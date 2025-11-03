-- =====================================================
-- Remove environments_count and zones_count from organization_members
-- =====================================================
-- These columns belong in the organizations and environments tables
-- respectively, not in organization_members.

-- Remove columns from organization_members table
ALTER TABLE public.organization_members
  DROP COLUMN IF EXISTS environments_count,
  DROP COLUMN IF EXISTS zones_count;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

