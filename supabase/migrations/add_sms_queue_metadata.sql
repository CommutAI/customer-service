-- Migration: Add metadata column to sms_queue table
-- This migration adds the metadata column needed for the SMS notification system

-- Add metadata column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE sms_queue ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Ensure sms_type column exists (rename from 'type' if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'sms_type'
  ) THEN
    -- If 'type' column exists, rename it to sms_type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'sms_queue' AND column_name = 'type'
    ) THEN
      ALTER TABLE sms_queue RENAME COLUMN type TO sms_type;
    ELSE
      -- Otherwise add the column
      ALTER TABLE sms_queue ADD COLUMN sms_type TEXT NOT NULL DEFAULT 'other';
    END IF;
  END IF;
END $$;

-- Remove restrictive check constraint on sms_type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sms_queue_type_check'
  ) THEN
    ALTER TABLE sms_queue DROP CONSTRAINT sms_queue_type_check;
  END IF;
END $$;
