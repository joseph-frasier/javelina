-- Add Monthly Recurring Subscription Plans
-- These plans work alongside existing lifetime plans
-- Migration created: 2025-11-25
-- Apply to main branch after testing on dev

-- Starter Monthly ($9.95/month)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'starter',
  'Starter',
  'month',
  'prod_THefRjwMEakPYm',
  jsonb_build_object(
    'price', 9.95,
    'price_id', 'price_1SVxEyA8kaNOs7ryzQmtRyFv',
    'description', 'Perfect for small projects and testing'
  ),
  true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Pro Monthly ($49.95/month)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'pro',
  'Pro',
  'month',
  'prod_THeggCI1HVHeQ9',
  jsonb_build_object(
    'price', 49.95,
    'price_id', 'price_1SVxFvA8kaNOs7ry16tQZRok',
    'description', 'For growing teams and production workloads'
  ),
  true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Business Monthly ($199.95/month)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'business',
  'Business',
  'month',
  'prod_TI2cDjhyuRaH7R',
  jsonb_build_object(
    'price', 199.95,
    'price_id', 'price_1SVxJgA8kaNOs7ryV8rFJ6oo',
    'description', 'Advanced features for enterprise teams'
  ),
  true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Enterprise (Contact Sales)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'enterprise',
  'Enterprise',
  NULL,
  'prod_TI2eKuLY9hXIoN',
  jsonb_build_object(
    'description', 'Custom solutions for large organizations',
    'contact_sales', true,
    'price', 0
  ),
  true
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Update premium_lifetime to display as "Business Lifetime" for consistency
UPDATE plans 
SET name = 'Business Lifetime'
WHERE code = 'premium_lifetime';

COMMENT ON TABLE plans IS 'Subscription plans: billing_interval=NULL for lifetime/custom, =month for recurring';

