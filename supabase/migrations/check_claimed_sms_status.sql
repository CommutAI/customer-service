-- Check the status of card_claimed SMS
-- Run this in Supabase SQL Editor

SELECT
  id,
  sms_type,
  status,
  phone_number,
  created_at,
  retry_count,
  LEFT(message, 80) as message_preview
FROM sms_queue
WHERE sms_type = 'card_claimed'
ORDER BY created_at DESC;
