# Sub Zones Removal Guide

## Overview

This guide explains how to remove all sub zones from the database. A **sub zone** is a zone whose domain name is a subdomain of another zone in the same organization.

### Example of Sub Zones

If you have these zones in the same organization:
- `example.com` (parent zone)
- `api.example.com` (sub zone - will be removed)
- `dev.example.com` (sub zone - will be removed)
- `staging.api.example.com` (sub zone - will be removed)
- `anotherdomain.com` (parent zone - kept)

The sub zones (`api.example.com`, `dev.example.com`, `staging.api.example.com`) will be identified and removed.

## Why Remove Sub Zones?

As of the recent architecture changes, the application no longer supports the parent/sub zone hierarchy. Each zone should be independent.

## File Created

**`scripts/remove_sub_zones.sql`**
- Standalone SQL script you can run directly in Supabase dashboard or psql
- Includes preview queries to see what will be deleted before committing
- Has both hard delete and soft delete options (both commented out by default)

## Usage

### Using the Standalone Script

1. **Preview what will be deleted:**
   - Run the first two SELECT queries in `scripts/remove_sub_zones.sql`
   - This shows all sub zones that will be removed and their record counts

2. **Execute the deletion:**
   - Uncomment either the HARD DELETE or SOFT DELETE section
   - Run in your database tool (Supabase dashboard, psql, etc.)

### Quick SQL Query

If you want to run the query directly without opening the script file, here's the essential SQL:

```sql
-- Preview first (shows what will be deleted)
SELECT 
    z1.name as sub_zone,
    z2.name as parent_zone,
    z1.organization_id
FROM zones z1
INNER JOIN zones z2 ON 
    z1.organization_id = z2.organization_id
    AND z1.id != z2.id
    AND z1.name LIKE '%.' || z2.name;

-- Delete DNS records for sub zones
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
```

## Safety Considerations

### Before Running

1. **Backup your database** (if running in production)

2. **Preview the changes:**
   - Run the SELECT queries first to see what will be deleted
   - Verify the sub zones are the ones you expect

3. **Check affected records:**
   - The preview shows how many DNS records will be deleted with each sub zone

### After Running

1. **Verify the cleanup:**
   ```sql
   -- Check for any remaining sub zones
   SELECT 
       z1.name as potential_sub_zone,
       z2.name as potential_parent
   FROM zones z1
   INNER JOIN zones z2 ON 
       z1.organization_id = z2.organization_id
       AND z1.id != z2.id
       AND z1.name LIKE '%.' || z2.name;
   -- Should return 0 rows
   ```

2. **Check audit logs:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE table_name = 'zones' 
   AND action = 'DELETE' 
   ORDER BY created_at DESC 
   LIMIT 20;
   ```

## Soft Delete vs Hard Delete

### Soft Delete (Recommended for Production)
- **Pros:**
  - Preserves data and audit trail
  - Can be reversed if needed
  - Maintains referential integrity with audit logs
- **Cons:**
  - Data still exists in database
  - May need cleanup later

### Hard Delete
- **Pros:**
  - Completely removes unwanted data
  - Reduces database size
- **Cons:**
  - Permanent and irreversible
  - Loses historical data

## Rollback (for Soft Delete only)

If you used soft delete and need to restore sub zones:

```sql
UPDATE zones
SET 
    deleted_at = NULL,
    updated_at = NOW()
WHERE id IN (
    -- IDs of zones to restore
    SELECT id FROM zones WHERE deleted_at IS NOT NULL
);
```

## Troubleshooting

### No sub zones found
If the query returns 0 results, you may already have removed all sub zones, or they may be defined differently than expected.

### Foreign key errors
If you get foreign key errors, ensure you delete DNS records (`zone_records`) before deleting zones.

### Audit log issues
The audit logs table should automatically capture these deletions via database triggers. Check the `audit_logs` table after deletion.

## Questions?

- **What defines a sub zone?** A zone whose name is `subdomain.parentdomain.tld` where `parentdomain.tld` exists as another zone in the same organization.
- **Will this affect parent zones?** No, only sub zones (subdomains) are deleted. Parent zones remain untouched.
- **What about DNS records?** All DNS records belonging to sub zones are also deleted (via CASCADE or explicit deletion).

