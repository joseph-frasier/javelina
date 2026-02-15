-- ================================================================
-- Migration: Add unique index to prevent discount redemption races
-- ================================================================
-- The backend's recordDiscountRedemption uses a check-then-insert
-- pattern that is vulnerable to race conditions under concurrent
-- webhook processing. This partial unique index enforces atomicity
-- at the DB level. The backend already handles 23505 (unique
-- violation) gracefully, so this is safe to add.
-- ================================================================

-- Prevent the same promo code from being applied twice to the same invoice
CREATE UNIQUE INDEX IF NOT EXISTS uniq_discount_redemption_promo_invoice
ON public.discount_redemptions(promotion_code_id, stripe_invoice_id)
WHERE stripe_invoice_id IS NOT NULL;
