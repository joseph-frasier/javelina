# Backend BFF Requirements

## Overview

This document outlines the Express API endpoints required to support the full Backend-for-Frontend (BFF) architecture refactor. The frontend has been updated to use session cookies exclusively and make all data requests through the Express API.

## Authentication

All endpoints must:
- Verify the `javelina_session` cookie
- Use Supabase service role key for database operations (bypasses RLS)
- Return `401 Unauthorized` for invalid/missing sessions

## Email Verification Enforcement

All endpoints that perform write operations (create/update/delete) must enforce email verification.

### Implementation Requirements

1. **Check session for emailVerified field**:
   - Every session must include `emailVerified: boolean`
   - Updated on every login from Auth0 JWT claim (`decoded.email_verified`)

2. **Middleware**: Use `requireEmailVerification` middleware for protected routes
   - Apply to POST, PUT, PATCH, DELETE requests
   - Allow GET requests without verification (read-only access)

3. **Error Response**: When user is not verified, return:
   ```json
   {
     "error": "Email verification required",
     "message": "Please verify your email address to perform this action. Check your inbox for a verification link.",
     "code": "EMAIL_NOT_VERIFIED",
     "email": "user@example.com"
   }
   ```
   - Status code: `403 Forbidden`

### Email Verification Endpoints

#### POST `/auth/resend-verification`

Triggers Auth0 Management API to resend verification email.

**Authentication**: Session cookie required

**Response**:
```json
{
  "success": true,
  "message": "Verification email sent successfully. Please check your inbox."
}
```

**Error Response**:
```json
{
  "error": "Failed to send verification email",
  "message": "Please try again later"
}
```

#### GET `/auth/me/verification-status`

Returns current email verification status from database.

**Authentication**: Session cookie required

**Response**:
```json
{
  "email_verified": true,
  "email": "user@example.com"
}
```

#### POST `/api/auth/refresh-verification-status`

Fetches current verification status directly from Auth0, updates database and session.

**Authentication**: Session cookie required

**Response**:
```json
{
  "success": true,
  "email_verified": true,
  "message": "Email verification confirmed!"
}
```

**Error Response**:
```json
{
  "error": "Failed to refresh verification status"
}
```

### Authentication Flow Endpoints

#### GET `/auth/login`

Redirects to Auth0 Universal Login. Supports optional `screen_hint` query parameter to control which screen is displayed.

**Query Parameters**:
- `screen_hint` (optional): 
  - `signup` - Direct users to the sign-up screen
  - Omit or use any other value for the default login screen

**Examples**:
- `/auth/login` - Shows login screen (default)
- `/auth/login?screen_hint=signup` - Shows sign-up screen

**Implementation**:
```javascript
router.get('/auth/login', (req, res) => {
  const { screen_hint } = req.query;
  
  // Build Auth0 authorization URL
  const params = new URLSearchParams({
    client_id: process.env.AUTH0_CLIENT_ID,
    redirect_uri: `${process.env.API_URL}/auth/callback`,
    response_type: 'code',
    scope: 'openid profile email',
    // Include screen_hint if provided
    ...(screen_hint && { screen_hint })
  });
  
  res.redirect(`https://${process.env.AUTH0_DOMAIN}/authorize?${params}`);
});
```

**Frontend Usage**:
- Login button: Calls `/auth/login` (default login screen)
- Sign Up / Get Started button: Calls `/auth/login?screen_hint=signup` (sign-up screen)

## Required New Endpoints

### 1. GET `/api/organizations/:id/role`

**Purpose**: Get the current user's role in a specific organization

**Authentication**: Session cookie required

**Response**:
```json
{
  "role": "Admin" | "Editor" | "Viewer" | "SuperAdmin" | "BillingContact"
}
```

**Error Responses**:
- `401`: Not authenticated
- `403`: User not a member of organization
- `404`: Organization not found

**Implementation Notes**:
- Query `organization_members` table
- Match `user_id` from session with `organization_id` parameter
- Return the user's role

---

### 2. GET `/api/zones/:id` (Enhancement)

**Purpose**: Get zone details including organization data

**Current**: Returns zone only

**Required Enhancement**: Include organization in response

**Response**:
```json
{
  "id": "uuid",
  "name": "example.com",
  "organization_id": "uuid",
  "description": "...",
  "live": true,
  "records_count": 42,
  "organization": {
    "id": "uuid",
    "name": "Acme Corp",
    "description": "..."
  }
}
```

**Implementation Notes**:
- Join `zones` with `organizations` table
- Return nested organization object

---

### 3. GET `/api/zones/organization/:orgId` (Enhancement)

**Purpose**: Get all zones for an organization with record counts

**Current**: Returns basic zone list

**Required Enhancement**: Include `records_count` for each zone

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "example.com",
      "organization_id": "uuid",
      "live": true,
      "records_count": 42
    }
  ]
}
```

