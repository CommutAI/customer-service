-- Check recent SMS entries
SELECT
  id,
  phone_number,
  sms_type,
  status,
  created_at,
  message
FROM sms_queue
ORDER BY created_at DESC
LIMIT 10;

-- Check if triggers are enabled
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%sms%'
  OR event_object_table IN ('qr_cards', 'card_reservations');
