-- Add business_starter and business_pro plans to the plans table.
-- Both plans grant starter-tier LaunchDarkly org limits; tier mapping is
-- enforced in code (javelina/lib/hooks/usePlanLimits.ts and
-- javelina-backend/src/utils/plan-limits.ts).
-- Stripe product and price IDs reuse IDs created for the prior storefront setup.
INSERT INTO public.plans (code, name, stripe_product_id, billing_interval, metadata, is_active) VALUES
  (
    'business_starter',
    'Javelina Business Starter',
    'prod_ULafV9yW6WDGiX',
    'month',
    jsonb_build_object(
      'price', 99.88,
      'price_id', 'price_1TMtU8A8kaNOs7ry5ullsdvX',
      'description', 'Everything you need to get your business online with a fully managed website.',
      'product_line', 'business'
    ),
    true
  ),
  (
    'business_pro',
    'Javelina Business Pro',
    'prod_ULafe1twEgo78B',
    'month',
    jsonb_build_object(
      'price', 157.77,
      'price_id', 'price_1TMtUWA8kaNOs7rywKdXi6AA',
      'description', 'Premium business package with Microsoft 365 email and a custom AI agent.',
      'product_line', 'business'
    ),
    true
  )
ON CONFLICT (code) DO NOTHING;
