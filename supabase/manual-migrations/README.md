# Manual Migration Scripts

This folder contains utility migration scripts that should be run **manually** and are **not part of the automatic migration pipeline**.

## Scripts

### Domains org NOT NULL (`20260715000000_domains_organization_id_not_null.sql`)

**Deferred — do not apply until domains are backfilled.**

Completes the user→org scoping of domains started by
`supabase/migrations/20260710000000_domains_add_organization_id.sql`, which added
`organization_id` as a nullable column with no backfill.

**Purpose:**
- Sets `domains.organization_id NOT NULL`
- Changes the FK from `ON DELETE SET NULL` to `ON DELETE RESTRICT`
- Drops the now-unreachable legacy NULL-org branches from the three domains RLS policies

**Why it is not in `migrations/`:** it fails by design while any domain has a NULL
`organization_id`, and deciding which org each existing domain belongs to is a business
call, not something a migration can infer. Applying it on 2026-07-15 correctly aborted
with 32 orgless rows on dev.

**Before running:**
```sql
-- expect 0
select count(*) from public.domains where organization_id is null;

-- the rows needing an org
select id, domain_name, user_id, created_at
from public.domains
where organization_id is null
order by created_at;
```

**How to run** (after the backfill):
```bash
supabase db execute -f supabase/manual-migrations/20260715000000_domains_organization_id_not_null.sql
```

**⚠️ Note the `ON DELETE RESTRICT` change.** After this runs, an organization with
domains attached cannot be deleted until those domains are reassigned or removed. That is
intentional: the previous `ON DELETE SET NULL` silently made an org's domains invisible to
everyone, because the domain list is scoped strictly by org.

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
