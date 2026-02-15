# Fix Migration Drift - Support Chat Tables

## Problem
There is migration drift on the dev branch, specifically with the AI chatbot helper tables. The dev database has schema changes that are not reflected in the migration files.

## Solution Steps

### Step 1: Dump the Current Dev Database Schema

Use Supabase CLI to create a schema dump of the current dev database:

```bash
# First, link to your dev project (if not already linked)
npx supabase link --project-ref <your-dev-project-ref>

# Generate schema diff comparing dev database to local migrations
npx supabase db diff --linked --schema public > supabase/drift_analysis.sql

# Or if you want a full schema dump:
npx supabase db dump --linked --schema public > supabase/dev_schema_dump.sql
```

**Alternative: Direct PostgreSQL dump**
```bash
# If you have the direct database credentials
pg_dump -h <supabase-db-host> \
  -U postgres \
  -d postgres \
  --schema=public \
  --schema-only \
  --no-owner \
  --no-privileges \
  > supabase/dev_schema_dump.sql
```

### Step 2: Identify the Drift

Compare the schema dump with existing migrations:

```bash
# Use supabase db diff to show what's missing
npx supabase db diff --linked --schema public

# This will show you SQL statements for objects that exist in dev but not in migrations
```

### Step 3: Review Existing Support Chat Migrations

We have these support chat migrations:
- `20260127000002_support_chat_system.sql` - Main support chat infrastructure
- `20260128000002_support_chat_missing_objects.sql` - Rate limiting and helper functions
- `20260130000000_add_metadata_to_kb_chunks.sql` - Metadata column for kb_chunks

### Step 4: Common Drift Issues to Check

Based on the migrations, likely drift areas:

1. **Missing table in migration but exists in dev:**
   - `support_chat_sessions` table (check if it's named differently)

2. **Missing columns:**
   - Check if `kb_chunks.metadata` column exists in dev
   - Check if all columns in `chat_sessions`, `chat_messages`, etc. match

3. **Missing indexes:**
   - Vector indexes on `kb_chunks.embedding`
   - Check all indexes from migrations are present

4. **Missing functions:**
   - `check_rate_limit()`
   - `search_kb_chunks()`
   - `increment_attempt_count()`
   - `cleanup_expired_support_data()`
   - `get_conversation_summary()`

5. **Missing RLS policies:**
   - Check all RLS policies from migrations

6. **Auth.users vs Profiles references:**
   - Since you're using Auth0, tables should reference `profiles.id`, not `auth.users`
   - Check if support chat tables were updated to reference profiles

### Step 5: Create a New Migration for Drift Fixes

Once you identify the differences:

```bash
# Create a new migration file
npx supabase migration new fix_support_chat_drift

# Or manually create:
# supabase/migrations/YYYYMMDDHHMMSS_fix_support_chat_drift.sql
```

### Step 6: Automated Drift Detection Script

Create a helper script to automate this:

```bash
#!/bin/bash
# File: scripts/check-migration-drift.sh

echo "Checking for migration drift on dev database..."

# Link to dev project
npx supabase link --project-ref <your-dev-project-ref>

# Generate diff
echo "Generating schema diff..."
npx supabase db diff --linked --schema public --use-migra --file supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_drift.sql

echo "Drift analysis saved to: supabase/migrations/<timestamp>_fix_drift.sql"
echo "Review the file and apply if needed."
```

### Step 7: Specific Command to Run Now

Run this command to get the drift:

```bash
# This will show you exactly what's missing
npx supabase db diff --linked --schema public

# If the output looks good, save it to a migration:
npx supabase db diff --linked --schema public --file supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_support_chat_drift.sql
```

### Step 8: Review and Apply

1. **Review the generated migration file** - Make sure it only includes the drift fixes
2. **Check for Auth0 compatibility** - Ensure references are to `profiles`, not `auth.users`
3. **Test locally first** if possible
4. **Apply to dev**:
   ```bash
   npx supabase db push --linked
   ```

### Step 9: Verify After Fix

```sql
-- Run these queries on dev database to verify:

-- 1. Check all support chat tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%chat%' 
   OR tablename LIKE '%kb_%'
   OR tablename LIKE '%support_%';

-- 2. Check kb_chunks has metadata column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'kb_chunks' 
  AND table_schema = 'public';

-- 3. Check all functions exist
SELECT proname, prosrc 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN (
    'check_rate_limit',
    'search_kb_chunks', 
    'increment_attempt_count',
    'cleanup_expired_support_data',
    'get_conversation_summary'
  );

-- 4. Check foreign key references point to profiles, not auth.users
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (tc.table_name LIKE '%chat%' OR tc.table_name LIKE '%support%')
  AND ccu.table_name IN ('auth.users', 'profiles');
```

## Expected Issues

Based on the Auth0 migration, the most likely drift is:

1. **Foreign key references to `auth.users` instead of `profiles`**
   - `chat_sessions.user_id`
   - `chat_messages.user_id`
   - `chat_feedback.user_id`
   - `app_snapshots.user_id`
   - `support_tickets.user_id`
   - `freshdesk_contacts.user_id`

2. **Missing `kb_chunks.metadata` column** (from migration 20260130000000)

3. **Possibly a table name mismatch** - Check if `chat_sessions` vs `support_chat_sessions`

## Quick Command Reference

```bash
# Check what Supabase project you're linked to
npx supabase link --project-ref <dev-project-ref>

# Show current status
npx supabase status

# Generate diff (shows in terminal)
npx supabase db diff --linked --schema public

# Generate diff and save to file
npx supabase db diff --linked --schema public --file supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_drift.sql

# Apply migrations to linked project
npx supabase db push --linked

# Reset and reapply all migrations (DESTRUCTIVE - backup first!)
npx supabase db reset --linked
```

## Notes

- Always backup before applying migrations to dev
- Review generated SQL before applying
- Consider creating the drift fix migration manually if the auto-generated one is messy
- After fixing, commit the new migration to git so it's tracked
