# Team Members API Backend Requirements

This document specifies the Express API endpoints required to support team member management for organizations in the Javelina DNS management application.

## Overview

Team member management allows organization Admins and SuperAdmins to add existing Javelina users to their organization, assign roles, change member roles, and remove members. The system enforces role-based access control and plan limits on the number of team members.

## Database Schema Reference

**Tables:**
- `profiles` - Stores user profile information including email
- `organization_members` - Junction table linking users to organizations with their assigned role
- `organizations` - Organization data
- `subscriptions` - Organization subscription information for plan limits

**Relevant columns in `organization_members`:**
- `organization_id` (uuid, part of composite primary key, foreign key to organizations)
- `user_id` (uuid, part of composite primary key, foreign key to auth.users/profiles)
- `role` (text) - One of: 'SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'
- `created_at` (timestamp)
- `invited_by` (uuid, nullable)
- `invited_at` (timestamp, nullable)
- `joined_at` (timestamp, nullable)
- `last_accessed_at` (timestamp, nullable)
- `permissions` (jsonb, nullable)
- `status` (text, default 'active') - One of: 'active', 'invited', 'suspended'

**Note:** This table uses a **composite primary key** of `(organization_id, user_id)` - there is no separate `id` column.

## API Endpoints

### 1. GET /api/organizations/:orgId/members

List all members of an organization.

**Path Parameters:**
- `orgId` (required) - Organization UUID

**Authorization:** 
- Requires valid JWT token
- User must be a member of the organization (any role)
- Use middleware: `authenticateUser`, `requireOrgMember()`

**Response (200 OK):**
```json
{
  "data": [
    {
      "user_id": "uuid",
      "organization_id": "uuid",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "role": "Admin",
      "avatar_url": "https://...",
      "status": "active",
      "created_at": "2025-12-17T00:00:00Z",
      "last_accessed_at": "2025-12-17T00:00:00Z"
    }
  ]
}
```

**Implementation Notes:**

**IMPORTANT - Foreign Key Structure:**
- `organization_members.user_id` → `auth.users.id`
- `profiles.id` → `auth.users.id`
- There is **NO DIRECT** foreign key from `organization_members` to `profiles`
- Both tables reference `auth.users`, but Supabase query builder can't do transitive joins

**Option 1: Using Raw SQL (RECOMMENDED)**
```javascript
// Use raw SQL with explicit JOIN since there's no direct FK relationship
const { data, error } = await supabase.rpc('get_organization_members', {
  p_org_id: orgId
});

// Or use raw SQL query:
const query = `
  SELECT 
    om.user_id,
    om.organization_id,
    om.role,
    om.status,
    om.created_at,
    om.last_accessed_at,
    p.name,
    p.email,
    p.avatar_url
  FROM organization_members om
  JOIN profiles p ON p.id = om.user_id
  WHERE om.organization_id = $1
  ORDER BY om.created_at
`;

const { data, error } = await supabase.rpc('exec_sql', { query, params: [orgId] });
```

**Option 2: Two-Step Query Approach**
```javascript
// Step 1: Get organization members
const { data: members, error: membersError } = await supabase
  .from('organization_members')
  .select('user_id, organization_id, role, status, created_at, last_accessed_at')
  .eq('organization_id', orgId);

if (membersError) throw membersError;

// Step 2: Get user profiles
const userIds = members.map(m => m.user_id);
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, name, email, avatar_url')
  .in('id', userIds);

if (profilesError) throw profilesError;

// Step 3: Merge the data
const profileMap = new Map(profiles.map(p => [p.id, p]));
const result = members.map(member => {
  const profile = profileMap.get(member.user_id);
  return {
    user_id: member.user_id,
    organization_id: member.organization_id,
    role: member.role,
    status: member.status,
    created_at: member.created_at,
    last_accessed_at: member.last_accessed_at,
    name: profile?.name || 'Unknown',
    email: profile?.email || '',
    avatar_url: profile?.avatar_url || null,
  };
});

return res.json({ data: result });
```

**Frontend Filtering:**
- The frontend will filter out `SuperAdmin` roles from the UI display
- Backend should return all members including SuperAdmins for consistency

**Error Responses:**
- `401` - Not authenticated
- `403` - User not member of organization
- `404` - Organization not found

---

### 2. POST /api/organizations/:orgId/members

Add an existing Javelina user to an organization.

