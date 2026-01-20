# Backend Admin Organization Actions API Specification

## Overview

This document specifies the Express API endpoints required for admin organization management. These endpoints enable administrators to view organization details, manage organization status (disable/enable), and view organization members. All endpoints require superadmin authentication and include audit logging.

---

## Architecture

- **Frontend**: Next.js app makes API calls via `lib/api-client.ts` adminApi methods
- **Backend**: Express.js API validates admin privileges, performs database operations, logs audit events
- **Authentication**: Uses standard JWT tokens from Supabase Auth
- **Database**: Queries `organizations`, `organization_members`, and `profiles` tables; uses database functions for counts

---

## Database Column Usage

**Organization Status**: Uses `is_active` boolean column:
- `is_active = true`: Organization is enabled (default)
- `is_active = false`: Organization is disabled by admin

When an organization is disabled (`is_active = false`):
- Users can still view organization data (read-only access)
- Users cannot perform any mutations (create/edit/delete zones, records, members, or org settings)
- A banner is displayed to organization members indicating the disabled status
- Only superadmins can re-enable the organization via admin portal

---

## Required API Endpoints

### 1. GET `/api/admin/organizations/:orgId`

**Purpose**: Get full organization details with aggregated counts for admin view.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**URL Parameters**:
- `orgId` (string, UUID): Organization ID

**Response (200 OK)**:

```json
{
  "data": {
    "id": "uuid",
    "name": "Organization Name",
    "description": "Optional description",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "is_active": true,
    "billing_phone": "(555) 123-4567",
    "billing_email": "billing@example.com",
    "billing_address": "123 Main St",
    "billing_city": "San Francisco",
    "billing_state": "CA",
    "billing_zip": "94105",
    "admin_contact_email": "admin@example.com",
    "admin_contact_phone": "(555) 987-6543",
    "member_count": 5,
    "zone_count": 10,
    "record_count": 150
  }
}
```

**Implementation**:

```javascript
// GET /api/admin/organizations/:orgId
router.get('/admin/organizations/:orgId', 
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Fetch organization details
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();
        
      if (orgError || !org) {
        return res.status(404).json({ 
          error: 'Organization not found' 
        });
      }
      
      // Get aggregated counts using database functions
      const { data: memberCount } = await supabase
        .rpc('get_org_member_count', { org_uuid: orgId });
        
      const { data: zoneCount } = await supabase
        .rpc('get_org_zone_count', { org_uuid: orgId });
        
      const { data: recordCount } = await supabase
        .rpc('get_org_record_count', { org_uuid: orgId });
      
      // Log audit action
      await logAdminAction({
        actorId: req.user.id,
        action: 'admin.org.view',
        resourceType: 'organization',
        resourceId: orgId,
        details: { org_name: org.name }
      });
      
      // Return full organization data with counts
      res.json({
        data: {
          ...org,
          member_count: memberCount || 0,
          zone_count: zoneCount || 0,
          record_count: recordCount || 0
        }
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization details' 
      });
    }
  }
);
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `404 Not Found`: Organization does not exist
- `500 Internal Server Error`: Database or server error

---

### 2. GET `/api/admin/organizations/:orgId/members`

**Purpose**: List organization members with profile data (name, email, role) for admin view.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**URL Parameters**:
- `orgId` (string, UUID): Organization ID

**Response (200 OK)**:

```json
{
  "data": [
    {
      "user_id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "Admin"
    },
    {
      "user_id": "uuid",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "role": "Editor"
    }
  ]
}
```

**Implementation**:

```javascript
// GET /api/admin/organizations/:orgId/members
router.get('/admin/organizations/:orgId/members',
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Verify organization exists
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('id', orgId)
        .single();
        
      if (orgError || !org) {
        return res.status(404).json({ 
          error: 'Organization not found' 
        });
      }
      
      // Fetch members
      const { data: members, error: membersError } = await supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('organization_id', orgId);
        
      if (membersError) {
        throw membersError;
      }

      // Handle case where organization has no members
      if (!members || members.length === 0) {
        await logAdminAction({
          actorId: req.user.id,
          action: 'admin.org.members.view',
          resourceType: 'organization',
          resourceId: orgId,
          details: { 
            org_name: org.name,
            member_count: 0
          }
        });
        
        return res.json({ data: [] });
      }
      
      // Fetch profile data separately for all user IDs
      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds);
        
      if (profilesError) {
        throw profilesError;
      }
      
      // Join the data manually
      const formattedMembers = members.map(member => {
        const profile = profiles?.find(p => p.id === member.user_id);
        return {
          user_id: member.user_id,
          name: profile?.name || 'Unknown',
          email: profile?.email || 'Unknown',
          role: member.role
        };
      });
      
      // Sort by role
      formattedMembers.sort((a, b) => a.role.localeCompare(b.role));
      
      // Log audit action
      await logAdminAction({
        actorId: req.user.id,
        action: 'admin.org.members.view',
        resourceType: 'organization',
        resourceId: orgId,
        details: { 
          org_name: org.name,
          member_count: formattedMembers.length 
        }
      });
      
      res.json({ data: formattedMembers });
    } catch (error) {
      console.error('Error fetching organization members:', error);
      res.status(500).json({ 
        error: 'Failed to fetch organization members' 
      });
    }
  }
);
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `404 Not Found`: Organization does not exist
- `500 Internal Server Error`: Database or server error

