-- Check which triggers are actually working
-- Run this in Supabase SQL Editor

-- 1. Check all triggers on card_reservations
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'card_reservations';

-- 2. Check all triggers on qr_cards
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'qr_cards';

-- 3. Check recent SMS by type
SELECT
  sms_type,
  status,
  created_at,
  phone_number,
  message
FROM sms_queue
ORDER BY created_at DESC
LIMIT 10;
