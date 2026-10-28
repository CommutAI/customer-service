-- SMS Queue Table
-- This table stores SMS messages to be sent by the Raspberry Pi service

CREATE TABLE IF NOT EXISTS sms_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL, -- 'topup', 'card_claim', 'card_expiration', 'reservation_status'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  metadata JSONB DEFAULT '{}',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  attempts INTEGER DEFAULT 0
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_queue_status ON sms_queue(status);
CREATE INDEX IF NOT EXISTS idx_sms_queue_created_at ON sms_queue(created_at);

-- Enable Row Level Security
ALTER TABLE sms_queue ENABLE ROW LEVEL SECURITY;

-- Allow service role to insert and update
CREATE POLICY "Service role can manage sms_queue"
  ON sms_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert (for frontend)
CREATE POLICY "Authenticated users can insert sms_queue"
  ON sms_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to read (for debugging)
CREATE POLICY "Authenticated users can read sms_queue"
  ON sms_queue
  FOR SELECT
  TO authenticated
  USING (true);
