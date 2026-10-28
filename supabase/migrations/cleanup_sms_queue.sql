-- Cleanup: Remove old schema columns from sms_queue
-- These columns are deprecated and no longer used

DO $$
BEGIN
  -- Remove deprecated columns if they exist
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'type'
  ) THEN
    ALTER TABLE sms_queue DROP COLUMN type;
    RAISE NOTICE 'Dropped deprecated column: type';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'priority'
  ) THEN
    ALTER TABLE sms_queue DROP COLUMN priority;
    RAISE NOTICE 'Dropped deprecated column: priority';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'related_id'
  ) THEN
    ALTER TABLE sms_queue DROP COLUMN related_id;
    RAISE NOTICE 'Dropped deprecated column: related_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'retry_count'
  ) THEN
    ALTER TABLE sms_queue DROP COLUMN retry_count;
    RAISE NOTICE 'Dropped deprecated column: retry_count';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'max_retries'
  ) THEN
    ALTER TABLE sms_queue DROP COLUMN max_retries;
    RAISE NOTICE 'Dropped deprecated column: max_retries';
  END IF;

  -- Rename attempts to retry_count if it exists (for consistency with processor)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sms_queue' AND column_name = 'attempts'
  ) THEN
    ALTER TABLE sms_queue RENAME COLUMN attempts TO retry_count;
    RAISE NOTICE 'Renamed attempts to retry_count';
  END IF;

  RAISE NOTICE 'Cleanup completed successfully';
END $$;
