-- =====================================================
-- Update create_organization_with_audit for Pending Checkout
-- =====================================================
--
-- Replaces the 11-param version with a 13-param version that
-- includes p_pending_plan_code and p_pending_price_id to support
-- the "resume checkout" feature.
--
-- Because adding parameters changes the function signature,
-- CREATE OR REPLACE alone would create a second overload.
-- We must explicitly drop the old signature first.
--
-- Depends on columns added by migration:
--   20260218100000_add_pending_checkout_to_organizations.sql
-- =====================================================

-- Drop the old 11-param overload by exact signature
DROP FUNCTION IF EXISTS public.create_organization_with_audit(
  uuid, text, text, text, text, text, text, text, text, text, text
);

CREATE OR REPLACE FUNCTION public.create_organization_with_audit(
  p_user_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_billing_phone text DEFAULT NULL,
  p_billing_email text DEFAULT NULL,
  p_billing_address text DEFAULT NULL,
  p_billing_city text DEFAULT NULL,
  p_billing_state text DEFAULT NULL,
  p_billing_zip text DEFAULT NULL,
  p_admin_contact_email text DEFAULT NULL,
  p_admin_contact_phone text DEFAULT NULL,
  p_pending_plan_code text DEFAULT NULL,
  p_pending_price_id text DEFAULT NULL
) RETURNS organizations AS $$
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
    admin_contact_phone,
    pending_plan_code,
    pending_price_id
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
    p_admin_contact_phone,
    p_pending_plan_code,
    p_pending_price_id
  )
  RETURNING * INTO v_organization;

  RETURN v_organization;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant with full signature to avoid ambiguity
GRANT EXECUTE ON FUNCTION public.create_organization_with_audit(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text
) TO authenticated, service_role;
