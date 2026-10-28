-- Update approval SMS message - Remove balance, change to "Card Approved"
-- Run this in Supabase SQL Editor

-- Update the card creation trigger
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

-- Update the reservation status change trigger
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

  -- Handle claimed status (keep balance here)
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
    RAISE LOG 'SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE 'Approval SMS message updated: No balance shown, says "Card Approved"';
END $$;