**Implementation Notes**:
- Query `zones` table filtered by `organization_id`
- For each zone, count records in `zone_records` table
- Return zones with record counts

---

### 4. GET `/api/organizations/:id` (Enhancement)

**Purpose**: Get organization details

**Current**: Returns organization only

**Optional Enhancement**: Include user's role in response

**Response**:
```json
{
  "id": "uuid",
  "name": "Acme Corp",
  "description": "...",
  "is_active": true,
  "created_at": "...",
  "updated_at": "...",
  "userRole": "Admin"  // Optional enhancement
}
```

**Implementation Notes**:
- Query `organizations` table
- Optionally join with `organization_members` to include user's role
- Verify user has access to this organization

---

## Optional New Endpoints (Phase 4)

These endpoints are needed for client component refactoring but are lower priority:

### 5. PUT `/api/auth/password`

**Purpose**: Change user password

**Body**:
```json
{
  "password": "newPassword123"
}
```

**Implementation Notes**:
- For Supabase Auth users: Update via Supabase Admin API
- For Auth0 users: Update via Auth0 Management API
- Return success/error

---

### 6. PUT `/api/auth/email`

**Purpose**: Change user email

**Body**:
```json
{
  "email": "newemail@example.com"
}
```

**Implementation Notes**:
- For Supabase Auth users: Update via Supabase Admin API
- For Auth0 users: Update via Auth0 Management API
- Send verification email
- Return success/error

---

### 7. GET `/api/auth/connections`

**Purpose**: Get connected OAuth providers

**Response**:
```json
{
  "google": false,
  "github": false
}
```

**Implementation Notes**:
- For Supabase Auth users: Check `auth.identities` table
- For Auth0 users: Query Auth0 Management API for user's identities
- Return which providers are connected

---

### 8. POST `/api/users/avatar`

**Purpose**: Upload user avatar to Supabase Storage

**Body**: `FormData` with file

**Response**:
```json
{
  "avatar_url": "https://..."
}
```

**Implementation Notes**:
- Upload to Supabase Storage `avatars` bucket
- Update `profiles.avatar_url`
- Return new avatar URL

---

## Existing Endpoints (Verified Working)

These endpoints already exist and work correctly with session cookies:

- ✅ `POST /api/organizations` - Create organization
- ✅ `PUT /api/organizations/:id` - Update organization
- ✅ `DELETE /api/organizations/:id` - Delete organization
- ✅ `GET /api/organizations/:id/audit-logs` - Get audit logs
- ✅ `POST /api/zones` - Create zone
- ✅ `PUT /api/zones/:id` - Update zone
- ✅ `DELETE /api/zones/:id` - Delete zone
- ✅ `PUT /api/zones/:id/verification` - Verify nameservers
- ✅ `GET /api/dns-records/zone/:zoneId` - List DNS records
- ✅ `POST /api/dns-records` - Create DNS record
- ✅ `PUT /api/dns-records/:id` - Update DNS record
- ✅ `DELETE /api/dns-records/:id` - Delete DNS record
- ✅ `GET /api/users/profile` - Get user profile with organizations

