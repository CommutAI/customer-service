-- Diagnostic: Check claim trigger and recent SMS
-- Run this in Supabase SQL Editor

-- 1. Check if the trigger exists
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_card_reservation_updated'
  AND event_object_table = 'card_reservations';

-- 2. Check if the function exists
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_name = 'queue_sms_on_reservation_status_change'
  AND routine_schema = 'public';

-- 3. Check recent claim operations
SELECT
  id,
  reservation_id,
  name,
  status,
  card_id,
  claimed_at,
  created_at
FROM card_reservations
WHERE status = 'claimed'
ORDER BY claimed_at DESC
LIMIT 5;

-- 4. Check recent SMS in queue
SELECT
  id,
  sms_type,
  status,
  phone_number,
  created_at,
  LEFT(message, 50) as message_preview
FROM sms_queue
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if any card_claimed SMS exist
SELECT
  COUNT(*) as card_claimed_count
FROM sms_queue
WHERE sms_type = 'card_claimed';
