-- Discount codes become issuers of org_pricing_rules.
-- Replaces the promotion_codes / discount_redemptions system entirely.

CREATE TABLE discount_codes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code              text NOT NULL UNIQUE,
  description       text,
  customer_blurb    text,

  -- Grant duration: how long granted rules last once redeemed.
  duration_months   integer,
  grant_ends_at     timestamptz,
  -- both NULL = open-ended

  -- Code availability: a separate axis from grant duration.
  redeemable_until  timestamptz,
  max_redemptions   integer,
  times_redeemed    integer NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,

  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT duration_mode CHECK (num_nonnulls(duration_months, grant_ends_at) <= 1),
  CONSTRAINT duration_positive CHECK (duration_months IS NULL OR duration_months > 0),
  CONSTRAINT max_redemptions_positive CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  CONSTRAINT code_is_upper CHECK (code = upper(code))
);

CREATE TABLE discount_code_rules (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  scope            org_pricing_scope    NOT NULL,
  category         org_pricing_category,
  discount_type    org_pricing_type     NOT NULL,
  value_bps        integer,
  value_cents      integer,

  CONSTRAINT scope_category_coherent CHECK (
    (scope = 'all'      AND category IS NULL) OR
    (scope = 'category' AND category IS NOT NULL)
  ),
  CONSTRAINT value_matches_type CHECK (
    (discount_type = 'percent'        AND value_bps IS NOT NULL AND value_bps BETWEEN 1 AND 10000 AND value_cents IS NULL) OR
    (discount_type = 'waive'          AND value_bps IS NULL AND value_cents IS NULL) OR
    (discount_type = 'price_override' AND value_cents IS NOT NULL AND value_cents >= 0 AND value_bps IS NULL)
  )
);

CREATE UNIQUE INDEX uq_code_rule_category
  ON discount_code_rules (discount_code_id, category) WHERE scope = 'category';
CREATE UNIQUE INDEX uq_code_rule_baseline
  ON discount_code_rules (discount_code_id) WHERE scope = 'all';

CREATE TABLE discount_code_redemptions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES discount_codes(id),
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  redeemed_by      uuid REFERENCES profiles(id),
  redeemed_at      timestamptz NOT NULL DEFAULT now(),
  granted_rule_ids uuid[] NOT NULL,
  UNIQUE (discount_code_id, org_id)
);

CREATE INDEX idx_discount_code_redemptions_org ON discount_code_redemptions (org_id);

-- RLS: these tables are written only by the backend service role.
-- No policies are added, so anon/authenticated clients get nothing.
ALTER TABLE discount_codes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_redemptions  ENABLE ROW LEVEL SECURITY;

-- The superseded system. Confirm production counts before this runs.
-- Retained rather than dropped. These are settled money records tied to live
-- Stripe invoices, and nothing migrates them into the new tables — the schemas
-- are not compatible (per-invoice money records vs per-org grants). Renaming
-- keeps the history queryable and makes this migration reversible. Drop the
-- _deprecated tables in a follow-up once accounting confirms they are not
-- needed.
ALTER TABLE IF EXISTS discount_redemptions RENAME TO discount_redemptions_deprecated;
ALTER TABLE IF EXISTS promotion_codes      RENAME TO promotion_codes_deprecated;

-- Orphaned by the rename: its body references promotion_codes and nothing
-- calls it now that the Stripe promo path is gone.
DROP FUNCTION IF EXISTS public.increment_promotion_code_redemption();
