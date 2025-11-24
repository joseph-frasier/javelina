-- Migration to remove leftover records_count trigger and function
-- These were causing "record has no field records_count" errors on zone creation
-- The zones table no longer has a records_count column

-- Drop all triggers that use update_zone_records_count function
DROP TRIGGER IF EXISTS zones_records_count_init ON zones;
DROP TRIGGER IF EXISTS zone_records_update_count_insert ON zone_records;
DROP TRIGGER IF EXISTS zone_records_update_count_delete ON zone_records;

-- Now drop the function (no dependencies remain)
DROP FUNCTION IF EXISTS update_zone_records_count();

-- Add comments for future reference
COMMENT ON TABLE zones IS 'DNS zones table - records_count column and related triggers removed';
COMMENT ON TABLE zone_records IS 'DNS records table - records_count update triggers removed';

