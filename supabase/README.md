# Javelina Database Schema

## Overview

This directory contains the database schema and migrations for the Javelina DNS Management application.

## Schema Files

### `consolidated-schema.sql` ⭐ **PRIMARY SOURCE OF TRUTH**

This file contains the **complete, current state** of the production database schema, extracted directly from the main Supabase database on 2025-11-03.

**Use this file for:**
- Creating new database branches
- Understanding the complete database structure
- Reference when creating new migrations
- Onboarding new developers

**What it includes:**
- All 14 production tables with complete definitions
- All indexes for performance optimization
- All RLS (Row Level Security) policies
- All database functions
- All triggers
- All constraints (primary keys, foreign keys, checks, unique)
- All comments and documentation

### Migrations Directory

Contains timestamped migration files that represent the evolution of the schema. These are applied in order by Supabase.

**Current migrations:**
1. `20250101000000_base_schema.sql` - Core tables (profiles, organizations, environments, zones, audit_logs)
2. `20250103150000_create_dns_records_table.sql` - DNS records table
3. `20250103160000_rename_dns_records_to_zone_records.sql` - Rename to zone_records
4. `20250104000000_remove_counts_from_organization_members.sql` - Schema normalization
5. `20251103142931_remote_schema.sql` - Remote schema sync
6. `20251103193000_billing_schema.sql` - Billing and subscription tables
7. `20251103193100_admin_schema.sql` - Admin users table
8. `20251103193200_schema_enhancements.sql` - Enhanced fields on existing tables

## Creating New Supabase Branches

When creating a new Supabase branch for testing schema changes, follow these steps:

### Method 1: Using Supabase MCP (Recommended)

```bash
# 1. Create the branch
# This will automatically apply all migrations from the migrations/ directory

# 2. If migrations don't cover everything, apply the consolidated schema
# (Use Supabase SQL editor or execute directly)
```

### Method 2: Manual Setup

If you need to set up a completely fresh database:

1. Run `consolidated-schema.sql` in the Supabase SQL editor
2. This creates all tables, indexes, functions, triggers, and policies in one go

## Production Database Tables

The production database contains **14 tables**:

### Core Tables
1. **profiles** - User profile information
2. **organizations** - Customer organizations
3. **organization_members** - Organization membership and roles
4. **environments** - Environment management (prod, staging, dev)
5. **zones** - DNS zones
6. **zone_records** - DNS records within zones
7. **audit_logs** - Audit trail for all changes

### Billing Tables
8. **plans** - Subscription plans
9. **entitlements** - Available features and limits
10. **plan_entitlements** - Features included in each plan
11. **subscriptions** - Organization subscriptions
12. **subscription_items** - Line items for subscriptions
13. **org_entitlement_overrides** - Custom limits for specific orgs

### Admin Tables
14. **admin_users** - Admin panel users

## Important Notes

⚠️ **DO NOT** use the following files as schema references - they are outdated:
- `schema.sql`
- `schema-enhancements.sql`
- `billing-schema-v2.sql`
- `admin-schema.sql`

These files are kept for historical reference but should not be used for new branches or as documentation.

## Schema Development Workflow

1. **For testing new schema changes:**
   - Create a new branch: `git checkout -b feature/new-schema`
   - Create a Supabase branch using MCP
   - Make your changes on the Supabase branch
   - Test thoroughly
   - Export the changes as a new migration file

2. **Creating a new migration:**
   - Name it with timestamp: `YYYYMMDDHHMMSS_description.sql`
   - Use `IF EXISTS` / `IF NOT EXISTS` for idempotency
   - Include both `UP` and `DOWN` logic if needed
   - Test on a branch before applying to main

3. **After merging to main:**
   - Apply the migration to the production database
   - Update `consolidated-schema.sql` if needed
   - Document any breaking changes

## Database Branching Best Practices

1. **Always test on a branch first** - Never apply untested migrations to production
2. **Keep migrations small** - Easier to review and roll back if needed
3. **One logical change per migration** - Makes troubleshooting easier
4. **Use transactions** - Wrap DDL changes when possible
5. **Document breaking changes** - In the migration file and in PR descriptions

## SuperAdmin Setup

The admin panel (`/admin`) is restricted to users with the `superadmin` flag set to `true` in their profile.

### Setting up a SuperAdmin User

1. **Create a regular user account:**
   - Sign up through the normal application signup flow (`/signup`)
   - Or create the user through the Supabase dashboard
   - Example: `admin@irongrove.com` with password `admin123`

2. **Promote the user to SuperAdmin:**
   - Open the Supabase SQL editor
   - Run the `seed-superadmin.sql` script
   - Update the email in the script to match your test user
   - Execute the script

3. **Verify SuperAdmin status:**
   ```sql
   SELECT id, email, name, superadmin, created_at
   FROM public.profiles
   WHERE superadmin = true;
   ```

### SuperAdmin Privileges

Users with `superadmin = true` have:
- Full access to the admin panel (`/admin`)
- Bypass all RLS (Row Level Security) policies
- Read/write access to all organizations, environments, zones, and records
- Ability to manage all users and their permissions
- Automatic membership in all organizations with SuperAdmin role

## Useful Commands

### Check branch status
```sql
-- Via Supabase MCP
supabase mcp list_branches --project_id <project_id>
```

### Apply a migration to a branch
```sql
-- Via Supabase MCP
supabase mcp apply_migration --project_id <branch_project_id> --name <migration_name> --query <sql>
```

### Verify schema after changes
```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check column count per table
SELECT 
  table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;
```

## Support

For questions or issues with the database schema, please:
1. Check this README
2. Review `consolidated-schema.sql`
3. Check the migrations for historical context
4. Ask in the team chat

---

Last updated: 2025-11-03