**Path Parameters:**
- `orgId` (required) - Organization UUID

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization
- Use middleware: `authenticateUser`, `requireOrgRole(['SuperAdmin', 'Admin'])`, `checkMemberLimit`

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "Admin"
}
```

**Validation:**
- `email` - Required, valid email format
- `role` - Required, must be one of: 'Admin', 'Editor', 'BillingContact', 'Viewer'
  - **IMPORTANT:** `SuperAdmin` is NOT an allowed value for this endpoint
  - SuperAdmin assignment is only via internal admin tooling

**Business Logic:**
1. Look up the user by email in the `profiles` table
2. If user not found, return 404 with `USER_NOT_FOUND` code
3. Check if user is already a member of the organization
4. If already a member, return 409 with `ALREADY_MEMBER` code
5. Enforce plan member limits using `checkMemberLimit` middleware
6. Insert into `organization_members` table
7. Return the created member object

**Response (201 Created):**
```json
{
  "data": {
    "user_id": "uuid",
    "organization_id": "uuid",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "Editor",
    "avatar_url": null,
    "status": "active",
    "created_at": "2025-12-17T00:00:00Z",
    "last_accessed_at": null
  }
}
```

**Implementation Notes:**

**Using Supabase Client:**
```javascript
// Step 1: Look up user by email
const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, name, email, avatar_url')
  .eq('email', email)
  .single();

if (profileError || !profile) {
  return res.status(404).json({ 
    error: 'User not found', 
    code: 'USER_NOT_FOUND' 
  });
}

const userId = profile.id;

// Step 2: Check if already a member
const { data: existingMember } = await supabase
  .from('organization_members')
  .select('user_id')
  .eq('organization_id', orgId)
  .eq('user_id', userId)
  .single();

if (existingMember) {
  return res.status(409).json({ 
    error: 'User is already a member of this organization',
    code: 'ALREADY_MEMBER' 
  });
}

// Step 3: Insert new member
const { data: newMember, error: insertError } = await supabase
  .from('organization_members')
  .insert({
    organization_id: orgId,
    user_id: userId,
    role: role,
    status: 'active'
  })
  .select()
  .single();

if (insertError) {
  throw insertError;
}

// Step 4: Return member with profile data
return res.status(201).json({
  data: {
    user_id: userId,
    organization_id: orgId,
    role: role,
    status: 'active',
    created_at: newMember.created_at,
    last_accessed_at: null,
    name: profile.name,
    email: profile.email,
    avatar_url: profile.avatar_url,
  }
});
```

**Using Raw SQL:**
```sql
-- Look up user by email
SELECT id, name, email, avatar_url
FROM profiles
WHERE email = $email;

-- Check if already a member
SELECT 1 FROM organization_members
WHERE organization_id = $org_id AND user_id = $user_id;

-- Insert new member
INSERT INTO organization_members (
  organization_id,
  user_id,
  role,
  status
)
VALUES ($org_id, $user_id, $role, 'active')
RETURNING *;

-- Join with profiles to return complete member object
SELECT 
  om.user_id,
  om.organization_id,
  om.role,
  om.status,
  om.created_at,
  om.last_accessed_at,
  p.name,
  p.email,
  p.avatar_url
FROM organization_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.organization_id = $org_id 
  AND om.user_id = $user_id;
```

**Error Responses:**
- `400` - Invalid request body or validation failed
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin of organization
- `404` - User with email not found
  ```json
  {
    "error": "User not found",
    "code": "USER_NOT_FOUND"
  }
  ```
- `409` - User already a member or member limit reached
  ```json
  {
    "error": "User is already a member of this organization",
    "code": "ALREADY_MEMBER"
  }
  ```
  ```json
  {
    "error": "Team member limit reached. Please upgrade your plan.",
    "code": "MEMBER_LIMIT_REACHED"
  }
  ```

---

### 3. PUT /api/organizations/:orgId/members/:userId/role

Update a member's role in an organization.

**Path Parameters:**
- `orgId` (required) - Organization UUID
- `userId` (required) - User UUID (organization_members.user_id)

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization
- Use middleware: `authenticateUser`, `requireOrgRole(['SuperAdmin', 'Admin'])`

**Request Body:**
```json
{
  "role": "Editor"
}
```

**Validation:**
- `role` - Required, must be one of: 'Admin', 'Editor', 'BillingContact', 'Viewer'
  - **IMPORTANT:** `SuperAdmin` is NOT an allowed value for this endpoint
  - SuperAdmin assignment is only via internal admin tooling

**Business Rules (from TEAM_MANAGEMENT_RULES.md):**
1. **Cannot change own role** - Prevents accidental lockout
   - Check if `req.user.id` matches the `user_id` of the member being changed
   - Return 403 with `CANNOT_CHANGE_OWN_ROLE` if true
2. **Cannot promote above own level** - Admins cannot create SuperAdmins
   - Get the requesting user's role in the organization
   - If requester is Admin and trying to assign SuperAdmin, reject
3. **Cannot demote another SuperAdmin if you're an Admin**
   - If target member is SuperAdmin and requester is Admin, reject

**Response (200 OK):**
```json
{
  "data": {
    "user_id": "uuid",
    "organization_id": "uuid",
    "name": "Jane Smith",
    "email": "jane.smith@example.com",
    "role": "Editor",
    "avatar_url": null,
    "status": "active",
    "created_at": "2025-12-17T00:00:00Z",
    "last_accessed_at": "2025-12-17T00:00:00Z"
  }
}
```

**Implementation Notes:**

**Using Supabase Client:**
```javascript
// Step 1: Get target member and requester's role
const { data: targetMember } = await supabase
  .from('organization_members')
  .select('user_id, role')
  .eq('organization_id', orgId)
  .eq('user_id', userId)
  .single();

