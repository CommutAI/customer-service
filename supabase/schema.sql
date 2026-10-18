-- ============================================================
-- CommutAI · Customer Service Database Schema
-- Run this in the Supabase SQL Editor on a clean slate.
-- All statements use IF NOT EXISTS / IF EXISTS guards so
-- re-running is safe.
-- ============================================================

-- ── 0. Custom Enum Types ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM ('admin', 'cs_desk', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE card_type AS ENUM ('regular', 'student', 'senior_citizen', 'pwd');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('issued', 'validated', 'expired', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('fare_validation', 'card_issuance', 'card_reload', 'refund', 'penalty');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cs_action_type AS ENUM ('complaint', 'inquiry', 'refund', 'lost_card', 'card_replacement', 'balance_dispute', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cs_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE cs_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'escalated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE card_status AS ENUM ('active', 'lost', 'replaced', 'deactivated', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 1. Staff Users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_users (
  id          UUID        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  email       TEXT        NOT NULL UNIQUE,
  role        staff_role  NOT NULL DEFAULT 'cs_desk',
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  department  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create staff_users row when a new auth user is created
CREATE OR REPLACE FUNCTION handle_new_staff_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO staff_users (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::staff_role, 'cs_desk')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email     = EXCLUDED.email,
    role      = EXCLUDED.role;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error creating staff_users record for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_staff_user();

-- ── 2. QR Cards ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qr_cards (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  card_uid        TEXT           NOT NULL UNIQUE,
  owner_name      TEXT           NOT NULL,
  contact_number  TEXT,
  email           TEXT,
  balance         NUMERIC(10,2)  NOT NULL DEFAULT 0,
  status          card_status    NOT NULL DEFAULT 'active',
  card_type       card_type      NOT NULL DEFAULT 'regular',
  purchase_price  NUMERIC(10,2)  NOT NULL DEFAULT 100.00,
  allowed_routes  TEXT[]         DEFAULT '{}',
  issued_by       UUID           REFERENCES staff_users (id),
  issued_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  notes           TEXT
);

-- ── 3. Temporary Tickets ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS temporary_tickets (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_uid      TEXT          NOT NULL UNIQUE,
  fare_amount     NUMERIC(10,2) NOT NULL DEFAULT 12,
  status          ticket_status NOT NULL DEFAULT 'issued',
  allowed_routes  TEXT[]        DEFAULT '{}',
  passenger_name  TEXT,
  passenger_contact TEXT,
  issued_by       UUID          REFERENCES staff_users (id),
  issued_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  validated_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ
);

-- ── 4. Transactions ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id          UUID             REFERENCES qr_cards (id),
  temp_ticket_id   UUID             REFERENCES temporary_tickets (id),
  type             transaction_type NOT NULL,
  amount           NUMERIC(10,2)    NOT NULL,
  channel          TEXT             NOT NULL, -- 'qr_card', 'temp_ticket', 'cash', 'card'
  staff_id         UUID             REFERENCES staff_users (id),
  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  reference_number TEXT,
  description      TEXT,
  balance_after    NUMERIC(10,2),
  baggage_category TEXT,
  baggage_weight   NUMERIC(10,2),
  baggage_fee      NUMERIC(10,2)
);

-- ── 5. Customer Service Tickets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_tickets (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number   TEXT           NOT NULL UNIQUE,
  customer_name   TEXT           NOT NULL,
  customer_contact TEXT          NOT NULL,
  customer_email  TEXT,
  action_type     cs_action_type NOT NULL,
  priority        cs_priority    NOT NULL DEFAULT 'medium',
  status          cs_status      NOT NULL DEFAULT 'open',
  subject         TEXT           NOT NULL,
  description     TEXT           NOT NULL,
  card_id         UUID           REFERENCES qr_cards (id),
  transaction_id  UUID           REFERENCES transactions (id),
  assigned_to     UUID           REFERENCES staff_users (id),
  created_by      UUID           REFERENCES staff_users (id),
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  resolution_notes TEXT
);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_cs_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cs_tickets_updated_at_trigger ON cs_tickets;
CREATE TRIGGER update_cs_tickets_updated_at_trigger
  BEFORE UPDATE ON cs_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_cs_tickets_updated_at();

-- ── 6. Customer Service Ticket Notes ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cs_ticket_notes (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID        NOT NULL REFERENCES cs_tickets (id) ON DELETE CASCADE,
  staff_id    UUID        NOT NULL REFERENCES staff_users (id),
  note        TEXT        NOT NULL,
  is_internal BOOLEAN     NOT NULL DEFAULT FALSE, -- If true, only visible to staff
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 7. Customer Service Logs ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_service_logs (
  id          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID           REFERENCES cs_tickets (id),
  handled_by  UUID           REFERENCES staff_users (id),
  action      cs_action_type NOT NULL,
  description TEXT,
  metadata    JSONB,
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ── 8. Card Reservations ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS card_reservations (
  id               BIGSERIAL PRIMARY KEY,
  reservation_id   TEXT        UNIQUE NOT NULL,
  name             TEXT        NOT NULL,
  contact          TEXT        NOT NULL,
  email            TEXT,
  card_type        card_type   NOT NULL,
  pickup_terminal  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_by     UUID        REFERENCES staff_users (id),
  processed_at     TIMESTAMPTZ
);

-- Trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION update_card_reservations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_card_reservations_updated_at_trigger ON card_reservations;
CREATE TRIGGER update_card_reservations_updated_at_trigger
  BEFORE UPDATE ON card_reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_card_reservations_updated_at();

-- ── 9. Refund Requests ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_requests (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number  TEXT        NOT NULL UNIQUE,
  customer_name   TEXT        NOT NULL,
  customer_contact TEXT       NOT NULL,
  transaction_id  UUID        REFERENCES transactions (id),
  card_id         UUID        REFERENCES qr_cards (id),
  amount          NUMERIC(10,2) NOT NULL,
  reason          TEXT        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'processed'
  approved_by     UUID        REFERENCES staff_users (id),
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

-- ── 10. Fare Matrix ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fare_matrix (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  route_from              TEXT        NOT NULL,
  route_to                TEXT        NOT NULL,
  km_distance             NUMERIC     NOT NULL,
  regular_fare            NUMERIC     NOT NULL,
  discounted_fare         NUMERIC     NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_route UNIQUE (route_from, route_to)
);

-- ── 11. Baggage Fee Matrix ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS baggage_fee_matrix (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category        TEXT        NOT NULL,
  max_weight_kg   NUMERIC     NOT NULL,
  fee             NUMERIC     NOT NULL,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 12. System Config ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT        UNIQUE NOT NULL,
  value       JSONB       NOT NULL,
  description TEXT,
  category    TEXT        NOT NULL DEFAULT 'general',
  is_public   BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by  UUID        REFERENCES staff_users (id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings
INSERT INTO system_config (key, value, description, category) VALUES
  ('card_initial_balance', '"100"', 'Initial balance for new QR cards', 'pricing'),
  ('card_fee', '"10"', 'Card issuance fee', 'pricing'),
  ('temporary_card_balance', '"100"', 'Balance for temporary QR cards', 'pricing'),
  ('card_validity_years', '"1"', 'Number of years cards are valid', 'general'),
  ('refund_processing_days', '"7"', 'Days to process refund requests', 'operations'),
  ('cs_ticket_sla_hours', '"24"', 'SLA for resolving CS tickets (hours)', 'operations')
ON CONFLICT (key) DO NOTHING;

-- ── 13. Staff Notifications ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_notifications (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id        UUID        NOT NULL REFERENCES staff_users (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  message         TEXT        NOT NULL,
  type            TEXT        NOT NULL CHECK (type IN ('transaction', 'card_issuance', 'card_replacement', 'card_reload', 'alert', 'info', 'cs_ticket', 'refund')),
  read            BOOLEAN     NOT NULL DEFAULT FALSE,
  related_id      UUID,       -- ID of related record (transaction, card, etc.)
  related_table   TEXT,       -- Table name of related record
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_staff_notifications_staff_id ON staff_notifications(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_read ON staff_notifications(read);
CREATE INDEX IF NOT EXISTS idx_staff_notifications_created_at ON staff_notifications(created_at DESC);

-- ── 14. Audit Logs ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  username    TEXT        NOT NULL,
  action      TEXT        DEFAULT 'info' CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'VIEW', 'EXPORT', 'APPROVE', 'REJECT')),
  module      TEXT,
  details     TEXT,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 15. Bus Reference (Minimal for CS inquiries) ─────────────────────────────
CREATE TABLE IF NOT EXISTS buses (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plate_number   TEXT        NOT NULL UNIQUE,
  bus_number     INTEGER     UNIQUE,
  route          TEXT        NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 16. Helper Functions ─────────────────────────────────────────────────────
-- Returns the role of the authenticated user
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role::TEXT FROM staff_users WHERE id = auth.uid();
$$;

-- Generate ticket number for CS tickets
CREATE OR REPLACE FUNCTION generate_cs_ticket_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the count of tickets created today
  SELECT COUNT(*) INTO sequence_num
  FROM cs_tickets
  WHERE TO_CHAR(created_at, 'YYYYMMDD') = date_prefix;
  
  sequence_num := sequence_num + 1;
  
  RETURN 'CS-' || date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
END;
$$;

-- Generate refund request number
CREATE OR REPLACE FUNCTION generate_refund_number()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Get the count of refund requests created today
  SELECT COUNT(*) INTO sequence_num
  FROM refund_requests
  WHERE TO_CHAR(created_at, 'YYYYMMDD') = date_prefix;
  
  sequence_num := sequence_num + 1;
  
  RETURN 'REF-' || date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
END;
$$;

-- ── 17. Notification Triggers ───────────────────────────────────────────────
-- Function to create notification for staff and audit logs
CREATE OR REPLACE FUNCTION notify_staff_on_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  admin_staff RECORD;
  cs_desk_staff RECORD;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
  audit_action TEXT;
  audit_module TEXT;
  audit_details TEXT;
  current_username TEXT;
BEGIN
  -- Get current username for audit log
  SELECT full_name INTO current_username FROM staff_users WHERE id = auth.uid();

  -- Determine notification details based on table and operation
  IF TG_TABLE_NAME = 'transactions' THEN
    notification_title := 'New Transaction';
    notification_message := format('Transaction of ₱%s recorded via %s', NEW.amount, NEW.channel);
    notification_type := 'transaction';
    audit_action := 'CREATE';
    audit_module := 'Transactions';
    audit_details := format('Transaction ID: %s, Amount: ₱%s, Channel: %s, Type: %s', NEW.id, NEW.amount, NEW.channel, NEW.type);
  ELSIF TG_TABLE_NAME = 'qr_cards' AND TG_OP = 'INSERT' THEN
    notification_title := 'New Card Issued';
    notification_message := format('Card %s issued for %s (%s)', NEW.card_uid, NEW.owner_name, NEW.card_type);
    notification_type := 'card_issuance';
    audit_action := 'CREATE';
    audit_module := 'Card Management';
    audit_details := format('Card UID: %s, Owner: %s, Type: %s, Balance: ₱%s', NEW.card_uid, NEW.owner_name, NEW.card_type, NEW.balance);
  ELSIF TG_TABLE_NAME = 'qr_cards' AND TG_OP = 'UPDATE' AND OLD.status != NEW.status AND NEW.status = 'replaced' THEN
    notification_title := 'Card Replaced';
    notification_message := format('Card %s has been replaced', NEW.card_uid);
    notification_type := 'card_replacement';
    audit_action := 'UPDATE';
    audit_module := 'Card Management';
    audit_details := format('Card UID: %s replaced, Previous status: %s, New status: %s', NEW.card_uid, OLD.status, NEW.status);
  ELSIF TG_TABLE_NAME = 'qr_cards' AND TG_OP = 'UPDATE' AND OLD.balance != NEW.balance THEN
    notification_title := 'Card Reloaded';
    notification_message := format('Card %s reloaded. New balance: ₱%s', NEW.card_uid, NEW.balance);
    notification_type := 'card_reload';
    audit_action := 'UPDATE';
    audit_module := 'Card Management';
    audit_details := format('Card UID: %s reloaded, Previous balance: ₱%s, New balance: ₱%s', NEW.card_uid, OLD.balance, NEW.balance);
  ELSIF TG_TABLE_NAME = 'cs_tickets' AND TG_OP = 'INSERT' THEN
    notification_title := 'New CS Ticket';
    notification_message := format('Ticket %s created: %s', NEW.ticket_number, NEW.subject);
    notification_type := 'cs_ticket';
    audit_action := 'CREATE';
    audit_module := 'Customer Service';
    audit_details := format('Ticket: %s, Customer: %s, Type: %s, Priority: %s', NEW.ticket_number, NEW.customer_name, NEW.action_type, NEW.priority);
  ELSIF TG_TABLE_NAME = 'refund_requests' AND TG_OP = 'INSERT' THEN
    notification_title := 'New Refund Request';
    notification_message := format('Refund request %s for ₱%s', NEW.request_number, NEW.amount);
    notification_type := 'refund';
    audit_action := 'CREATE';
    audit_module := 'Refunds';
    audit_details := format('Refund: %s, Amount: ₱%s, Customer: %s', NEW.request_number, NEW.amount, NEW.customer_name);
  ELSE
    RETURN NEW;
  END IF;

  -- Insert into audit logs
  INSERT INTO audit_logs (username, action, module, details)
  VALUES (
    COALESCE(current_username, 'System'),
    audit_action,
    audit_module,
    audit_details
  );

  -- Get all admin staff
  FOR admin_staff IN SELECT id FROM staff_users WHERE role = 'admin' AND is_active = true LOOP
    INSERT INTO staff_notifications (staff_id, title, message, type, related_id, related_table)
    VALUES (
      admin_staff.id,
      notification_title,
      notification_message,
      notification_type,
      COALESCE(NEW.id, OLD.id),
      TG_TABLE_NAME
    );
  END LOOP;

  -- Get all cs_desk staff
  FOR cs_desk_staff IN SELECT id FROM staff_users WHERE role = 'cs_desk' AND is_active = true LOOP
    INSERT INTO staff_notifications (staff_id, title, message, type, related_id, related_table)
    VALUES (
      cs_desk_staff.id,
      notification_title,
      notification_message,
      notification_type,
      COALESCE(NEW.id, OLD.id),
      TG_TABLE_NAME
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create trigger for transactions
DROP TRIGGER IF EXISTS notify_transaction ON transactions;
CREATE TRIGGER notify_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION notify_staff_on_event();

-- Create trigger for qr_cards (issuance and replacement)
DROP TRIGGER IF EXISTS notify_card_change ON qr_cards;
CREATE TRIGGER notify_card_change
  AFTER INSERT OR UPDATE ON qr_cards
  FOR EACH ROW EXECUTE FUNCTION notify_staff_on_event();

-- Create trigger for cs_tickets
DROP TRIGGER IF EXISTS notify_cs_ticket ON cs_tickets;
CREATE TRIGGER notify_cs_ticket
  AFTER INSERT ON cs_tickets
  FOR EACH ROW EXECUTE FUNCTION notify_staff_on_event();

-- Create trigger for refund_requests
DROP TRIGGER IF EXISTS notify_refund_request ON refund_requests;
CREATE TRIGGER notify_refund_request
  AFTER INSERT ON refund_requests
  FOR EACH ROW EXECUTE FUNCTION notify_staff_on_event();

-- ── 18. Row-Level Security ───────────────────────────────────────────────────
ALTER TABLE staff_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_cards              ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporary_tickets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_tickets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_ticket_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_service_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_reservations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fare_matrix            ENABLE ROW LEVEL SECURITY;
ALTER TABLE baggage_fee_matrix     ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_notifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE buses                 ENABLE ROW LEVEL SECURITY;

-- Staff can view their own profile (admins and managers see all)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_users' AND policyname = 'staff_users_self_select'
  ) THEN
    CREATE POLICY "staff_users_self_select"
      ON staff_users FOR SELECT
      USING (id = auth.uid() OR current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- QR cards: read by any authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_cards' AND policyname = 'qr_cards_read_authenticated'
  ) THEN
    CREATE POLICY "qr_cards_read_authenticated"
      ON qr_cards FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_cards' AND policyname = 'qr_cards_delete_authenticated'
  ) THEN
    CREATE POLICY "qr_cards_delete_authenticated"
      ON qr_cards FOR DELETE
      USING (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_cards' AND policyname = 'qr_cards_insert_authenticated'
  ) THEN
    CREATE POLICY "qr_cards_insert_authenticated"
      ON qr_cards FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'qr_cards' AND policyname = 'qr_cards_update_authenticated'
  ) THEN
    CREATE POLICY "qr_cards_update_authenticated"
      ON qr_cards FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Temporary tickets: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'temporary_tickets' AND policyname = 'temp_tickets_rw_authenticated'
  ) THEN
    CREATE POLICY "temp_tickets_rw_authenticated"
      ON temporary_tickets FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Transactions: insert + select for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_insert_authenticated'
  ) THEN
    CREATE POLICY "transactions_insert_authenticated"
      ON transactions FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_select_authenticated'
  ) THEN
    CREATE POLICY "transactions_select_authenticated"
      ON transactions FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_update_authenticated'
  ) THEN
    CREATE POLICY "transactions_update_authenticated"
      ON transactions FOR UPDATE
      USING (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'transactions_delete_authenticated'
  ) THEN
    CREATE POLICY "transactions_delete_authenticated"
      ON transactions FOR DELETE
      USING (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- CS tickets: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cs_tickets' AND policyname = 'cs_tickets_rw_authenticated'
  ) THEN
    CREATE POLICY "cs_tickets_rw_authenticated"
      ON cs_tickets FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- CS ticket notes: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'cs_ticket_notes' AND policyname = 'cs_ticket_notes_rw_authenticated'
  ) THEN
    CREATE POLICY "cs_ticket_notes_rw_authenticated"
      ON cs_ticket_notes FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Customer service logs: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'customer_service_logs' AND policyname = 'cs_logs_rw_authenticated'
  ) THEN
    CREATE POLICY "cs_logs_rw_authenticated"
      ON customer_service_logs FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Card reservations: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'card_reservations' AND policyname = 'card_reservations_rw_authenticated'
  ) THEN
    CREATE POLICY "card_reservations_rw_authenticated"
      ON card_reservations FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Refund requests: full access for authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'refund_requests' AND policyname = 'refund_requests_rw_authenticated'
  ) THEN
    CREATE POLICY "refund_requests_rw_authenticated"
      ON refund_requests FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

