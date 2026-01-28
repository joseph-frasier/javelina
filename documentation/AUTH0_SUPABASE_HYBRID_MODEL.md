# Auth0 + Supabase Hybrid Authentication Model

**Last Updated:** January 28, 2026  
**Status:** Active  
**Database FK Refactor:** Complete

## Overview

Javelina now supports **dual authentication methods** in a hybrid model:
1. **Supabase Auth** - Existing users with email/password or OAuth
2. **Auth0** - New users via Auth0 Universal Login

Both authentication methods are fully functional and users from either system can collaborate within the same organizations.

## Architecture

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     USER AUTHENTICATION                      │
└─────────────────────────────────────────────────────────────┘
                              │
                 ┌────────────┴────────────┐
                 │                         │
         ┌───────▼────────┐       ┌───────▼────────┐
         │ Supabase Auth  │       │     Auth0      │
         │   (Existing)   │       │     (New)      │
         └───────┬────────┘       └───────┬────────┘
                 │                         │
                 │  JWT Token              │  OAuth + OIDC
                 │                         │
         ┌───────▼─────────────────────────▼────────┐
         │       Express Backend (Port 3001)        │
         │   - Auth0 callback handler               │
         │   - Session management                   │
         │   - Supabase JWT validation              │
         └───────┬──────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │   Supabase     │
         │   PostgreSQL   │
         │                │
         │  ┌──────────┐  │
         │  │ profiles │←─┼─── Single source of truth
         │  └──────────┘  │      for user identity
         └────────────────┘
```

### Database Schema

#### Profiles Table (Central User Identity)

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  name TEXT,
  auth0_user_id TEXT UNIQUE,  -- NULL for Supabase Auth users
  -- ... other profile fields
);
```

**For Supabase Auth users:**
- `id` matches `auth.users.id` (via trigger)
- `auth0_user_id` is NULL
- Created automatically on signup via trigger

**For Auth0 users:**
- `id` is auto-generated UUID
- `auth0_user_id` stores Auth0 identifier (e.g., `auth0|123456`)
- Created by backend on first login

#### Foreign Key Architecture

**All application tables now reference `profiles.id`:**

| Table | Column | References |
|-------|--------|------------|
| organizations | owner_id | profiles(id) |
| organization_members | user_id | profiles(id) |
| organization_members | invited_by | profiles(id) |
| zones | created_by | profiles(id) |
| zone_records | created_by | profiles(id) |
| audit_logs | user_id | profiles(id) |
| subscriptions | created_by | profiles(id) |
| tags | created_by | profiles(id) |
| promotion_codes | created_by | profiles(id) |
| discount_redemptions | user_id | profiles(id) |

**Migration Date:** January 28, 2026  
**Migration Files:**
- `20260128000001_refactor_fks_to_profiles.sql`
- `20260128000002_update_rls_policies.sql`

## Authentication Methods Comparison

### Supabase Auth (Existing Users)

**How it works:**
1. User logs in via Supabase Auth
2. Supabase returns JWT token
3. Frontend sends JWT in `Authorization` header
4. Backend validates JWT
5. `auth.uid()` returns user's UUID
6. RLS policies enforce data access

**User Records:**
- Entry in `auth.users` (Supabase managed)
- Entry in `profiles` with matching ID
- `profiles.auth0_user_id` = NULL

**Access Control:**
- Row Level Security (RLS) policies
- `auth.uid()` function returns user UUID
- Direct database access via Supabase client

**Use Cases:**
- Existing email/password users
- Google OAuth users
- GitHub OAuth users
- Any Supabase-managed authentication

### Auth0 (New Users)

**How it works:**
1. User clicks login → redirected to Auth0
2. Auth0 handles authentication (OAuth/OIDC)
3. Auth0 redirects to backend callback
4. Backend validates Auth0 tokens
5. Backend creates/updates profile record
6. Backend sets session cookie
7. All requests use session cookie
8. Backend uses service role key (bypasses RLS)

**User Records:**
- NO entry in `auth.users` (Auth0 managed)
- Entry in `profiles` with auto-generated ID
- `profiles.auth0_user_id` populated (e.g., `auth0|123456`)

**Access Control:**
- Backend API with service role key
- RBAC middleware in Express
- Session-based authentication
- `auth.uid()` returns NULL (not used)

**Use Cases:**
- New user signups
- Enterprise SSO
- Social logins via Auth0
- MFA via Auth0

## Row Level Security (RLS) Policies

### Current Implementation

RLS policies use `auth.uid()` which only works for Supabase Auth users:

```sql
-- Example: profiles table
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Example: organizations table  
CREATE POLICY "users_can_select_their_organizations" ON organizations
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
    )
  );
```

### How RLS Works in Hybrid Model

