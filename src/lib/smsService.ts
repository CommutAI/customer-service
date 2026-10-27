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

/**
 * Queue SMS to be sent by backend service
 */
async function queueSMS(
  phoneNumber: string,
  message: string,
  smsType: string,
  metadata?: Record<string, any>
): Promise<SMSSendResult> {
  try {
    const { error } = await supabase
      .from('sms_queue')
      .insert({
        phone_number: phoneNumber,
        message: message,
        sms_type: smsType,
        status: 'pending',
        metadata: metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to queue SMS:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      message: 'SMS queued successfully',
    };
  } catch (error) {
    console.error('SMS queue error:', error);
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

  return queueSMS(phoneNumber, message, 'card_claim', {
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

  if (status === 'claimed') {
    message = `CommuteAI: Reservation Claimed!\n\nPassenger: ${passengerName}\nReservation ID: ${reservationId}\n\nYour card is ready for pickup at the terminal. Please bring a valid ID.`;
  } else if (status === 'cancelled') {
    message = `CommuteAI: Reservation Cancelled\n\nPassenger: ${passengerName}\nReservation ID: ${reservationId}\n\nYour reservation has been cancelled. If this was a mistake, please visit the terminal to make a new reservation.`;
  } else if (status === 'expired') {
    message = `CommuteAI: Reservation Expired\n\nPassenger: ${passengerName}\nReservation ID: ${reservationId}\n\nYour reservation has expired. Please visit the terminal to make a new reservation.`;
  }

  return queueSMS(phoneNumber, message, 'reservation_status', {
    passengerName,
    reservationId,
    status,
  });
}