-- Fare matrix: read for all, update for admin/manager
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fare_matrix' AND policyname = 'fare_matrix_read_authenticated'
  ) THEN
    CREATE POLICY "fare_matrix_read_authenticated"
      ON fare_matrix FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fare_matrix' AND policyname = 'fare_matrix_update_admin'
  ) THEN
    CREATE POLICY "fare_matrix_update_admin"
      ON fare_matrix FOR ALL
      USING (current_user_role() IN ('admin', 'manager'))
      WITH CHECK (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- Baggage fee matrix: read for all, update for admin/manager
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'baggage_fee_matrix' AND policyname = 'baggage_fee_matrix_read_authenticated'
  ) THEN
    CREATE POLICY "baggage_fee_matrix_read_authenticated"
      ON baggage_fee_matrix FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'baggage_fee_matrix' AND policyname = 'baggage_fee_matrix_update_admin'
  ) THEN
    CREATE POLICY "baggage_fee_matrix_update_admin"
      ON baggage_fee_matrix FOR ALL
      USING (current_user_role() IN ('admin', 'manager'))
      WITH CHECK (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- System config (read-only for authenticated, admin/manager can update)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'system_config' AND policyname = 'system_config_select_authenticated'
  ) THEN
    CREATE POLICY "system_config_select_authenticated"
      ON system_config FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'system_config' AND policyname = 'system_config_update_admin'
  ) THEN
    CREATE POLICY "system_config_update_admin"
      ON system_config FOR UPDATE
      USING (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- Staff notifications (users can only read their own notifications)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_notifications' AND policyname = 'staff_notifications_select_own'
  ) THEN
    CREATE POLICY "staff_notifications_select_own"
      ON staff_notifications FOR SELECT
      USING (staff_id = auth.uid() OR current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_notifications' AND policyname = 'staff_notifications_insert_own'
  ) THEN
    CREATE POLICY "staff_notifications_insert_own"
      ON staff_notifications FOR INSERT
      WITH CHECK (staff_id = auth.uid() OR current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_notifications' AND policyname = 'staff_notifications_update_own'
  ) THEN
    CREATE POLICY "staff_notifications_update_own"
      ON staff_notifications FOR UPDATE
      USING (staff_id = auth.uid() OR current_user_role() IN ('admin', 'manager'))
      WITH CHECK (staff_id = auth.uid() OR current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'staff_notifications' AND policyname = 'staff_notifications_delete_own'
  ) THEN
    CREATE POLICY "staff_notifications_delete_own"
      ON staff_notifications FOR DELETE
      USING (staff_id = auth.uid() OR current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- Audit logs: read for admin/manager only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'audit_logs' AND policyname = 'audit_logs_select_admin'
  ) THEN
    CREATE POLICY "audit_logs_select_admin"
      ON audit_logs FOR SELECT
      USING (current_user_role() IN ('admin', 'manager'));
  END IF;
