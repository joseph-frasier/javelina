-- =====================================================
-- Verify and Fix Plan Price ID Mappings
-- This script ensures the plans table has correct price_id
-- mappings so webhooks can properly link subscriptions to plans
-- =====================================================

-- Step 1: Check current state of plans table
SELECT 
  code,
  name,
  stripe_product_id,
  billing_interval,
  metadata->>'price_id' as price_id,
  is_active
FROM public.plans
ORDER BY code;

-- =====================================================
-- Step 2: Update plans with correct price_ids
-- These match the price IDs defined in lib/plans-config.ts
-- =====================================================

-- Update Free plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SL5MCA8kaNOs7rye16c39RS"'
)
WHERE code = 'free';

-- Update Basic Monthly plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SL5NJA8kaNOs7rywCjYzPgH"'
)
WHERE code = 'basic_monthly';

-- Update Basic Annual plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SLSWiA8kaNOs7ryllPfcTHx"'
)
WHERE code = 'basic_annual';

-- Update Pro Monthly plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SLSXKA8kaNOs7ryKJ6hCHd5"'
)
WHERE code = 'pro_monthly';

-- Update Pro Annual plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SLSYMA8kaNOs7ryrJU9oOYL"'
)
WHERE code = 'pro_annual';

-- Update Enterprise Monthly plan
UPDATE public.plans
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{price_id}',
  '"price_1SLSZFA8kaNOs7rywWLjhQ8b"'
)
WHERE code = 'enterprise_monthly';

-- =====================================================
-- Step 3: Verify the updates
-- =====================================================

SELECT 
  code,
  name,
  metadata->>'price_id' as price_id,
  stripe_product_id,
  is_active
FROM public.plans
ORDER BY 
  CASE code
    WHEN 'free' THEN 1
    WHEN 'basic_monthly' THEN 2
    WHEN 'basic_annual' THEN 3
    WHEN 'pro_monthly' THEN 4
    WHEN 'pro_annual' THEN 5
    WHEN 'enterprise_monthly' THEN 6
  END;

-- =====================================================
-- Step 4: Check existing subscriptions
-- =====================================================

-- Show all organizations and their current subscription status
SELECT 
  o.name as organization,
  o.stripe_customer_id,
  s.id as subscription_id,
  s.stripe_subscription_id,
  p.code as plan_code,
  p.name as plan_name,
  s.status,
  s.current_period_end,
  s.metadata
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.plans p ON p.id = s.plan_id
ORDER BY o.name;

-- =====================================================
-- Step 5: Fix existing subscriptions with NULL plan_id
-- =====================================================

-- This will attempt to match subscriptions to plans based on metadata
UPDATE public.subscriptions s
SET plan_id = p.id,
    updated_at = now()
FROM public.plans p
WHERE s.plan_id IS NULL
  AND s.metadata->>'plan_code' IS NOT NULL
  AND p.code = s.metadata->>'plan_code'
  AND p.is_active = true;

-- Verify the fix
SELECT 
  o.name as organization,
  p.name as plan,
  s.status,
  s.metadata->>'plan_code' as metadata_plan_code
FROM public.subscriptions s
JOIN public.organizations o ON o.id = s.org_id
LEFT JOIN public.plans p ON p.id = s.plan_id
ORDER BY o.name;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- After running this script:
-- 1. All plans should have correct price_id in metadata
-- 2. Existing subscriptions should be linked to correct plans
-- 3. Future webhook events should properly map price_id to plan_id
--
-- If you still see NULL plan_ids after this:
-- - Check your Stripe webhook logs for errors
-- - Verify webhook secret is correctly configured
-- - Check webhook endpoint is accessible: /api/stripe/webhook
--

