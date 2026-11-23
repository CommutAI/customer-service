-- Fix: Allow Customer Service app to update, claim, and cancel card reservations
-- Run this script in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Ensure RLS policies on card_reservations allow UPDATE and DELETE for the app
DO $$
BEGIN
  -- Drop old/duplicate policies if they exist
  DROP POLICY IF EXISTS "card_reservations_anon_update" ON public.card_reservations;
  DROP POLICY IF EXISTS "card_reservations_anon_delete" ON public.card_reservations;
  DROP POLICY IF EXISTS "card_reservations_public_update" ON public.card_reservations;
  DROP POLICY IF EXISTS "card_reservations_public_delete" ON public.card_reservations;

  -- Create UPDATE policy (allows updating status to approved, claimed, cancelled, expired)
  CREATE POLICY "card_reservations_public_update" ON public.card_reservations
    FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

  -- Create DELETE policy
  CREATE POLICY "card_reservations_public_delete" ON public.card_reservations
    FOR DELETE
    TO public
    USING (true);

  RAISE NOTICE 'Card reservations policies updated successfully!';
END $$;

-- 2. Verify policies on card_reservations
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'card_reservations';
