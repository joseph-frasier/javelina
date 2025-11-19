-- =====================================================
-- DNS Schema Refactor: Zones & Zone_Records Overhaul
-- Migration: 20251119000000_zone_schema_refactor.sql
-- =====================================================
-- This migration:
-- 1. Creates SOA records for all existing zones
-- 2. Adds unique constraint for one SOA per zone
-- 3. Drops zone_type, metadata, ttl, records_count from zones
-- 4. Drops priority, active from zone_records
-- 5. Creates triggers for automatic soa_serial incrementing
-- =====================================================

-- =====================================================
-- STEP 1: Create SOA records for existing zones
-- =====================================================

-- Insert SOA records for zones that don't have one yet
INSERT INTO public.zone_records (
  zone_id,
  name,
  type,
  value,
  ttl,
  comment,
  metadata,
  created_by,
  created_at,
  updated_at
)
SELECT 
  z.id as zone_id,
  '@' as name,
  'SOA' as type,
  'SOA Record' as value,
  86400 as ttl, -- 24 hours, standard for SOA
  'Auto-generated SOA record' as comment,
  jsonb_build_object(
    'primary_nameserver', COALESCE(z.nameservers[1], 'ns1.example.com'),
    'admin_email', 'admin@example.com',
    'negative_ttl', COALESCE(z.ttl, 3600)
  ) as metadata,
  z.created_by,
  now() as created_at,
  now() as updated_at
FROM public.zones z
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.zone_records zr 
  WHERE zr.zone_id = z.id 
  AND zr.type = 'SOA'
)
AND z.deleted_at IS NULL;

-- =====================================================
-- STEP 2: Add partial unique index for SOA records
-- =====================================================

-- Ensure only one SOA record per zone
CREATE UNIQUE INDEX IF NOT EXISTS unique_soa_per_zone 
ON public.zone_records(zone_id) 
WHERE type = 'SOA';

-- =====================================================
-- STEP 3: Drop existing triggers and functions
-- =====================================================

-- Drop existing triggers that use functions we need to replace
DROP TRIGGER IF EXISTS zone_records_increment_soa_insert ON public.zone_records;
DROP TRIGGER IF EXISTS zone_records_increment_soa_update ON public.zone_records;
DROP TRIGGER IF EXISTS zone_records_increment_soa_delete ON public.zone_records;
DROP TRIGGER IF EXISTS zones_bump_soa_on_update ON public.zones;
DROP TRIGGER IF EXISTS zone_records_update_count_insert ON public.zone_records;
DROP TRIGGER IF EXISTS zone_records_update_count_delete ON public.zone_records;
DROP TRIGGER IF EXISTS zones_records_count_init ON public.zones;

-- Drop the old functions
DROP FUNCTION IF EXISTS public.increment_zone_soa_serial() CASCADE;
DROP FUNCTION IF EXISTS public.bump_zone_soa_on_update() CASCADE;
DROP FUNCTION IF EXISTS public.update_zone_records_count() CASCADE;

-- =====================================================
-- STEP 4: Create functions for serial auto-increment
-- =====================================================

-- Function to increment soa_serial on zone_records changes
CREATE OR REPLACE FUNCTION public.increment_zone_serial_on_record_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_zone_id uuid;
BEGIN
  -- Get the zone_id from the affected record
  target_zone_id := COALESCE(NEW.zone_id, OLD.zone_id);
  
  -- Increment the soa_serial for the zone
  UPDATE public.zones
  SET 
    soa_serial = soa_serial + 1,
    updated_at = now()
  WHERE id = target_zone_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to increment soa_serial on DNS-relevant zone changes
CREATE OR REPLACE FUNCTION public.increment_zone_serial_on_zone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment if DNS-relevant fields changed
  IF (NEW.nameservers IS DISTINCT FROM OLD.nameservers) OR
     (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.active IS DISTINCT FROM OLD.active) OR
     (NEW.description IS DISTINCT FROM OLD.description) OR
     (NEW.name IS DISTINCT FROM OLD.name) THEN
    
    NEW.soa_serial := NEW.soa_serial + 1;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 5: Create triggers for serial auto-increment
-- =====================================================

-- Trigger on zone_records INSERT
CREATE TRIGGER zone_records_increment_serial_insert
  AFTER INSERT ON public.zone_records
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_zone_serial_on_record_change();

-- Trigger on zone_records UPDATE
CREATE TRIGGER zone_records_increment_serial_update
  AFTER UPDATE ON public.zone_records
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_zone_serial_on_record_change();

-- Trigger on zone_records DELETE
CREATE TRIGGER zone_records_increment_serial_delete
  AFTER DELETE ON public.zone_records
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_zone_serial_on_record_change();

-- Trigger on zones UPDATE (for DNS-relevant changes)
CREATE TRIGGER zones_increment_serial_on_update
  BEFORE UPDATE ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_zone_serial_on_zone_change();

-- =====================================================
-- STEP 6: Drop columns from zone_records table
-- =====================================================

-- Drop priority column
ALTER TABLE public.zone_records 
  DROP COLUMN IF EXISTS priority;

-- Drop active column
ALTER TABLE public.zone_records 
  DROP COLUMN IF EXISTS active;

-- =====================================================
-- STEP 7: Drop columns from zones table
-- =====================================================

-- Drop the CHECK constraint on zone_type before dropping the column
ALTER TABLE public.zones 
  DROP CONSTRAINT IF EXISTS zones_zone_type_check;

-- Drop zone_type column
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS zone_type;

-- Drop metadata column (we moved negative_ttl to SOA record metadata)
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS metadata;

-- Drop ttl column (moved to SOA record metadata as negative_ttl)
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS ttl;

-- Drop records_count column (can be calculated via COUNT query if needed)
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS records_count;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify the migration
DO $$
DECLARE
  zones_count INTEGER;
  soa_count INTEGER;
BEGIN
  -- Count zones
  SELECT COUNT(*) INTO zones_count 
  FROM public.zones 
  WHERE deleted_at IS NULL;
  
  -- Count SOA records
  SELECT COUNT(*) INTO soa_count 
  FROM public.zone_records 
  WHERE type = 'SOA';
  
  -- Log results
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  Active zones: %', zones_count;
  RAISE NOTICE '  SOA records: %', soa_count;
  
  -- Warn if mismatch
  IF zones_count != soa_count THEN
    RAISE WARNING 'Zone/SOA count mismatch! Expected % SOA records but found %', zones_count, soa_count;
  END IF;
END $$;

