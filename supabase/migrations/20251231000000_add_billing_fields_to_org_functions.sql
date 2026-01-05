-- =====================================================
-- Update Organization Functions for Billing Fields
-- =====================================================
-- 
-- This migration updates the organization audit functions
-- to support the new billing contact fields added in
-- migration 20251230191655_add_billing_contact_fields.sql
--
-- New fields:
-- - billing_phone
-- - billing_email
-- - billing_address
-- - billing_city
-- - billing_state
-- - billing_zip
-- - admin_contact_email
-- - admin_contact_phone
-- =====================================================

-- Drop existing functions (with correct signatures from previous migrations)
DROP FUNCTION IF EXISTS create_organization_with_audit(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS update_organization_with_audit(uuid, uuid, text, text, text, text, jsonb, boolean);

-- Create organization with audit (with billing fields)
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
  
  -- Create the organization with billing fields
  INSERT INTO organizations (
    name, 
    description, 
    owner_id, 
    created_by,
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

-- Update organization with audit (with billing fields)
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

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- CREATE with billing fields:
-- const { data, error } = await supabaseAdmin.rpc('create_organization_with_audit', {
--   p_user_id: req.user.id,
--   p_name: 'My Organization',
--   p_description: 'Description here',
--   p_billing_phone: '(555) 123-4567',
--   p_billing_email: 'billing@example.com',
--   p_billing_address: '123 Main St',
--   p_billing_city: 'San Francisco',
--   p_billing_state: 'CA',
--   p_billing_zip: '94102',
--   p_admin_contact_email: 'admin@example.com',
--   p_admin_contact_phone: '(555) 987-6543'
-- });

-- UPDATE billing fields:
-- const { data, error } = await supabaseAdmin.rpc('update_organization_with_audit', {
--   p_user_id: req.user.id,
--   p_organization_id: orgId,
--   p_billing_phone: '(555) 999-8888',
--   p_billing_email: 'newbilling@example.com'
-- });

-- =====================================================
-- NOTES
-- =====================================================
-- 1. All billing fields are optional (DEFAULT NULL)
-- 2. Application-level validation enforces required fields for new orgs
-- 3. COALESCE ensures NULL parameters don't overwrite existing values
-- 4. Audit trigger automatically captures all field changes
-- =====================================================

