-- Ensure SMS trigger is working - Run this in Supabase SQL Editor

-- Step 1: Remove old trigger if it exists
DROP TRIGGER IF EXISTS on_qr_card_created ON qr_cards;
DROP FUNCTION IF EXISTS queue_sms_on_card_created() CASCADE;

-- Step 2: Create simplified trigger function
CREATE OR REPLACE FUNCTION queue_sms_on_card_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE LOG '=== CARD CREATED TRIGGER FIRED ===';
  RAISE LOG 'card_uid: %, owner: %, contact: %', NEW.card_uid, NEW.owner_name, NEW.contact_number;

  -- Insert SMS directly using card data (no reservation matching needed)
  INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
  VALUES (
    NEW.contact_number,
    'CommuteAI: Card Approved! Card ID: ' || NEW.card_uid || '. Owner: ' || NEW.owner_name || '. Type: ' || NEW.card_type || '. Your card will be ready for pickup in 3 days. Please bring a valid ID.',
    'card_approved',
    'pending',
    jsonb_build_object(
      'card_id', NEW.id,
      'card_uid', NEW.card_uid,
      'owner_name', NEW.owner_name,
      'balance', NEW.balance,
      'card_type', NEW.card_type
    )
  );

  RAISE LOG 'SMS QUEUED SUCCESSFULLY for card_uid: %', NEW.card_uid;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'TRIGGER ERROR: %', SQLERRM;
    -- Don't fail the card creation even if SMS fails
    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger
CREATE TRIGGER on_qr_card_created
  AFTER INSERT ON qr_cards
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_created();

-- Step 4: Verify trigger was created
DO $$
BEGIN
  RAISE NOTICE 'Trigger created successfully on qr_cards table';
END $$;

-- Step 5: Test trigger (uncomment to test)
-- INSERT INTO qr_cards (card_uid, owner_name, contact_number, balance, status, card_type, purchase_price, allowed_routes)
-- VALUES ('TEST-TRIGGER-001', 'Test User', '09991146757', 100, 'active', 'regular', 110, ARRAY['type:Regular']);
