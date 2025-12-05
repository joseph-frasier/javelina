# Backend API Requirements for Architecture Compliance

This document outlines the Express API endpoints required to support the frontend architecture refactor. All frontend data operations now route through the Express API instead of direct Supabase calls.

---

## Summary of Required Endpoints

| Endpoint | Method | Status | Purpose |
|----------|--------|--------|---------|
| `/api/users/profile` | GET | **NEW** | Get authenticated user's profile with organizations |
| `/api/users/profile` | PUT | **NEW** | Update authenticated user's profile |
| `/api/zones/organization/:orgId` | GET | Verify | List zones for an organization |
| `/api/zones/:id/verification` | PUT | **NEW** | Trigger zone nameserver verification |

---

## Endpoint Specifications

### 1. GET /api/users/profile

Returns the authenticated user's profile data including their organization memberships.

**Authorization:** Bearer token (Supabase JWT)

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "display_name": "John",
    "title": "DevOps Engineer",
    "phone": "+1-555-555-0101",
    "timezone": "America/New_York",
    "bio": "DNS enthusiast",
    "avatar_url": "https://...",
    "role": "user",
    "mfa_enabled": false,
    "sso_connected": false,
    "first_name": "John",
    "last_name": "Doe",
    "billing_email": "billing@example.com",
    "billing_phone": "(555) 123-4567",
    "billing_address": "123 Main St",
    "billing_city": "San Francisco",
    "billing_state": "CA",
    "billing_zip": "94105",
    "admin_email": "admin@example.com",
    "admin_phone": "(555) 987-6543",
    "organizations": [
      {
        "id": "org-uuid",
        "name": "Company Corp",
        "role": "Admin"
      },
      {
        "id": "org-uuid-2",
        "name": "Personal Projects",
        "role": "SuperAdmin"
      }
    ]
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Not authenticated"
}
```

**Implementation Notes:**
- Query the `profiles` table for the authenticated user (from JWT)
- Query `organization_members` joined with `organizations` to get memberships
- Return role from `organization_members.role`

**SQL Reference:**
```sql
-- Get profile
SELECT * FROM profiles WHERE id = $user_id;

-- Get organizations
SELECT 
  om.role,
  o.id,
  o.name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = $user_id;
```

---

### 2. PUT /api/users/profile

Updates the authenticated user's profile data.

**Authorization:** Bearer token (Supabase JWT)

**Request Body:**
```json
{
  "name": "John Doe",
  "first_name": "John",
  "last_name": "Doe",
  "title": "Senior DevOps Engineer",
  "phone": "+1-555-555-0102",
  "timezone": "America/Los_Angeles",
  "bio": "Updated bio",
  "billing_email": "newbilling@example.com",
  "billing_phone": "(555) 111-2222",
  "billing_address": "456 New St",
  "billing_city": "Los Angeles",
  "billing_state": "CA",
  "billing_zip": "90001",
  "admin_email": "newadmin@example.com",
  "admin_phone": "(555) 333-4444"
}
```

All fields are optional - only provided fields will be updated.

**Response (200 OK):**
```json
{
  "data": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    ...
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Not authenticated"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Invalid email format"
}
```

**Implementation Notes:**
- Only allow users to update their own profile
- Validate email formats for `billing_email` and `admin_email`
- Update `updated_at` timestamp
- Return the updated profile

**SQL Reference:**
```sql
UPDATE profiles
SET 
  name = COALESCE($name, name),
  first_name = COALESCE($first_name, first_name),
  last_name = COALESCE($last_name, last_name),
  title = COALESCE($title, title),
  -- ... other fields
  updated_at = NOW()
WHERE id = $user_id
RETURNING *;
```

---

### 3. GET /api/zones/organization/:orgId

Lists all zones for a specific organization.

**Authorization:** Bearer token (Supabase JWT) - User must be a member of the organization

**URL Parameters:**
- `orgId` - The organization UUID

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "zone-uuid",
      "name": "example.com",
      "organization_id": "org-uuid",
      "description": "Main website zone",
      "admin_email": "admin@example.com",
      "negative_caching_ttl": 3600,
      "soa_serial": 1,
      "nameservers": ["ns1.javelina.io", "ns2.javelina.io"],
      "verification_status": "verified",
      "live": true,
      "active": true,
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Not a member of this organization"
}
```

