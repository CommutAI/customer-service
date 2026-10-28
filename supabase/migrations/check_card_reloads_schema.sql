-- Check if card_reloads table exists
-- Run this in Supabase SQL Editor

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'card_reloads'
ORDER BY ordinal_position;
