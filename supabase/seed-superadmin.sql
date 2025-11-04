-- =====================================================
-- Promote existing user to SuperAdmin
-- =====================================================
-- This script helps set up a superadmin user for testing
-- 
-- IMPORTANT: You must first create a regular user account through
-- the normal signup process or Supabase dashboard, then run this
-- script to promote them to superadmin.
--
-- Example: If you created admin@irongrove.com with password admin123,
-- update the email below and run this script.
-- =====================================================

-- Update the email below to match your test user
DO $$
DECLARE
  admin_email TEXT := 'admin@irongrove.com'; -- Change this to your test user's email
  user_profile_id UUID;
BEGIN
  -- Find the user's profile ID from their email
  SELECT id INTO user_profile_id
  FROM public.profiles
  WHERE email = admin_email;

  IF user_profile_id IS NULL THEN
    RAISE NOTICE 'User with email % not found. Please create this user first through signup or Supabase dashboard.', admin_email;
  ELSE
    -- Update the user's profile to be a superadmin
    UPDATE public.profiles
    SET superadmin = true
    WHERE id = user_profile_id;
    
    RAISE NOTICE 'User % (ID: %) has been promoted to SuperAdmin', admin_email, user_profile_id;
  END IF;
END $$;

-- Verify superadmins
SELECT id, email, name, superadmin, created_at
FROM public.profiles
WHERE superadmin = true;

