-- Add id_file column to qr_cards table
-- This stores the ID document (Base64 encoded) for Student, PWD, and Senior Citizen cards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'qr_cards' AND column_name = 'id_file'
  ) THEN
    ALTER TABLE qr_cards ADD COLUMN id_file TEXT;
  END IF;
END $$;
