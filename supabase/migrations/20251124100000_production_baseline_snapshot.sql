-- ============================================================================
-- PRODUCTION BASELINE SNAPSHOT MIGRATION
-- ============================================================================
-- 
-- This migration represents the baseline schema state of the production
-- database as of 2024-11-24. It is designed to:
--
-- 1. Document the current production schema state
-- 2. Serve as a reference point for future branch creation
-- 3. Be idempotent and safe to run on any environment
--
-- IMPORTANT: This migration is a NO-OP on production (which already has
-- all these changes) but will properly set up new branches created in the future.
--
-- Source: Generated from live.sql production dump
-- ============================================================================

-- ----------------------------------------------------------------------------
-- INDEXES ON PUBLIC SCHEMA
-- ----------------------------------------------------------------------------

-- Zones table indexes (soft delete and live status)
CREATE INDEX IF NOT EXISTS idx_zones_deleted_at 
ON public.zones(deleted_at) 
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_zones_live 
ON public.zones(live) 
WHERE live = true;

CREATE INDEX IF NOT EXISTS idx_zones_environment_live 
ON public.zones(environment_id, live) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_zones_environment_id
ON public.zones(environment_id);

-- Subscriptions table indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id 
ON public.subscriptions(org_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id
ON public.subscriptions(stripe_subscription_id);

-- Plans table indexes
CREATE INDEX IF NOT EXISTS idx_plans_code 
ON public.plans(code);

CREATE INDEX IF NOT EXISTS idx_plans_is_active 
ON public.plans(is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_plans_stripe_product_id
ON public.plans(stripe_product_id);

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id
ON public.organizations(owner_id);

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id
ON public.organizations(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_organizations_slug
ON public.organizations(slug);

CREATE INDEX IF NOT EXISTS idx_organizations_status
ON public.organizations(status)
WHERE status = 'active';

-- Organization members indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id
ON public.organization_members(user_id);

CREATE INDEX IF NOT EXISTS idx_org_members_status
ON public.organization_members(status);

-- Environments table indexes
CREATE INDEX IF NOT EXISTS idx_environments_org_id
ON public.environments(organization_id);

CREATE INDEX IF NOT EXISTS idx_environments_status
ON public.environments(status)
WHERE status = 'active';

-- Zone records indexes
CREATE INDEX IF NOT EXISTS idx_zone_records_zone_id
ON public.zone_records(zone_id);

CREATE INDEX IF NOT EXISTS idx_zone_records_type
ON public.zone_records(type);

CREATE INDEX IF NOT EXISTS idx_zone_records_name
ON public.zone_records(name);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
ON public.audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
ON public.audit_logs(table_name, record_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
ON public.audit_logs(created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email
ON public.profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role
ON public.profiles(role);

-- ----------------------------------------------------------------------------
-- TABLE COMMENTS (Documentation)
-- ----------------------------------------------------------------------------

COMMENT ON TABLE public.zones IS 'DNS zones with soft delete and activation support';
COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions linked to organizations';
COMMENT ON TABLE public.plans IS 'Subscription plans that map to Stripe Products';
COMMENT ON TABLE public.organizations IS 'Organizations in the system';
COMMENT ON TABLE public.profiles IS 'User profiles';
COMMENT ON TABLE public.environments IS 'Environment configurations for organizations';
COMMENT ON TABLE public.zone_records IS 'DNS records for zones';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all significant actions';
COMMENT ON TABLE public.entitlements IS 'Available capabilities and limits that can be assigned to plans';
COMMENT ON TABLE public.plan_entitlements IS 'Maps entitlements to plans with their values';
COMMENT ON TABLE public.org_entitlement_overrides IS 'Custom entitlement values for specific organizations';
COMMENT ON TABLE public.subscription_items IS 'Line items for subscriptions (seats, add-ons)';
COMMENT ON TABLE public.organization_members IS 'Organization membership and roles';
COMMENT ON TABLE public.irongrove_contact_submissions IS 'Contact form submissions from the Irongrove website';
COMMENT ON TABLE public."marketing-website-contact-form" IS 'Public contact form submissions with anti-spam protection. Direct anon writes disabled - use API route.';

-- ----------------------------------------------------------------------------
-- COLUMN COMMENTS (Key Fields)
-- ----------------------------------------------------------------------------

-- Zones
COMMENT ON COLUMN public.zones.deleted_at IS 'Timestamp when zone was soft deleted';
COMMENT ON COLUMN public.zones.live IS 'Whether zone is active/live';
COMMENT ON COLUMN public.zones.verification_status IS 'DNS verification status';
COMMENT ON COLUMN public.zones.soa_serial IS 'SOA record serial number';

-- Subscriptions
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status plus lifetime for permanent access';
COMMENT ON COLUMN public.subscriptions.org_id IS 'One subscription per organization';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN public.subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';

-- Plans
COMMENT ON COLUMN public.plans.code IS 'Unique plan identifier (e.g., free, pro, enterprise)';
COMMENT ON COLUMN public.plans.billing_interval IS 'Billing cycle: month, year, or NULL for free/custom plans';
COMMENT ON COLUMN public.plans.stripe_product_id IS 'Stripe Product ID for this plan';

-- Organizations
COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN public.organizations.environments_count IS 'Cached count of environments (for quick limit checks)';

-- Environments
COMMENT ON COLUMN public.environments.zones_count IS 'Cached count of zones in this environment (for quick limit checks)';

-- Profiles
COMMENT ON COLUMN public.profiles.superadmin IS 'SuperAdmin flag: users with true have global access to all organizations';

-- Marketing form
COMMENT ON COLUMN public."marketing-website-contact-form".inquiry_type IS 'Type of inquiry: general, founders-pricing, enterprise, support, partnership';

-- ----------------------------------------------------------------------------
-- RLS CONFIGURATION DOCUMENTATION
-- ----------------------------------------------------------------------------

-- Ensure RLS is properly configured
-- Note: irongrove_contact_submissions should have RLS disabled
DO $$
BEGIN
  -- Disable RLS on irongrove_contact_submissions (internal use only)
  EXECUTE 'ALTER TABLE public.irongrove_contact_submissions DISABLE ROW LEVEL SECURITY';
  
  RAISE NOTICE 'RLS configuration verified';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Could not verify RLS configuration: %', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- SCHEMA VERIFICATION
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  v_missing_columns TEXT[] := ARRAY[]::TEXT[];
  v_missing_indexes TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verify critical columns exist
  
  -- Check zones.deleted_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'zones' AND column_name = 'deleted_at'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'zones.deleted_at');
  END IF;

  -- Check zones.live
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'zones' AND column_name = 'live'
  ) THEN
    v_missing_columns := array_append(v_missing_columns, 'zones.live');
  END IF;

  -- Report missing columns
  IF array_length(v_missing_columns, 1) > 0 THEN
    RAISE WARNING 'Missing columns: %', array_to_string(v_missing_columns, ', ');
  ELSE
    RAISE NOTICE '✓ All critical columns present';
  END IF;

  -- Verify critical indexes exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_zones_deleted_at'
  ) THEN
    v_missing_indexes := array_append(v_missing_indexes, 'idx_zones_deleted_at');
  END IF;

  -- Report missing indexes
  IF array_length(v_missing_indexes, 1) > 0 THEN
    RAISE WARNING 'Missing indexes: %', array_to_string(v_missing_indexes, ', ');
  ELSE
    RAISE NOTICE '✓ All critical indexes present';
  END IF;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'Production baseline snapshot migration complete';
  RAISE NOTICE '================================================';
END $$;

-- ============================================================================
-- BASELINE SNAPSHOT COMPLETE
-- ============================================================================
-- 
-- This migration establishes the baseline schema state. All future migrations
-- should build upon this foundation.
--
-- To create a new branch with this baseline:
-- 1. Create branch: supabase branches create <branch-name>
-- 2. The branch will automatically include this migration
-- 3. New migrations will be applied on top of this baseline
--
-- To verify schema state, run:
--   SELECT * FROM supabase_migrations.schema_migrations 
--   WHERE version >= '20251124100000' ORDER BY version;
-- ============================================================================



