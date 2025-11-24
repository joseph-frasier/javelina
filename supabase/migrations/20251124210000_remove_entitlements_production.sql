-- =====================================================
-- Remove Entitlements System
-- =====================================================
-- This migration removes the entitlements system in favor
-- of Launch Darkly feature flags.
--
-- Order:
-- 1. Drop functions that depend on tables
-- 2. Drop tables (CASCADE will handle remaining dependencies)
-- =====================================================

-- Drop functions that use entitlement tables
DROP FUNCTION IF EXISTS get_org_entitlements(uuid) CASCADE;
DROP FUNCTION IF EXISTS check_entitlement(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS can_create_resource(uuid, text) CASCADE;

-- Drop entitlement tables (CASCADE handles foreign keys)
DROP TABLE IF EXISTS org_entitlement_overrides CASCADE;
DROP TABLE IF EXISTS plan_entitlements CASCADE;
DROP TABLE IF EXISTS entitlements CASCADE;

-- Note: plans and subscriptions tables remain intact

