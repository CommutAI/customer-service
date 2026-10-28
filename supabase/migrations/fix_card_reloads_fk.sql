-- Fix card_reloads foreign key constraint
-- Run this in Supabase SQL Editor

-- Drop the incorrect foreign key constraint
ALTER TABLE card_reloads
DROP CONSTRAINT IF EXISTS card_reloads_card_id_fkey;

-- Add the correct foreign key constraint pointing to qr_cards
ALTER TABLE card_reloads
ADD CONSTRAINT card_reloads_card_id_fkey
FOREIGN KEY (card_id)
REFERENCES qr_cards(id)
ON DELETE CASCADE;

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraint fixed: card_reloads.card_id now references qr_cards.id';
END $$;
