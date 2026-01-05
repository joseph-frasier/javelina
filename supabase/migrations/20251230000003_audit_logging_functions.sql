-- =====================================================
-- Audit Logging Functions
-- =====================================================
-- These functions wrap INSERT/UPDATE operations to ensure user_id
-- is properly captured in audit logs when using service role keys.
--
-- Each function:
-- 1. Sets the session variable 'app.current_user_id' 
-- 2. Performs the mutation
-- 3. Returns the affected record
--
-- The handle_audit_log() trigger reads from this session variable.

-- =====================================================
-- DROP EXISTING FUNCTIONS (to fix return types)
-- =====================================================
DROP FUNCTION IF EXISTS delete_zone_with_audit(uuid, uuid);
DROP FUNCTION IF EXISTS delete_zone_record_with_audit(uuid, uuid);
DROP FUNCTION IF EXISTS delete_organization_with_audit(uuid, uuid);

-- =====================================================
-- ZONE FUNCTIONS
-- =====================================================

-- Create zone with audit
CREATE OR REPLACE FUNCTION create_zone_with_audit(
  p_user_id uuid,
  p_name text,
  p_organization_id uuid,
  p_description text DEFAULT NULL,
  p_admin_email text DEFAULT 'admin@example.com',
  p_negative_caching_ttl integer DEFAULT 3600
) RETURNS zones AS $$
DECLARE
  v_zone zones;
BEGIN
  -- Set user context for audit log trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update zone with audit
CREATE OR REPLACE FUNCTION update_zone_with_audit(
  p_user_id uuid,
  p_zone_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_admin_email text DEFAULT NULL,
  p_negative_caching_ttl integer DEFAULT NULL,
  p_live boolean DEFAULT NULL
) RETURNS zones AS $$
DECLARE
  v_zone zones;
BEGIN
  -- Set user context for audit log trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete zone with audit (soft delete)
CREATE OR REPLACE FUNCTION delete_zone_with_audit(
  p_user_id uuid,
  p_zone_id uuid
) RETURNS zones AS $$
DECLARE
  v_zone zones;
BEGIN
  -- Set user context for audit log trigger
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  UPDATE zones
  SET 
    deleted_at = now(),
    live = false,
    updated_at = now()
  WHERE id = p_zone_id
  RETURNING * INTO v_zone;
  
  RETURN v_zone;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ZONE_RECORDS FUNCTIONS
-- =====================================================

-- Create zone record with audit
CREATE OR REPLACE FUNCTION create_zone_record_with_audit(
  p_user_id uuid,
  p_zone_id uuid,
  p_name text,
  p_type text,
  p_value text,
  p_ttl integer DEFAULT 3600,
  p_comment text DEFAULT NULL
) RETURNS zone_records AS $$
DECLARE
  v_record zone_records;
BEGIN
  -- Set user context for audit log trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update zone record with audit
CREATE OR REPLACE FUNCTION update_zone_record_with_audit(
  p_user_id uuid,
  p_record_id uuid,
  p_name text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_value text DEFAULT NULL,
  p_ttl integer DEFAULT NULL,
  p_comment text DEFAULT NULL
) RETURNS zone_records AS $$
DECLARE
  v_record zone_records;
BEGIN
  -- Set user context for audit log trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete zone record with audit
CREATE OR REPLACE FUNCTION delete_zone_record_with_audit(
  p_user_id uuid,
  p_record_id uuid
) RETURNS zone_records AS $$
DECLARE
  v_record zone_records;
BEGIN
  -- Set user context for audit log trigger
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  DELETE FROM zone_records
  WHERE id = p_record_id
  RETURNING * INTO v_record;
  
  RETURN v_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ORGANIZATION FUNCTIONS
-- =====================================================

-- Create organization with audit
CREATE OR REPLACE FUNCTION create_organization_with_audit(
  p_user_id uuid,
  p_name text,
  p_description text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL
) RETURNS organizations AS $$
DECLARE
  v_org organizations;
BEGIN
  -- Set user context for audit log trigger
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  INSERT INTO organizations (
    name,
    description,
    slug,
    owner_id
  )
  VALUES (
    p_name,
    p_description,
    p_slug,
    COALESCE(p_owner_id, p_user_id)
  )
  RETURNING * INTO v_org;
  
  RETURN v_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update organization with audit
CREATE OR REPLACE FUNCTION update_organization_with_audit(
  p_user_id uuid,
  p_org_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_slug text DEFAULT NULL,
  p_logo_url text DEFAULT NULL,
  p_settings jsonb DEFAULT NULL,
  p_is_active boolean DEFAULT NULL
) RETURNS organizations AS $$
DECLARE
  v_org organizations;
BEGIN
  -- Set user context for audit log trigger
  PERFORM set_config('app.current_user_id', p_user_id::text, true);
  
  UPDATE organizations
  SET 
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    slug = COALESCE(p_slug, slug),
    logo_url = COALESCE(p_logo_url, logo_url),
    settings = COALESCE(p_settings, settings),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_org_id
  RETURNING * INTO v_org;
  
  RETURN v_org;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete organization with audit (soft delete)
CREATE OR REPLACE FUNCTION delete_organization_with_audit(
  p_user_id uuid,
  p_org_id uuid
) RETURNS organizations AS $$
DECLARE
  v_org organizations;
BEGIN
  -- Set user context for audit log trigger
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

