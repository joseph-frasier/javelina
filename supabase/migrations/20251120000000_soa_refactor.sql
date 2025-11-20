-- =====================================================
-- SOA Refactor: Move SOA Data to Zones Table
-- Migration: 20251120000000_soa_refactor.sql
-- =====================================================
-- This migration:
-- 1. Adds admin_email and negative_caching_ttl to zones table
-- 2. Drops zone_type, metadata, ttl, records_count from zones
-- 3. Drops priority, active, metadata from zone_records
-- 4. Keeps existing SOA serial triggers intact
-- 5. Does NOT create SOA records (will be generated dynamically)
-- =====================================================

-- =====================================================
-- STEP 1: Add new columns to zones table
-- =====================================================

-- Add admin_email column
ALTER TABLE public.zones 
  ADD COLUMN IF NOT EXISTS admin_email TEXT DEFAULT 'admin@example.com';

-- Add negative_caching_ttl column
ALTER TABLE public.zones 
  ADD COLUMN IF NOT EXISTS negative_caching_ttl INT4 DEFAULT 3600;

-- =====================================================
-- STEP 2: Migrate existing SOA data from zone_records
-- =====================================================

-- Update zones with admin_email from existing SOA records if they exist
UPDATE public.zones z
SET admin_email = (zr.metadata->>'admin_email')::TEXT
FROM public.zone_records zr
WHERE zr.zone_id = z.id 
  AND zr.type = 'SOA'
  AND zr.metadata IS NOT NULL
  AND zr.metadata->>'admin_email' IS NOT NULL;

-- Update zones with negative_caching_ttl from existing SOA records if they exist
UPDATE public.zones z
SET negative_caching_ttl = (zr.metadata->>'negative_ttl')::INT4
FROM public.zone_records zr
WHERE zr.zone_id = z.id 
  AND zr.type = 'SOA'
  AND zr.metadata IS NOT NULL
  AND zr.metadata->>'negative_ttl' IS NOT NULL;

-- =====================================================
-- STEP 3: Delete SOA records from zone_records
-- =====================================================

-- Remove SOA records as they will now be generated dynamically
DELETE FROM public.zone_records 
WHERE type = 'SOA';

-- Drop the unique SOA index if it exists
DROP INDEX IF EXISTS unique_soa_per_zone;

-- =====================================================
-- STEP 4: Drop columns from zone_records table
-- =====================================================

-- Drop priority column
ALTER TABLE public.zone_records 
  DROP COLUMN IF EXISTS priority;

-- Drop active column
ALTER TABLE public.zone_records 
  DROP COLUMN IF EXISTS active;

-- Drop metadata column
ALTER TABLE public.zone_records 
  DROP COLUMN IF EXISTS metadata;

-- =====================================================
-- STEP 5: Drop columns from zones table
-- =====================================================

-- Drop the CHECK constraint on zone_type before dropping the column
ALTER TABLE public.zones 
  DROP CONSTRAINT IF EXISTS zones_zone_type_check;

-- Drop zone_type column
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS zone_type;

-- Drop metadata column
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS metadata;

-- Drop ttl column
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS ttl;

-- Drop records_count column (can be calculated via COUNT query if needed)
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS records_count;

-- =====================================================
-- STEP 6: Keep existing SOA serial triggers
-- =====================================================

-- The following triggers and functions should already exist from previous migration:
-- - increment_zone_serial_on_record_change() function
-- - increment_zone_serial_on_zone_change() function
-- - Triggers on zone_records (INSERT, UPDATE, DELETE)
-- - Trigger on zones (UPDATE)

-- Verify they exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_zone_serial_on_record_change'
  ) THEN
    RAISE EXCEPTION 'Missing function: increment_zone_serial_on_record_change';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'increment_zone_serial_on_zone_change'
  ) THEN
    RAISE EXCEPTION 'Missing function: increment_zone_serial_on_zone_change';
  END IF;
  
  RAISE NOTICE 'All required SOA serial functions are present';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify the migration
DO $$
DECLARE
  zones_count INTEGER;
  zones_with_admin_email INTEGER;
  zones_with_negative_ttl INTEGER;
BEGIN
  -- Count zones
  SELECT COUNT(*) INTO zones_count 
  FROM public.zones 
  WHERE deleted_at IS NULL;
  
  -- Count zones with admin_email
  SELECT COUNT(*) INTO zones_with_admin_email 
  FROM public.zones 
  WHERE deleted_at IS NULL AND admin_email IS NOT NULL;
  
  -- Count zones with negative_caching_ttl
  SELECT COUNT(*) INTO zones_with_negative_ttl 
  FROM public.zones 
  WHERE deleted_at IS NULL AND negative_caching_ttl IS NOT NULL;
  
  -- Log results
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Active zones: %', zones_count;
  RAISE NOTICE '  Zones with admin_email: %', zones_with_admin_email;
  RAISE NOTICE '  Zones with negative_caching_ttl: %', zones_with_negative_ttl;
END $$;

