# Backend Admin Dashboard API Fixes

## Overview

This document specifies the Express API endpoints that need to be implemented/fixed in the **backend repository** to support the admin dashboard and audit log pages.

## Architecture

- **Frontend (this repo)**: Next.js app that makes API calls via `lib/api-client.ts`
- **Backend (separate repo)**: Express.js API that handles all database queries
- **Database**: Supabase PostgreSQL, accessed ONLY by Express API

## Database Statistics (Dev Branch - ipfsrbxjgewhdcvonrbo)

Current database contains:
- **5 users** in profiles table
- **12 organizations** (not deleted)
- **0 flagged zones** (duplicate zone names)
- **175 audit logs** with proper profile joins

## Required API Endpoints

### 1. GET /api/admin/dashboard

**Purpose**: Return dashboard KPI statistics for admin overview page.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**Current Issues**:
- Returns mock data or incomplete data
- Includes unnecessary fields (deletedOrganizations, activeMembers, recentAudit)

**Required Response Format**:

```json
{
  "kpis": {
    "totalUsers": 5,
    "totalOrganizations": 12,
    "flaggedZones": 0
  }
}
```

**Implementation Requirements**:

Execute these SQL queries against the Supabase database:

```sql
-- Count total users
SELECT COUNT(*) as total_users FROM profiles;

-- Count total organizations (excluding soft-deleted)
SELECT COUNT(*) as total_organizations 
FROM organizations 
WHERE deleted_at IS NULL;

-- Count flagged zones (duplicate zone names)
SELECT COUNT(DISTINCT z1.id) as flagged_zones
FROM zones z1
JOIN zones z2 ON z1.name = z2.name AND z1.id != z2.id;
```

