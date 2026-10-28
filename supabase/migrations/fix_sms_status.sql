-- Fix: Update old 'awaiting_approval' SMS to 'pending' status
-- Run this in Supabase SQL Editor

UPDATE sms_queue
SET status = 'pending'
WHERE status = 'awaiting_approval';

-- Verify the update
SELECT COUNT(*) as updated_count
FROM sms_queue
WHERE status = 'pending';

-- Check recent pending SMS
SELECT
  sms_type,
  status,
  created_at,
  phone_number
FROM sms_queue
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;
