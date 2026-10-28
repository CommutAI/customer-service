-- Debug: Check if trigger is enabled and working

-- 1. Check if trigger exists and is enabled
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_qr_card_created';

-- 2. Check the function definition
SELECT
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'queue_sms_on_card_created';

-- 3. Test trigger manually by inserting a test card
-- Uncomment the lines below to test (but comment them out after testing)

-- INSERT INTO qr_cards (card_uid, owner_name, contact_number, balance, status, card_type, purchase_price, allowed_routes)
-- VALUES ('TEST-CARD-001', 'Test User', '09991146757', 100, 'active', 'regular', 110, ARRAY['type:Regular']);

-- 4. Check if SMS was queued
-- SELECT * FROM sms_queue ORDER BY created_at DESC LIMIT 1;

-- 5. Clean up test card
-- DELETE FROM qr_cards WHERE card_uid = 'TEST-CARD-001';
