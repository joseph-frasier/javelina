-- =====================================================
-- Fix Missing Subscriptions for Basic Test and Pro Test
-- This script creates subscription records for organizations
-- that are missing them after the rebase
-- =====================================================

-- First, let's see what organizations exist and what subscriptions they have
SELECT 
  o.id,
  o.name,
  s.id as subscription_id,
  s.plan_id,
  p.name as plan_name,
  s.status
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE o.name ILIKE '%test%'
ORDER BY o.name;

-- Get plan IDs for reference
SELECT id, code, name FROM public.plans WHERE is_active = true;

-- =====================================================
-- Create missing subscriptions
-- =====================================================

-- For Basic Test organization - assign Basic plan
INSERT INTO public.subscriptions (
  org_id, 
  plan_id, 
  status, 
  current_period_start, 
  current_period_end,
  metadata
)
SELECT 
  o.id as org_id,
  p.id as plan_id,
  'active' as status,
  now() as current_period_start,
  now() + interval '1 month' as current_period_end,
  '{"created_via": "manual_fix", "reason": "post-rebase restoration"}'::jsonb as metadata
FROM public.organizations o
CROSS JOIN public.plans p
WHERE o.name = 'Basic Test'
  AND p.code = 'basic_monthly'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.org_id = o.id
  )
ON CONFLICT (org_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- For Pro Test organization - assign Pro plan
INSERT INTO public.subscriptions (
  org_id, 
  plan_id, 
  status, 
  current_period_start, 
  current_period_end,
  metadata
)
SELECT 
  o.id as org_id,
  p.id as plan_id,
  'active' as status,
  now() as current_period_start,
  now() + interval '1 month' as current_period_end,
  '{"created_via": "manual_fix", "reason": "post-rebase restoration"}'::jsonb as metadata
FROM public.organizations o
CROSS JOIN public.plans p
WHERE o.name = 'Pro Test'
  AND p.code = 'pro_monthly'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s 
    WHERE s.org_id = o.id
  )
ON CONFLICT (org_id) DO UPDATE SET
  plan_id = EXCLUDED.plan_id,
  status = EXCLUDED.status,
  current_period_start = EXCLUDED.current_period_start,
  current_period_end = EXCLUDED.current_period_end,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- =====================================================
-- Verify the fix
-- =====================================================

SELECT 
  o.name as organization,
  p.name as plan,
  s.status,
  s.current_period_end as next_billing,
  s.created_at
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE o.name IN ('Basic Test', 'Pro Test')
ORDER BY o.name;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- Run this script in your Supabase SQL Editor to restore
-- the missing subscription data.
--
-- After running:
-- 1. Refresh your browser
-- 2. Check that organizations show correct plans
-- 3. Verify entitlements are working correctly
--

