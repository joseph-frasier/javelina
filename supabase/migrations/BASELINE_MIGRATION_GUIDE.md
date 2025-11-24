# Baseline Migration Strategy

## Overview

This project uses a **baseline snapshot migration** strategy to manage database schema across environments. The baseline represents the production schema state as of 2024-11-24.

## Files

### Current Baseline
- **`20251124100000_production_baseline_snapshot.sql`** - The production baseline migration
  - Safe to run on any environment (idempotent)
  - Creates all indexes, comments, and verifies schema
  - NO-OP on production (already has everything)
  - Sets up new branches correctly

### Legacy Migrations (Applied to Dev)
- `20251124000000_sync_zones_schema.sql`
- `20251124000001_sync_subscriptions_schema.sql`
- `20251124000002_sync_plans_schema.sql`
- `20251124000003_sync_contact_forms_schema.sql`
- `20251124000004_add_missing_indexes.sql`
- `20251124000005_baseline_schema_sync.sql`

These were used to sync dev with production and are now superseded by the baseline snapshot.

## How It Works

### Production Database
Production already has all schema changes applied manually. The baseline migration:
1. **Does not modify** existing production schema (uses `IF NOT EXISTS`)
2. **Documents** the current state with comments
3. **Verifies** that all expected elements are present
4. **Provides** a clean starting point for future branches

### Creating New Branches

When you create a new branch:

```bash
# Create a new branch
supabase branches create feature-xyz

# The branch will automatically:
# 1. Start from the production baseline
# 2. Include all migrations up to the baseline
# 3. Apply any new migrations after the baseline
```

The new branch will have a clean, consistent schema that matches production.

### Current State

#### Production (main)
- ✅ All schema changes applied manually
- ✅ Baseline migration recorded (or will be)
- ✅ Ready for future branches

#### Dev Branch
- ✅ Schema synced via separate migrations
- ✅ Ready for testing
- ⚠️ Will be superseded by baseline for future branches

## Recording the Baseline on Production

Since production already has all changes, you need to **record** the baseline migration without running it:

### Option 1: Via Supabase Dashboard
1. Go to Database → Migrations
2. Mark migration `20251124100000` as applied
3. Add note: "Baseline snapshot - already applied manually"

### Option 2: Via SQL (if you have direct access)
```sql
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('20251124100000', 'production_baseline_snapshot', ARRAY['-- Baseline snapshot'])
ON CONFLICT (version) DO NOTHING;
```

### Option 3: Via Supabase CLI
```bash
# Link to production
supabase link --project-ref uhkwiqupiekatbtxxaky

# Apply migrations (will skip baseline since schema already exists)
supabase db push

# Or manually mark as applied
supabase migration repair --status applied 20251124100000
```

## Future Migrations

Going forward, all new migrations should:

1. **Build on the baseline**: Assume baseline state exists
2. **Be incremental**: Only add/modify what's needed
3. **Be idempotent**: Use `IF NOT EXISTS` clauses
4. **Include rollback info**: Document how to reverse changes

### Example Future Migration

```sql
-- 20251125000000_add_new_feature.sql

-- Add new column
ALTER TABLE public.zones 
ADD COLUMN IF NOT EXISTS new_feature_flag boolean DEFAULT false;

-- Add index
CREATE INDEX IF NOT EXISTS idx_zones_new_feature
ON public.zones(new_feature_flag)
WHERE new_feature_flag = true;

-- Add comment
COMMENT ON COLUMN public.zones.new_feature_flag IS 'Description of new feature';

-- Verify
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'zones' AND column_name = 'new_feature_flag'
  ) THEN
    RAISE EXCEPTION 'Migration failed: new_feature_flag not added';
  END IF;
  
  RAISE NOTICE 'Migration successful';
END $$;
```

## Benefits of This Approach

### ✅ Consistency
- All new branches start from the same baseline
- No schema drift between environments
- Easy to verify state

### ✅ Safety
- Idempotent migrations prevent duplicate operations
- Verification checks catch issues early
- Can run migrations multiple times safely

### ✅ Documentation
- Schema comments explain purpose
- Migration history is clear
- Easy to onboard new developers

### ✅ Flexibility
- Can create branches anytime
- Each branch gets consistent starting point
- Easy to test migrations before production

## Troubleshooting

### Branch Creation Fails

If a new branch fails to apply migrations:

```bash
# Check migration status
supabase migration list

# Check for errors
supabase db inspect

# Reset and try again
supabase branches delete branch-name
supabase branches create branch-name
```

### Schema Drift Detected

If you detect schema differences:

1. Run the diff report tool (see `database-diff-report.md`)
2. Identify the differences
3. Create a migration to fix the drift
4. Apply to all environments

### Missing Migration Records

If migration records are missing:

```sql
-- Check what's recorded
SELECT version, name, inserted_at 
FROM supabase_migrations.schema_migrations 
ORDER BY version;

-- Add missing records (adjust as needed)
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('20251124100000', 'production_baseline_snapshot')
ON CONFLICT (version) DO NOTHING;
```

## Related Documentation

- **`database-diff-report.md`** - Schema comparison between prod and dev
- **`README_BASELINE_SYNC.md`** - Details on the sync process
- **`live.sql`** - Full production schema dump (reference)

## Summary

This baseline strategy ensures:
- ✅ Production schema is documented
- ✅ New branches start consistently  
- ✅ Future migrations build on known state
- ✅ Easy to maintain and debug

All environments will converge on this baseline, making branch creation reliable and predictable.

