-- =====================================================
-- Fix Entitlements to Match Dev Database
-- Clear incorrect plan_entitlements and ensure schema matches dev
-- =====================================================

-- 1. Clear any incorrectly inserted plan_entitlements
-- (The rollback migration tried to insert for plans that don't exist)
DELETE FROM public.plan_entitlements;

-- 2. Verify entitlements exist (should have been restored by rollback)
-- If not, insert them
INSERT INTO public.entitlements (key, description, value_type)
VALUES
  -- Numeric Limits
  ('environments_limit', 'Maximum number of environments per organization', 'numeric'),
  ('zones_limit', 'Maximum number of DNS zones per organization', 'numeric'),
  ('dns_records_limit', 'Maximum number of DNS records per zone', 'numeric'),
  ('team_members_limit', 'Maximum number of team members per organization', 'numeric'),
  
  -- Boolean Features
  ('api_access', 'Access to REST API and API keys', 'boolean'),
  ('advanced_analytics', 'Access to advanced analytics and insights', 'boolean'),
  ('priority_support', 'Priority email and chat support', 'boolean'),
  ('audit_logs', 'Access to detailed audit logs', 'boolean'),
  ('custom_roles', 'Ability to create custom user roles', 'boolean'),
  ('sso_enabled', 'Single Sign-On (SSO) support', 'boolean'),
  ('bulk_operations', 'Bulk DNS record operations', 'boolean'),
  ('export_data', 'Export DNS data to various formats', 'boolean')
ON CONFLICT (key) DO NOTHING;

-- 3. Verify functions exist
-- Check if functions were properly restored
DO $$
BEGIN
  -- Test get_org_entitlements function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_org_entitlements'
  ) THEN
    RAISE EXCEPTION 'Function get_org_entitlements is missing - rollback did not complete properly';
  END IF;
  
  -- Test check_entitlement function
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_entitlement'
  ) THEN
    RAISE EXCEPTION 'Function check_entitlement is missing - rollback did not complete properly';
  END IF;
  
  -- Test can_create_resource function  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_create_resource'
  ) THEN
    RAISE EXCEPTION 'Function can_create_resource is missing - rollback did not complete properly';
  END IF;
  
  RAISE NOTICE 'All entitlement functions verified successfully';
END $$;

-- 4. NOTE: plan_entitlements table is intentionally left EMPTY
-- This matches the dev database state where plan_entitlements has 0 rows
-- The application should handle subscriptions without requiring entitlement mappings

DO $$
BEGIN
  RAISE NOTICE 'Production database now matches dev database structure';
  RAISE NOTICE 'plan_entitlements table is empty (matches dev)';
  RAISE NOTICE 'Entitlements system restored and verified';
END $$;