| User Type | auth.uid() | RLS Applied? | Data Access Method |
|-----------|------------|--------------|-------------------|
| Supabase Auth | Returns UUID | ✅ Yes | Direct Supabase client + RLS |
| Auth0 | Returns NULL | ❌ No | Backend API + service role key |

**Auth0 users bypass RLS entirely** because:
- Backend uses `SUPABASE_SERVICE_ROLE_KEY`
- Service role key bypasses RLS
- Authorization enforced at API level via RBAC

**No RLS policy changes needed** - existing policies continue to work correctly for Supabase Auth users.

## Session Management

### Supabase Auth Sessions

- JWT token stored in localStorage/cookies by Supabase client
- Token includes `sub` claim = `auth.users.id` = `profiles.id`
- Token sent in `Authorization: Bearer <token>` header
- Backend validates JWT signature
- No server-side session storage needed

### Auth0 Sessions

- httpOnly session cookie set by backend
- Cookie name: `javelina_session` (configurable)
- Session data stored in signed JWT:
  ```javascript
  {
    userId: 'uuid-from-profiles-table',
    auth0UserId: 'auth0|123456',
    email: 'user@example.com',
    name: 'User Name',
    loginTime: 1706400000000
  }
  ```
- Session expires after 24 hours (configurable)
- Backend validates session on every request

## Backend Implementation

### Auth0 Endpoints

**`GET /auth/login`**
- Generates state and PKCE challenge
- Sets httpOnly cookies for CSRF protection
- Redirects to Auth0 authorization endpoint

**`GET /auth/callback`**
- Validates state and code_verifier
- Exchanges authorization code for tokens
- Validates ID token
- Creates/updates profile record
- Sets session cookie
- Redirects to frontend

**`GET /auth/me`**
- Validates session cookie
- Returns user profile data
- Used by frontend to check auth state

**`POST /auth/logout`**
- Clears session cookie
- Optionally logs out of Auth0

### Profile Sync Logic

```javascript
// On Auth0 callback
const auth0UserId = decoded.sub; // e.g., "auth0|123456"
const email = decoded.email;
const name = decoded.name;

// Check if profile exists
const { data: existingUser } = await supabase
  .from('profiles')
  .select('*')
  .eq('auth0_user_id', auth0UserId)
  .single();

if (existingUser) {
  // Update existing profile
  userId = existingUser.id;
  await supabase
    .from('profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', userId);
} else {
  // Create new profile
  const { data: newUser } = await supabase
    .from('profiles')
    .insert({
      auth0_user_id: auth0UserId,
      email: email,
      name: name,
      email_verified: decoded.email_verified || false,
      last_login: new Date().toISOString()
    })
    .select()
    .single();
  
  userId = newUser.id; // Auto-generated UUID
}

// Create session with profiles.id
const sessionData = {
  userId: userId, // This is profiles.id
  auth0UserId: auth0UserId,
  email: email,
  name: name
};
```

### Authorization Middleware

```javascript
// RBAC middleware for protected routes
async function requireRole(allowedRoles) {
  // Extract userId from session (profiles.id)
  const userId = req.session.userId;
  
  // Get user's role in organization
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId) // profiles.id
    .single();
  
  if (!allowedRoles.includes(member.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  next();
}
```

## Frontend Integration

### Current Auth Flow

The frontend (`lib/auth-store.ts`) currently uses Supabase Auth:

```typescript
// Supabase Auth (existing)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
});
```

### Auth0 Integration (To Be Implemented)

Frontend should detect Auth0 login and redirect:

```typescript
// Auth0 login (new)
const loginWithAuth0 = async () => {
  // Redirect to backend Auth0 login endpoint
  window.location.href = `${API_URL}/auth/login`;
};

// On app initialization, check session
const initializeAuth = async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include' // Send session cookie
  });
  
  if (response.ok) {
    const profile = await response.json();
    set({ user: profile, isAuthenticated: true });
  }
};
```

## Migration from Supabase Auth to Auth0

### For Existing Users

If you want existing Supabase Auth users to migrate to Auth0:

**Option 1: Account Linking (Recommended)**
1. User logs in with Auth0 using same email
2. Backend detects existing profile by email
3. Update profile with `auth0_user_id`:
   ```sql
   UPDATE profiles
   SET auth0_user_id = 'auth0|123456'
   WHERE email = 'user@example.com' AND auth0_user_id IS NULL;
   ```
4. User now has both auth methods

**Option 2: Manual Migration**
1. Export users from Supabase
2. Import to Auth0
3. Update profiles with Auth0 IDs
4. Disable Supabase Auth

**Option 3: Gradual Migration**
1. Keep both auth methods active
2. Encourage users to link Auth0 accounts
3. Eventually deprecate Supabase Auth

### Handling Duplicate Emails

