# Baseline Schema Sync Migration

## Overview

The migration file `20251124000005_baseline_schema_sync.sql` is a **baseline sync migration** created to ensure the production (main) database schema matches the dev branch after resolving schema drift.

## Background

A schema diff revealed discrepancies between production and dev databases that were not tracked in migrations:
- Missing columns in zones table (`deleted_at`, `live`)
- Missing 'lifetime' status in subscriptions
- Incorrect constraint on plans.billing_interval
- Inconsistent RLS settings and missing documentation

## What This Migration Does

### 1. Zones Table Enhancements
- Adds `deleted_at` column for soft delete functionality
- Adds `live` column for zone activation control
- Adds appropriate comments and documentation

### 2. Subscriptions Table Updates
- Adds 'lifetime' status option to support permanent access plans
- Updates status constraint to include all valid states

### 3. Plans Table Updates
- Allows NULL in `billing_interval` for free/custom plans
- Updates constraint and documentation

### 4. Contact Forms Configuration
- Disables RLS on `irongrove_contact_submissions`
- Adds missing table and column comments

### 5. Performance Indexes
- Adds 8 new indexes for common query patterns
- Includes partial indexes for better performance

## When to Apply

### Apply to Production If:
- ✅ Production is missing these schema changes
- ✅ You're setting up a new production environment
- ✅ You're consolidating schema changes after drift

### Do NOT Apply If:
- ❌ Production already has these changes manually applied
- ❌ The migration has already been run (check `supabase_migrations.schema_migrations`)

## How to Apply

### Option 1: Using Supabase CLI (Recommended)
```bash
# Link to your project
supabase link --project-ref uhkwiqupiekatbtxxaky

# Apply the migration
supabase db push
```

### Option 2: Using Supabase Management Tool
```bash
# Apply via MCP tool (if available in your environment)
# The migration will be applied automatically as part of the migration sequence
```

### Option 3: Manual SQL Execution
If you need to apply manually:
```bash
psql -h db.uhkwiqupiekatbtxxaky.supabase.co -U postgres -d postgres -f supabase/migrations/20251124000005_baseline_schema_sync.sql
```

## Verification

After applying, verify the changes:

```sql
-- Check zones columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'zones' 
AND column_name IN ('deleted_at', 'live');

-- Check subscriptions constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'subscriptions_status_check';

-- Check plans constraint
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'plans_billing_interval_check';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY indexname;
```

## Rollback

If you need to rollback these changes, you can:

1. Remove the columns from zones:
```sql
ALTER TABLE public.zones DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE public.zones DROP COLUMN IF EXISTS live;
```

2. Revert subscriptions constraint:
```sql
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check
CHECK (status = ANY (ARRAY['incomplete'::text, 'incomplete_expired'::text, 'trialing'::text, 'active'::text, 'past_due'::text, 'canceled'::text, 'unpaid'::text, 'paused'::text]));
```

3. Drop indexes:
```sql
DROP INDEX IF EXISTS idx_zones_deleted_at;
DROP INDEX IF EXISTS idx_zones_live;
DROP INDEX IF EXISTS idx_zones_environment_live;
-- etc.
```

## Related Files

- **Migration File**: `20251124000005_baseline_schema_sync.sql`
- **Diff Report**: `../database-diff-report.md`
- **Dev Migrations**: 
  - `20251124000000_sync_zones_schema.sql`
  - `20251124000001_sync_subscriptions_schema.sql`
  - `20251124000002_sync_plans_schema.sql`
  - `20251124000003_sync_contact_forms_schema.sql`
  - `20251124000004_add_missing_indexes.sql`

## Notes

- This migration is **idempotent** - it can be run multiple times safely
- The migration includes verification checks to ensure success
- All operations use `IF NOT EXISTS` or `IF EXISTS` clauses
- The dev branch already has these changes applied via separate migrations

