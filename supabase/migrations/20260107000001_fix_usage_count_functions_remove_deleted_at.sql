-- ============================================================================
-- FIX USAGE COUNT FUNCTIONS - REMOVE DELETED_AT FILTER
-- ============================================================================
-- The get_org_zone_count function still references deleted_at column which
-- was removed in the zone hard delete migration. This causes the function
-- to error and return 0, breaking plan limit enforcement.
-- 
-- Created: 2026-01-07
-- Related: 20260107000000_remove_zone_soft_delete.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Update get_org_zone_count to remove deleted_at filter
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_org_zone_count(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0) 
  FROM zones 
  WHERE organization_id = org_uuid;
  -- Removed: AND deleted_at IS NULL (column no longer exists)
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_org_zone_count IS 'Returns count of zones for an organization (hard delete model)';

-- ----------------------------------------------------------------------------
-- Update get_org_record_count to remove deleted_at filter
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_org_record_count(org_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(COUNT(*)::INTEGER, 0)
  FROM zone_records zr
  JOIN zones z ON z.id = zr.zone_id
  WHERE z.organization_id = org_uuid;
  -- Removed: AND z.deleted_at IS NULL (column no longer exists)
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_org_record_count IS 'Returns total DNS records across all zones in an organization (hard delete model)';

-- ----------------------------------------------------------------------------
-- get_org_member_count is unchanged (no deleted_at dependency)
-- ----------------------------------------------------------------------------

-- Migration complete

