-- =====================================================
-- Consolidate Zone Status Fields Migration
-- =====================================================
-- Replace verification_status and last_verified_at with
-- last_valid_serial for simpler status tracking
-- =====================================================

-- Add the new last_valid_serial column
ALTER TABLE zones
ADD COLUMN last_valid_serial INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN zones.last_valid_serial IS 'Last serial number that was successfully validated/published. Used with soa_serial and error to determine zone status.';

-- Update the trigger function to remove verification_status check
CREATE OR REPLACE FUNCTION increment_zone_serial_on_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if DNS-relevant fields changed
  -- Removed verification_status check (field being dropped)
  IF (NEW.description IS DISTINCT FROM OLD.description) OR
     (NEW.name IS DISTINCT FROM OLD.name) THEN
    
    NEW.soa_serial := NEW.soa_serial + 1;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the check constraint on verification_status
ALTER TABLE zones
DROP CONSTRAINT IF EXISTS zones_verification_status_check;

-- Drop the deprecated columns
ALTER TABLE zones
DROP COLUMN IF EXISTS verification_status,
DROP COLUMN IF EXISTS last_verified_at;

-- =====================================================
-- Migration Notes
-- =====================================================
-- New Status Logic:
--   1. ERROR: If error IS NOT NULL
--   2. PENDING: If error IS NULL AND last_valid_serial != soa_serial
--   3. OK: If error IS NULL AND last_valid_serial = soa_serial
--
-- The last_valid_serial column is initialized to 0 for all zones.
-- Backend systems should update last_valid_serial when zones are
-- successfully validated/published.
-- =====================================================

