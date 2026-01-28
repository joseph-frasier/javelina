# FK Refactor Testing Guide

This document outlines testing steps after applying the FK refactor migrations.

## Prerequisites

Before testing, ensure you've applied:
1. `20260128000001_refactor_fks_to_profiles.sql` - Main FK refactor
2. `20260128000002_update_rls_policies.sql` - RLS policy documentation

## Testing Checklist

### 1. Existing Supabase Auth Users

Test that existing users (who have entries in both `auth.users` and `profiles`) can still access all features:

- [ ] **Login**: User can log in successfully
- [ ] **Profile Access**: User can view and edit their profile
- [ ] **Organizations**: 
  - [ ] User can view their organizations
  - [ ] User can create new organizations
  - [ ] User can edit organization settings (if Admin/SuperAdmin)
  - [ ] User can see organization members
- [ ] **Zones**:
  - [ ] User can view zones in their organizations
  - [ ] User can create new zones
  - [ ] User can edit zones (if Editor/Admin/SuperAdmin)
  - [ ] User can delete zones (if Admin/SuperAdmin)
  - [ ] `created_by` field correctly references the user
- [ ] **DNS Records**:
  - [ ] User can view DNS records
  - [ ] User can create new records
  - [ ] User can edit records
  - [ ] User can delete records
  - [ ] `created_by` field correctly references the user
- [ ] **Subscriptions**:
  - [ ] User can view subscription status
  - [ ] User can upgrade/change plans (if billing role)
  - [ ] User can access billing portal
  - [ ] `created_by` field correctly references the user
- [ ] **Tags**:
  - [ ] User can create tags
  - [ ] User can assign tags to zones
  - [ ] User can edit/delete tags
- [ ] **Audit Logs**:
  - [ ] User's actions are logged
  - [ ] `user_id` correctly references the user
  - [ ] User can view their own audit logs

### 2. New Auth0 Users

Test that Auth0 users (who only have entries in `profiles`, not in `auth.users`) have full access:

**Backend Testing Required** - Auth0 users access via Express backend API with service role key.

- [ ] **Auth0 Login**: User can log in via Auth0
- [ ] **Profile Creation**: Backend creates profile record with:
  - [ ] Auto-generated UUID in `profiles.id`
  - [ ] `auth0_user_id` populated correctly
  - [ ] User info (email, name) synced from Auth0
- [ ] **Session Creation**: Backend session cookie contains correct `userId` from `profiles.id`
- [ ] **Organizations**:
  - [ ] User can create organizations
  - [ ] `owner_id` correctly references `profiles.id`
  - [ ] User can invite other users
  - [ ] `organization_members.user_id` correctly references `profiles.id`
- [ ] **Zones**:
  - [ ] User can create zones
  - [ ] `created_by` correctly references `profiles.id`
  - [ ] User can manage zone records
- [ ] **Full CRUD Operations**:
  - [ ] All create/read/update/delete operations work
  - [ ] Foreign keys properly link to `profiles.id`
  - [ ] No permission errors

### 3. Mixed Environment Testing

Test interactions between Supabase Auth and Auth0 users:

- [ ] Supabase Auth user invites Auth0 user to organization
- [ ] Auth0 user invites Supabase Auth user to organization
- [ ] Both user types can collaborate in same organization
- [ ] Audit logs show actions from both user types
- [ ] Organization ownership can transfer between user types

### 4. Data Integrity Checks

Run these SQL queries to verify data integrity:

```sql
-- Verify all FK constraints exist
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'profiles'
  AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- Should return all refactored FKs pointing to profiles

-- Verify no orphaned references
SELECT 
  'organizations' as table_name,
  COUNT(*) as orphaned_count
FROM organizations o
WHERE o.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = o.owner_id)
UNION ALL
SELECT 
  'organization_members',
  COUNT(*)
FROM organization_members om
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = om.user_id)
UNION ALL
SELECT 
  'zones',
  COUNT(*)
FROM zones z
WHERE z.created_by IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = z.created_by);

-- Should return 0 for all tables
```

### 5. Performance Testing

- [ ] Check query performance on tables with new indexes
- [ ] Verify indexes are being used:

```sql
EXPLAIN ANALYZE
SELECT * FROM organizations WHERE owner_id = 'some-uuid';

-- Should show "Index Scan using idx_organizations_owner_id"
```

### 6. RLS Policy Verification

For Supabase Auth users, verify RLS policies still work:

```sql
-- Test as authenticated user
SET LOCAL "request.jwt.claims" = '{"sub": "user-uuid-here"}';

-- Try to select organizations
SELECT * FROM organizations;

-- Should only return organizations the user has access to
```

## Known Issues / Expected Behavior

### Auth0 Users and RLS

- Auth0 users bypass RLS because backend uses service role key
- This is intentional and expected
- Authorization is handled at the backend API level via RBAC middleware
- Supabase Auth users continue to use RLS normally

### Migration from Supabase Auth to Auth0

If you need to migrate an existing Supabase Auth user to Auth0:

1. User logs in via Auth0 for first time
2. Backend should detect existing profile by email
3. Update existing profile with `auth0_user_id`
4. Link accounts (implementation needed if required)

## Rollback Testing

If you need to test the rollback:

1. Apply `manual-migrations/20260128999999_rollback_fk_refactor.sql`
2. Verify Supabase Auth users still work
3. Confirm Auth0 users lose functionality (expected)
4. Re-apply FK refactor migrations to restore Auth0 support

## Reporting Issues

If you find any issues during testing:

1. Document the exact steps to reproduce
2. Include relevant user IDs and table records
3. Check FK constraints: `\d+ table_name` in psql
4. Review backend API logs for Auth0 users
5. Consider rollback if critical issues found