**Response Structure**:
```javascript
{
  kpis: {
    totalUsers: <count from profiles>,
    totalOrganizations: <count from organizations>,
    flaggedZones: <count from duplicate zones>
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `500 Internal Server Error`: Database query failed

---

### 2. GET /api/admin/audit-logs

**Purpose**: Return all audit log entries with user profile information for the audit log page.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**Current Issues**:
- May not be returning data with proper user profile joins
- Frontend expects `profiles` object with `name` and `email` fields

**Required Response Format**:

```json
[
  {
    "id": "uuid",
    "created_at": "2025-01-09T12:00:00Z",
    "action": "INSERT",
    "table_name": "zones",
    "record_id": "uuid",
    "metadata": {},
    "ip_address": "192.168.1.1",
    "user_agent": "Mozilla/5.0...",
    "profiles": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  {
    "id": "uuid",
    "created_at": "2025-01-09T11:00:00Z",
    "action": "DELETE",
    "table_name": "zones",
    "record_id": "uuid",
    "metadata": {"permanent": true},
    "ip_address": null,
    "user_agent": null,
    "profiles": null
  }
]
```

**Implementation Requirements**:

Execute this SQL query against the Supabase database:

```sql
SELECT 
  al.id,
  al.created_at,
  al.action,
  al.table_name,
  al.record_id,
  al.metadata,
  al.ip_address,
  al.user_agent,
  p.name as profile_name,
  p.email as profile_email
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;
```

**Response Transformation**:

Transform the SQL results to include nested `profiles` object:

```javascript
const transformedResults = results.map(row => ({
  id: row.id,
  created_at: row.created_at,
  action: row.action,
  table_name: row.table_name,
  record_id: row.record_id,
  metadata: row.metadata,
  ip_address: row.ip_address,
  user_agent: row.user_agent,
  profiles: row.profile_name ? {
    name: row.profile_name,
    email: row.profile_email
  } : null
}));
```

**Query Parameters** (optional for future enhancements):
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 100)
- `table_name`: Filter by table name
- `action`: Filter by action type (INSERT, UPDATE, DELETE)

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `500 Internal Server Error`: Database query failed

---

## Database Schema Reference

### profiles table
- **Columns**: id, name, email, role, superadmin (boolean), status, created_at, updated_at
- **Key field**: `superadmin` (boolean) - used for authorization

### organizations table
- **Columns**: id, name, status, deleted_at, created_at, updated_at
- **Key field**: `deleted_at` (timestamp) - null means active

### zones table
- **Columns**: id, name, organization_id, created_at, updated_at
- **Used for**: Detecting duplicate zone names

### audit_logs table
- **Columns**: id, table_name, record_id, action, old_data, new_data, user_id, created_at, ip_address, user_agent, metadata, actor_type, admin_user_id
- **Relationships**: LEFT JOIN with profiles via user_id

---

## Security Considerations

### Supabase Connection
- Express API connects to Supabase PostgreSQL using service role connection string
- RLS policies should allow service role access to all tables
- Express API is responsible for enforcing user-level authorization

### Authorization Flow
1. Frontend sends JWT token (from Supabase Auth) in `Authorization: Bearer <token>` header
2. Express API verifies JWT token validity using Supabase client
3. Express API extracts user ID from JWT
4. Express API queries profiles table to check if `superadmin = true`
5. If authorized, execute database queries and return results
6. If not authorized, return 403 Forbidden

### Recommended RLS Policy (on Supabase)

```sql
-- Allow service role to access audit logs
CREATE POLICY "Service role can access audit logs" 
ON audit_logs FOR SELECT 
TO service_role 
USING (true);

-- Allow service role to access all tables for admin queries
CREATE POLICY "Service role can read profiles" 
ON profiles FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Service role can read organizations" 
ON organizations FOR SELECT 
TO service_role 
USING (true);

CREATE POLICY "Service role can read zones" 
ON zones FOR SELECT 
TO service_role 
USING (true);
```

---

## Testing Checklist

After implementing these endpoints:

### Dashboard Endpoint Testing
1. ✅ Returns correct count of users from profiles table
2. ✅ Returns correct count of organizations (excluding deleted)
3. ✅ Returns correct count of flagged zones (duplicates)
4. ✅ Rejects requests without JWT token (401)
5. ✅ Rejects requests from non-superadmin users (403)
6. ✅ Response matches exact format expected by frontend

### Audit Logs Endpoint Testing
1. ✅ Returns all audit logs ordered by created_at DESC
2. ✅ Includes nested profiles object with name and email
3. ✅ Handles null profiles (system actions) correctly
4. ✅ Includes all required fields (metadata, ip_address, user_agent)
5. ✅ Rejects requests without JWT token (401)
6. ✅ Rejects requests from non-superadmin users (403)
7. ✅ Response is valid JSON array

### Frontend Integration Testing
1. Navigate to `/admin` dashboard
2. Verify only 3 boxes are visible (Total Users, Organizations, Flagged Zones)
3. Verify numbers are real data from database, not mock data
4. Navigate to `/admin/audit` page
5. Verify audit logs are loading and displaying
6. Verify the stat boxes (Total Events, Today, This Week) show correct counts
7. Verify clicking on an audit log entry expands to show details

---

## Implementation Notes

### Database Connection
- Use Supabase service role key for database access
- Connection string format: `postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`
- Consider using connection pooling for better performance

### Error Handling
- Log all errors with context (user ID, endpoint, query)
- Return generic error messages to client (don't expose SQL errors)
- Include request ID in error responses for debugging

### Performance Considerations
- Dashboard queries are simple COUNT operations - should be fast
- Audit logs query may return many rows - consider pagination
- Add database indexes if queries are slow:
  - `CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);`
  - `CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at) WHERE deleted_at IS NULL;`

### Future Enhancements
- Add pagination to audit logs endpoint
- Add filtering by date range, table, action type
- Add caching for dashboard KPIs (refresh every 5 minutes)
- Add WebSocket support for real-time audit log updates

---

## Admin Users List

**Frontend Location**: `app/admin/users/page.tsx`

**Required**: The users list fetches data from the Express API endpoint.

### Current Implementation

The frontend currently calls:

```typescript
adminApi.listUsers(params?: { page?: number; limit?: number; search?: string })
// Makes GET /admin/users?page=1&limit=25&search=query
```

**Critical**: The `/admin/users` endpoint **MUST** return the `status` field from the profiles table. The frontend uses this field to:
- Display correct status badges in the UI
- Show "Disabled Users" count in stats
- Determine if the "Disable User" or "Enable User" action should be shown in the dropdown

**Expected Response Format**:

```json
[
  {
    "id": "user-uuid",
    "name": "User Name",
    "email": "user@example.com",
    "status": "active",
    "role": "user",
    "last_login": "2026-01-12T20:00:00.000Z",
    "organization_members": [
      { "organization_id": "org-uuid" }
    ]
  }
]
```

**Backend SQL Query**:

```sql
SELECT 
  p.id,
  p.name,
  p.email,
  p.status,
  p.role,
  p.last_login,
  p.created_at,
  p.updated_at,
  json_agg(
    json_build_object('organization_id', om.organization_id)
  ) FILTER (WHERE om.organization_id IS NOT NULL) as organization_members
FROM profiles p
LEFT JOIN organization_members om ON p.id = om.user_id
WHERE ($1::text IS NULL OR 
       p.name ILIKE '%' || $1 || '%' OR 
       p.email ILIKE '%' || $1 || '%')
GROUP BY p.id, p.name, p.email, p.status, p.role, p.last_login, p.created_at, p.updated_at
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;
```

**Important**: The status field is critical for the UI to function correctly. Without it, the frontend will default to 'active' and show incorrect status badges.

---

## Frontend API Client Reference

The frontend already has these endpoints defined in `lib/api-client.ts`:

```typescript
export const adminApi = {
  getDashboard: () => {
    return apiClient.get('/admin/dashboard');
  },
  
  getAuditLogs: (params?: { 
    page?: number; 
    limit?: number; 
    table_name?: string; 
    action?: string 
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.table_name) query.append('table_name', params.table_name);
    if (params?.action) query.append('action', params.action);
    const queryString = query.toString();
    return apiClient.get(`/admin/audit-logs${queryString ? `?${queryString}` : ''}`);
  }
};
```

The API client automatically:
- Attaches JWT token from Supabase Auth to all requests
- Handles errors and returns formatted responses
- Retries failed requests with exponential backoff

---

## Questions or Issues?

If you have questions about these requirements or encounter issues during implementation, please:
1. Check the frontend code in `app/admin/page.tsx` and `app/admin/audit/page.tsx`
2. Review the API client implementation in `lib/api-client.ts`
3. Test with the dev branch database (ipfsrbxjgewhdcvonrbo)
4. Verify RLS policies on Supabase dashboard

