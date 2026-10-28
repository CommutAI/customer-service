-- Fix top-up SMS trigger and update messages
-- Run this in Supabase SQL Editor

-- Step 1: Update the card reload SMS trigger to use correct phone number and shorten message
CREATE OR REPLACE FUNCTION queue_sms_on_card_reload()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  card_data RECORD;
BEGIN
  -- Get card details
  SELECT card_uid, owner_name, balance, contact_number INTO card_data
  FROM qr_cards
  WHERE id = NEW.card_id;

  IF card_data.card_uid IS NOT NULL AND card_data.contact_number IS NOT NULL THEN
    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      card_data.contact_number,
      'CommuteAI: Top-up! Card: ' || card_data.card_uid || '. Amount: ₱' || NEW.amount::text || '. New Balance: ₱' || card_data.balance::text || '. Thank you!',
      'topup',
      'pending',
      jsonb_build_object(
        'card_id', NEW.card_id,
        'card_uid', card_data.card_uid,
        'owner_name', card_data.owner_name,
        'amount', NEW.amount,
        'new_balance', card_data.balance
      )
    );
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Card reload SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 2: Add RLS policy for card_reloads (allow service role for triggers)
DROP POLICY IF EXISTS card_reloads_service_role ON card_reloads;
CREATE POLICY card_reloads_service_role ON card_reloads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Step 2b: Add RLS policy for authenticated users
DROP POLICY IF EXISTS card_reloads_rw_authenticated ON card_reloads;
CREATE POLICY card_reloads_rw_authenticated ON card_reloads
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 3: Ensure trigger exists
DROP TRIGGER IF EXISTS on_card_reload_inserted ON card_reloads;
CREATE TRIGGER on_card_reload_inserted
  AFTER INSERT ON card_reloads
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_reload();

-- Step 3: Verify
DO $$
BEGIN
  RAISE NOTICE 'Top-up SMS trigger updated: Uses contact_number, shortened message';
END $$;
