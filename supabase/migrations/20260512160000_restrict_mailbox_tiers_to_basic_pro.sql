-- Restrict customer-facing mailbox tiers to Basic and Pro, with Pro
-- resized to 20 GB to fit under the OpenSRS company-level Quota Maximum
-- of 20 GB. Pro's margin is raised to 75% to match Basic.
--
-- Business and Enterprise are deactivated (not deleted) so they can be
-- re-enabled if OpenSRS raises the company Quota Maximum.
--
-- Stripe sync: stripe_price_id is intentionally NOT cleared. If/when a
-- cached price exists, mailbox-billing.ts:getOrCreateStripePrice will
-- detect the price drift on the next subscription action, deactivate
-- the old Stripe price, and create a fresh one. Clearing it here would
-- orphan the old Stripe price.

update mailbox_pricing
set storage_gb = 20,
    margin_percent = 75.00,
    updated_at = now()
where tier_name = 'Pro';

update mailbox_pricing
set is_active = false,
    updated_at = now()
where tier_name in ('Business', 'Enterprise');
