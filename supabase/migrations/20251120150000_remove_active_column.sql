-- =====================================================
-- Remove Active Column from Zones Table
-- Migration: 20251120150000_remove_active_column.sql
-- =====================================================
-- This migration removes the 'active' column from zones table.
-- All zones are now considered active once created.
-- The 'live' column remains for duplicate detection/flagging.
-- =====================================================

-- Drop trigger that depends on active column
DROP TRIGGER IF EXISTS zones_verification_health_update ON public.zones;

-- Drop active column from zones table
ALTER TABLE public.zones 
  DROP COLUMN IF EXISTS active;

-- Recreate the trigger without the active column dependency
CREATE TRIGGER zones_verification_health_update 
  AFTER INSERT OR DELETE OR UPDATE OF verification_status 
  ON public.zones 
  FOR EACH ROW 
  EXECUTE FUNCTION update_environment_health_status();

-- Update the increment_zone_serial_on_zone_change function to remove active reference
CREATE OR REPLACE FUNCTION public.increment_zone_serial_on_zone_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only increment if DNS-relevant fields changed
  -- Removed active column check since it no longer exists
  IF (NEW.nameservers IS DISTINCT FROM OLD.nameservers) OR
     (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.description IS DISTINCT FROM OLD.description) OR
     (NEW.name IS DISTINCT FROM OLD.name) THEN
    
    NEW.soa_serial := NEW.soa_serial + 1;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update the update_environment_health_status function to remove active reference
CREATE OR REPLACE FUNCTION public.update_environment_health_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
declare
  verified_count int;
  failed_count int;
  pending_count int;
  total_count int;
  env_health text;
begin
  -- Count zone statuses for the environment
  -- Removed 'and active = true' since active column no longer exists
  -- All zones are now considered active
  select 
    count(*) filter (where verification_status = 'verified'),
    count(*) filter (where verification_status = 'failed'),
    count(*) filter (where verification_status = 'pending'),
    count(*)
  into verified_count, failed_count, pending_count, total_count
  from public.zones
  where environment_id = coalesce(NEW.environment_id, OLD.environment_id)
    and deleted_at IS NULL;

  -- Determine health status based on zone verification
  if total_count = 0 then
    env_health := 'unknown';
  elsif failed_count > 0 then
    env_health := 'degraded';
  elsif verified_count = total_count then
    env_health := 'healthy';
  elsif pending_count > 0 then
    env_health := 'unknown';
  else
    env_health := 'unknown';
  end if;

  -- Update the environment's health status
  update public.environments
  set health_status = env_health,
      updated_at = now()
  where id = coalesce(NEW.environment_id, OLD.environment_id);

  return coalesce(NEW, OLD);
end;
$$;

-- Verify the migration
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if active column still exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'zones' 
      AND column_name = 'active'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE EXCEPTION 'Active column still exists after migration';
  ELSE
    RAISE NOTICE 'Migration complete: active column successfully removed';
  END IF;
END $$;

