-- Migration: Fix sms_queue table and add SMS triggers
-- Run this in Supabase SQL Editor

-- Step 1: Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE sms_queue ADD COLUMN metadata JSONB DEFAULT '{}';
    RAISE NOTICE 'Added metadata column to sms_queue';
  ELSE
    RAISE NOTICE 'metadata column already exists in sms_queue';
  END IF;
END $$;

-- Step 2: Ensure sms_type column exists (rename from 'type' if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'sms_type'
  ) THEN
    -- If 'type' column exists, rename it to sms_type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sms_queue' AND column_name = 'type'
    ) THEN
      ALTER TABLE sms_queue RENAME COLUMN type TO sms_type;
      RAISE NOTICE 'Renamed type column to sms_type';
    ELSE
      -- Otherwise add the column
      ALTER TABLE sms_queue ADD COLUMN sms_type TEXT NOT NULL DEFAULT 'other';
      RAISE NOTICE 'Added sms_type column to sms_queue';
    END IF;
  ELSE
    RAISE NOTICE 'sms_type column already exists in sms_queue';
  END IF;
END $$;

-- Step 3: Remove restrictive check constraint on sms_type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sms_queue_type_check'
  ) THEN
    ALTER TABLE sms_queue DROP CONSTRAINT sms_queue_type_check;
    RAISE NOTICE 'Dropped sms_queue_type_check constraint';
  END IF;
END $$;

-- Step 4: Ensure RLS policy allows authenticated users to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sms_queue' AND policyname = 'sms_queue_rw_authenticated'
  ) THEN
    CREATE POLICY "sms_queue_rw_authenticated" ON sms_queue FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
    RAISE NOTICE 'Created sms_queue_rw_authenticated policy';
  ELSE
    RAISE NOTICE 'sms_queue_rw_authenticated policy already exists';
  END IF;
END $$;

-- Step 4b: Add policy to allow service role to bypass RLS (for triggers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sms_queue' AND policyname = 'sms_queue_service_role'
  ) THEN
    CREATE POLICY "sms_queue_service_role" ON sms_queue FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Created sms_queue_service_role policy';
  ELSE
    RAISE NOTICE 'sms_queue_service_role policy already exists';
  END IF;
END $$;

-- Step 4c: Ensure triggers can read card_reservations and qr_cards tables
DO $$
BEGIN
  -- Service role policy for card_reservations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'card_reservations' AND policyname = 'card_reservations_service_role'
  ) THEN
    CREATE POLICY "card_reservations_service_role" ON card_reservations FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Created card_reservations_service_role policy';
  END IF;

  -- Service role policy for qr_cards
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'qr_cards' AND policyname = 'qr_cards_service_role'
  ) THEN
    CREATE POLICY "qr_cards_service_role" ON qr_cards FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
    RAISE NOTICE 'Created qr_cards_service_role policy';
  END IF;
END $$;

-- Step 5: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at ON sms_queue(created_at);

-- Step 6: Create function to queue SMS when card reservation is created
CREATE OR REPLACE FUNCTION queue_sms_on_card_reserved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
  VALUES (
    NEW.contact,
    'CommuteAI: Reservation Confirmed! ID: ' || NEW.reservation_id || '. Card Type: ' || NEW.card_type || '. Pickup: ' || NEW.pickup_terminal || '. Approval within 1-2 days. Thank you for using CommuteAI!',
    'card_reserved',
    'pending',
    jsonb_build_object(
      'reservation_id', NEW.reservation_id,
      'name', NEW.name,
      'card_type', NEW.card_type
    )
  );
  RETURN NEW;
END;
$$;

-- Step 7: Create trigger for card reservation creation
DROP TRIGGER IF EXISTS on_card_reservation_created ON card_reservations;
CREATE TRIGGER on_card_reservation_created
  AFTER INSERT ON card_reservations
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_reserved();

