-- ============================================================================
-- BASELINE SCHEMA SYNC MIGRATION
-- ============================================================================
-- This migration ensures the production database schema matches the dev branch
-- after manual schema changes and drift resolution.
-- 
-- Created: 2024-11-24
-- Purpose: Consolidate schema changes for zones, subscriptions, plans, and contact forms
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ZONES TABLE ENHANCEMENTS
-- ----------------------------------------------------------------------------
-- Add soft delete and activation support to zones table

-- Add deleted_at column for soft delete functionality
ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Add live column for zone activation logic
ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS live boolean DEFAULT true;

-- Update table and column comments
COMMENT ON TABLE public.zones IS 'DNS zones with soft delete and activation support';
COMMENT ON COLUMN public.zones.deleted_at IS 'Timestamp when zone was soft deleted';
COMMENT ON COLUMN public.zones.live IS 'Whether zone is active/live';

-- ----------------------------------------------------------------------------
-- 2. SUBSCRIPTIONS TABLE ENHANCEMENTS
-- ----------------------------------------------------------------------------
-- Add 'lifetime' subscription status for permanent access plans

-- Drop existing check constraint
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add updated check constraint with 'lifetime' status
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_status_check
CHECK (status = ANY (ARRAY[
  'incomplete'::text,
  'incomplete_expired'::text,
  'trialing'::text,
  'active'::text,
  'past_due'::text,
  'canceled'::text,
  'unpaid'::text,
  'paused'::text,
  'lifetime'::text
]));

-- Update comment
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status plus lifetime for permanent access';

-- ----------------------------------------------------------------------------
-- 3. PLANS TABLE ENHANCEMENTS
-- ----------------------------------------------------------------------------
-- Allow NULL billing_interval for free and custom plans

-- Drop existing check constraint
ALTER TABLE public.plans
DROP CONSTRAINT IF EXISTS plans_billing_interval_check;

-- Add updated check constraint that allows NULL
ALTER TABLE public.plans
ADD CONSTRAINT plans_billing_interval_check
CHECK (billing_interval IS NULL OR billing_interval = ANY (ARRAY['month'::text, 'year'::text]));

-- Update comment
COMMENT ON COLUMN public.plans.billing_interval IS 'Billing cycle: month, year, or NULL for free/custom plans';

-- ----------------------------------------------------------------------------
-- 4. CONTACT FORMS CONFIGURATION
-- ----------------------------------------------------------------------------
-- Ensure consistent RLS and documentation across environments

DO $$
BEGIN
  -- =====================================================
  -- Handle public.irongrove_contact_submissions
  -- =====================================================
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'irongrove_contact_submissions'
  ) THEN
    -- Disable RLS on irongrove_contact_submissions (internal use only)
    ALTER TABLE public.irongrove_contact_submissions
      DISABLE ROW LEVEL SECURITY;

    -- Add table comments for documentation
    COMMENT ON TABLE public.irongrove_contact_submissions
      IS 'Contact form submissions from the Irongrove website';
  ELSE
    RAISE NOTICE 'Table public.irongrove_contact_submissions does not exist; skipping contact submissions config.';
  END IF;

  -- =====================================================
  -- Handle public."marketing-website-contact-form"
  -- =====================================================
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name   = 'marketing-website-contact-form'
  ) THEN
    COMMENT ON TABLE public."marketing-website-contact-form"
      IS 'Public contact form submissions with anti-spam protection. Direct anon writes disabled - use API route.';

    COMMENT ON COLUMN public."marketing-website-contact-form".inquiry_type
      IS 'Type of inquiry: general, founders-pricing, enterprise, support, partnership';
  ELSE
    RAISE NOTICE 'Table public."marketing-website-contact-form" does not exist; skipping marketing form comments.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. PERFORMANCE INDEXES
-- ----------------------------------------------------------------------------
-- Add indexes for common query patterns

-- Index on zones.deleted_at for soft delete queries
-- Partial index only includes soft-deleted records
CREATE INDEX IF NOT EXISTS idx_zones_deleted_at 
ON public.zones(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- Index on zones.live for filtering active zones
-- Partial index only includes live zones
CREATE INDEX IF NOT EXISTS idx_zones_live 
ON public.zones(live) 
WHERE live = true;

-- Composite index for common zone queries (environment + active status)
-- Partial index excludes soft-deleted zones
CREATE INDEX IF NOT EXISTS idx_zones_environment_live 
ON public.zones(environment_id, live) 
WHERE deleted_at IS NULL;

-- Index on subscriptions.status for filtering by subscription state
CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
ON public.subscriptions(status);

-- Index on subscriptions.org_id for organization lookups
-- Already has unique constraint but this helps with performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id 
ON public.subscriptions(org_id);

-- Index on plans.code for plan lookups by identifier
CREATE INDEX IF NOT EXISTS idx_plans_code 
ON public.plans(code);

-- Index on plans.is_active for filtering active plans
CREATE INDEX IF NOT EXISTS idx_plans_is_active 
ON public.plans(is_active) 
WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 6. VERIFY SCHEMA CONSISTENCY
-- ----------------------------------------------------------------------------
-- Optional: Add assertions to verify the migration completed successfully

DO $$
BEGIN
  -- Verify zones columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zones' 
    AND column_name = 'deleted_at'
  ) THEN
    RAISE EXCEPTION 'Migration failed: zones.deleted_at column missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'zones' 
    AND column_name = 'live'
  ) THEN
    RAISE EXCEPTION 'Migration failed: zones.live column missing';
  END IF;

  -- Verify subscriptions constraint includes 'lifetime'
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_status_check' 
    AND pg_get_constraintdef(oid) LIKE '%lifetime%'
  ) THEN
    RAISE WARNING 'subscriptions_status_check constraint may not include lifetime status';
  END IF;

  RAISE NOTICE 'Baseline schema sync migration completed successfully';
END $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

