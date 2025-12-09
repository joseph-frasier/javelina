-- =====================================================
-- Comprehensive Subscription Fix
-- Addresses multiple potential issues preventing subscription creation
-- =====================================================
-- Created: 2024-11-24
-- Purpose: Ensure subscriptions can be created successfully after entitlement restoration
-- =====================================================

\echo '==============================================================================='
\echo 'COMPREHENSIVE SUBSCRIPTION FIX'
\echo '==============================================================================='

-- =====================================================
-- 1. VERIFY TABLES EXIST
-- =====================================================
\echo ''
\echo '--- Verifying required tables exist ---'

DO $$
BEGIN
  -- Check critical tables
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    RAISE EXCEPTION 'subscriptions table is missing!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'plans') THEN
    RAISE EXCEPTION 'plans table is missing!';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscription_items') THEN
    RAISE EXCEPTION 'subscription_items table is missing!';
  END IF;
  
  RAISE NOTICE '✅ All required tables exist';
END $$;

-- =====================================================
-- 2. FIX SUBSCRIPTIONS TABLE STATUS CONSTRAINT
-- =====================================================
\echo ''
\echo '--- Ensuring subscriptions status constraint includes all valid statuses ---'

-- Drop existing constraint
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add comprehensive constraint including 'lifetime' status
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

\echo '✅ Updated subscriptions status constraint'

-- =====================================================
-- 3. ENSURE UNIQUE CONSTRAINT EXISTS
-- =====================================================
\echo ''
\echo '--- Verifying subscriptions unique constraints ---'

-- Add unique constraint on org_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.subscriptions'::regclass 
    AND contype = 'u'
    AND conname = 'subscriptions_org_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_org_id_key UNIQUE (org_id);
    RAISE NOTICE '✅ Added unique constraint on subscriptions.org_id';
  ELSE
    RAISE NOTICE '✅ Unique constraint on subscriptions.org_id already exists';
  END IF;
END $$;

-- Add unique constraint on stripe_subscription_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'public.subscriptions'::regclass 
    AND contype = 'u'
    AND conname = 'subscriptions_stripe_subscription_id_key'
  ) THEN
    ALTER TABLE public.subscriptions
    ADD CONSTRAINT subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
    RAISE NOTICE '✅ Added unique constraint on subscriptions.stripe_subscription_id';
  ELSE
    RAISE NOTICE '✅ Unique constraint on subscriptions.stripe_subscription_id already exists';
  END IF;
END $$;

-- =====================================================
-- 4. FIX RLS POLICIES
-- =====================================================
\echo ''
\echo '--- Fixing RLS policies on subscriptions table ---'

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions for their orgs" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- POLICY 1: Users can view subscriptions for their organizations
CREATE POLICY "Users can view their org subscriptions"
  ON public.subscriptions 
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- POLICY 2: Users can create subscriptions for their organizations
CREATE POLICY "Users can create subscriptions for their orgs"
  ON public.subscriptions 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- POLICY 3: Admins can update their org subscriptions
CREATE POLICY "Users can update their org subscriptions"
  ON public.subscriptions 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

-- POLICY 4: Service role can manage all subscriptions (for webhooks)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions 
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

\echo '✅ Created all 4 RLS policies on subscriptions table'

-- =====================================================
-- 5. VERIFY INDEXES EXIST
-- =====================================================
\echo ''
\echo '--- Ensuring performance indexes exist ---'

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id 
  ON public.subscriptions(org_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id 
  ON public.subscriptions(stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_status 
  ON public.subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id 
  ON public.subscriptions(plan_id);

\echo '✅ Verified all indexes exist'

-- =====================================================
-- 6. CHECK PLANS HAVE REQUIRED METADATA
-- =====================================================
\echo ''
\echo '--- Checking plans have price_id in metadata ---'

DO $$
DECLARE
  plans_without_price_id INTEGER;
  missing_plans TEXT;
BEGIN
  SELECT COUNT(*), STRING_AGG(code, ', ')
  INTO plans_without_price_id, missing_plans
  FROM public.plans
  WHERE is_active = true
  AND (metadata->>'price_id' IS NULL OR metadata->>'price_id' = '');
  
  IF plans_without_price_id > 0 THEN
    RAISE WARNING 'Found % active plans without price_id in metadata: %', plans_without_price_id, missing_plans;
    RAISE WARNING 'These plans will not work with subscription creation!';
    RAISE WARNING 'Run: UPDATE plans SET metadata = jsonb_set(metadata, ''{price_id}'', ''"your_price_id"'') WHERE code = ''plan_code'';';
  ELSE
    RAISE NOTICE '✅ All active plans have price_id in metadata';
  END IF;
END $$;

-- =====================================================
-- 7. VERIFY ENTITLEMENT FUNCTIONS
-- =====================================================
\echo ''
\echo '--- Verifying entitlement functions exist ---'

DO $$
DECLARE
  missing_functions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Check for required functions
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_org_entitlements'
  ) THEN
    missing_functions := array_append(missing_functions, 'get_org_entitlements');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'check_entitlement'
  ) THEN
    missing_functions := array_append(missing_functions, 'check_entitlement');
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'can_create_resource'
  ) THEN
    missing_functions := array_append(missing_functions, 'can_create_resource');
  END IF;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE WARNING 'Missing entitlement functions: %', array_to_string(missing_functions, ', ');
    RAISE WARNING 'These functions should have been restored by migration 20251124200001';
  ELSE
    RAISE NOTICE '✅ All entitlement functions exist';
  END IF;
END $$;

-- =====================================================
-- 8. FINAL VERIFICATION
-- =====================================================
\echo ''
\echo '--- Running final verification checks ---'

DO $$
DECLARE
  policy_count INTEGER;
  active_plans INTEGER;
  plans_with_price_id INTEGER;
BEGIN
  -- Count policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename = 'subscriptions';
  
  IF policy_count < 4 THEN
    RAISE EXCEPTION 'Expected 4 policies on subscriptions table, found %', policy_count;
  END IF;
  
  -- Count active plans
  SELECT COUNT(*) INTO active_plans
  FROM public.plans
  WHERE is_active = true;
  
  IF active_plans = 0 THEN
    RAISE EXCEPTION 'No active plans found! Cannot create subscriptions without plans.';
  END IF;
  
  -- Count plans with price_id
  SELECT COUNT(*) INTO plans_with_price_id
  FROM public.plans
  WHERE is_active = true
  AND metadata->>'price_id' IS NOT NULL
  AND metadata->>'price_id' != '';
  
  RAISE NOTICE '================================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '================================================';
  RAISE NOTICE 'RLS Policies: % (expected 4)', policy_count;
  RAISE NOTICE 'Active Plans: %', active_plans;
  RAISE NOTICE 'Plans with price_id: % of %', plans_with_price_id, active_plans;
  RAISE NOTICE '';
  
  IF plans_with_price_id < active_plans THEN
    RAISE WARNING 'Some active plans are missing price_id in metadata!';
    RAISE WARNING 'Subscriptions for these plans will fail to create.';
  ELSE
    RAISE NOTICE '✅ All systems ready for subscription creation';
  END IF;
END $$;

\echo ''
\echo '==============================================================================='
\echo 'MIGRATION COMPLETE'
\echo '==============================================================================='
\echo ''
\echo 'Next steps:'
\echo '1. Test subscription creation with a new organization'
\echo '2. Verify Stripe webhook configuration'
\echo '3. Check application logs for any errors'
\echo '4. If issues persist, run migration 20251124200004 for detailed diagnostics'
\echo ''
\echo '==============================================================================='

-- =====================================================
-- END OF MIGRATION
-- =====================================================



