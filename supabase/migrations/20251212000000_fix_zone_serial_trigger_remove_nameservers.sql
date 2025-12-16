-- =====================================================
-- Fix increment_zone_serial_on_zone_change Function
-- Remove nameservers reference from trigger function
-- =====================================================
-- Issue: The function was still checking for nameservers 
-- changes even though the column was removed from the 
-- zones table in migration 20251209000000
-- =====================================================

CREATE OR REPLACE FUNCTION increment_zone_serial_on_zone_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if DNS-relevant fields changed
  -- Removed nameservers check since the column no longer exists
  IF (NEW.verification_status IS DISTINCT FROM OLD.verification_status) OR
     (NEW.description IS DISTINCT FROM OLD.description) OR
     (NEW.name IS DISTINCT FROM OLD.name) THEN
    
    NEW.soa_serial := NEW.soa_serial + 1;
    NEW.updated_at := now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Migration Notes
-- =====================================================
-- This fixes the error: "Failed to create DNS record: 
-- record 'new' has no field 'nameservers'"
-- 
-- The trigger is called when zones are updated, which
-- can happen as part of DNS record creation workflows.