const { data: requester } = await supabase
  .from('organization_members')
  .select('role')
  .eq('organization_id', orgId)
  .eq('user_id', req.user.id)
  .single();

if (!targetMember) {
  return res.status(404).json({ error: 'Member not found' });
}

// Step 2: Validate business rules
if (userId === req.user.id) {
  return res.status(403).json({
    error: 'You cannot change your own role',
    code: 'CANNOT_CHANGE_OWN_ROLE'
  });
}

// Step 3: Update the role
const { error: updateError } = await supabase
  .from('organization_members')
  .update({ role: newRole })
  .eq('organization_id', orgId)
  .eq('user_id', userId);

if (updateError) throw updateError;

// Step 4: Fetch updated member with profile data
const { data: updated, error: fetchError } = await supabase
  .from('organization_members')
  .select(`
    user_id,
    organization_id,
    role,
    status,
    created_at,
    last_accessed_at,
    profiles!organization_members_user_id_fkey (
      name,
      email,
      avatar_url
    )
  `)
  .eq('organization_id', orgId)
  .eq('user_id', userId)
  .single();

return res.json({
  data: {
    user_id: updated.user_id,
    organization_id: updated.organization_id,
    role: updated.role,
    status: updated.status,
    created_at: updated.created_at,
    last_accessed_at: updated.last_accessed_at,
    name: updated.profiles.name,
    email: updated.profiles.email,
    avatar_url: updated.profiles.avatar_url,
  }
});
```

**Using Raw SQL:**
```sql
-- Get member info and check requester's role
SELECT 
  om_target.user_id as target_user_id,
  om_target.role as target_current_role,
  om_requester.role as requester_role
FROM organization_members om_target
CROSS JOIN organization_members om_requester
WHERE om_target.user_id = $user_id
  AND om_target.organization_id = $org_id
  AND om_requester.organization_id = $org_id
  AND om_requester.user_id = $requester_user_id;

-- Validate business rules in application code, then update
UPDATE organization_members
SET role = $new_role
WHERE organization_id = $org_id
  AND user_id = $user_id
RETURNING *;

-- Join with profiles to return complete member object
SELECT 
  om.user_id,
  om.organization_id,
  om.role,
  om.status,
  om.created_at,
  om.last_accessed_at,
  p.name,
  p.email,
  p.avatar_url
FROM organization_members om
JOIN profiles p ON p.id = om.user_id
WHERE om.organization_id = $org_id
  AND om.user_id = $user_id;
```

**Error Responses:**
- `400` - Invalid role value
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin, or business rule violation
  ```json
  {
    "error": "You cannot change your own role",
    "code": "CANNOT_CHANGE_OWN_ROLE"
  }
  ```
  ```json
  {
    "error": "You cannot promote a member to a role higher than your own",
    "code": "FORBIDDEN_ROLE_CHANGE"
  }
  ```
- `404` - Member not found

---

### 4. DELETE /api/organizations/:orgId/members/:userId

Remove a member from an organization.

**Path Parameters:**
- `orgId` (required) - Organization UUID
- `userId` (required) - User UUID (organization_members.user_id)

**Authorization:**
- Requires valid JWT token
- User must be SuperAdmin or Admin of the organization
- Use middleware: `authenticateUser`, `requireOrgRole(['SuperAdmin', 'Admin'])`

**Business Rules (from TEAM_MANAGEMENT_RULES.md):**
1. **Cannot remove yourself** - Prevents accidental lockout
   - Check if `req.user.id` matches the `user_id` of the member being removed
   - Return 403 with `CANNOT_REMOVE_SELF` if true
2. **Warn if removing last Admin/SuperAdmin** (optional enhancement)
   - Count remaining Admins/SuperAdmins in the organization
   - If removing the last one, consider blocking or requiring confirmation

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

**Implementation Notes:**

**Using Supabase Client:**
```javascript
// Step 1: Validate business rules - check if removing self
if (userId === req.user.id) {
  return res.status(403).json({
    error: 'You cannot remove yourself from the organization',
    code: 'CANNOT_REMOVE_SELF'
  });
}

