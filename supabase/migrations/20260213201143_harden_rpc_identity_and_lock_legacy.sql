-- ================================================================
-- Migration: Harden RPC identity checks + lock down legacy functions
-- ================================================================
-- Part A: Add auth.uid() identity guard to all *_with_audit functions.
--         This prevents user impersonation via direct PostgREST RPC calls.
--         service_role calls (backend) have auth.uid() = NULL and are unaffected.
--
-- Part B: REVOKE EXECUTE from authenticated/anon on dangerous legacy
--         SECURITY DEFINER functions that lack authorization checks.
--         service_role retains access. Trigger invocations are unaffected.
-- ================================================================


-- =====================================================
-- PART A: Identity-hardened *_with_audit functions
-- =====================================================

-- 1. create_organization_with_audit
CREATE OR REPLACE FUNCTION public.create_organization_with_audit(
  p_user_id UUID,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_billing_phone TEXT DEFAULT NULL,
  p_billing_email TEXT DEFAULT NULL,
  p_billing_address TEXT DEFAULT NULL,
  p_billing_city TEXT DEFAULT NULL,
  p_billing_state TEXT DEFAULT NULL,
  p_billing_zip TEXT DEFAULT NULL,
  p_admin_contact_email TEXT DEFAULT NULL,
  p_admin_contact_phone TEXT DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization organizations;
BEGIN
  -- Identity guard: prevent impersonation via direct RPC
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  INSERT INTO organizations (
    name,
    description,
    owner_id,
    billing_phone,
    billing_email,
    billing_address,
    billing_city,
    billing_state,
    billing_zip,
    admin_contact_email,
    admin_contact_phone
  )
  VALUES (
    p_name,
    p_description,
    p_user_id,
    p_billing_phone,
    p_billing_email,
    p_billing_address,
    p_billing_city,
    p_billing_state,
    p_billing_zip,
    p_admin_contact_email,
    p_admin_contact_phone
  )
  RETURNING * INTO v_organization;

  RETURN v_organization;
END;
$$;


-- 2. update_organization_with_audit
CREATE OR REPLACE FUNCTION public.update_organization_with_audit(
  p_user_id UUID,
  p_organization_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_billing_phone TEXT DEFAULT NULL,
  p_billing_email TEXT DEFAULT NULL,
  p_billing_address TEXT DEFAULT NULL,
  p_billing_city TEXT DEFAULT NULL,
  p_billing_state TEXT DEFAULT NULL,
  p_billing_zip TEXT DEFAULT NULL,
  p_admin_contact_email TEXT DEFAULT NULL,
  p_admin_contact_phone TEXT DEFAULT NULL
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_organization organizations;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  PERFORM verify_org_membership(p_user_id, p_organization_id, ARRAY['SuperAdmin', 'Admin', 'BillingContact']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  UPDATE organizations
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    billing_phone = COALESCE(p_billing_phone, billing_phone),
    billing_email = COALESCE(p_billing_email, billing_email),
    billing_address = COALESCE(p_billing_address, billing_address),
    billing_city = COALESCE(p_billing_city, billing_city),
    billing_state = COALESCE(p_billing_state, billing_state),
    billing_zip = COALESCE(p_billing_zip, billing_zip),
    admin_contact_email = COALESCE(p_admin_contact_email, admin_contact_email),
    admin_contact_phone = COALESCE(p_admin_contact_phone, admin_contact_phone),
    updated_at = now()
  WHERE id = p_organization_id
  RETURNING * INTO v_organization;

  RETURN v_organization;
END;
$$;


-- 3. delete_organization_with_audit
CREATE OR REPLACE FUNCTION public.delete_organization_with_audit(
  p_user_id UUID,
  p_org_id UUID
)
RETURNS organizations
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org organizations;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  PERFORM verify_org_membership(p_user_id, p_org_id, ARRAY['SuperAdmin', 'Admin']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  UPDATE organizations
  SET
    deleted_at = now(),
    status = 'deleted',
    updated_at = now()
  WHERE id = p_org_id
  RETURNING * INTO v_org;

  RETURN v_org;
END;
$$;


-- 4. create_zone_with_audit
CREATE OR REPLACE FUNCTION public.create_zone_with_audit(
  p_user_id UUID,
  p_name TEXT,
  p_organization_id UUID,
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT 'admin@example.com',
  p_negative_caching_ttl INTEGER DEFAULT 3600
)
RETURNS zones
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_zone zones;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  PERFORM verify_org_membership(p_user_id, p_organization_id, ARRAY['SuperAdmin', 'Admin', 'Editor']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  INSERT INTO zones (
    name,
    organization_id,
    description,
    admin_email,
    negative_caching_ttl,
    created_by
  )
  VALUES (
    p_name,
    p_organization_id,
    p_description,
    p_admin_email,
    p_negative_caching_ttl,
    p_user_id
  )
  RETURNING * INTO v_zone;

  RETURN v_zone;
END;
$$;


-- 5. update_zone_with_audit
CREATE OR REPLACE FUNCTION public.update_zone_with_audit(
  p_user_id UUID,
  p_zone_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_admin_email TEXT DEFAULT NULL,
  p_negative_caching_ttl INTEGER DEFAULT NULL,
  p_live BOOLEAN DEFAULT NULL
)
RETURNS zones
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_zone zones;
  v_org_id UUID;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_org_id FROM zones WHERE id = p_zone_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Zone % not found', p_zone_id;
  END IF;

  PERFORM verify_org_membership(p_user_id, v_org_id, ARRAY['SuperAdmin', 'Admin', 'Editor']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  UPDATE zones
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    admin_email = COALESCE(p_admin_email, admin_email),
    negative_caching_ttl = COALESCE(p_negative_caching_ttl, negative_caching_ttl),
    live = COALESCE(p_live, live),
    updated_at = now()
  WHERE id = p_zone_id
  RETURNING * INTO v_zone;

  RETURN v_zone;
END;
$$;


-- 6. create_zone_record_with_audit
CREATE OR REPLACE FUNCTION public.create_zone_record_with_audit(
  p_user_id UUID,
  p_zone_id UUID,
  p_name TEXT,
  p_type TEXT,
  p_value TEXT,
  p_ttl INTEGER DEFAULT 3600,
  p_comment TEXT DEFAULT NULL
)
RETURNS zone_records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record zone_records;
  v_org_id UUID;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT organization_id INTO v_org_id FROM zones WHERE id = p_zone_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Zone % not found', p_zone_id;
  END IF;

  PERFORM verify_org_membership(p_user_id, v_org_id, ARRAY['SuperAdmin', 'Admin', 'Editor']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  INSERT INTO zone_records (
    zone_id,
    name,
    type,
    value,
    ttl,
    comment,
    created_by
  )
  VALUES (
    p_zone_id,
    p_name,
    p_type,
    p_value,
    p_ttl,
    p_comment,
    p_user_id
  )
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;


-- 7. update_zone_record_with_audit
CREATE OR REPLACE FUNCTION public.update_zone_record_with_audit(
  p_user_id UUID,
  p_record_id UUID,
  p_name TEXT DEFAULT NULL,
  p_type TEXT DEFAULT NULL,
  p_value TEXT DEFAULT NULL,
  p_ttl INTEGER DEFAULT NULL,
  p_comment TEXT DEFAULT NULL
)
RETURNS zone_records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record zone_records;
  v_org_id UUID;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT z.organization_id INTO v_org_id
  FROM zone_records zr
  JOIN zones z ON z.id = zr.zone_id
  WHERE zr.id = p_record_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Zone record % not found', p_record_id;
  END IF;

  PERFORM verify_org_membership(p_user_id, v_org_id, ARRAY['SuperAdmin', 'Admin', 'Editor']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  UPDATE zone_records
  SET
    name = COALESCE(p_name, name),
    type = COALESCE(p_type, type),
    value = COALESCE(p_value, value),
    ttl = COALESCE(p_ttl, ttl),
    comment = COALESCE(p_comment, comment),
    updated_at = now()
  WHERE id = p_record_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;


-- 8. delete_zone_record_with_audit
CREATE OR REPLACE FUNCTION public.delete_zone_record_with_audit(
  p_user_id UUID,
  p_record_id UUID
)
RETURNS zone_records
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record zone_records;
  v_org_id UUID;
BEGIN
  -- Identity guard
  IF auth.uid() IS NOT NULL AND p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: caller identity mismatch'
      USING ERRCODE = '42501';
  END IF;

  SELECT z.organization_id INTO v_org_id
  FROM zone_records zr
  JOIN zones z ON z.id = zr.zone_id
  WHERE zr.id = p_record_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Zone record % not found', p_record_id;
  END IF;

  PERFORM verify_org_membership(p_user_id, v_org_id, ARRAY['SuperAdmin', 'Admin', 'Editor']);

  PERFORM set_config('app.current_user_id', p_user_id::text, true);

  DELETE FROM zone_records
  WHERE id = p_record_id
  RETURNING * INTO v_record;

  RETURN v_record;
END;
$$;


-- =====================================================
-- PART B: Revoke access on dangerous legacy functions
-- =====================================================
-- These SECURITY DEFINER functions have no authorization checks.
-- Only service_role (backend) and postgres should be able to call them.

-- Dangerous: any user can soft-delete / restore ANY org
REVOKE EXECUTE ON FUNCTION public.soft_delete_organization(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.restore_organization(uuid) FROM authenticated, anon;

-- Dangerous: any user can impersonate another user in audit logs
REVOKE EXECUTE ON FUNCTION public.set_user_context(uuid) FROM authenticated, anon;

-- Not used by frontend; only called via service_role in backend
REVOKE EXECUTE ON FUNCTION public.increment_promotion_code_redemption(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.increment_attempt_count(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.get_conversation_summary(uuid) FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.update_member_last_accessed(uuid, uuid) FROM authenticated, anon;

-- Maintenance / trigger functions: should not be callable via RPC
REVOKE EXECUTE ON FUNCTION public.check_expired_invitations() FROM authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_support_data() FROM authenticated, anon;

-- Preserve grants on hardened functions
GRANT EXECUTE ON FUNCTION public.create_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_zone_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_zone_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_zone_record_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_zone_record_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_zone_record_with_audit TO authenticated, service_role;
