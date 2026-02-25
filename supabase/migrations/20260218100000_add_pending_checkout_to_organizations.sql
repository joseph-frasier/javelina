-- =====================================================
-- Add Pending Checkout Fields to Organizations
-- =====================================================
--
-- When a user creates an organization during the plan
-- selection flow but abandons checkout before completing
-- payment, these fields track which plan they intended
-- to purchase. This allows the frontend to show a
-- "Complete Payment" banner and reconstruct the checkout
-- URL so the user can resume.
--
-- Fields are cleared by the backend when the subscription
-- is successfully activated (via Stripe webhook).
-- =====================================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pending_plan_code TEXT,
  ADD COLUMN IF NOT EXISTS pending_price_id TEXT;

COMMENT ON COLUMN organizations.pending_plan_code IS 'Plan code the user intended to purchase during org creation (e.g., starter_lifetime, pro). Cleared when subscription is activated.';
COMMENT ON COLUMN organizations.pending_price_id IS 'Stripe Price ID for the intended plan. Cleared when subscription is activated.';
