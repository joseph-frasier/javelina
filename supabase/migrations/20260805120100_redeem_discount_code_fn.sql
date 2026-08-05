-- Atomic discount code redemption.
--
-- Every condition evaluateCode() checks is re-checked here inside the
-- transaction, with the code row locked. That is what makes two concurrent
-- redemptions of a max_redemptions=1 code impossible — the system this
-- replaces incremented its counter outside any transaction and conceded
-- in a log line that the count "may drift slightly".
--
-- Month arithmetic uses make_interval, which clamps to the last day of a
-- short target month (Jan 31 + 1 month = Feb 28). services/discounts/dates.ts
-- reimplements exactly that for the preview; the two must agree.

CREATE OR REPLACE FUNCTION redeem_discount_code(
  p_code    text,
  p_org_id  uuid,
  p_user_id uuid
) RETURNS uuid[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  IF EXISTS (
    SELECT 1 FROM discount_code_redemptions
     WHERE discount_code_id = v_code.id AND org_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'already_applied' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM org_pricing_rules
     WHERE org_id = p_org_id AND archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'org_has_pricing' USING ERRCODE = 'P0001';
  END IF;

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
      v_now, v_until,
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
