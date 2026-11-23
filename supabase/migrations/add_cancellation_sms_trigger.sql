-- 1. Drop the restrictive sms_type check constraint so all SMS types are allowed
-- (or recreate it with all historical types including 'alighting', 'fare_validation', etc.)
ALTER TABLE sms_queue DROP CONSTRAINT IF EXISTS sms_queue_sms_type_check;
ALTER TABLE sms_queue DROP CONSTRAINT IF EXISTS sms_queue_type_check;

-- Optional: Recreate constraint with all valid types including historical ones
ALTER TABLE sms_queue ADD CONSTRAINT sms_queue_sms_type_check
CHECK (sms_type IN (
  'card_reserved',
  'card_approved',
  'card_claimed',
  'card_declined',
  'card_cancelled',
  'card_expired',
  'card_expiration',
  'reservation_status',
  'reservation_confirmation',
  'fare_validation',
  'alighting',
  'trip_completion',
  'emergency',
  'emergency_bus',
  'topup',
  'other',
  'admin',
  'test'
));

-- 2. Trigger function to automatically queue concise SMS on status changes
CREATE OR REPLACE FUNCTION queue_sms_on_reservation_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  card_data RECORD;
BEGIN
  -- Claimed status (~125 chars)
  IF NEW.status = 'claimed' AND (OLD.status IS NULL OR OLD.status != 'claimed') THEN
    IF NEW.card_id IS NOT NULL THEN
      SELECT card_uid, balance INTO card_data
      FROM qr_cards
      WHERE id = NEW.card_id;
    END IF;

    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      NEW.contact,
      'CommutAI: Reservation ' || NEW.reservation_id || ' for ' || NEW.name || ' is ready for pickup at the terminal. Bring a valid ID.',
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

  -- Cancelled status (concise: ~105 chars, under 120-160 limit)
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      NEW.contact,
      'CommutAI: Reservation ' || NEW.reservation_id || ' for ' || NEW.name || ' is cancelled. Visit the terminal to make a new request.',
      'card_cancelled',
      'pending',
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'name', NEW.name,
        'status', 'cancelled',
        'card_type', NEW.card_type
      )
    );

    RAISE LOG 'SMS queued for card cancellation: reservation_id=%', NEW.reservation_id;
  END IF;

  -- Expired status (concise: ~105 chars, under 120-160 limit)
  IF NEW.status = 'expired' AND (OLD.status IS NULL OR OLD.status != 'expired') THEN
    INSERT INTO sms_queue (phone_number, message, sms_type, status, metadata)
    VALUES (
      NEW.contact,
      'CommutAI: Reservation ' || NEW.reservation_id || ' for ' || NEW.name || ' has expired. Visit the terminal to make a new request.',
      'card_expired',
      'pending',
      jsonb_build_object(
        'reservation_id', NEW.reservation_id,
        'name', NEW.name,
        'status', 'expired',
        'card_type', NEW.card_type
      )
    );

    RAISE LOG 'SMS queued for card expiration: reservation_id=%', NEW.reservation_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'SMS trigger error: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Recreate trigger on card_reservations table
DROP TRIGGER IF EXISTS on_card_reservation_updated ON card_reservations;
CREATE TRIGGER on_card_reservation_updated
  AFTER UPDATE ON card_reservations
  FOR EACH ROW EXECUTE FUNCTION queue_sms_on_reservation_status_change();
