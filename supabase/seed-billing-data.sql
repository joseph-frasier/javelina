-- =====================================================
-- Seed Data for Billing Schema v2
-- Run this after billing-schema-v2.sql
-- =====================================================

-- =====================================================
-- 1. INSERT PLANS
-- =====================================================

INSERT INTO public.plans (code, name, stripe_product_id, billing_interval, metadata, is_active)
VALUES
  -- Free Plan
  (
    'free',
    'Free',
    'prod_THefRjwMEakPYm',
    NULL,
    '{"description": "Perfect for trying out Javelina", "price": 0, "price_id": "price_1SL5MCA8kaNOs7rye16c39RS", "recommended_for": "Individual developers and small projects"}'::jsonb,
    true
  ),
  
  -- Basic Plan - Monthly
  (
    'basic_monthly',
    'Basic (Monthly)',
    'prod_THeggCI1HVHeQ9',
    'month',
    '{"description": "For small teams getting started", "price": 3.50, "price_id": "price_1SL5NJA8kaNOs7rywCjYzPgH", "recommended_for": "Small teams and startups"}'::jsonb,
    true
  ),
  
  -- Basic Plan - Annual
  (
    'basic_annual',
    'Basic (Annual)',
    'prod_THeggCI1HVHeQ9',
    'year',
    '{"description": "For small teams getting started", "price": 42.00, "price_id": "price_1SLSWiA8kaNOs7ryllPfcTHx", "annual_price": 42.00, "monthly_equivalent": 3.50, "recommended_for": "Small teams and startups"}'::jsonb,
    true
  ),
  
  -- Pro Plan - Monthly
  (
    'pro_monthly',
    'Pro (Monthly)',
    'prod_TI2cDjhyuRaH7R',
    'month',
    '{"description": "For teams managing multiple environments", "price": 6.70, "price_id": "price_1SLSXKA8kaNOs7ryKJ6hCHd5", "recommended_for": "Growing teams and businesses"}'::jsonb,
    true
  ),
  
  -- Pro Plan - Annual
  (
    'pro_annual',
    'Pro (Annual)',
    'prod_TI2cDjhyuRaH7R',
    'year',
    '{"description": "For teams managing multiple environments", "price": 80.40, "price_id": "price_1SLSYMA8kaNOs7ryrJU9oOYL", "annual_price": 80.40, "monthly_equivalent": 6.70, "recommended_for": "Growing teams and businesses"}'::jsonb,
    true
  ),
  
  -- Enterprise Plan - Monthly
  (
    'enterprise_monthly',
    'Enterprise (Monthly)',
    'prod_TI2eKuLY9hXIoN',
    'month',
    '{"description": "Custom solutions for large organizations", "price": 450.00, "price_id": "price_1SLSZFA8kaNOs7rywWLjhQ8b", "contact_sales": false, "recommended_for": "Large enterprises with custom requirements"}'::jsonb,
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  updated_at = now();

-- =====================================================
-- 2. INSERT ENTITLEMENTS
-- =====================================================

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
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type;

-- =====================================================
-- 3. MAP ENTITLEMENTS TO PLANS
-- =====================================================

-- Get plan IDs
DO $$
DECLARE
  free_plan_id UUID;
  basic_monthly_id UUID;
  basic_annual_id UUID;
  pro_monthly_id UUID;
  pro_annual_id UUID;
  enterprise_id UUID;
  
  -- Entitlement IDs
  env_limit_id UUID;
  zones_limit_id UUID;
  dns_limit_id UUID;
  members_limit_id UUID;
  api_access_id UUID;
  analytics_id UUID;
  priority_support_id UUID;
  audit_logs_id UUID;
  custom_roles_id UUID;
  sso_id UUID;
  bulk_ops_id UUID;
  export_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO free_plan_id FROM public.plans WHERE code = 'free';
  SELECT id INTO basic_monthly_id FROM public.plans WHERE code = 'basic_monthly';
  SELECT id INTO basic_annual_id FROM public.plans WHERE code = 'basic_annual';
  SELECT id INTO pro_monthly_id FROM public.plans WHERE code = 'pro_monthly';
  SELECT id INTO pro_annual_id FROM public.plans WHERE code = 'pro_annual';
  SELECT id INTO enterprise_id FROM public.plans WHERE code = 'enterprise_monthly';
  
  -- Get entitlement IDs
  SELECT id INTO env_limit_id FROM public.entitlements WHERE key = 'environments_limit';
  SELECT id INTO zones_limit_id FROM public.entitlements WHERE key = 'zones_limit';
  SELECT id INTO dns_limit_id FROM public.entitlements WHERE key = 'dns_records_limit';
  SELECT id INTO members_limit_id FROM public.entitlements WHERE key = 'team_members_limit';
  SELECT id INTO api_access_id FROM public.entitlements WHERE key = 'api_access';
  SELECT id INTO analytics_id FROM public.entitlements WHERE key = 'advanced_analytics';
  SELECT id INTO priority_support_id FROM public.entitlements WHERE key = 'priority_support';
  SELECT id INTO audit_logs_id FROM public.entitlements WHERE key = 'audit_logs';
  SELECT id INTO custom_roles_id FROM public.entitlements WHERE key = 'custom_roles';
  SELECT id INTO sso_id FROM public.entitlements WHERE key = 'sso_enabled';
  SELECT id INTO bulk_ops_id FROM public.entitlements WHERE key = 'bulk_operations';
  SELECT id INTO export_id FROM public.entitlements WHERE key = 'export_data';
  
  -- FREE PLAN ENTITLEMENTS
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (free_plan_id, env_limit_id, '1'),           -- 1 environment
    (free_plan_id, zones_limit_id, '3'),         -- 3 DNS zones
    (free_plan_id, dns_limit_id, '100'),         -- 100 records per zone
    (free_plan_id, members_limit_id, '2'),       -- 2 team members
    (free_plan_id, api_access_id, 'false'),      -- No API access
    (free_plan_id, analytics_id, 'false'),       -- No advanced analytics
    (free_plan_id, priority_support_id, 'false'), -- Community support only
    (free_plan_id, audit_logs_id, 'false'),      -- No audit logs
    (free_plan_id, custom_roles_id, 'false'),    -- No custom roles
    (free_plan_id, sso_id, 'false'),             -- No SSO
    (free_plan_id, bulk_ops_id, 'false'),        -- No bulk operations
    (free_plan_id, export_id, 'false')           -- No export
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
  -- BASIC MONTHLY PLAN ENTITLEMENTS
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (basic_monthly_id, env_limit_id, '3'),       -- 3 environments
    (basic_monthly_id, zones_limit_id, '10'),    -- 10 DNS zones
    (basic_monthly_id, dns_limit_id, '500'),     -- 500 records per zone
    (basic_monthly_id, members_limit_id, '5'),   -- 5 team members
    (basic_monthly_id, api_access_id, 'true'),   -- API access included
    (basic_monthly_id, analytics_id, 'false'),   -- No advanced analytics
    (basic_monthly_id, priority_support_id, 'false'), -- Email support
    (basic_monthly_id, audit_logs_id, 'false'),  -- No audit logs
    (basic_monthly_id, custom_roles_id, 'false'), -- No custom roles
    (basic_monthly_id, sso_id, 'false'),         -- No SSO
    (basic_monthly_id, bulk_ops_id, 'true'),     -- Bulk operations
    (basic_monthly_id, export_id, 'true')        -- Export enabled
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
  -- BASIC ANNUAL PLAN ENTITLEMENTS (same as monthly)
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (basic_annual_id, env_limit_id, '3'),        -- 3 environments
    (basic_annual_id, zones_limit_id, '10'),     -- 10 DNS zones
    (basic_annual_id, dns_limit_id, '500'),      -- 500 records per zone
    (basic_annual_id, members_limit_id, '5'),    -- 5 team members
    (basic_annual_id, api_access_id, 'true'),    -- API access included
    (basic_annual_id, analytics_id, 'false'),    -- No advanced analytics
    (basic_annual_id, priority_support_id, 'false'), -- Email support
    (basic_annual_id, audit_logs_id, 'false'),   -- No audit logs
    (basic_annual_id, custom_roles_id, 'false'), -- No custom roles
    (basic_annual_id, sso_id, 'false'),          -- No SSO
    (basic_annual_id, bulk_ops_id, 'true'),      -- Bulk operations
    (basic_annual_id, export_id, 'true')         -- Export enabled
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
  -- PRO MONTHLY PLAN ENTITLEMENTS
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (pro_monthly_id, env_limit_id, '10'),        -- 10 environments
    (pro_monthly_id, zones_limit_id, '50'),      -- 50 DNS zones
    (pro_monthly_id, dns_limit_id, '5000'),      -- 5k records per zone
    (pro_monthly_id, members_limit_id, '10'),    -- 10 team members
    (pro_monthly_id, api_access_id, 'true'),     -- API access included
    (pro_monthly_id, analytics_id, 'true'),      -- Advanced analytics
    (pro_monthly_id, priority_support_id, 'true'), -- Priority support
    (pro_monthly_id, audit_logs_id, 'true'),     -- Audit logs
    (pro_monthly_id, custom_roles_id, 'false'),  -- No custom roles (enterprise only)
    (pro_monthly_id, sso_id, 'false'),           -- No SSO (enterprise only)
    (pro_monthly_id, bulk_ops_id, 'true'),       -- Bulk operations
    (pro_monthly_id, export_id, 'true')          -- Export enabled
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
  -- PRO ANNUAL PLAN ENTITLEMENTS (same as monthly)
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (pro_annual_id, env_limit_id, '10'),         -- 10 environments
    (pro_annual_id, zones_limit_id, '50'),       -- 50 DNS zones
    (pro_annual_id, dns_limit_id, '5000'),       -- 5k records per zone
    (pro_annual_id, members_limit_id, '10'),     -- 10 team members
    (pro_annual_id, api_access_id, 'true'),      -- API access included
    (pro_annual_id, analytics_id, 'true'),       -- Advanced analytics
    (pro_annual_id, priority_support_id, 'true'), -- Priority support
    (pro_annual_id, audit_logs_id, 'true'),      -- Audit logs
    (pro_annual_id, custom_roles_id, 'false'),   -- No custom roles (enterprise only)
    (pro_annual_id, sso_id, 'false'),            -- No SSO (enterprise only)
    (pro_annual_id, bulk_ops_id, 'true'),        -- Bulk operations
    (pro_annual_id, export_id, 'true')           -- Export enabled
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
  -- ENTERPRISE PLAN ENTITLEMENTS
  INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
  VALUES
    (enterprise_id, env_limit_id, '-1'),         -- Unlimited environments
    (enterprise_id, zones_limit_id, '-1'),       -- Unlimited zones
    (enterprise_id, dns_limit_id, '-1'),         -- Unlimited records
    (enterprise_id, members_limit_id, '-1'),     -- Unlimited team members
    (enterprise_id, api_access_id, 'true'),      -- API access
    (enterprise_id, analytics_id, 'true'),       -- Advanced analytics
    (enterprise_id, priority_support_id, 'true'), -- Priority support
    (enterprise_id, audit_logs_id, 'true'),      -- Audit logs
    (enterprise_id, custom_roles_id, 'true'),    -- Custom roles
    (enterprise_id, sso_id, 'true'),             -- SSO enabled
    (enterprise_id, bulk_ops_id, 'true'),        -- Bulk operations
    (enterprise_id, export_id, 'true')           -- Export enabled
  ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- View all plans with entitlement counts
SELECT 
  p.code,
  p.name,
  p.billing_interval,
  COUNT(pe.entitlement_id) as entitlement_count
FROM public.plans p
LEFT JOIN public.plan_entitlements pe ON pe.plan_id = p.id
WHERE p.is_active = true
GROUP BY p.id, p.code, p.name, p.billing_interval
ORDER BY p.code;

-- View all plan entitlements side-by-side
SELECT 
  e.key as entitlement_key,
  MAX(CASE WHEN p.code = 'free' THEN pe.value END) as free,
  MAX(CASE WHEN p.code = 'basic_monthly' THEN pe.value END) as basic,
  MAX(CASE WHEN p.code = 'pro_monthly' THEN pe.value END) as pro,
  MAX(CASE WHEN p.code = 'enterprise_monthly' THEN pe.value END) as enterprise
FROM public.entitlements e
LEFT JOIN public.plan_entitlements pe ON pe.entitlement_id = e.id
LEFT JOIN public.plans p ON p.id = pe.plan_id
WHERE p.code IN ('free', 'basic_monthly', 'pro_monthly', 'enterprise_monthly')
   OR p.code IS NULL
GROUP BY e.key
ORDER BY e.key;

-- =====================================================
-- NOTES
-- =====================================================
-- 
-- After running this seed file:
-- 1. Update stripe_product_id in plans table with actual Stripe Product IDs
-- 2. Create corresponding products and prices in Stripe Dashboard
-- 3. Test entitlement checks using: SELECT public.check_entitlement(org_id, 'entitlement_key');
--

