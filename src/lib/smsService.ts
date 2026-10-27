/**
 * smsService.ts
 * Service for sending SMS notifications via the existing SMS API server on Raspberry Pi
 */

const SMS_API_URL = import.meta.env.VITE_SMS_API_URL || 'http://raspberry-pi-ip:8001';

export interface SMSSendResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send SMS notification
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<SMSSendResult> {
  try {
    const response = await fetch(`${SMS_SERVER_URL}/api/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        message,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Failed to send SMS',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error) {
    // console.error('SMS service error:', error);
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
  try {
    const response = await fetch(`${SMS_API_URL}/topup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        card_id: cardId,
        card_holder: passengerName,
        amount: amount,
        new_balance: newBalance,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Failed to send SMS',
      };
    }

    return {
      success: true,
      message: data.data?.message || 'SMS sent successfully',
    };
  } catch (error) {
    console.error('SMS service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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

  return sendSMS(phoneNumber, message);
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
  try {
    const response = await fetch(`${SMS_API_URL}/card-claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        card_id: cardId,
        card_holder: passengerName,
        passenger_type: cardType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Failed to send SMS',
      };
    }

    return {
      success: true,
      message: data.data?.message || 'SMS sent successfully',
    };
  } catch (error) {
    console.error('SMS service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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
  try {
    const response = await fetch(`${SMS_API_URL}/card-expiration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number: phoneNumber,
        card_id: cardId,
        card_holder: passengerName,
        expiration_date: expiryDate,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.detail || 'Failed to send SMS',
      };
    }

    return {
      success: true,
      message: data.data?.message || 'SMS sent successfully',
    };
  } catch (error) {
    console.error('SMS service error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
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

  return sendSMS(phoneNumber, message);
}
