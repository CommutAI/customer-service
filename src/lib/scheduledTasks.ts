/**
 * scheduledTasks.ts
 * Functions for running scheduled tasks like card expiration checks
 */

import { supabaseApiCalls } from './supabaseApi';

/**
 * Check for cards expiring soon and send SMS notifications
 * This should be called periodically (e.g., daily via cron job or scheduler)
 */
export async function runCardExpirationCheck(): Promise<void> {
  try {
    console.log('Running card expiration check...');
    await supabaseApiCalls.checkAndNotifyExpiredCards();
    console.log('Card expiration check completed.');
  } catch (error) {
    console.error('Error during card expiration check:', error);
  }
}

/**
 * Initialize scheduled tasks
 * This can be called when the app starts to set up periodic checks
 */
export function initScheduledTasks(): void {
  // Check for expiring cards daily (86400000 ms = 24 hours)
  const EXPIRATION_CHECK_INTERVAL = 86400000;

  setInterval(() => {
    runCardExpirationCheck();
  }, EXPIRATION_CHECK_INTERVAL);

  // Run an initial check on startup
  runCardExpirationCheck();
}