**Implementation Note - Why Two Queries?**

This endpoint uses two separate queries instead of Supabase's automatic join syntax because:
1. `organization_members.user_id` → `auth.users.id` (FK exists)
2. `profiles.id` → `auth.users.id` (FK exists)
3. But there's **no direct FK** from `organization_members` to `profiles`

Supabase's automatic join syntax (`profiles:user_id (...)`) only works with direct foreign key relationships. Since both tables reference `auth.users` but not each other, we fetch data separately and join manually in JavaScript.

**Alternative: Add Direct Foreign Key?**

You *could* add a second foreign key constraint:
```sql
ALTER TABLE organization_members
ADD CONSTRAINT organization_members_user_id_profiles_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id);
```

**Pros:**
- Enables Supabase automatic join syntax
- Enforces referential integrity at database level
- Single query instead of two

**Cons:**
- Redundant constraint (already enforced through auth.users)
- Creates multiple FKs on same column (unusual pattern)
- May cause confusion about relationship hierarchy
- Adds overhead to insert/update operations

**Recommendation:** Keep the two-query approach. It's clearer, more maintainable, and performs well (both queries are indexed lookups). The performance difference is negligible for admin operations.

---

### 3. PUT `/api/admin/organizations/:orgId/disable`

**Purpose**: Disable an organization, preventing all members from performing any mutations.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**URL Parameters**:
- `orgId` (string, UUID): Organization ID

**Request Body**: None

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Organization disabled successfully"
}
```

**Implementation**:

```javascript
// PUT /api/admin/organizations/:orgId/disable
router.put('/admin/organizations/:orgId/disable',
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Fetch organization details for audit logging
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', orgId)
        .single();
        
      if (orgError || !org) {
        return res.status(404).json({ 
          error: 'Organization not found' 
        });
      }
      
      // Check if already disabled
      if (!org.is_active) {
        return res.status(400).json({ 
          error: 'Organization is already disabled' 
        });
      }
      
      // Update organization to disabled
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId);
        
      if (updateError) {
        throw updateError;
      }
      
      // Log audit action
      await logAdminAction({
        actorId: req.user.id,
        action: 'admin.org.disable',
        resourceType: 'organization',
        resourceId: orgId,
        details: { 
          org_name: org.name,
          previous_status: 'enabled',
          new_status: 'disabled'
        }
      });
      
      res.json({
        success: true,
        message: 'Organization disabled successfully'
      });
    } catch (error) {
      console.error('Error disabling organization:', error);
      res.status(500).json({ 
        error: 'Failed to disable organization' 
      });
    }
  }
);
```

**Error Responses**:
- `400 Bad Request`: Organization is already disabled
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `404 Not Found`: Organization does not exist
- `500 Internal Server Error`: Database or server error

---

### 4. PUT `/api/admin/organizations/:orgId/enable`

**Purpose**: Re-enable a disabled organization, allowing members to perform mutations again.

**Authorization**: 
- Verify JWT token from Supabase Auth
- Check that user has `superadmin = true` in profiles table
- Return 403 Forbidden if not authorized

**URL Parameters**:
- `orgId` (string, UUID): Organization ID

**Request Body**: None

**Response (200 OK)**:

```json
{
  "success": true,
  "message": "Organization enabled successfully"
}
```

**Implementation**:

```javascript
// PUT /api/admin/organizations/:orgId/enable
router.put('/admin/organizations/:orgId/enable',
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { orgId } = req.params;
      
      // Fetch organization details for audit logging
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', orgId)
        .single();
        
      if (orgError || !org) {
        return res.status(404).json({ 
          error: 'Organization not found' 
        });
      }
      
      // Check if already enabled
      if (org.is_active) {
        return res.status(400).json({ 
          error: 'Organization is already enabled' 
        });
      }
      
      // Update organization to enabled
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId);
        
      if (updateError) {
        throw updateError;
      }
      
      // Log audit action
      await logAdminAction({
        actorId: req.user.id,
        action: 'admin.org.enable',
        resourceType: 'organization',
        resourceId: orgId,
        details: { 
          org_name: org.name,
          previous_status: 'disabled',
          new_status: 'enabled'
        }
      });
      
      res.json({
        success: true,
        message: 'Organization enabled successfully'
      });
    } catch (error) {
      console.error('Error enabling organization:', error);
      res.status(500).json({ 
        error: 'Failed to enable organization' 
      });
    }
  }
);
```

**Error Responses**:
- `400 Bad Request`: Organization is already enabled
- `401 Unauthorized`: Missing or invalid JWT token
- `403 Forbidden`: User is not a superadmin
- `404 Not Found`: Organization does not exist
- `500 Internal Server Error`: Database or server error

---

### 5. Update Existing Endpoint: GET `/api/admin/organizations`

**Purpose**: Include `is_active` field in organization list response.

**Changes Required**:
- Add `is_active` to SELECT query
- Include in response data

**Updated Response Format**:

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Org Name",
      "description": "Description",
      "created_at": "2024-01-01T00:00:00Z",
      "is_active": true,
      "organization_members": [...]
    }
  ]
}
```