-- Step 8: Create function to queue SMS when card reservation status changes (handles both approval and claim)
CREATE OR REPLACE FUNCTION queue_sms_on_reservation_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  card_data RECORD;
BEGIN
  -- Handle approval status
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Get card details if card_id is set
    IF NEW.card_id IS NOT NULL THEN
      SELECT card_uid, balance INTO card_data
      FROM qr_cards
      WHERE id = NEW.card_id;
    END IF;

    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      NEW.contact,
      'CommuteAI: Card Approved! Card ID: ' || COALESCE(card_data.card_uid, 'See terminal for details') || '. Owner: ' || NEW.name || '. Type: ' || NEW.card_type || '. Your card will be ready for pickup in 3 days. Please bring a valid ID.',
      'card_approved',
      'pending',
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'name', NEW.name,
        'card_id', NEW.card_id,
        'card_uid', card_data.card_uid,
        'balance', card_data.balance
      )
    );
  END IF;

  -- Handle claimed status
  IF NEW.status = 'claimed' AND (OLD.status IS NULL OR OLD.status != 'claimed') THEN
    -- Get card details if card_id is set
    IF NEW.card_id IS NOT NULL THEN
      SELECT card_uid, balance INTO card_data
      FROM qr_cards
      WHERE id = NEW.card_id;
    END IF;

    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      NEW.contact,
      'CommuteAI: Card Claimed! Card: ' || COALESCE(card_data.card_uid, 'See terminal') || '. Balance: ₱' || COALESCE(card_data.balance::text, '0') || '. Thank you!',
      'card_claimed',
      'pending',
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'name', NEW.name,
        'card_id', NEW.card_id,
        'card_uid', card_data.card_uid,
        'balance', card_data.balance,
        'card_type', NEW.card_type
      )
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE LOG 'SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 9: Create trigger for card reservation status changes
DROP TRIGGER IF EXISTS on_card_reservation_updated ON card_reservations;
CREATE TRIGGER on_card_reservation_updated
  AFTER UPDATE ON card_reservations
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_reservation_status_change();

-- Step 10: Create function to queue SMS when a QR card is created (for approval flow)
CREATE OR REPLACE FUNCTION queue_sms_on_card_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  reservation RECORD;
BEGIN
  RAISE LOG 'Card created trigger fired: card_uid=%, owner=%, contact=%', NEW.card_uid, NEW.owner_name, NEW.contact_number;

  -- Find the most recent pending reservation that matches this card's owner
  -- This works because approval creates the card first, then updates the reservation
  SELECT * INTO reservation
  FROM card_reservations
  WHERE name = NEW.owner_name
    AND contact = NEW.contact_number
    AND card_type = CASE
        WHEN NEW.card_type = 'regular' THEN 'Regular'
        WHEN NEW.card_type = 'student' THEN 'Student'
        WHEN NEW.card_type = 'senior_citizen' THEN 'Senior Citizen'
        WHEN NEW.card_type = 'pwd' THEN 'PWD'
        ELSE 'Regular'
      END
    AND status IN ('pending', 'approved')
  ORDER BY created_at DESC
  LIMIT 1;

  IF reservation IS NOT NULL THEN
    RAISE LOG 'Found reservation: id=%, reservation_id=%', reservation.id, reservation.reservation_id;

    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      reservation.contact,
      'CommuteAI: Card Approved! Card ID: ' || NEW.card_uid || '. Owner: ' || NEW.owner_name || '. Type: ' || NEW.card_type || '. Your card will be ready for pickup in 3 days. Please bring a valid ID.',
      'card_approved',
      'pending',
      jsonb_build_object(
        'reservation_id', reservation.reservation_id,
        'name', reservation.name,
        'card_id', NEW.id,
        'card_uid', NEW.card_uid,
        'balance', NEW.balance
      )
    );

    RAISE LOG 'SMS queued for card approval';
  ELSE
    RAISE LOG 'No matching reservation found for card: owner=%, contact=%', NEW.owner_name, NEW.contact_number;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Card creation SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 11: Create trigger for QR card creation
DROP TRIGGER IF EXISTS on_qr_card_created ON qr_cards;
CREATE TRIGGER on_qr_card_created
  AFTER INSERT ON qr_cards
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_created();

-- Step 12: Create function to queue SMS when card is reloaded (top-up)
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

-- Step 13: Create trigger for card reloads
DROP TRIGGER IF EXISTS on_card_reload_inserted ON card_reloads;
CREATE TRIGGER on_card_reload_inserted
  AFTER INSERT ON card_reloads
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_reload();

-- Step 14: Confirm migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
END $$;

-- Step 15: Diagnostic query to check trigger setup
-- Run this separately to verify triggers are working
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_name LIKE '%sms%' OR event_object_table IN ('qr_cards', 'card_reservations');

-- Step 16: Check if there are any recent SMS entries
-- SELECT * FROM sms_queue ORDER BY created_at DESC LIMIT 5;

