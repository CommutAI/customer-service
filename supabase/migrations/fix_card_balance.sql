-- Fix card balance manually
-- Run this in Supabase SQL Editor
-- Replace 'RC-XXX-XX-XXX' with the actual card UID

UPDATE qr_cards
SET balance = 200
WHERE card_uid = 'RC-XXX-XX-XXX';

-- Verify the update
SELECT card_uid, owner_name, balance
FROM qr_cards
WHERE card_uid = 'RC-XXX-XX-XXX';
