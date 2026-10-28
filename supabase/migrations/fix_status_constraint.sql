-- Fix: Add 'permanently_failed' to the status constraint
-- Run this in Supabase SQL Editor

ALTER TABLE sms_queue
DROP CONSTRAINT IF EXISTS sms_queue_status_check;

ALTER TABLE sms_queue
ADD CONSTRAINT sms_queue_status_check
CHECK (status IN ('pending', 'sent', 'failed', 'cancelled', 'permanently_failed'));
