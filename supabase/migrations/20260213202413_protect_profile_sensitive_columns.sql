-- ================================================================
-- Migration: Prevent superadmin/role self-escalation via profiles
-- ================================================================
-- CRITICAL FIX: The profiles table UPDATE RLS policy is auth.uid() = id,
-- allowing any authenticated user to update ALL columns on their own row.
-- Column-level grants confirm authenticated/anon have UPDATE on every
-- column including superadmin, role, status, and email_verified.
--
-- Attack: supabase.from('profiles').update({ superadmin: true }).eq('id', userId)
--
-- Fix: Two-layer defense:
--   1. BEFORE UPDATE trigger rejects changes to protected columns
--      unless the caller is service_role (backend).
--   2. Column-level grant revocation as defense-in-depth.
-- ================================================================


-- =====================================================
-- LAYER 1: BEFORE UPDATE trigger on profiles
-- =====================================================

CREATE OR REPLACE FUNCTION public.protect_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow service_role (backend) and direct DB connections to update any column.
  -- PostgREST sets 'request.jwt.claim.role' from the JWT; for service_role
  -- calls this is 'service_role'. For direct DB / migration / trigger chains
  -- the setting may not exist (NULL). We only block authenticated/anon.
  IF COALESCE(current_setting('request.jwt.claim.role', true), 'service_role')
     NOT IN ('service_role') THEN

    IF NEW.superadmin IS DISTINCT FROM OLD.superadmin THEN
      RAISE EXCEPTION 'Forbidden: cannot modify superadmin flag via client API'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Forbidden: cannot modify role via client API'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Forbidden: cannot modify status via client API'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
      RAISE EXCEPTION 'Forbidden: cannot modify email_verified via client API'
        USING ERRCODE = '42501';
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_sensitive_columns();


-- =====================================================
-- LAYER 2: Column-level grant revocation (defense-in-depth)
-- =====================================================
-- Revoke table-level UPDATE, then re-grant only on safe columns.
-- This ensures even if the trigger is somehow bypassed, the column
-- grants prevent modification of sensitive fields.

-- Step 1: Revoke table-level UPDATE (removes UPDATE on ALL columns)
REVOKE UPDATE ON public.profiles FROM authenticated;
REVOKE UPDATE ON public.profiles FROM anon;

-- Step 2: Re-grant UPDATE on safe (user-editable) columns only
GRANT UPDATE (
  name,
  display_name,
  title,
  phone,
  timezone,
  bio,
  avatar_url,
  preferences,
  onboarding_completed,
  notification_preferences,
  language
) ON public.profiles TO authenticated;

-- anon should not be able to update profiles at all
-- (RLS blocks it anyway since there's no INSERT/UPDATE policy for anon,
-- but belt-and-suspenders: don't grant UPDATE to anon)


-- =====================================================
-- VERIFICATION COMMENT
-- =====================================================
-- Protected columns (NOT granted to authenticated):
--   superadmin, role, status, email_verified,
--   id, email, created_at, updated_at, last_login,
--   mfa_enabled, sso_connected, auth0_user_id
--
-- These can only be modified by service_role (backend)
-- or postgres (migrations/admin).
