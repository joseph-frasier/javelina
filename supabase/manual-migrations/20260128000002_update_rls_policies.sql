-- Update RLS Policies Documentation for Auth0 Integration
-- This migration documents how RLS policies work with the hybrid auth model

-- =====================================================
-- HYBRID AUTH MODEL EXPLANATION
-- =====================================================
-- This database now supports TWO authentication methods:
--
-- 1. SUPABASE AUTH (existing users)
--    - User exists in auth.users with UUID
--    - User exists in profiles with SAME UUID
--    - auth.uid() returns the user's UUID
--    - RLS policies work normally with auth.uid()
--
-- 2. AUTH0 (new users)
--    - User does NOT exist in auth.users
--    - User exists in profiles with auto-generated UUID
--    - profiles.auth0_user_id stores Auth0 identifier
--    - Backend API uses service role key (bypasses RLS)
--    - auth.uid() returns NULL for these users
--
-- IMPORTANT: Auth0 users access data via Express backend API
-- which uses SUPABASE_SERVICE_ROLE_KEY. This bypasses RLS entirely.
-- All authorization is handled at the API level using RBAC middleware.
--
-- Supabase Auth users continue to use RLS policies as before.
-- =====================================================

-- =====================================================
-- RLS POLICY REVIEW
-- =====================================================
-- All existing RLS policies use auth.uid() and continue to work:
--
-- ✅ profiles: auth.uid() = id
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ organizations: owner_id = auth.uid() OR member check
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ organization_members: user_id = auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ zones: organization member check with auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ zone_records: organization member check with auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ audit_logs: user_id = auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ subscriptions: organization member check with auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- ✅ tags: organization member check with auth.uid()
--    - Works for Supabase Auth users
--    - Auth0 users access via backend API
--
-- NO POLICY CHANGES NEEDED!
-- RLS policies remain unchanged and work correctly for both:
-- - Supabase Auth users (via auth.uid())
-- - Auth0 users (via backend service role key)
-- =====================================================

-- =====================================================
-- SUPERADMIN BYPASS
-- =====================================================
-- SuperAdmin users (profiles.superadmin = true) have global access
-- This is enforced at the backend API level, not via RLS
-- SuperAdmins use the same auth methods as regular users:
-- - Supabase Auth: RLS applies normally, backend grants elevated access
-- - Auth0: Backend API grants elevated access via RBAC middleware
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS POLICIES REVIEW COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'No policy changes required for Auth0 integration';
  RAISE NOTICE '';
  RAISE NOTICE 'Auth Model:';
  RAISE NOTICE '  - Supabase Auth users: auth.uid() + RLS';
  RAISE NOTICE '  - Auth0 users: Backend API + Service Role Key';
  RAISE NOTICE '';
  RAISE NOTICE 'All existing RLS policies continue to work correctly';
  RAISE NOTICE 'Foreign keys now reference profiles.id for both auth types';
END $$;
