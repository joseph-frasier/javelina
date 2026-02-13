-- ================================================================
-- Migration: Add membership validation to SECURITY DEFINER functions
-- ================================================================
-- All *_with_audit RPC functions are SECURITY DEFINER, meaning they
-- run as the function owner and bypass RLS. They accept p_user_id
-- without verifying the caller is that user or has membership.
--
-- Attack vector: Direct PostgREST RPC call with arbitrary p_user_id
-- and p_organization_id/p_zone_id to mutate another tenant's data.
--
-- Fix: Add membership checks inside each function using a shared
-- verify_org_membership() helper that also validates roles.
-- create_organization_with_audit is intentionally excluded from
-- membership checks because the org doesn't exist yet at call time.
-- ================================================================

-- Helper function: verify user is a member of an org with required roles
CREATE OR REPLACE FUNCTION public.verify_org_membership(
  p_user_id UUID,
  p_organization_id UUID,
  p_required_roles TEXT[] DEFAULT ARRAY['SuperAdmin', 'Admin', 'Editor']
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = p_user_id
      AND organization_id = p_organization_id
      AND role = ANY(p_required_roles)
  ) THEN
    RAISE EXCEPTION 'Access denied: user % is not an authorized member of organization %',
      p_user_id, p_organization_id;
  END IF;
END;
$$;


-- =====================================================
-- ZONE FUNCTIONS
-- =====================================================

-- Roles allowed: SuperAdmin, Admin, Editor (matches backend check)
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
  -- Verify membership
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


-- =====================================================
-- ZONE RECORD FUNCTIONS
-- =====================================================

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
-- ORGANIZATION FUNCTIONS
-- =====================================================

-- NOTE: create_organization_with_audit is intentionally NOT modified
-- with a membership check. When creating an org, the user is not yet
-- a member (the org doesn't exist). The backend adds them as Admin
-- AFTER org creation. We only add the identity guard.
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

-- SuperAdmin, Admin, or BillingContact can update org settings
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

-- Only SuperAdmin or Admin can delete an org
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


-- =====================================================
-- GRANT PERMISSIONS (preserve existing grants)
-- =====================================================
GRANT EXECUTE ON FUNCTION verify_org_membership TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_zone_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_zone_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_zone_record_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_zone_record_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_zone_record_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION create_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION delete_organization_with_audit TO authenticated, service_role;