**Implementation Update**:

```javascript
// GET /api/admin/organizations (UPDATE EXISTING)
router.get('/admin/organizations',
  authenticateUser,
  requireSuperAdmin,
  async (req, res) => {
    try {
      const { data: orgs, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members(organization_id)
        `)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      res.json({ data: orgs || [] });
    } catch (error) {
      console.error('Error listing organizations:', error);
      res.status(500).json({ 
        error: 'Failed to list organizations' 
      });
    }
  }
);
```

---

## Organization Active Status Enforcement

### Middleware: `checkOrganizationActive`

**Purpose**: Prevent mutations on disabled organizations.

**Implementation**:

Create a new middleware file: `middleware/checkOrganizationActive.js`

```javascript
const { supabase } = require('../utils/supabase');

/**
 * Middleware to check if an organization is active (enabled)
 * Blocks mutations on disabled organizations
 * 
 * Usage: Apply to all organization-scoped mutation endpoints
 * Do NOT apply to:
 * - Admin disable/enable endpoints
 * - Read-only endpoints (GET requests)
 */
async function checkOrganizationActive(req, res, next) {
  try {
    // Extract orgId from request
    // Check params first, then body (for POST/PUT requests)
    const orgId = req.params.orgId || req.body.organization_id;
    
    if (!orgId) {
      return res.status(400).json({ 
        error: 'Organization ID required' 
      });
    }
    
    // Fetch organization status
    const { data: org, error } = await supabase
      .from('organizations')
      .select('is_active')
      .eq('id', orgId)
      .single();
      
    if (error || !org) {
      return res.status(404).json({ 
        error: 'Organization not found' 
      });
    }
    
    // Block mutation if organization is disabled
    if (!org.is_active) {
      return res.status(403).json({ 
        error: 'Organization is disabled',
        message: 'This organization has been disabled. Contact support for assistance.'
      });
    }
    
    // Organization is active, proceed
    next();
  } catch (error) {
    console.error('Error checking organization status:', error);
    res.status(500).json({ 
      error: 'Failed to check organization status' 
    });
  }
}

module.exports = { checkOrganizationActive };
```

### Apply Middleware to Routes

**Apply to the following mutation endpoints** (this list may not be exhaustive):

#### Organization Routes
```javascript
const { checkOrganizationActive } = require('../middleware/checkOrganizationActive');

// Organization settings
router.put('/organizations/:orgId', 
  authenticateUser, 
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);

// Organization members
router.post('/organizations/:orgId/members',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);

