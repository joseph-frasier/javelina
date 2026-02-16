-- ================================================================
-- Create stripe_webhook_events table for webhook idempotency
-- ================================================================
-- Prevents duplicate processing of Stripe webhook events.
-- The backend checks this table before processing any webhook.
-- ================================================================

CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cleanup queries (delete events older than X days)
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed_at
  ON public.stripe_webhook_events (processed_at);

-- Enable RLS (only service role should access this table)
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

-- No RLS policies = only service role can read/write
-- This is intentional: webhooks are handled by the backend (service role only)

COMMENT ON TABLE public.stripe_webhook_events IS 'Tracks processed Stripe webhook event IDs to ensure idempotent handling';
