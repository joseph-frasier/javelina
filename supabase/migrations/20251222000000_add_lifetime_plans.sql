-- Add Lifetime Plans
-- These are one-time purchase plans that exist alongside monthly subscriptions
-- Migration created: 2025-12-22
-- Essential operational data that must exist in all environments

-- Starter Lifetime
INSERT INTO plans (id, code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'f7945e13-9b12-4d7a-83fd-95b0755ba2db',
  'starter_lifetime',
  'Starter Lifetime',
  NULL,  -- NULL = one-time purchase, not recurring
  NULL,  -- No specific Stripe product (legacy)
  jsonb_build_object(
    'price', 238.80,
    'price_id', 'price_1SUZSnA8kaNOs7ryYXRO3GlF',
    'description', 'Perfect for getting started with DNS management'
  ),
  true
) ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Pro Lifetime
INSERT INTO plans (id, code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'b2fd52db-1a05-40dd-a40a-f08d6f2de27b',
  'pro_lifetime',
  'Pro Lifetime',
  NULL,
  NULL,
  jsonb_build_object(
    'price', 1198.80,
    'price_id', 'price_1SUZTYA8kaNOs7ryyv0d76jm',
    'description', 'For small teams getting started'
  ),
  true
) ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Premium Lifetime (displayed as "Business Lifetime")
INSERT INTO plans (id, code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  '82d0abed-177c-4e58-8329-bddf08555f64',
  'premium_lifetime',
  'Business Lifetime',
  NULL,
  NULL,
  jsonb_build_object(
    'price', 4776.00,
    'price_id', 'price_1SUZUfA8kaNOs7ry1BAawtWn',
    'description', 'For teams managing multiple environments'
  ),
  true
) ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Enterprise Lifetime
INSERT INTO plans (id, code, name, billing_interval, stripe_product_id, metadata, is_active)
VALUES (
  'df285f80-a0aa-41f3-9668-a9c5205e6f1a',
  'enterprise_lifetime',
  'Enterprise Lifetime',
  NULL,
  NULL,
  jsonb_build_object(
    'price', 0,
    'price_id', 'price_1SUZVZA8kaNOs7rytyUAygja',
    'description', 'Quoted Individually'
  ),
  true
) ON CONFLICT (id) DO UPDATE SET
  code = EXCLUDED.code,
  name = EXCLUDED.name,
  billing_interval = EXCLUDED.billing_interval,
  stripe_product_id = EXCLUDED.stripe_product_id,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Migration complete: Lifetime plans added
-- These are essential operational data that must exist in all environments

