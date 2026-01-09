-- ============================================================================
-- REMOVE SUB ZONES - Standalone Query
-- ============================================================================
-- This script identifies and removes all sub zones from the database.
-- Run this directly in your database query tool (Supabase dashboard, psql, etc.)
-- ============================================================================

-- Step 1: Preview what will be deleted
SELECT 
    z1.id as sub_zone_id,
    z1.name as sub_zone_name,
    z1.organization_id,
    z2.id as parent_zone_id,
    z2.name as parent_zone_name,
    (SELECT COUNT(*) FROM zone_records WHERE zone_id = z1.id) as record_count
FROM zones z1
INNER JOIN zones z2 ON 
    z1.organization_id = z2.organization_id
    AND z1.id != z2.id
    AND z1.name LIKE '%.' || z2.name
WHERE z1.deleted_at IS NULL
ORDER BY z1.organization_id, z2.name, z1.name;

-- Step 2: Count total sub zones and records to be deleted
SELECT 
    COUNT(DISTINCT z1.id) as sub_zones_to_delete,
    COALESCE(SUM(record_counts.count), 0) as total_records_to_delete
FROM zones z1
INNER JOIN zones z2 ON 
    z1.organization_id = z2.organization_id
    AND z1.id != z2.id
    AND z1.name LIKE '%.' || z2.name
LEFT JOIN (
    SELECT zone_id, COUNT(*) as count 
    FROM zone_records 
    GROUP BY zone_id
) record_counts ON record_counts.zone_id = z1.id
WHERE z1.deleted_at IS NULL;

-- Step 3: HARD DELETE (Uncomment to execute)
-- WARNING: This permanently deletes data. Make a backup first!

/*
-- Delete DNS records first
DELETE FROM zone_records
WHERE zone_id IN (
    SELECT DISTINCT z1.id
    FROM zones z1
    INNER JOIN zones z2 ON 
        z1.organization_id = z2.organization_id
        AND z1.id != z2.id
        AND z1.name LIKE '%.' || z2.name
);

-- Delete the sub zones
DELETE FROM zones
WHERE id IN (
    SELECT DISTINCT z1.id
    FROM zones z1
    INNER JOIN zones z2 ON 
        z1.organization_id = z2.organization_id
        AND z1.id != z2.id
        AND z1.name LIKE '%.' || z2.name
);
*/

-- Alternative: SOFT DELETE (Uncomment to execute)
-- This preserves data by marking zones as deleted

/*
UPDATE zones
SET 
    deleted_at = NOW(),
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT z1.id
    FROM zones z1
    INNER JOIN zones z2 ON 
        z1.organization_id = z2.organization_id
        AND z1.id != z2.id
        AND z1.name LIKE '%.' || z2.name
    WHERE z1.deleted_at IS NULL
);
*/


