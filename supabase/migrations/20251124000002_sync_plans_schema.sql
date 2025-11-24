-- Migration: Sync plans table schema with production
-- Allow NULL billing_interval for free/custom plans

-- Drop existing check constraint
ALTER TABLE public.plans
DROP CONSTRAINT IF EXISTS plans_billing_interval_check;

-- Add updated check constraint that allows NULL
ALTER TABLE public.plans
ADD CONSTRAINT plans_billing_interval_check
CHECK (billing_interval IS NULL OR billing_interval = ANY (ARRAY['month'::text, 'year'::text]));

-- Update comment
COMMENT ON COLUMN public.plans.billing_interval IS 'Billing cycle: month, year, or NULL for free/custom plans';

