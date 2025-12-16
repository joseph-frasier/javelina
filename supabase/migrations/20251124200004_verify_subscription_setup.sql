-- =====================================================
-- Verify Subscription Setup (diagnostic helper ONLY)
-- Original intent: run manually on production to inspect state.
-- This migration is now a no-op so it can safely replay in new environments.
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'verify_subscription_setup migration is a no-op; run diagnostics manually if needed.';
END $$;

-- =====================================================
-- ORIGINAL DIAGNOSTIC QUERIES (REFERENCE ONLY - NOT EXECUTED)
-- =====================================================
-- Run the following manually in psql against production if you need to debug
-- subscription setup. They are intentionally commented out so the migration
-- system does not try to execute psql meta-commands like \echo.
-- =====================================================

-- \echo '==============================================================================='
-- \echo 'SUBSCRIPTION SETUP VERIFICATION'
-- \echo '==============================================================================='

-- \echo ''
-- \echo '--- 1. CHECK PLANS TABLE ---'
-- SELECT 
--   code,
--   name,
--   billing_interval,
--   metadata->>'price_id' as price_id,
--   metadata->>'price' as price,
--   is_active,
--   stripe_product_id
-- FROM public.plans
-- ORDER BY code;

-- \echo ''
-- \echo '--- 2. CHECK ENTITLEMENTS SYSTEM ---'
-- SELECT 
--   'entitlements' as table_name,
--   COUNT(*) as row_count
-- FROM public.entitlements
-- UNION ALL
-- SELECT 
--   'plan_entitlements' as table_name,
--   COUNT(*) as row_count
-- FROM public.plan_entitlements
-- UNION ALL
-- SELECT 
--   'org_entitlement_overrides' as table_name,
--   COUNT(*) as row_count
-- FROM public.org_entitlement_overrides;

-- \echo ''
-- \echo '--- 3. CHECK ENTITLEMENT FUNCTIONS ---'
-- SELECT 
--   proname as function_name,
--   pg_get_function_result(oid) as return_type
-- FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
-- AND proname IN ('get_org_entitlements', 'check_entitlement', 'can_create_resource')
-- ORDER BY proname;

-- \echo ''
-- \echo '--- 4. CHECK SUBSCRIPTIONS TABLE RLS POLICIES ---'
-- SELECT 
--   policyname,
--   cmd as command,
--   qual as using_expression
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND tablename = 'subscriptions'
-- ORDER BY policyname;

-- \echo ''
-- \echo '--- 5. CHECK RECENT SUBSCRIPTIONS ---'
-- SELECT 
--   s.id,
--   s.org_id,
--   s.stripe_subscription_id,
--   s.plan_id,
--   p.code as plan_code,
--   p.name as plan_name,
--   s.status,
--   s.created_at,
--   s.updated_at
-- FROM public.subscriptions s
-- LEFT JOIN public.plans p ON p.id = s.plan_id
-- ORDER BY s.created_at DESC
-- LIMIT 10;

-- \echo ''
-- \echo '--- 6. CHECK ORGANIZATIONS WITHOUT SUBSCRIPTIONS ---'
-- SELECT 
--   o.id,
--   o.name,
--   o.created_at,
--   s.id as subscription_id,
--   s.plan_id,
--   p.code as plan_code
-- FROM public.organizations o
-- LEFT JOIN public.subscriptions s ON s.org_id = o.id
-- LEFT JOIN public.plans p ON p.id = s.plan_id
-- WHERE o.created_at > NOW() - INTERVAL '7 days'
-- ORDER BY o.created_at DESC
-- LIMIT 10;

-- \echo ''
-- \echo '--- 7. CHECK SUBSCRIPTION_ITEMS ---'
-- SELECT 
--   si.id,
--   si.subscription_id,
--   si.stripe_price_id,
--   si.quantity,
--   p.code as matching_plan_code
-- FROM public.subscription_items si
-- LEFT JOIN public.plans p ON p.metadata->>'price_id' = si.stripe_price_id
-- ORDER BY si.created_at DESC
-- LIMIT 10;

-- \echo ''
-- \echo '--- 8. VERIFY CONSTRAINTS ---'
-- SELECT 
--   conname as constraint_name,
--   contype as constraint_type,
--   pg_get_constraintdef(oid) as definition
-- FROM pg_constraint
-- WHERE conrelid = 'public.subscriptions'::regclass
-- ORDER BY conname;

-- \echo ''
-- \echo '--- 9. CHECK FOR FAILED INSERTS (if audit logging enabled) ---'
-- \echo 'Note: This requires audit logging to be enabled'

-- \echo ''
-- \echo '==============================================================================='
-- \echo 'DIAGNOSIS SUMMARY'
-- \echo '==============================================================================='
-- \echo ''
-- \echo 'Common Issues to Check:'
-- \echo '1. Plans table missing price_ids in metadata'
-- \echo '2. Subscriptions table missing RLS policies for INSERT/UPDATE'
-- \echo '3. Plan_entitlements table is empty (expected after fix migration)'
-- \echo '4. Entitlement functions exist but return no data'
-- \echo ''
-- \echo 'Expected State After Migrations:'
-- \echo '- 4 RLS policies on subscriptions table'
-- \echo '- All plans should have price_id in metadata'
-- \echo '- Entitlement functions should exist'
-- \echo '- Plan_entitlements can be empty (app should handle this)'
-- \echo ''
-- \echo '==============================================================================='




