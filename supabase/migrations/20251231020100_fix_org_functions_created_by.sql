-- =====================================================
-- Fix Organization Audit Functions - Remove created_by
-- =====================================================
-- 
-- Migration 20251231000000 created functions that reference
-- a non-existent 'created_by' column. This migration fixes that.
-- =====================================================

-- Drop the buggy functions
DROP FUNCTION IF EXISTS create_organization_with_audit(uuid, text, text, text, text, text, text, text, text, text, text);
DROP FUNCTION IF EXISTS update_organization_with_audit(uuid, uuid, text, text, text, text, text, text, text, text, text, text);

-- Recreate create_organization_with_audit WITHOUT created_by column
CREATE OR REPLACE FUNCTION create_organization_with_audit(
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
  p_admin_contact_phone text DEFAULT NULL
) RETURNS organizations AS $$
DECLARE
  v_organization organizations;
BEGIN
  -- Set user context for audit logging
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  -- Create the organization with billing fields (NO created_by)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate update_organization_with_audit (already correct, but recreating for consistency)
CREATE OR REPLACE FUNCTION update_organization_with_audit(
  p_user_id uuid,
  p_organization_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_billing_phone text DEFAULT NULL,
  p_billing_email text DEFAULT NULL,
  p_billing_address text DEFAULT NULL,
  p_billing_city text DEFAULT NULL,
  p_billing_state text DEFAULT NULL,
  p_billing_zip text DEFAULT NULL,
  p_admin_contact_email text DEFAULT NULL,
  p_admin_contact_phone text DEFAULT NULL
) RETURNS organizations AS $$
DECLARE
  v_organization organizations;
BEGIN
  -- Set user context for audit logging
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  -- Update the organization (only update fields that are provided)
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_organization_with_audit TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_organization_with_audit TO authenticated, service_role;

-- Add comments
COMMENT ON FUNCTION create_organization_with_audit IS 
'Creates an organization with billing fields and proper audit logging. Fixed version without created_by column.';

COMMENT ON FUNCTION update_organization_with_audit IS 
'Updates an organization with billing fields and proper audit logging.';

