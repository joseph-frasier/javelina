-- =====================================================
-- Usage Count Functions for Plan Limit Enforcement
-- Migration: 20251211000000_add_usage_count_functions.sql
-- =====================================================
-- These functions are used by the backend to check current usage
-- against plan limits before allowing resource creation.
-- =====================================================

-- Zone count (simple - no exclusions needed)
-- Returns count of non-deleted zones for an organization
CREATE OR REPLACE FUNCTION get_org_zone_count(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0) 
  FROM zones 
  WHERE organization_id = org_uuid 
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Record count across all zones in org
-- Returns total DNS records across all non-deleted zones in an organization
CREATE OR REPLACE FUNCTION get_org_record_count(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM zone_records zr
  JOIN zones z ON z.id = zr.zone_id
  WHERE z.organization_id = org_uuid
    AND z.deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Member count: EXCLUDES superadmin users (system accounts)
-- This ensures customers only see their actual team members
-- 
-- CRITICAL: The trigger_auto_add_superadmins adds all profiles.superadmin=true 
-- users to every organization automatically. These system users should NOT
-- count against a customer's team member limit.
CREATE OR REPLACE FUNCTION get_org_member_count(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0) 
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = org_uuid
    AND p.superadmin = false;  -- Critical: exclude system superadmins
$$ LANGUAGE sql STABLE;

-- Comments for clarity
COMMENT ON FUNCTION get_org_zone_count IS 'Returns count of non-deleted zones for an organization';
COMMENT ON FUNCTION get_org_record_count IS 'Returns total DNS records across all zones in an organization';
COMMENT ON FUNCTION get_org_member_count IS 'Returns count of real team members (excludes system superadmins)';

-- =====================================================
-- Grant execute permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION get_org_zone_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_record_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_member_count(UUID) TO authenticated;