END $$;

-- Buses: read for all authenticated staff
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'buses' AND policyname = 'buses_read_authenticated'
  ) THEN
    CREATE POLICY "buses_read_authenticated"
      ON buses FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- ── 19. Indexes for Performance ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_qr_cards_uid ON qr_cards(card_uid);
CREATE INDEX IF NOT EXISTS idx_qr_cards_status ON qr_cards(status);
CREATE INDEX IF NOT EXISTS idx_qr_cards_owner_name ON qr_cards(owner_name);
CREATE INDEX IF NOT EXISTS idx_qr_cards_contact_number ON qr_cards(contact_number);

CREATE INDEX IF NOT EXISTS idx_temp_tickets_uid ON temporary_tickets(ticket_uid);
CREATE INDEX IF NOT EXISTS idx_temp_tickets_status ON temporary_tickets(status);

CREATE INDEX IF NOT EXISTS idx_transactions_card_id ON transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_transactions_temp_ticket_id ON transactions(temp_ticket_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs_tickets_number ON cs_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_status ON cs_tickets(status);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_priority ON cs_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_action_type ON cs_tickets(action_type);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_assigned_to ON cs_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_customer_contact ON cs_tickets(customer_contact);
CREATE INDEX IF NOT EXISTS idx_cs_tickets_created_at ON cs_tickets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cs_ticket_notes_ticket_id ON cs_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_cs_ticket_notes_staff_id ON cs_ticket_notes(staff_id);

CREATE INDEX IF NOT EXISTS idx_customer_service_logs_ticket_id ON customer_service_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_service_logs_handled_by ON customer_service_logs(handled_by);

CREATE INDEX IF NOT EXISTS idx_card_reservations_reservation_id ON card_reservations(reservation_id);
CREATE INDEX IF NOT EXISTS idx_card_reservations_status ON card_reservations(status);
CREATE INDEX IF NOT EXISTS idx_card_reservations_contact ON card_reservations(contact);

CREATE INDEX IF NOT EXISTS idx_refund_requests_number ON refund_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_transaction_id ON refund_requests(transaction_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_card_id ON refund_requests(card_id);

CREATE INDEX IF NOT EXISTS idx_fare_matrix_route ON fare_matrix(route_from, route_to);
CREATE INDEX IF NOT EXISTS idx_baggage_fee_matrix_category ON baggage_fee_matrix(category);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_username ON audit_logs(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);

-- ── 20. Views for Customer Service ─────────────────────────────────────────────
CREATE OR REPLACE VIEW cs_ticket_summary AS
SELECT 
  cs.id,
  cs.ticket_number,
  cs.customer_name,
  cs.customer_contact,
  cs.action_type,
  cs.priority,
  cs.status,
  cs.subject,
  cs.assigned_to,
  su.full_name as assigned_to_name,
  cs.created_at,
  cs.updated_at,
  cs.resolved_at,
  CASE 
    WHEN cs.status = 'open' THEN 0
    WHEN cs.status = 'in_progress' THEN 1
    WHEN cs.status = 'resolved' THEN 2
    WHEN cs.status = 'closed' THEN 3
    WHEN cs.status = 'escalated' THEN 4
  END as status_order,
  CASE 
    WHEN cs.priority = 'urgent' THEN 0
    WHEN cs.priority = 'high' THEN 1
    WHEN cs.priority = 'medium' THEN 2
    WHEN cs.priority = 'low' THEN 3
  END as priority_order
FROM cs_tickets cs
LEFT JOIN staff_users su ON cs.assigned_to = su.id;

CREATE OR REPLACE VIEW card_balance_summary AS
SELECT 
  qc.id,
  qc.card_uid,
  qc.owner_name,
  qc.contact_number,
  qc.balance,
  qc.status,
  qc.card_type,
  qc.issued_at,
  qc.expires_at,
  COUNT(t.id) as transaction_count,
  MAX(t.created_at) as last_transaction_at
FROM qr_cards qc
LEFT JOIN transactions t ON qc.id = t.card_id
GROUP BY qc.id;

CREATE OR REPLACE VIEW refund_request_summary AS
SELECT 
  rr.id,
  rr.request_number,
  rr.customer_name,
  rr.customer_contact,
  rr.amount,
  rr.reason,
  rr.status,
  rr.created_at,
  rr.processed_at,
  su.full_name as approved_by_name
FROM refund_requests rr
LEFT JOIN staff_users su ON rr.approved_by = su.id;

-- ── 21. Realtime Publications ─────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'cs_tickets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cs_tickets;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'staff_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE staff_notifications;
  END IF;
END $$;

-- ============================================================
-- Schema complete.
-- ============================================================

-- ── 22. Seed: Fare Matrix Data ─────────────────────────────────────────────────
INSERT INTO fare_matrix (route_from, route_to, km_distance, regular_fare, discounted_fare) VALUES
  ('Agora Terminal', 'Puerto', 13, 34.75, 27.75),
  ('Agora Terminal', 'Ba-e', 16, 41.50, 33.00),
  ('Agora Terminal', 'Mambatangan', 20, 50.25, 40.25),
  ('Agora Terminal', 'Maitom', 24, 59.00, 47.25),
  ('Agora Terminal', 'Ala-e', 26, 63.50, 50.75),
  ('Agora Terminal', 'Lonocan', 27, 65.50, 52.50),
  ('Agora Terminal', 'San Miguel', 31, 74.50, 59.50),
  ('Agora Terminal', 'Diclum', 35, 83.25, 66.50),
  ('Agora Terminal', 'Manolo Fortich', 36, 85.50, 68.25),
  ('Puerto', 'Agora Terminal', 13, 34.75, 27.75),
  ('Ba-e', 'Agora Terminal', 16, 41.50, 33.00),
  ('Mambatangan', 'Agora Terminal', 20, 50.25, 40.25),
  ('Maitom', 'Agora Terminal', 24, 59.00, 47.25),
  ('Ala-e', 'Agora Terminal', 26, 63.50, 50.75),
  ('Lonocan', 'Agora Terminal', 27, 65.50, 52.50),
  ('San Miguel', 'Agora Terminal', 31, 74.50, 59.50),
  ('Diclum', 'Agora Terminal', 35, 83.25, 66.50),
  ('Manolo Fortich', 'Agora Terminal', 36, 85.50, 68.25)
ON CONFLICT (route_from, route_to) DO NOTHING;

-- ── 23. Seed: Baggage Fee Matrix Data ─────────────────────────────────────────
INSERT INTO baggage_fee_matrix (category, max_weight_kg, fee, remarks) VALUES
  ('Free Carry-on', 7, 0, 'Included in passenger fare'),
  ('Small', 10, 20, 'Fits under seat or overhead area'),
  ('Medium', 20, 40, 'Stored in baggage compartment'),
  ('Large', 30, 60, 'Requires larger storage space'),
  ('Oversized', 31, 100, 'Subject to conductor approval')
ON CONFLICT DO NOTHING;

-- ── 24. Seed: Test Bus Data ───────────────────────────────────────────────────
INSERT INTO buses (plate_number, bus_number, route, status) VALUES
  ('BUS-001', 1001, 'Manalo Fortich Terminal ↔ Agora Terminal', 'active')
ON CONFLICT (plate_number) DO UPDATE SET
  bus_number = EXCLUDED.bus_number,
  route = EXCLUDED.route,
  status = EXCLUDED.status;

-- ── 25. Create Admin Test User Instructions ─────────────────────────────────────
-- To create test users, follow these steps in the Supabase Dashboard:
--
-- 1. Go to Supabase Dashboard → Authentication → Users → Add user
-- 2. Email: admin@commutai.test  Password: Admin123!  Auto-confirm: Yes
-- 3. Copy the user UUID from the users table, then run:
--
--    INSERT INTO staff_users (id, full_name, email, role, is_active)
--    VALUES (
--      '<paste-uuid-here>',
--      'System Admin',
--      'admin@commutai.test',
--      'admin',
--      true
--    );
--
-- 4. Repeat for CS Desk:
--    Email: csdesk@commutai.test  Password: CSDesk123!
--    Role: cs_desk
--
-- 5. Repeat for Manager:
--    Email: manager@commutai.test  Password: Manager123!
--    Role: manager