router.delete('/organizations/:orgId/members/:userId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);

router.put('/organizations/:orgId/members/:userId/role',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  checkOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);
```

#### Zone Routes
```javascript
// For zone endpoints, need to fetch orgId from zone first
// Create specialized middleware: checkZoneOrganizationActive

async function checkZoneOrganizationActive(req, res, next) {
  try {
    const zoneId = req.params.zoneId || req.body.zone_id;
    
    // Fetch zone's organization
    const { data: zone, error } = await supabase
      .from('zones')
      .select('organization_id, organizations(is_active)')
      .eq('id', zoneId)
      .single();
      
    if (error || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    if (!zone.organizations?.is_active) {
      return res.status(403).json({ 
        error: 'Organization is disabled',
        message: 'This organization has been disabled. Contact support for assistance.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking zone organization status:', error);
    res.status(500).json({ error: 'Failed to check organization status' });
  }
}

// Apply to zone mutations
router.post('/organizations/:orgId/zones',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']),
  checkOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);

router.put('/zones/:zoneId',
  authenticateUser,
  checkZoneOrganizationActive,  // ADD THIS (specialized)
  async (req, res) => { /* ... */ }
);

router.delete('/zones/:zoneId',
  authenticateUser,
  checkZoneOrganizationActive,  // ADD THIS (specialized)
  async (req, res) => { /* ... */ }
);
```

#### DNS Record Routes
```javascript
// DNS record mutations also need zone-based org check

router.post('/zones/:zoneId/records',
  authenticateUser,
  checkZoneOrganizationActive,  // ADD THIS
  async (req, res) => { /* ... */ }
);

router.put('/dns-records/:recordId',
  authenticateUser,
  checkRecordOrganizationActive,  // Similar to zone check
  async (req, res) => { /* ... */ }
);

router.delete('/dns-records/:recordId',
  authenticateUser,
  checkRecordOrganizationActive,  // Similar to zone check
  async (req, res) => { /* ... */ }
);
```

**Important**: 
- Do NOT apply this middleware to admin enable/disable endpoints
- Do NOT apply to read-only GET endpoints (users should still be able to view their disabled org data)
- Only apply to mutation operations (POST, PUT, DELETE)

---

## Audit Log Actions

The following audit log actions should be logged:

| Action | Event | Details |
|--------|-------|---------|
| `admin.org.view` | Admin views org details | `{ org_name }` |
| `admin.org.members.view` | Admin views org members | `{ org_name, member_count }` |
| `admin.org.disable` | Admin disables org | `{ org_name, previous_status: 'enabled', new_status: 'disabled' }` |
| `admin.org.enable` | Admin enables org | `{ org_name, previous_status: 'disabled', new_status: 'enabled' }` |

---

## Testing Checklist

### Backend Tests

- [ ] `GET /api/admin/organizations/:orgId` returns full org details with counts
- [ ] `GET /api/admin/organizations/:orgId` requires superadmin authentication
- [ ] `GET /api/admin/organizations/:orgId` returns 404 for non-existent org
- [ ] `GET /api/admin/organizations/:orgId/members` returns member list with profiles
- [ ] `GET /api/admin/organizations/:orgId/members` requires superadmin authentication
- [ ] `PUT /api/admin/organizations/:orgId/disable` updates is_active to false
- [ ] `PUT /api/admin/organizations/:orgId/disable` logs audit action
- [ ] `PUT /api/admin/organizations/:orgId/disable` returns 400 if already disabled
- [ ] `PUT /api/admin/organizations/:orgId/enable` updates is_active to true
- [ ] `PUT /api/admin/organizations/:orgId/enable` logs audit action
- [ ] `PUT /api/admin/organizations/:orgId/enable` returns 400 if already enabled
- [ ] `checkOrganizationActive` middleware blocks mutations when is_active = false
- [ ] `checkOrganizationActive` middleware returns 403 with appropriate error message
- [ ] Disabled org members receive 403 error when attempting zone creation
- [ ] Disabled org members receive 403 error when attempting record creation
- [ ] Disabled org members can still view org data (GET requests work)
- [ ] Member count excludes superadmin users (system accounts)
- [ ] Zone count is accurate
- [ ] Record count is accurate across all zones

---

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token from Supabase Auth
2. **Authorization**: All endpoints require `superadmin = true` in profiles table
3. **Audit Logging**: All admin actions are logged with actor, action, and details
4. **Input Validation**: UUIDs are validated, error handling prevents information leakage
5. **Rate Limiting**: Consider applying rate limits to admin endpoints
6. **Organization Privacy**: Billing and contact information is sensitive PII - only expose to superadmins

---

## Database Functions Used

These functions should already exist in your Supabase database (from previous migrations):

- `get_org_member_count(org_uuid UUID)`: Returns member count (excludes superadmins)
- `get_org_zone_count(org_uuid UUID)`: Returns zone count
- `get_org_record_count(org_uuid UUID)`: Returns total DNS records across all zones

If not present, refer to migration `20251211000000_add_usage_count_functions.sql` and `20260107000001_fix_usage_count_functions_remove_deleted_at.sql`.

---

## Error Response Format

All endpoints follow consistent error response format:

```json
{
  "error": "Short error identifier",
  "message": "Optional detailed user-facing message"
}
```

**Common Error Codes**:
- `401`: Missing or invalid JWT token
- `403`: Insufficient permissions (not superadmin) or organization disabled
- `404`: Resource not found
- `500`: Internal server error

---

## Notes

- The `status` column in organizations table is NOT used for disable functionality (reserved for soft delete tracking)
- The `is_active` boolean is the source of truth for enabled/disabled status
- Disabled organizations maintain all data - only mutations are blocked
- Only superadmins can disable/enable organizations - regular admins cannot
- Audit logs provide full traceability of all admin organization actions

