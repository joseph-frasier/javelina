# Backend Verification Steps for FK Refactor

This document outlines verification steps for the Express.js backend after the FK refactor migration.

## Overview

The FK refactor changes all foreign keys from `auth.users.id` to `profiles.id`. The good news: **the backend already queries the `profiles` table exclusively**, so no code changes are required. However, you should verify everything works correctly.

## Pre-Migration Backend State

The backend already implements the correct pattern:

- ✅ Auth callback creates/updates `profiles` table records
- ✅ Session cookie stores `userId` from `profiles.id`
- ✅ API middleware validates sessions using `profiles` table
- ✅ All queries reference `profiles` table, not `auth.users`

## Verification Checklist

### 1. Auth0 Login Flow

**File to check:** Backend auth routes (`/auth/login`, `/auth/callback`)

Test:
```bash
# 1. Initiate login
curl -i http://localhost:3001/auth/login

# Should redirect to Auth0 with state and PKCE parameters

# 2. After Auth0 callback completes
# Check that session cookie is set
# Verify profile record was created in database
```

Verify in database:
```sql
-- Check that new profile was created
SELECT id, email, name, auth0_user_id, created_at
FROM profiles
WHERE auth0_user_id = 'auth0|...'  -- Use actual Auth0 user ID
ORDER BY created_at DESC
LIMIT 1;

-- Verify the ID is a valid UUID (not from auth.users)
-- Verify auth0_user_id is populated
-- Verify email and name are synced from Auth0
```

Expected behavior:
- [x] Profile created with auto-generated UUID
- [x] `auth0_user_id` populated
- [x] `email` and `name` synced from Auth0
- [x] Session cookie set with `userId` = `profiles.id`

### 2. Session Cookie Validation

**File to check:** Backend auth middleware

Test:
```bash
# Make authenticated request with session cookie
curl -i -H "Cookie: javelina_session=..." \
  http://localhost:3001/api/profile
```

Verify:
- [x] Middleware decodes session JWT
- [x] `userId` in session matches `profiles.id` (not `auth.users.id`)
- [x] Profile lookup succeeds: `SELECT * FROM profiles WHERE id = userId`
- [x] Request proceeds successfully

### 3. Organization Creation

**File to check:** Organization API endpoints

Test via backend:
```bash
curl -X POST http://localhost:3001/api/organizations \
  -H "Cookie: javelina_session=..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Org", "description": "FK Refactor Test"}'
```

Verify in database:
```sql
-- Check organization was created
SELECT id, name, owner_id
FROM organizations
WHERE name = 'Test Org';

-- Verify owner_id references profiles.id (not auth.users.id)
SELECT o.name, p.email, p.auth0_user_id
FROM organizations o
JOIN profiles p ON p.id = o.owner_id
WHERE o.name = 'Test Org';

-- Should successfully join with profiles
```

Expected behavior:
- [x] Organization created successfully
- [x] `owner_id` = Auth0 user's `profiles.id`
- [x] Foreign key constraint satisfied

### 4. Organization Membership

**File to check:** Organization members API endpoints

Test:
```bash
# Invite a user
curl -X POST http://localhost:3001/api/organizations/{orgId}/members \
  -H "Cookie: javelina_session=..." \
  -H "Content-Type: application/json" \
  -d '{"email": "invitee@example.com", "role": "Editor"}'
```

Verify in database:
```sql
-- Check membership record
SELECT om.organization_id, om.user_id, om.role, om.invited_by, 
       p1.email as member_email, p2.email as inviter_email
FROM organization_members om
JOIN profiles p1 ON p1.id = om.user_id
JOIN profiles p2 ON p2.id = om.invited_by
WHERE om.organization_id = 'org-uuid';

-- Both user_id and invited_by should reference profiles.id
```

Expected behavior:
- [x] `user_id` references `profiles.id`
- [x] `invited_by` references `profiles.id`
- [x] Both FKs work for Auth0 users

### 5. Zone and Record Creation

**File to check:** Zones and records API endpoints

Test:
```bash
# Create zone
curl -X POST http://localhost:3001/api/zones \
  -H "Cookie: javelina_session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test.example.com",
    "organization_id": "org-uuid",
    "description": "FK Test Zone"
  }'

# Create DNS record
curl -X POST http://localhost:3001/api/zones/{zoneId}/records \
  -H "Cookie: javelina_session=..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "www",
    "type": "A",
    "value": "192.168.1.1",
    "ttl": 3600
  }'
```

Verify in database:
```sql
-- Check zone
SELECT z.id, z.name, z.created_by, p.email, p.auth0_user_id
FROM zones z
JOIN profiles p ON p.id = z.created_by
WHERE z.name = 'test.example.com';

-- Check record
SELECT zr.id, zr.name, zr.type, zr.created_by, p.email
FROM zone_records zr
JOIN profiles p ON p.id = zr.created_by
WHERE zr.zone_id = 'zone-uuid';

-- created_by should reference Auth0 user's profiles.id
```

