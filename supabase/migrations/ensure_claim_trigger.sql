-- Ensure claim SMS trigger is working
-- Run this in Supabase SQL Editor

-- Drop existing status change trigger if it exists
DROP TRIGGER IF EXISTS on_card_reservation_updated ON card_reservations;
DROP FUNCTION IF EXISTS queue_sms_on_reservation_status_change() CASCADE;

-- Create function to handle claim SMS
CREATE OR REPLACE FUNCTION queue_sms_on_reservation_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  card_data RECORD;
BEGIN
  RAISE LOG '=== RESERVATION STATUS CHANGE TRIGGER FIRED ===';
  RAISE LOG 'Status: % (from %)', NEW.status, OLD.status;

  -- Handle claimed status ONLY
  IF NEW.status = 'claimed' AND (OLD.status IS NULL OR OLD.status != 'claimed') THEN
    RAISE LOG 'Processing CLAIMED status for reservation: %', NEW.reservation_id;

    -- Get card details if card_id is set
    IF NEW.card_id IS NOT NULL THEN
      SELECT card_uid, balance INTO card_data
      FROM qr_cards
      WHERE id = NEW.card_id;

      RAISE LOG 'Card data: uid=%, balance=%', card_data.card_uid, card_data.balance;
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

    RAISE LOG 'CLAIM SMS QUEUED for reservation: %', NEW.reservation_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'CLAIM TRIGGER ERROR: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for reservation status changes
CREATE TRIGGER on_card_reservation_updated
  AFTER UPDATE ON card_reservations
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_reservation_status_change();

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Claim SMS trigger created successfully';
END $$;
