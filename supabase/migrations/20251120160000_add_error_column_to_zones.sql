-- =====================================================
-- Add Error Column to Zones Table
-- Migration: 20251120160000_add_error_column_to_zones.sql
-- =====================================================
-- This migration adds a nullable 'error' text field to zones table
-- for storing error messages or validation failures.
-- =====================================================

-- Add error column to zones table
ALTER TABLE public.zones 
  ADD COLUMN IF NOT EXISTS error TEXT DEFAULT NULL;

-- Verify the migration
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if error column exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'zones' 
      AND column_name = 'error'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE 'Migration complete: error column successfully added to zones table';
  ELSE
    RAISE EXCEPTION 'Error column was not added to zones table';
  END IF;
END $$;

