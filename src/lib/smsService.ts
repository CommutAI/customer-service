/**
 * smsService.ts
 * Service for sending SMS notifications via the backend SMS server
 */

const SMS_SERVER_URL = import.meta.env.VITE_SMS_SERVER_URL || 'http://localhost:3001';

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
    console.error('SMS service error:', error);
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

  return sendSMS(phoneNumber, message);
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
