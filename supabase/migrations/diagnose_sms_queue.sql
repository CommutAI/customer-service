-- Diagnostic: Check sms_queue table structure
-- Run this in Supabase SQL Editor to see the actual table structure

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'sms_queue'
ORDER BY ordinal_position;

-- Check existing data
SELECT * FROM sms_queue ORDER BY created_at DESC LIMIT 5;
