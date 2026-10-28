-- Check transactions table schema
-- Run this in Supabase SQL Editor

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
