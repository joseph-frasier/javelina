# Supabase Setup Guide

## Step-by-Step Database Setup

### 1. Run the Schema SQL

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **New Query**
4. Copy the entire contents of `schema.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

You should see a success message confirming the tables were created.

### 2. Verify Tables Were Created

Run this query in the SQL Editor to verify:

```sql
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in ('profiles', 'organizations', 'organization_members');
```

You should see all three tables listed.

### 3. Check Row Level Security

Run this to verify RLS is enabled:

```sql
select tablename, rowsecurity 
from pg_tables 
where schemaname = 'public' 
  and tablename in ('profiles', 'organizations', 'organization_members');
```

All tables should show `rowsecurity = true`.

---

## What Was Created

### Tables

1. **profiles** - Extended user information beyond auth.users
   - Stores name, email, role, preferences, etc.
   - Automatically created when a user signs up
   - **Enhanced fields:** preferences (JSONB), onboarding_completed, email_verified, notification_preferences, language

2. **organizations** - Company/organization information
   - Can have multiple users as members
   - **Enhanced fields:** slug (unique URL identifier), logo_url, settings (JSONB), is_active, owner_id

3. **organization_members** - Junction table
   - Links users to organizations with roles
   - Tracks role-based access (SuperAdmin, Admin, Editor, Viewer)
   - **Enhanced fields:** invited_by, invited_at, joined_at, last_accessed_at, permissions (JSONB), status

4. **environments** - Environment management within organizations
   - **Enhanced fields:** configuration (JSONB), metadata (JSONB), parent_environment_id, last_deployed_at, health_status

5. **zones** - DNS zone management within environments
   - **Enhanced fields:** metadata (JSONB), ttl, nameservers, last_verified_at, verification_status, records_count

6. **audit_logs** - System activity tracking
   - **Enhanced fields:** ip_address, user_agent, metadata (JSONB)

### Security

- **Row Level Security (RLS)** enabled on all tables
- Users can only view/edit their own profile
- Users can only view organizations they belong to
- Users can only view their own organization memberships

### Triggers

- **Auto Profile Creation** - When a user signs up, a profile is automatically created
- **Auto Timestamps** - `updated_at` is automatically updated on changes
- **Environment Health Status** - Automatically updates environment health based on zone verification status
- **Zone Records Count** - Initializes records count for new zones (prepared for future DNS records)

---

## Schema Enhancements

### Applying Enhancements

To add the enhanced fields to your existing database:

1. Run `schema-enhancements.sql` in Supabase SQL Editor
2. This adds new fields to all existing tables with safe defaults
3. All changes are idempotent (safe to run multiple times)

### Rolling Back Enhancements

If you need to remove the enhancements:

1. Run `schema-enhancements-rollback.sql` in Supabase SQL Editor
2. This removes all enhancement fields and triggers
3. **Warning:** This will delete data in the enhancement columns

## Next Steps

After running the schema:

1. Test user signup to verify profile creation works
2. Optionally add seed data (see commented section in schema.sql)
3. Configure OAuth providers in Supabase dashboard
4. Apply schema enhancements if desired