// Step 2: Optional - Count remaining admins
const { count } = await supabase
  .from('organization_members')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', orgId)
  .in('role', ['SuperAdmin', 'Admin'])
  .neq('user_id', userId);

if (count === 0) {
  return res.status(403).json({
    error: 'Cannot remove the last admin from the organization',
    code: 'CANNOT_REMOVE_LAST_ADMIN'
  });
}

// Step 3: Delete the member
const { error: deleteError } = await supabase
  .from('organization_members')
  .delete()
  .eq('organization_id', orgId)
  .eq('user_id', userId);

if (deleteError) throw deleteError;

return res.json({
  success: true,
  message: 'Member removed successfully'
});
```

**Using Raw SQL:**
```sql
-- Get member info to validate business rules
SELECT 
  om_target.user_id as target_user_id,
  om_target.role as target_role
FROM organization_members om_target
WHERE om_target.user_id = $user_id
  AND om_target.organization_id = $org_id;

-- Check if removing self
-- (Compare target_user_id with requester's user_id in application code)

-- Optional: Count remaining admins
SELECT COUNT(*) as admin_count
FROM organization_members
WHERE organization_id = $org_id
  AND role IN ('SuperAdmin', 'Admin')
  AND user_id != $user_id;

-- Delete the member
DELETE FROM organization_members
WHERE organization_id = $org_id
  AND user_id = $user_id;
```

**Error Responses:**
- `401` - Not authenticated
- `403` - User not Admin/SuperAdmin, or business rule violation
  ```json
  {
    "error": "You cannot remove yourself from the organization",
    "code": "CANNOT_REMOVE_SELF"
  }
  ```
  ```json
  {
    "error": "Cannot remove the last admin from the organization",
    "code": "CANNOT_REMOVE_LAST_ADMIN"
  }
  ```
- `404` - Member not found

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    "field": "Additional context if applicable"
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `USER_NOT_FOUND` | 404 | Email does not correspond to an existing Javelina user |
| `ALREADY_MEMBER` | 409 | User is already a member of the organization |
| `MEMBER_LIMIT_REACHED` | 409 | Organization has reached its plan's member limit |
| `CANNOT_CHANGE_OWN_ROLE` | 403 | User attempted to change their own role |
| `FORBIDDEN_ROLE_CHANGE` | 403 | User attempted to promote someone above their own level |
| `CANNOT_REMOVE_SELF` | 403 | User attempted to remove themselves |
| `CANNOT_REMOVE_LAST_ADMIN` | 403 | Attempting to remove the last admin/superadmin |
| `INVALID_ROLE` | 400 | Role value is not one of the allowed values |

---

## Authentication & Authorization

All endpoints require a JWT token from Supabase auth in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

The token should be validated using Supabase's JWT verification, and the user ID extracted from `auth.uid()` for RLS policy enforcement and authorization checks.

### RBAC Middleware

Use the RBAC middleware documented in `BACKEND_RBAC_IMPLEMENTATION.md`:

```javascript
const { requireOrgRole, requireOrgMember } = require('../middleware/rbac');

// Example: Only Admins and SuperAdmins can add members
router.post('/:orgId/members', 
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkMemberLimit,
  async (req, res) => {
    // Handler implementation
  }
);
```

---

## Plan Limits Enforcement

Member limits are enforced at the plan level. Use the `checkMemberLimit` middleware documented in `PLAN_LIMITS_BACKEND_IMPLEMENTATION.md`:

```javascript
const { checkMemberLimit } = require('../middleware/enforcePlanLimits');

// Automatically checks and blocks if at limit
router.post('/:orgId/members', 
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkMemberLimit,
  async (req, res) => {
    // Handler implementation
  }
);
```

**Default plan limits:**
- Starter: 1 member
- Pro: 5 members
- Business: 20 members
- Enterprise: Unlimited (-1)

---

## Rate Limiting

Consider implementing rate limiting on member management endpoints:
- Add member: 10 requests per minute per user
- Update role: 20 requests per minute per user
- Remove member: 20 requests per minute per user

---

## Testing Checklist

### Unit Tests
- [ ] Validate role values (reject SuperAdmin for customer-facing endpoints)
- [ ] Email validation
- [ ] Business rule enforcement (cannot change own role, cannot remove self, etc.)

### Integration Tests
- [ ] GET /members returns all members for org member
- [ ] GET /members returns 403 for non-members
- [ ] POST /members adds existing user successfully
- [ ] POST /members returns 404 for non-existent email (USER_NOT_FOUND)
- [ ] POST /members returns 409 for duplicate member (ALREADY_MEMBER)
- [ ] POST /members returns 409 when at member limit (MEMBER_LIMIT_REACHED)
- [ ] POST /members rejects SuperAdmin role (400 INVALID_ROLE)
- [ ] POST /members returns 403 for Editor/Viewer/BillingContact
- [ ] PUT /members/:id/role updates role successfully for Admin
- [ ] PUT /members/:id/role returns 403 when trying to change own role
- [ ] PUT /members/:id/role returns 403 when Admin tries to create SuperAdmin
- [ ] PUT /members/:id/role rejects SuperAdmin as target role (400 INVALID_ROLE)
- [ ] DELETE /members/:id removes member successfully
- [ ] DELETE /members/:id returns 403 when trying to remove self
- [ ] DELETE /members/:id returns 403 for non-Admin users
- [ ] All endpoints return proper error format with codes

### Authorization Tests
- [ ] SuperAdmin can perform all member operations
- [ ] Admin can perform all member operations (except promote to SuperAdmin)
- [ ] BillingContact cannot add/edit/remove members
- [ ] Editor cannot add/edit/remove members
- [ ] Viewer cannot add/edit/remove members
- [ ] Non-members cannot access member endpoints

---

## Frontend Integration

The frontend uses the following `api-client.ts` methods:

```typescript
// Get members
organizationsApi.getMembers(orgId: string)

// Add member
organizationsApi.addMember(orgId: string, data: { 
  email: string; 
  role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer' 
})

// Update member role
organizationsApi.updateMemberRole(orgId: string, userId: string, 
  role: 'Admin' | 'Editor' | 'BillingContact' | 'Viewer')

// Remove member
organizationsApi.removeMember(orgId: string, userId: string)
```

**Important:** The `userId` parameter is the `user_id` from `organization_members` table (not a separate `id` column - the table uses a composite primary key).

The frontend filters out `SuperAdmin` members from the UI display, but the backend should still return them in the GET response for consistency.

---

## Migration from Invite Flow

**Previous endpoints (deprecated for customer use):**
- `POST /api/organizations/:orgId/members/invite` - Used for email-based invitations

**New approach:**
- `POST /api/organizations/:orgId/members` - Directly adds existing users by email

**Key differences:**
1. No invitation email is sent (email service not implemented)
2. User must already have a Javelina account
3. Member is immediately added to the organization
4. No pending invitation state

**Backward compatibility:**
- The `/invite` endpoint may still exist for admin tooling
- Customer-facing UI exclusively uses the new `/members` endpoint
- Update documentation in `BACKEND_RBAC_IMPLEMENTATION.md` to reference new flow

---

## Related Documentation

- `BACKEND_RBAC_IMPLEMENTATION.md` - Complete backend RBAC implementation guide
- `TEAM_MANAGEMENT_RULES.md` - Business rules for team management permissions
- `PLAN_LIMITS_BACKEND_IMPLEMENTATION.md` - Plan limits enforcement
- `RBAC.md` - Master RBAC reference document
- `TAGS_API_REQUIREMENTS.md` - Example API requirements document format

---

## Common Implementation Issues & Troubleshooting

### Error: "Could not find a relationship between 'organization_members' and 'user_id'"

**Cause:** Trying to use `.select('*, user_id(*)')` with Supabase client

**Solution:** Use the foreign key constraint name:
```javascript
.select('*, profiles!organization_members_user_id_fkey(*)')
```

Or use raw SQL with a JOIN on profiles table.

### Error: "column organization_members.id does not exist"

**Cause:** Trying to reference an `id` column that doesn't exist

**Solution:** The table uses a composite primary key `(organization_id, user_id)`. Use these two columns to identify records:
```sql
WHERE organization_id = $org_id AND user_id = $user_id
```

### Error: "column organization_members.updated_at does not exist"

**Cause:** Trying to set an `updated_at` column

**Solution:** This table doesn't have an `updated_at` column. Remove it from INSERT/UPDATE statements.

---

## Contact

For questions about team member API implementation:
- **Owner:** Seth Chesky
- **Date Created:** December 17, 2024
- **Last Updated:** December 18, 2024
- **Status:** Ready for Implementation

