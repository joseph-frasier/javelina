-- ============================================================================
-- SUBSCRIPTION VERIFICATION SCRIPT
-- ============================================================================
-- Run this in your Supabase SQL Editor to check subscription status
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COUNT SUMMARY
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  org_count INT;
  sub_count INT;
  missing_count INT;
  trigger_exists BOOLEAN;
BEGIN
  -- Count organizations
  SELECT COUNT(*) INTO org_count FROM public.organizations;
  
  -- Count subscriptions
  SELECT COUNT(*) INTO sub_count FROM public.subscriptions;
  
  -- Count organizations without subscriptions
  SELECT COUNT(*) INTO missing_count 
  FROM public.organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.org_id = o.id
  );

  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_create_default_subscription'
  ) INTO trigger_exists;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SUBSCRIPTION VERIFICATION REPORT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total organizations: %', org_count;
  RAISE NOTICE 'Total subscriptions: %', sub_count;
  RAISE NOTICE 'Organizations without subscriptions: %', missing_count;
  RAISE NOTICE 'Auto-creation trigger exists: %', trigger_exists;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  IF missing_count > 0 THEN
    RAISE WARNING '❌ % organizations are missing subscriptions!', missing_count;
    RAISE NOTICE 'Run the queries below to see which organizations are affected.';
  ELSIF NOT trigger_exists THEN
    RAISE WARNING '⚠️  Auto-creation trigger is missing! Apply migration: 20251124200000_auto_create_default_subscription.sql';
  ELSE
    RAISE NOTICE '✅ All organizations have subscriptions and trigger is installed!';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. LIST ORGANIZATIONS WITHOUT SUBSCRIPTIONS
-- ----------------------------------------------------------------------------
SELECT 
  o.id,
  o.name,
  o.created_at,
  o.stripe_customer_id,
  COUNT(om.user_id) as member_count
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.organization_members om ON om.organization_id = o.id
WHERE s.id IS NULL
GROUP BY o.id, o.name, o.created_at, o.stripe_customer_id
ORDER BY o.created_at DESC;

-- ----------------------------------------------------------------------------
-- 3. LIST ALL SUBSCRIPTIONS WITH PLAN DETAILS
-- ----------------------------------------------------------------------------
SELECT 
  o.name as organization_name,
  p.name as plan_name,
  p.code as plan_code,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.stripe_subscription_id,
  s.metadata->>'created_via' as created_via,
  s.created_at as subscription_created_at
FROM public.subscriptions s
JOIN public.organizations o ON o.id = s.org_id
JOIN public.plans p ON p.id = s.plan_id
ORDER BY s.created_at DESC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- 4. CHECK FOR DUPLICATE SUBSCRIPTIONS (SHOULD BE NONE)
-- ----------------------------------------------------------------------------
SELECT 
  org_id,
  COUNT(*) as subscription_count,
  array_agg(id) as subscription_ids
FROM public.subscriptions
GROUP BY org_id
HAVING COUNT(*) > 1;

-- ----------------------------------------------------------------------------
-- 5. CHECK TRIGGER AND FUNCTION EXISTENCE
-- ----------------------------------------------------------------------------
SELECT 
  'Function exists' as check_type,
  EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'create_default_org_subscription'
  ) as exists
UNION ALL
SELECT 
  'Trigger exists' as check_type,
  EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_create_default_subscription'
  ) as exists;

-- ----------------------------------------------------------------------------
-- 6. RECENT ORGANIZATION CREATIONS (Last 7 days)
-- ----------------------------------------------------------------------------
SELECT 
  o.id,
  o.name,
  o.created_at,
  CASE 
    WHEN s.id IS NOT NULL THEN '✅ Has subscription'
    ELSE '❌ Missing subscription'
  END as subscription_status,
  s.status as sub_status,
  p.code as plan_code
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE o.created_at > now() - interval '7 days'
ORDER BY o.created_at DESC;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- If you see missing subscriptions:
--   1. Apply migration: 20251124200000_auto_create_default_subscription.sql
--   2. The migration includes a backfill that will fix existing orgs
--   3. Re-run this verification script to confirm
--
-- If trigger is missing:
--   1. The migration hasn't been applied to this database
--   2. Apply it immediately to prevent future issues
--
-- If you see duplicate subscriptions:
--   1. This shouldn't happen (unique constraint on org_id)
--   2. Contact support or investigate data corruption
-- ============================================================================

