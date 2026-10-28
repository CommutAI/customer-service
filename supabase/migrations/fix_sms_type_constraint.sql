-- Fix: Update sms_type constraint to include all SMS types
-- Run this in Supabase SQL Editor

ALTER TABLE sms_queue
DROP CONSTRAINT IF EXISTS sms_queue_sms_type_check;

ALTER TABLE sms_queue
ADD CONSTRAINT sms_queue_sms_type_check
CHECK (sms_type IN (
  'card_reserved',
  'card_approved',
  'card_claimed',
  'card_expiration',
  'fare_validation',
  'reservation_status',
  'topup',
  'emergency',
  'alighting',
  'other',
  'admin',
  'test',
  'reservation_confirmation',
  'card_declined',
  'emergency_bus',
  'trip_completion'
));
