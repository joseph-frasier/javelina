# Supabase Seed Data

This directory contains comprehensive seed data for the Javelina DNS Management application.

## Files

- `seed-data.sql` - Complete seed data script with realistic sample data
- `schema.sql` - Database schema (already exists)

## What's Included

The seed data provides:

### 👥 **User Profiles (5 users)**
- **Marcus Rodriguez** - Senior DevOps Engineer (SuperAdmin)
- **Sarah Chen** - Platform Engineer (Admin) 
- **David Kim** - Network Engineer (Editor)
- **Lisa Thompson** - Product Manager (Viewer)
- **Alex Johnson** - Freelance Developer (Personal projects)

### 🏢 **Organizations (4 organizations)**
- **Acme Corporation** - Enterprise technology company
- **Personal Projects** - Personal domains and side projects
- **CloudFlow Solutions** - Fast-growing SaaS startup
- **DataVault Systems** - Enterprise data management and analytics platform

### 🌍 **Environments (10 environments)**
- **Acme Corp**: Production, Staging, Development
- **Personal Projects**: Production, Development  
- **CloudFlow Solutions**: Production, Staging
- **DataVault Systems**: Production, Staging, Development

### 🌐 **DNS Zones (36 zones)**
Realistic DNS zones including:
- Main domains (acme.com, cloudflow.io, datavault.com)
- API endpoints (api.acme.com, api.cloudflow.io, api.datavault.com)
- CDN domains (cdn.acme.com)
- Staging environments (staging.acme.com)
- Development domains (dev.acme.com)
- Personal projects (blog.example.com, portfolio.example.com)

### 📊 **Audit Logs (8 entries)**
Recent activity showing:
- Zone updates and creations
- Environment status changes
- Organization updates

## How to Use

### Option 1: Supabase Dashboard (Recommended)

1. **Open your Supabase project dashboard**
2. **Navigate to the SQL Editor**
3. **Copy and paste the entire contents of `seed-data.sql`**
4. **Click "Run" to execute the script**

### Option 2: Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db reset --linked
# Then run the seed data
psql -h your-db-host -U postgres -d postgres -f seed-data.sql
```

### Option 3: Direct Database Connection

```bash
# Using psql directly
psql -h your-db-host -U postgres -d postgres -f seed-data.sql
```

## Data Structure

The seed data creates a realistic hierarchy:

```
Organizations
├── Acme Corporation (SuperAdmin: Marcus, Admin: Sarah, Editor: David, Viewer: Lisa)
│   ├── Production Environment
│   │   ├── acme.com
│   │   ├── api.acme.com
│   │   ├── cdn.acme.com
│   │   ├── mail.acme.com
│   │   └── monitoring.acme.com
│   ├── Staging Environment
│   │   ├── staging.acme.com
│   │   ├── api-staging.acme.com
│   │   └── test.acme.com
│   └── Development Environment
│       ├── dev.acme.com
│       ├── local.acme.com
│       └── sandbox.acme.com (inactive)
├── Personal Projects (Admin: Marcus, Alex)
│   ├── Production Environment
│   │   ├── blog.example.com
│   │   ├── portfolio.example.com
│   │   ├── projects.example.com
│   │   └── api.example.com
│   └── Development Environment
│       ├── dev.blog.example.com
│       └── test.portfolio.example.com
└── CloudFlow Solutions (SuperAdmin: Marcus, Editor: Sarah)
    ├── Production Environment
    │   ├── cloudflow.io
    │   ├── app.cloudflow.io
    │   ├── api.cloudflow.io
    │   └── docs.cloudflow.io
    └── Staging Environment
        ├── staging.cloudflow.io
        └── test-app.cloudflow.io
```

## User Roles & Permissions

The seed data includes users with different roles to test the RBAC system:

- **SuperAdmin**: Full access to all resources
- **Admin**: Can manage environments and zones
- **Editor**: Can modify zones but not create environments
- **Viewer**: Read-only access

## Testing the Data

After running the seed data, you can verify it worked by:

1. **Check the dashboard** - You should see 3 organizations
2. **Navigate to an organization** - You should see multiple environments
3. **Click on an environment** - You should see multiple DNS zones
4. **Check user permissions** - Different users should see different data based on their roles

## Customization

To customize the seed data:

1. **Edit `seed-data.sql`** to modify any values
2. **Add more organizations** by inserting additional rows
3. **Add more users** by creating additional profiles
4. **Add more zones** by inserting additional zone records

## Troubleshooting

### Common Issues

1. **"User does not exist" errors**
   - Make sure you have actual users in your `auth.users` table
   - The seed data references specific user IDs that may not exist in your database

2. **Permission errors**
   - Ensure you're running the script as a user with appropriate permissions
   - Check that RLS policies allow the operations

3. **Duplicate key errors**
   - The script uses `ON CONFLICT` clauses to handle duplicates
   - If you get errors, you may need to clear existing data first

### Clearing Existing Data

If you need to start fresh:

```sql
-- WARNING: This will delete all data!
DELETE FROM public.audit_logs;
DELETE FROM public.zones;
DELETE FROM public.environments;
DELETE FROM public.organization_members;
DELETE FROM public.organizations;
DELETE FROM public.profiles;
```

## Next Steps

After running the seed data:

1. **Test the application** - Navigate through the UI to see the data
2. **Test user permissions** - Log in as different users to verify RBAC
3. **Add real data** - Start adding your actual organizations and zones
4. **Customize** - Modify the seed data to match your specific needs

## Support

If you encounter issues:

1. Check the Supabase logs for error messages
2. Verify your database schema matches the expected structure
3. Ensure all foreign key relationships are correct
4. Check that RLS policies are properly configured
