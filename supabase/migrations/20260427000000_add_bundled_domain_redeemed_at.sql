-- Track whether an organization has redeemed its bundled domain entitlement.
-- The $99 (business_starter) and $157 (business_pro) plans include one
-- bundled domain registration or transfer. NULL means available; a timestamp
-- means the entitlement has been consumed.

ALTER TABLE organizations
ADD COLUMN bundled_domain_redeemed_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN organizations.bundled_domain_redeemed_at IS
  'Timestamp when the org consumed its plan-bundled domain (register or transfer-in). NULL = entitlement still available.';