---

## Frontend Changes Summary

### Completed Refactoring

**Phase 1: Server Components**
- ✅ `app/organization/[orgId]/page.tsx` - Uses session cookies
- ✅ `app/zone/[id]/page.tsx` - Uses session cookies
- ✅ `app/analytics/page.tsx` - Uses session cookies
- ✅ `app/settings/page.tsx` - Uses session cookies
- ✅ `app/settings/billing/[org_id]/page.tsx` - Uses session cookies

**Phase 2: Server Actions**
- ✅ `lib/actions/organizations.ts` - Uses session cookies
- ✅ `lib/actions/zones.ts` - Uses session cookies
- ✅ `lib/actions/dns-records.ts` - Uses session cookies

**Phase 3: Client Hooks & API Helpers**
- ✅ `lib/hooks/useZones.ts` - Uses `apiClient`
- ✅ `lib/api/dns.ts` - Uses `apiClient`
- ✅ `lib/api/audit.ts` - Uses session cookies
- ✅ `lib/api/roles.ts` - Uses session cookies

### Pending (Lower Priority)

**Phase 4: Client Components**
- ⏸️ `components/modals/ChangePasswordModal.tsx` - Requires new endpoint
- ⏸️ `components/modals/ManageEmailModal.tsx` - Requires new endpoint
- ⏸️ `components/ui/AvatarUpload.tsx` - Requires new endpoint

**Phase 5: Cleanup**
- ⏸️ Remove unused Supabase client imports

---

## Testing Checklist

### Critical Path (Auth0 Users)

- [ ] Login with Auth0
- [ ] View organization page
- [ ] Create organization
- [ ] View zone page
- [ ] Create zone
- [ ] Add DNS record
- [ ] Update DNS record
- [ ] Delete DNS record
- [ ] View analytics page
- [ ] View settings page

### Legacy Path (Supabase Auth Users)

- [ ] Login with email/password
- [ ] All CRUD operations work
- [ ] No regression from previous functionality

---

## Implementation Priority

### High Priority (Required for Auth0 users to function)

1. **GET `/api/organizations/:id/role`** - Required by organization page
2. **GET `/api/zones/:id`** (enhancement) - Include organization data
3. **GET `/api/zones/organization/:orgId`** (enhancement) - Include record counts

### Medium Priority (Nice to have)

4. **GET `/api/organizations/:id`** (enhancement) - Include user role

### Low Priority (Can defer)

5. **PUT `/api/auth/password`** - Password change for Auth0 users
6. **PUT `/api/auth/email`** - Email change for Auth0 users
7. **GET `/api/auth/connections`** - OAuth connections status
8. **POST `/api/users/avatar`** - Avatar upload proxy

---

## Session Cookie Format

The Express backend sets a `javelina_session` cookie after Auth0 login:

```javascript
const sessionToken = jwt.sign(
  {
    userId: profile.id,
    auth0UserId: auth0User.sub,
    email: auth0User.email,
    // ... other claims
  },
  process.env.SESSION_SECRET,
  { expiresIn: '7d' }
);

res.cookie('javelina_session', sessionToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

All endpoints should verify this cookie using:

```javascript
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies['javelina_session'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    req.user = decoded; // Contains userId, auth0UserId, email, etc.
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid session' });
  }
}
```

---

## Database Access Pattern

All Express endpoints should use the Supabase service role key:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
```

This bypasses Row Level Security (RLS) policies, so authorization must be handled in the Express middleware/endpoints.

---

## Success Criteria

- ✅ Auth0 users can access all application features
- ✅ No direct Supabase client calls from frontend
- ✅ All data flows through Express API
- ✅ Session cookie is sole authentication mechanism
- ✅ Legacy Supabase Auth users still work
- ✅ No performance degradation
