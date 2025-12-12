-- Migration: Sync subscriptions table schema with production
-- Adds 'lifetime' status option to subscriptions

-- Drop existing check constraint
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

-- Add updated check constraint with 'lifetime' status
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

-- Update comment
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status plus lifetime for permanent access';