**Implementation Notes:**
- Verify user is a member of the organization
- Filter out soft-deleted zones (`deleted_at IS NULL`)
- Order by `created_at DESC` or `name ASC`

**SQL Reference:**
```sql
-- Verify membership
SELECT 1 FROM organization_members 
WHERE organization_id = $org_id AND user_id = $user_id;

-- Get zones
SELECT * FROM zones
WHERE organization_id = $org_id
AND deleted_at IS NULL
ORDER BY created_at DESC;
```

---

### 4. PUT /api/zones/:id/verification

Triggers nameserver verification for a zone.

**Authorization:** Bearer token (Supabase JWT) - User must be Admin or SuperAdmin in the zone's organization

**URL Parameters:**
- `id` - The zone UUID

**Response (200 OK):**
```json
{
  "success": true,
  "status": "verified",
  "message": "Nameservers verified successfully"
}
```

**Response (200 OK - Verification Failed):**
```json
{
  "success": false,
  "status": "failed",
  "message": "Verification failed - nameservers not yet propagated"
}
```

**Response (403 Forbidden):**
```json
{
  "error": "Insufficient permissions to verify this zone"
}
```

**Implementation Notes:**
1. Verify user has Admin or SuperAdmin role in the zone's organization
2. Update zone `verification_status` to `'pending'`
3. Perform actual DNS verification (query nameservers, check propagation)
4. Update zone with final status (`'verified'` or `'failed'`)
5. Update `last_verified_at` timestamp
6. Return verification result

**SQL Reference:**
```sql
-- Check permissions
SELECT om.role FROM organization_members om
JOIN zones z ON z.organization_id = om.organization_id
WHERE z.id = $zone_id AND om.user_id = $user_id;

-- Update verification status
UPDATE zones
SET 
  verification_status = $status,
  last_verified_at = NOW(),
  updated_at = NOW()
WHERE id = $zone_id
RETURNING *;
```

---

## Existing Endpoints to Verify

The following endpoints should already exist but should be verified:

### Zones CRUD
- `GET /api/zones` - List all zones (user has access to)
- `GET /api/zones/:id` - Get single zone
- `POST /api/zones` - Create zone (expects `organization_id`, not `environment_id`)
- `PUT /api/zones/:id` - Update zone
- `DELETE /api/zones/:id` - Soft delete zone

### DNS Records
- `GET /api/dns-records/zone/:zoneId` - List records for a zone (already used by frontend)

---

## Authentication Pattern

All endpoints use Bearer token authentication with Supabase JWTs:

```
Authorization: Bearer <supabase_access_token>
```

The Express API should:
1. Extract the JWT from the Authorization header
2. Verify the JWT with Supabase
3. Extract the user ID from the JWT claims
4. Use the user ID for authorization checks

**Example middleware:**
```javascript
const authenticateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const token = authHeader.split(' ')[1];
  
  // Verify with Supabase
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
};
```

---

## Error Response Format

All error responses should follow this format:

```json
{
  "error": "Human-readable error message",
  "code": "OPTIONAL_ERROR_CODE"
}
```

HTTP Status Codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (authenticated but not authorized)
- `404` - Not Found
- `500` - Internal Server Error

---

## Testing Checklist

After implementing the endpoints, verify:

- [ ] `GET /api/users/profile` returns profile with organizations
- [ ] `PUT /api/users/profile` updates profile fields correctly
- [ ] `GET /api/zones/organization/:orgId` returns zones for authorized users
- [ ] `GET /api/zones/organization/:orgId` returns 403 for non-members
- [ ] `PUT /api/zones/:id/verification` triggers verification flow
- [ ] `PUT /api/zones/:id/verification` enforces role requirements
- [ ] All endpoints reject requests without valid tokens
- [ ] All endpoints return proper error formats

---

## Related Documentation

- `BACKEND_ENVIRONMENT_REMOVAL.md` - Environment layer removal details
- `lib/actions/profile.ts` - Frontend server action for profile operations
- `lib/actions/zones.ts` - Frontend server action for zone operations

