-- Fix: Simplified trigger for card approval SMS
-- This version queues SMS based on card_uid instead of matching reservation fields

-- Step 1: Add a temporary column to track which reservation a card belongs to
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_cards' AND column_name = 'reservation_id'
  ) THEN
    ALTER TABLE qr_cards ADD COLUMN reservation_id TEXT;
    RAISE NOTICE 'Added reservation_id column to qr_cards';
  END IF;
END $$;

-- Step 2: Replace the card creation trigger with a simpler version
CREATE OR REPLACE FUNCTION queue_sms_on_card_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RAISE LOG 'Card created trigger fired: card_uid=%, owner=%, contact=%', NEW.card_uid, NEW.owner_name, NEW.contact_number;

  -- Insert SMS for card approval using the card's own data
  -- This is simpler and more reliable than trying to match with reservations
  INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
  VALUES (
    NEW.contact_number,
    'CommuteAI: Card Created! Card ID: ' || NEW.card_uid || '. Owner: ' || NEW.owner_name || '. Type: ' || NEW.card_type || '. Balance: ₱' || NEW.balance::text || '. Your card is now active.',
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

  RAISE LOG 'SMS queued for card creation: card_uid=%', NEW.card_uid;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Card creation SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 3: Recreate the trigger
DROP TRIGGER IF EXISTS on_qr_card_created ON qr_cards;
CREATE TRIGGER on_qr_card_created
  AFTER INSERT ON qr_cards
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_card_created();

-- Step 4: Also update the reservation update trigger to send SMS on claim
CREATE OR REPLACE FUNCTION queue_sms_on_reservation_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  card_data RECORD;
BEGIN
  -- Handle claimed status only (approval is now handled by card creation trigger)
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
      'CommuteAI: Card Claimed Successfully! Passenger: ' || NEW.name || '. Card ID: ' || COALESCE(card_data.card_uid, 'See terminal') || '. Type: ' || NEW.card_type || '. Initial Balance: ₱' || COALESCE(card_data.balance::text, '0') || '. Your card is now active. Use it for seamless travel with CommuteAI!',
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

    RAISE LOG 'SMS queued for card claim: reservation_id=%', NEW.reservation_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Step 5: Recreate the reservation update trigger
DROP TRIGGER IF EXISTS on_card_reservation_updated ON card_reservations;
CREATE TRIGGER on_card_reservation_updated
  AFTER UPDATE ON card_reservations
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_reservation_status_change();

-- Step 6: Confirm completion
DO $$
BEGIN
  RAISE NOTICE 'Trigger fix completed successfully';
END $$;
