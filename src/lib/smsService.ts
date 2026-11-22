/**
 * smsService.ts
 * Service for queuing SMS notifications via Supabase database
 * SMS is sent by a backend service that polls the database
 */

import { supabase } from './supabase';

export interface SMSSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Valid SMS types matching database constraint
const VALID_SMS_TYPES = new Set([
  'card_reserved',
  'card_approved',
  'card_claimed',
  'card_declined',
  'card_cancelled',
  'card_expired',
  'card_expiration',
  'reservation_status',
  'reservation_confirmation',
  'fare_validation',
  'alighting',
  'trip_completion',
  'emergency',
  'emergency_bus',
  'topup',
  'other',
  'admin',
  'test',
]);

/**
 * Queue SMS to be sent by backend service
 */
async function queueSMS(
  phoneNumber: string,
  message: string,
  smsType: string,
  metadata?: Record<string, unknown>
): Promise<SMSSendResult> {
  try {
    // Sanitize smsType against valid types
    const safeType = VALID_SMS_TYPES.has(smsType) ? smsType : 'other';
    console.log('Attempting to queue SMS:', { phoneNumber, smsType: safeType, messageLength: message.length });

    // Try inserting with metadata first (new schema)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const smsQueue = (supabase as any).from('sms_queue');

    const { error: error1 } = await smsQueue
      .insert({
        phone_number: phoneNumber,
        message: message,
        sms_type: safeType,
        status: 'pending',
        metadata: metadata || {},
      });

    // If metadata column doesn't exist, try without it (old schema)
    if (error1 && error1.message.includes('metadata')) {
      console.log('Metadata column not found, using old schema...');
      const { error: error2 } = await smsQueue
        .insert({
          phone_number: phoneNumber,
          message: message,
          sms_type: safeType,
          status: 'pending',
        });

      if (error2) {
        console.warn('Failed to queue SMS (old schema):', error2.message);
        return {
          success: false,
          error: error2.message,
        };
      }

      console.log('SMS queued successfully (old schema)');
      return {
        success: true,
        message: 'SMS queued successfully',
      };
    }

    if (error1) {
      // If check constraint fails on sms_type, fallback to 'other' or 'card_declined'
      if (error1.message?.includes('sms_type_check') || error1.code === '23514') {
        console.warn('sms_type constraint violation, retrying with fallback type (other)...');
        const { error: fallbackError } = await smsQueue
          .insert({
            phone_number: phoneNumber,
            message: message,
            sms_type: 'other',
            status: 'pending',
            metadata: metadata || {},
          });

        if (!fallbackError) {
          console.log('SMS queued successfully using fallback type');
          return { success: true, message: 'SMS queued successfully' };
        }
      }

      console.warn('Failed to queue SMS:', error1.message);
      return {
        success: false,
        error: error1.message,
      };
    }

    console.log('SMS queued successfully (new schema)');
    return {
      success: true,
      message: 'SMS queued successfully',
    };
  } catch (error) {
    console.warn('SMS queue error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send top-up confirmation SMS
 */
export async function sendTopUpConfirmation(
  phoneNumber: string,
  passengerName: string,
  amount: number,
  newBalance: number,
  cardId: string
): Promise<SMSSendResult> {
  const message = `CommuteAI: Top-up successful!\n\nPassenger: ${passengerName}\nCard: ${cardId}\nAmount: ₱${amount.toFixed(2)}\nNew Balance: ₱${newBalance.toFixed(2)}\n\nThank you for using CommuteAI!`;

  return queueSMS(phoneNumber, message, 'topup', {
    passengerName,
    cardId,
    amount,
    newBalance,
  });
}

/**
 * Send card claim notification SMS
 */
export async function sendCardClaimNotification(
  phoneNumber: string,
  passengerName: string,
  cardId: string,
  initialBalance: number,
  cardType: string
): Promise<SMSSendResult> {
  const message = `CommuteAI: Card Claimed Successfully!\n\nPassenger: ${passengerName}\nCard ID: ${cardId}\nType: ${cardType}\nInitial Balance: ₱${initialBalance.toFixed(2)}\n\nYour card is now active. Use it for seamless travel with CommuteAI!`;

  return queueSMS(phoneNumber, message, 'card_claimed', {
    passengerName,
    cardId,
    initialBalance,
    cardType,
  });
}

/**
 * Send card expiration notification SMS
 */
export async function sendCardExpirationNotification(
  phoneNumber: string,
  passengerName: string,
  cardId: string,
  expiryDate: string
): Promise<SMSSendResult> {
  const message = `CommuteAI: Card Expiration Notice\n\nPassenger: ${passengerName}\nCard ID: ${cardId}\nExpires on: ${expiryDate}\n\nPlease renew your card at the terminal to continue enjoying discounted fares. Thank you!`;

  return queueSMS(phoneNumber, message, 'card_expiration', {
    passengerName,
    cardId,
    expiryDate,
  });
}

/**
 * Send fare validation SMS (optional)
 */
export async function sendFareValidationConfirmation(
  phoneNumber: string,
  passengerName: string,
  fare: number,
  newBalance: number,
  destination: string
): Promise<SMSSendResult> {
  const message = `CommuteAI: Fare validated!\n\nPassenger: ${passengerName}\nDestination: ${destination}\nFare: ₱${fare.toFixed(2)}\nRemaining Balance: ₱${newBalance.toFixed(2)}\n\nSafe travels!`;

  return queueSMS(phoneNumber, message, 'fare_validation', {
    passengerName,
    fare,
    newBalance,
    destination,
  });
}

/**
 * Send reservation status notification SMS
 */
export async function sendReservationStatusNotification(
  phoneNumber: string,
  passengerName: string,
  reservationId: string,
  status: 'claimed' | 'cancelled' | 'expired'
): Promise<SMSSendResult> {
  let message = '';
  let smsType = 'other';

  if (status === 'claimed') {
    message = `CommutAI: Reservation ${reservationId} for ${passengerName} is ready for pickup at the terminal. Bring a valid ID.`;
    smsType = 'card_claimed';
  } else if (status === 'cancelled') {
    message = `CommutAI: Reservation ${reservationId} for ${passengerName} is cancelled. Visit the terminal to make a new request.`;
    smsType = 'card_cancelled';
  } else if (status === 'expired') {
    message = `CommutAI: Reservation ${reservationId} for ${passengerName} has expired. Visit the terminal to make a new request.`;
    smsType = 'card_expired';
  }

  return queueSMS(phoneNumber, message, smsType, {
    passengerName,
    reservationId,
    status,
  });
}