Expected behavior:
- [x] Zone created with `created_by` = `profiles.id`
- [x] Record created with `created_by` = `profiles.id`
- [x] Both can join to `profiles` table

### 6. Subscription Management

**File to check:** Subscription/billing API endpoints

Test:
```bash
# Check subscription status
curl -i http://localhost:3001/api/subscriptions/{orgId} \
  -H "Cookie: javelina_session=..."
```

Verify in database:
```sql
-- Check subscription
SELECT s.id, s.org_id, s.plan_id, s.status, s.created_by, p.email
FROM subscriptions s
LEFT JOIN profiles p ON p.id = s.created_by
WHERE s.org_id = 'org-uuid';

-- created_by should reference profiles.id
```

Expected behavior:
- [x] Subscription queries work
- [x] `created_by` references `profiles.id` correctly
- [x] Auth0 users can manage billing

### 7. Audit Logging

**File to check:** Audit logging middleware/functions

Test by performing actions and checking logs:

```sql
-- Check recent audit logs
SELECT al.id, al.action, al.table_name, al.user_id, p.email, p.auth0_user_id
FROM audit_logs al
LEFT JOIN profiles p ON p.id = al.user_id
WHERE al.created_at > NOW() - INTERVAL '1 hour'
ORDER BY al.created_at DESC
LIMIT 20;

-- user_id should reference profiles.id for Auth0 users
```

Expected behavior:
- [x] Audit logs created for Auth0 user actions
- [x] `user_id` correctly references `profiles.id`
- [x] Can join to profiles to get user email

### 8. Permission Checks

**File to check:** RBAC middleware

Verify that permission checks work correctly:

```javascript
// Backend should query:
// SELECT om.role FROM organization_members om
// WHERE om.organization_id = $orgId AND om.user_id = $userId

// $userId comes from session cookie (profiles.id)
// Should work for both Supabase Auth and Auth0 users
```

Test:
- [x] Editor can create/edit zones
- [x] Viewer cannot edit zones
- [x] Admin can manage members
- [x] BillingContact can manage subscription
- [x] SuperAdmin has global access

### 9. Error Scenarios

Test error handling:

**Invalid user_id in session:**
```bash
# Manually craft JWT with non-existent userId
# Request should fail with 401 Unauthorized
```

**Orphaned foreign keys (shouldn't exist after validation):**
```sql
-- Try to create org with non-existent owner_id
INSERT INTO organizations (name, owner_id)
VALUES ('Test', 'non-existent-uuid');

-- Should fail with FK constraint violation
```

## Backend Code Review

Even though no changes are required, review these files to confirm:

### Auth Callback (`/auth/callback`)

```javascript
// ✅ Should create/update profiles table
const { data: existingUser } = await supabase
  .from('profiles')
  .select('*')
  .eq('auth0_user_id', auth0UserId)
  .single();

// ✅ Should store profiles.id in session
const sessionData = {
  userId: userId,  // This is profiles.id
  auth0UserId: auth0UserId,
  email: email,
  name: name,
};
```

### Auth Middleware

```javascript
// ✅ Should decode session and extract userId
const decoded = jwt.verify(token, process.env.SESSION_SECRET);
const userId = decoded.userId;  // This is profiles.id

// ✅ Should query profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)  // profiles.id
  .single();
```

### API Routes

```javascript
// ✅ All queries should reference profiles
// Example:
const { data: orgs } = await supabase
  .from('organizations')
  .select(`
    *,
    owner:profiles!owner_id(*)  // Join to profiles, not auth.users
  `);
```

## Backend Environment Variables

Verify these are set correctly:

```env
# Auth0
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback

# Session
SESSION_SECRET=your-secret-key
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=86400000

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # For bypassing RLS

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Expected Results Summary

After verification, you should confirm:

- ✅ Auth0 login creates profiles with auto-generated UUIDs
- ✅ Session cookies contain `userId` = `profiles.id`
- ✅ All CRUD operations work for Auth0 users
- ✅ Foreign keys correctly reference `profiles.id`
- ✅ Organizations, zones, records, subscriptions all work
- ✅ Permission checks work correctly
- ✅ Audit logs track Auth0 user actions
- ✅ No code changes required (backend already correct)

## Troubleshooting

### Issue: "Foreign key violation"

**Cause:** Session cookie still contains old `auth.users.id`

**Solution:** Clear cookies and log in again to get new session with `profiles.id`

### Issue: "User not found"

**Cause:** Backend trying to query `auth.users` instead of `profiles`

**Solution:** Review backend code - should query `profiles` table exclusively

### Issue: "Permission denied"

**Cause:** RLS policies blocking Auth0 users (shouldn't happen with service role key)

**Solution:** Verify backend uses `SUPABASE_SERVICE_ROLE_KEY`, not anon key

## Next Steps

Once verification is complete:

1. Document any issues found
2. Apply fixes to backend if needed (unlikely)
3. Test with real Auth0 provider (not just mock)
4. Monitor logs for FK constraint violations
5. Ready for production deployment
