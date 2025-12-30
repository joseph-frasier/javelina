-- =====================================================
-- Drop ALL Duplicate Audit Functions
-- =====================================================

-- Drop all create_zone_record_with_audit versions
DROP FUNCTION IF EXISTS create_zone_record_with_audit(uuid, uuid, text, text, text, integer, text);
DROP FUNCTION IF EXISTS create_zone_record_with_audit(uuid, uuid, text, text, text, integer, integer, boolean, text, jsonb);

-- Drop all update_zone_record_with_audit versions
DROP FUNCTION IF EXISTS update_zone_record_with_audit(uuid, uuid, text, text, text, integer, text);
DROP FUNCTION IF EXISTS update_zone_record_with_audit(uuid, uuid, text, text, text, integer, integer, boolean, text, jsonb);

-- Drop all update_zone_with_audit versions
DROP FUNCTION IF EXISTS update_zone_with_audit(uuid, uuid, text, text, text, integer);
DROP FUNCTION IF EXISTS update_zone_with_audit(uuid, uuid, text, text, text, integer, boolean);

-- Drop all update_organization_with_audit versions
DROP FUNCTION IF EXISTS update_organization_with_audit(uuid, uuid, text, text);
DROP FUNCTION IF EXISTS update_organization_with_audit(uuid, uuid, text, text, text, text, jsonb, boolean);

-- Drop all other functions
DROP FUNCTION IF EXISTS create_zone_with_audit(uuid, text, uuid, text, text, integer);
DROP FUNCTION IF EXISTS delete_zone_with_audit(uuid, uuid);
DROP FUNCTION IF EXISTS delete_zone_record_with_audit(uuid, uuid);
DROP FUNCTION IF EXISTS create_organization_with_audit(uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS delete_organization_with_audit(uuid, uuid);

