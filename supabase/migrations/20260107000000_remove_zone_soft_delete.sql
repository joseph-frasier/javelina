-- ============================================================================
-- REMOVE ZONE SOFT DELETE MIGRATION
-- ============================================================================
-- This migration removes soft delete functionality from zones and implements
-- hard deletion. The deleted_at column is removed while the live column is
-- retained for other purposes.
-- 
-- Created: 2026-01-07
-- Purpose: Replace soft deletion with hard deletion for zones
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. DROP OBSOLETE SOFT DELETE FUNCTIONS
-- ----------------------------------------------------------------------------

-- Drop soft delete function (updates deleted_at timestamp)
DROP FUNCTION IF EXISTS public.soft_delete_zone(uuid);

-- Drop restore zone function (clears deleted_at timestamp)
DROP FUNCTION IF EXISTS public.restore_zone(uuid);

-- Drop audit-based soft delete function (if exists)
DROP FUNCTION IF EXISTS public.delete_zone_with_audit(uuid, uuid);

-- ----------------------------------------------------------------------------
-- 2. UPDATE ZONE NAME UNIQUENESS CHECK
-- ----------------------------------------------------------------------------

-- Update check_zone_name_exists to remove deleted_at filter
-- Zone names must be unique globally, regardless of deleted_at status
CREATE OR REPLACE FUNCTION public.check_zone_name_exists(zone_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.zones
    WHERE name = zone_name
  );
END;
$$;

COMMENT ON FUNCTION public.check_zone_name_exists(text) IS 
  'Check if a zone name exists globally (no soft delete filtering)';

-- ----------------------------------------------------------------------------
-- 3. VERIFY CASCADE DELETE CONSTRAINTS
-- ----------------------------------------------------------------------------

-- Verify zone_records cascade delete constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc 
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'zone_records'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND rc.delete_rule = 'CASCADE'
      AND rc.constraint_name = 'zone_records_zone_id_fkey'
  ) THEN
    RAISE EXCEPTION 'CASCADE DELETE constraint missing for zone_records.zone_id';
  END IF;
END $$;

-- Verify zone_tags cascade delete constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc 
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name = 'zone_tags'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND rc.delete_rule = 'CASCADE'
      AND rc.constraint_name = 'zone_tags_zone_id_fkey'
  ) THEN
    RAISE EXCEPTION 'CASCADE DELETE constraint missing for zone_tags.zone_id';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. REMOVE DELETED_AT COLUMN
-- ----------------------------------------------------------------------------

-- Remove deleted_at column from zones table
-- Note: The live column is intentionally KEPT as it has other uses
ALTER TABLE public.zones
DROP COLUMN IF EXISTS deleted_at;

-- Update zones table comment to reflect hard deletion
COMMENT ON TABLE public.zones IS 
  'DNS zones table with hard deletion. Records and tags are cascade deleted.';

-- ----------------------------------------------------------------------------
-- 5. VERIFICATION
-- ----------------------------------------------------------------------------

-- Verify deleted_at column is removed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zones'
      AND column_name = 'deleted_at'
  ) THEN
    RAISE EXCEPTION 'deleted_at column still exists on zones table';
  END IF;
END $$;

-- Verify live column still exists (should NOT be removed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'zones'
      AND column_name = 'live'
  ) THEN
    RAISE EXCEPTION 'live column was incorrectly removed from zones table';
  END IF;
END $$;

-- Verify soft delete functions are dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname IN ('soft_delete_zone', 'restore_zone', 'delete_zone_with_audit')
  ) THEN
    RAISE EXCEPTION 'Soft delete functions still exist';
  END IF;
END $$;

-- Migration complete

