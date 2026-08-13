-- Corrects two defects in 20260805120100:
--
-- 1. org_has_pricing counted rules whose effective_until had passed. Nothing
--    archives a rule on expiry, so an org that redeemed a 3-month code was
--    refused every code thereafter, forever. The guard now ignores expired
--    rules, and expired rules are archived in-transaction before the insert so
--    uq_org_pricing_active_baseline / uq_org_pricing_active_category cannot
--    fire on the new grant. A partial index cannot filter on now(), so the
--    retirement has to happen here rather than in the index.
--
-- 2. inactive / expired / fully_redeemed were raised before already_applied,
--    so an org holding a live grant from a now-full code was told its discount
--    had "reached its redemption limit". Code state cannot invalidate a grant
--    that already exists: already_applied is answered first.

CREATE OR REPLACE FUNCTION redeem_discount_code(
  p_code    text,
  p_org_id  uuid,
  p_user_id uuid
) RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code   discount_codes%ROWTYPE;
  v_rule   discount_code_rules%ROWTYPE;
  v_until  timestamptz;
  v_new_id uuid;
  v_ids    uuid[] := '{}';
  v_now    timestamptz := now();
BEGIN
  SELECT * INTO v_code
    FROM discount_codes
   WHERE code = upper(btrim(p_code))
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  -- Serialize all redemptions for this org. The code row lock alone does not
  -- cover the org_has_pricing guard below: two different codes redeemed for
  -- the same org lock different rows, so without this they never serialize
  -- and both can pass a guard that neither has yet invalidated.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_org_id::text, 0));

  -- Answered first: an existing grant is a fact about this org, and no later
  -- change to the code's state can undo it.
  IF EXISTS (
    SELECT 1 FROM discount_code_redemptions
     WHERE discount_code_id = v_code.id AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'already_applied' USING ERRCODE = 'P0001';
  END IF;

  IF NOT v_code.is_active THEN
    RAISE EXCEPTION 'inactive' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.redeemable_until IS NOT NULL AND v_code.redeemable_until < v_now THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.grant_ends_at IS NOT NULL AND v_code.grant_ends_at < v_now THEN
    RAISE EXCEPTION 'expired' USING ERRCODE = 'P0001';
  END IF;

  IF v_code.max_redemptions IS NOT NULL
     AND v_code.times_redeemed >= v_code.max_redemptions THEN
    RAISE EXCEPTION 'fully_redeemed' USING ERRCODE = 'P0001';
  END IF;

  -- Blocks on anything unarchived that has not yet expired — in effect OR
  -- scheduled. A scheduled contract rule must still block, or the insert below
  -- collides with the partial unique index.
  IF EXISTS (
    SELECT 1 FROM org_pricing_rules
     WHERE org_id = p_org_id
       AND archived_at IS NULL
       AND (effective_until IS NULL OR effective_until > v_now)
  ) THEN
    RAISE EXCEPTION 'org_has_pricing' USING ERRCODE = 'P0001';
  END IF;

  -- Only expired rows can remain unarchived at this point. Retire them so the
  -- partial unique indexes see a clean slate. Bookkeeping, not a state change:
  -- these rules stopped applying when effective_until passed.
  UPDATE org_pricing_rules
     SET archived_at = v_now
   WHERE org_id = p_org_id
     AND archived_at IS NULL
     AND effective_until IS NOT NULL
     AND effective_until <= v_now;

  v_until := CASE
    WHEN v_code.duration_months IS NOT NULL
      THEN v_now + make_interval(months => v_code.duration_months)
    ELSE v_code.grant_ends_at
  END;

  FOR v_rule IN
    SELECT * FROM discount_code_rules WHERE discount_code_id = v_code.id
  LOOP
    INSERT INTO org_pricing_rules (
      org_id, scope, category, discount_type,
      value_bps, value_cents,
      effective_from, effective_until, note, created_by
    ) VALUES (
      p_org_id, v_rule.scope, v_rule.category, v_rule.discount_type,
      v_rule.value_bps, v_rule.value_cents,
      -- Backdate the start by a minute. resolvePricing filters
      -- effective_from <= now() using the API server's clock; if that clock
      -- trails the database's at all, a rule stamped with exactly now() is not
      -- yet effective when the subscription is created milliseconds later, and
      -- Stripe bills the first invoice at catalog price while the UI shows the
      -- discounted total. Only the start is backdated — v_until still runs from
      -- v_now, so the grant length is unchanged.
      v_now - interval '1 minute', v_until,
      'Granted by discount code ' || v_code.code, p_user_id
    )
    RETURNING id INTO v_new_id;

    v_ids := array_append(v_ids, v_new_id);
  END LOOP;

  INSERT INTO discount_code_redemptions (
    discount_code_id, org_id, redeemed_by, granted_rule_ids
  ) VALUES (v_code.id, p_org_id, p_user_id, v_ids);

  UPDATE discount_codes
     SET times_redeemed = times_redeemed + 1
   WHERE id = v_code.id;

  RETURN v_ids;
END;
$$;

REVOKE ALL ON FUNCTION redeem_discount_code(text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION redeem_discount_code(text, uuid, uuid) TO service_role;
