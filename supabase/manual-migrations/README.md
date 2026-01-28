# Manual Migration Scripts

This folder contains utility migration scripts that should be run **manually** and are **not part of the automatic migration pipeline**.

## Scripts

### Pre-Migration Validation (`20260128000000_pre_migration_validation.sql`)

Run this **before** applying the FK refactor migration to validate data integrity.

**Purpose:**
- Verifies all auth.users have corresponding profiles
- Checks for orphaned foreign key references
- Identifies any data issues that need fixing

**How to run:**
```bash
# Via Supabase CLI
supabase db execute -f supabase/manual-migrations/20260128000000_pre_migration_validation.sql

# Or via SQL Editor in Supabase Dashboard
# Copy/paste the contents and execute
```

**When to run:**
- Before applying the FK refactor migration to dev branch
- Before applying the FK refactor migration to production

### RLS Policy Documentation (`20260128000002_update_rls_policies.sql`)

**Optional reference document** - explains how RLS policies work with the hybrid auth model.

**Purpose:**
- Documents that no RLS policy changes are needed
- Explains how auth.uid() works for both auth methods
- Reference for understanding the hybrid model

**Note:** This file doesn't make any database changes - it's documentation only. You can read it but don't need to execute it.

### Rollback Migration (`20260128999999_rollback_fk_refactor.sql`)

Run this **only in emergencies** to revert the FK refactor.

**Purpose:**
- Reverts all foreign keys back to auth.users.id
- Emergency rollback if the FK refactor causes critical issues

**How to run:**
```bash
# Via Supabase CLI
supabase db execute -f supabase/manual-migrations/20260128999999_rollback_fk_refactor.sql

# Or via SQL Editor in Supabase Dashboard
# Copy/paste the contents and execute
```

**When to run:**
- ONLY if the FK refactor causes critical production issues
- After rollback, Auth0 users will lose app functionality

**⚠️ WARNING:** This rollback will break Auth0 integration!

## Actual Migration to Apply

The following migration in `supabase/migrations/` should be applied automatically:

1. `20260128000001_refactor_fks_to_profiles.sql` - Main FK refactor (10 columns, 9 tables)

This will be applied via `supabase db push` or through the migration system.
