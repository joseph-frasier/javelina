-- =====================================================
-- Remove Entitlements System
-- Dropping entitlement tables and functions in preparation for Launch Darkly
-- =====================================================

-- Drop database functions first (with CASCADE to handle dependencies)
DROP FUNCTION IF EXISTS public.can_create_resource(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.check_entitlement(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_org_entitlements(UUID) CASCADE;

-- Drop entitlement-related tables (with CASCADE for foreign keys)
DROP TABLE IF EXISTS public.org_entitlement_overrides CASCADE;
DROP TABLE IF EXISTS public.plan_entitlements CASCADE;
DROP TABLE IF EXISTS public.entitlements CASCADE;

-- Note: plans and subscriptions tables are preserved
-- Organizations can still have subscriptions, but entitlements will be managed by Launch Darkly