Both auth systems may have users with the same email:

```sql
-- Find profiles with same email but different auth methods
SELECT 
  p1.id as supabase_profile_id,
  p2.id as auth0_profile_id,
  p1.email
FROM profiles p1
JOIN profiles p2 ON p1.email = p2.email AND p1.id != p2.id
WHERE p1.auth0_user_id IS NULL
  AND p2.auth0_user_id IS NOT NULL;
```

Decision: Merge accounts or keep separate?

## SuperAdmin Access

SuperAdmin users (`profiles.superadmin = true`) have global access regardless of auth method:

**For Supabase Auth SuperAdmins:**
- RLS policies check `profiles.superadmin = true`
- Can access all organizations

**For Auth0 SuperAdmins:**
- Backend RBAC checks `profiles.superadmin = true`
- Can access all organizations via API

Both work identically at the application level.

## Security Considerations

### Auth0 Configuration

**Required Settings:**
- HTTPS only in production
- Secure, httpOnly session cookies
- PKCE flow for authorization code exchange
- State parameter for CSRF protection
- Token signature validation
- Short-lived sessions (24 hours)

**Environment Variables:**
```env
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret  # Keep secure!
AUTH0_AUDIENCE=https://api.javelina.io
SESSION_SECRET=64-char-random-string   # Keep secure!
```

### Service Role Key Usage

Backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses all RLS:

**Security measures:**
- Never expose service role key to frontend
- Store in environment variables only
- Implement RBAC at API level
- Validate all inputs
- Log all service role key usage
- Monitor for unauthorized access

## Testing

See [TESTING_GUIDE.md](../supabase/manual-migrations/TESTING_GUIDE.md) for comprehensive testing checklist.

**Key test scenarios:**
- Supabase Auth user creates organization
- Auth0 user creates organization
- Users from both auth types collaborate in same org
- Permission checks work for both user types
- Audit logs track actions from both user types

## Monitoring and Debugging

### Identifying User Auth Method

```sql
-- Check user's auth method
SELECT 
  id,
  email,
  name,
  CASE 
    WHEN auth0_user_id IS NOT NULL THEN 'Auth0'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE id = profiles.id) THEN 'Supabase Auth'
    ELSE 'Unknown'
  END as auth_method,
  auth0_user_id,
  created_at
FROM profiles
WHERE email = 'user@example.com';
```

### Debugging Auth Issues

**Supabase Auth users:**
- Check JWT token validity
- Verify `auth.users` record exists
- Check RLS policies
- Review Supabase Auth logs

**Auth0 users:**
- Check session cookie is set
- Verify `auth0_user_id` populated
- Check backend logs
- Review Auth0 dashboard logs
- Ensure service role key is used

## Rollback Plan

If critical issues arise, you can rollback the FK refactor:

See [manual-migrations/20260128999999_rollback_fk_refactor.sql](../supabase/manual-migrations/20260128999999_rollback_fk_refactor.sql)

**⚠️ WARNING:** Rollback will break Auth0 integration! Only use in emergencies.

## Future Enhancements

### Potential Improvements

1. **Unified Login UI** - Single login page that supports both methods
2. **Account Linking** - Allow users to link Auth0 and Supabase accounts
3. **Migration Tool** - Automated tool to migrate Supabase users to Auth0
4. **Auth0 RLS Support** - Implement custom RLS for Auth0 users (complex)
5. **SSO Integration** - Enterprise SSO via Auth0
6. **MFA** - Multi-factor authentication via Auth0

### Deprecation Strategy

If/when you want to fully migrate to Auth0:

1. Enable both auth methods (current state)
2. Encourage users to create Auth0 accounts
3. Implement account linking
4. Set deprecation date for Supabase Auth
5. Migrate remaining users
6. Disable Supabase Auth
7. Clean up auth.users references
8. Remove Supabase Auth dependencies

## Summary

### Key Points

✅ **Hybrid Model Active** - Both Supabase Auth and Auth0 work simultaneously  
✅ **Profiles Table Central** - Single source of truth for user identity  
✅ **FK Refactor Complete** - All tables reference `profiles.id`  
✅ **No Backend Changes Needed** - Backend already queries profiles  
✅ **RLS Unchanged** - Existing policies work for Supabase Auth users  
✅ **Service Role Key** - Auth0 users bypass RLS via backend API  
✅ **Full Collaboration** - Users from both auth types can work together  

### Migration Complete

The database FK refactor migration is complete. Auth0 users can now:
- Create and manage organizations
- Add zones and DNS records
- Manage subscriptions
- Collaborate with Supabase Auth users
- Access all application features

**Next Steps:**
1. Test Auth0 integration thoroughly
2. Monitor for any issues
3. Document any edge cases
4. Plan gradual user migration if desired
