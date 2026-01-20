# Backend Admin Audit Logging Implementation

## Overview

This document specifies how to implement audit logging for admin actions in the Express backend API. Admin actions must be logged to the existing `audit_logs` table with `actor_type='admin'` and `admin_user_id` set to differentiate them from regular user actions.

**IMPORTANT:** The `GET /admin/audit-logs` endpoint MUST support filtering by `actor_type` query parameter. The frontend passes `?actor_type=admin` to only fetch admin actions (not regular user actions).

---

## Current Admin Actions Requiring Audit Logging

1. **Disable User** - `PUT /admin/users/:userId/disable`
2. **Enable User** - `PUT /admin/users/:userId/enable`
3. **Disable Organization** - `PUT /admin/organizations/:orgId/disable`
4. **Enable Organization** - `PUT /admin/organizations/:orgId/enable`

**Note:** Password reset (direct Supabase call from frontend) does NOT require audit logging.

---

## Audit Log Table Structure

The existing `audit_logs` table supports admin actions with these fields:

| Field | Type | Description | Admin Action Value |
|-------|------|-------------|-------------------|
| `id` | UUID | Primary key | Auto-generated |
| `table_name` | TEXT | Table being modified | 'profiles' or 'organizations' |
| `record_id` | UUID | ID of affected resource | User ID or Org ID |
| `action` | TEXT | Action type | 'UPDATE' |
| `old_data` | JSONB | Previous state | `{ status: 'active' }` or `{ is_active: true }` |
| `new_data` | JSONB | New state | `{ status: 'disabled' }` or `{ is_active: false }` |
| `user_id` | UUID | Regular user (for user actions) | **NULL** for admin actions |
| `admin_user_id` | UUID | **Admin who performed action** | **Admin's user ID from JWT** |
| `actor_type` | TEXT | Actor type | **'admin'** |
| `metadata` | JSONB | Additional context | `{}` (empty for basic logging) |
| `ip_address` | INET | IP address | NULL (optional enhancement) |
| `user_agent` | TEXT | User agent | NULL (optional enhancement) |
| `created_at` | TIMESTAMPTZ | Timestamp | Auto-generated |

**Key Points:**
- `actor_type = 'admin'` distinguishes admin actions from regular user actions
- `admin_user_id` contains the admin's user ID (from JWT token)
- `user_id` is NULL for admin actions (we use `admin_user_id` instead)
- Keep `old_data` and `new_data` simple - just the changed fields

---

## Implementation

### 1. Reusable Helper Function

Create this helper function in a shared utils file (e.g., `utils/audit-logging.js`):

```javascript
const { supabase } = require('./supabase');

/**
 * Log an admin action to the audit_logs table
 * 
 * @param {Object} params
 * @param {string} params.adminUserId - ID of admin performing action (from JWT)
 * @param {string} params.tableName - Table being modified ('profiles' or 'organizations')
 * @param {string} params.recordId - ID of record being modified (user ID or org ID)
 * @param {string} params.action - Action type ('UPDATE', 'DELETE', etc.)
 * @param {Object} params.oldData - Previous state (only changed fields)
 * @param {Object} params.newData - New state (only changed fields)
 * @returns {Promise<void>}
 */
async function logAdminAction({
  adminUserId,
  tableName,
  recordId,
  action,
  oldData,
  newData
}) {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        table_name: tableName,
        record_id: recordId,
        action: action,
        old_data: oldData,
        new_data: newData,
        user_id: null,  // Always null for admin actions
        admin_user_id: adminUserId,
        actor_type: 'admin',
        metadata: {},
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to log admin action:', error);
      // Don't throw - audit logging failure should not block the action
    }
  } catch (err) {
    console.error('Exception while logging admin action:', err);
    // Don't throw - audit logging failure should not block the action
  }
}

module.exports = { logAdminAction };
```

**Important:** Audit logging failures should be logged but should NOT cause the admin action to fail.

---

### 2. Updated Endpoint Implementations

#### A. Disable User - `PUT /admin/users/:userId/disable`

```javascript
const { supabaseAdmin } = require('../utils/supabase-admin');
const { supabase } = require('../utils/supabase');
const { logAdminAction } = require('../utils/audit-logging');

router.put('/admin/users/:userId/disable', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;  // From JWT token
      
      // 1. Get current user status
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('status, email, name')
        .eq('id', userId)
        .single();
      
      if (userError || !targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.status === 'disabled') {
        return res.status(400).json({ error: 'User is already disabled' });
      }
      
      // 2. Ban user in Supabase Auth (prevents login)
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(
        userId, 
        { ban_duration: 'none' }  // Permanent ban
      );
      
      if (banError) {
        console.error('Failed to ban user:', banError);
        return res.status(500).json({ error: 'Failed to ban user' });
      }
      
      // 3. Update profile status (for UI display in admin panel)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'disabled' })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Failed to update profile:', updateError);
        // Continue anyway - user is banned in auth
      }
      
      // 4. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'profiles',
        recordId: userId,
        action: 'UPDATE',
        oldData: { status: 'active' },
        newData: { status: 'disabled' }
      });
      
      res.json({ 
        success: true, 
        message: 'User disabled successfully' 
      });
    } catch (error) {
      console.error('Disable user error:', error);
      res.status(500).json({ error: 'Failed to disable user' });
    }
  }
);
```

---

#### B. Enable User - `PUT /admin/users/:userId/enable`

```javascript
router.put('/admin/users/:userId/enable', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const { userId } = req.params;
      const adminId = req.user.id;
      
      // 1. Get current user status
      const { data: targetUser, error: userError } = await supabase
        .from('profiles')
        .select('status, email, name')
        .eq('id', userId)
        .single();
      
      if (userError || !targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      if (targetUser.status === 'active') {
        return res.status(400).json({ error: 'User is already enabled' });
      }
      
      // 2. Unban user in Supabase Auth
      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(
        userId, 
        { ban_duration: '0s' }  // Remove ban
      );
      
      if (unbanError) {
        console.error('Failed to unban user:', unbanError);
        return res.status(500).json({ error: 'Failed to unban user' });
      }
      
      // 3. Update profile status
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: 'active' })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Failed to update profile:', updateError);
      }
      
      // 4. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'profiles',
        recordId: userId,
        action: 'UPDATE',
        oldData: { status: 'disabled' },
        newData: { status: 'active' }
      });
      
      res.json({ 
        success: true, 
        message: 'User enabled successfully' 
      });
    } catch (error) {
      console.error('Enable user error:', error);
      res.status(500).json({ error: 'Failed to enable user' });
    }
  }
);
```

---

#### C. Disable Organization - `PUT /admin/organizations/:orgId/disable`

```javascript
router.put('/admin/organizations/:orgId/disable', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const adminId = req.user.id;
      
      // 1. Get current organization status
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', orgId)
        .single();
      
      if (orgError || !org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (!org.is_active) {
        return res.status(400).json({ 
          error: 'Organization is already disabled' 
        });
      }
      
      // 2. Update organization to disabled
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId);
      
      if (updateError) {
        console.error('Failed to disable organization:', updateError);
        return res.status(500).json({ 
          error: 'Failed to disable organization' 
        });
      }
      
      // 3. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'organizations',
        recordId: orgId,
        action: 'UPDATE',
        oldData: { is_active: true },
        newData: { is_active: false }
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

---

#### D. Enable Organization - `PUT /admin/organizations/:orgId/enable`

```javascript
router.put('/admin/organizations/:orgId/enable', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const adminId = req.user.id;
      
      // 1. Get current organization status
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, is_active')
        .eq('id', orgId)
        .single();
      
      if (orgError || !org) {
        return res.status(404).json({ error: 'Organization not found' });
      }
      
      if (org.is_active) {
        return res.status(400).json({ 
          error: 'Organization is already enabled' 
        });
      }
      
      // 2. Update organization to enabled
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId);
      
      if (updateError) {
        console.error('Failed to enable organization:', updateError);
        return res.status(500).json({ 
          error: 'Failed to enable organization' 
        });
      }
      
      // 3. Log admin action
      await logAdminAction({
        adminUserId: adminId,
        tableName: 'organizations',
        recordId: orgId,
        action: 'UPDATE',
        oldData: { is_active: false },
        newData: { is_active: true }
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

---

### 3. Update Audit Logs Query Endpoint

The admin dashboard queries `GET /admin/audit-logs` to display all audit logs. This endpoint must be updated to:

1. **Join with profiles table twice** - once for `user_id` (regular actions) and once for `admin_user_id` (admin actions)
2. **Return admin information** when `actor_type='admin'`

#### Updated Query

```javascript
router.get('/admin/audit-logs', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      // Optional pagination and filtering
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      const tableName = req.query.table_name;
      const action = req.query.action;
      const actorType = req.query.actor_type;  // Filter by actor_type
      
      // Build query
      let query = `
        SELECT 
          al.id,
          al.created_at,
          al.action,
          al.table_name,
          al.record_id,
          al.metadata,
          al.ip_address,
          al.user_agent,
          al.actor_type,
          al.old_data,
          al.new_data,
          -- Regular user info (for user actions)
          p.name as user_name,
          p.email as user_email,
          -- Admin user info (for admin actions)
          ap.name as admin_name,
          ap.email as admin_email
        FROM audit_logs al
        LEFT JOIN profiles p ON al.user_id = p.id
        LEFT JOIN profiles ap ON al.admin_user_id = ap.id
      `;
      
      const conditions = [];
      const params = [];
      
      if (tableName) {
        params.push(tableName);
        conditions.push(`al.table_name = $${params.length}`);
      }
      
      if (action) {
        params.push(action);
        conditions.push(`al.action = $${params.length}`);
      }
      
      if (actorType) {
        params.push(actorType);
        conditions.push(`al.actor_type = $${params.length}`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);
      
      const { data, error } = await supabase.rpc('exec_sql', { 
        query, 
        params 
      });
      
      if (error) {
        throw error;
      }
      
      // Transform results to match frontend expectations
      const transformedData = data.map(row => ({
        id: row.id,
        created_at: row.created_at,
        action: row.action,
        table_name: row.table_name,
        record_id: row.record_id,
        metadata: row.metadata,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        actor_type: row.actor_type,
        old_data: row.old_data,
        new_data: row.new_data,
        // Use admin profile if actor_type is 'admin', otherwise use regular user profile
        profiles: row.actor_type === 'admin' 
          ? (row.admin_name ? { name: row.admin_name, email: row.admin_email } : null)
          : (row.user_name ? { name: row.user_name, email: row.user_email } : null),
        // Add affected resource information
        target_name: row.target_name || null,
        target_email: row.target_email || null
      }));
      
      res.json(transformedData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);
```

**Alternative simpler approach using Supabase query builder:**

```javascript
router.get('/admin/audit-logs', 
  authenticateUser, 
  verifyAdmin, 
  async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;
      
      // Fetch audit logs
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (req.query.table_name) {
        query = query.eq('table_name', req.query.table_name);
      }
      
      if (req.query.action) {
        query = query.eq('action', req.query.action);
      }
      
      if (req.query.actor_type) {
        query = query.eq('actor_type', req.query.actor_type);
      }
      
      const { data: logs, error } = await query;
      
      if (error) {
        throw error;
      }
      
      // Fetch user profiles for both user_id and admin_user_id
      const userIds = new Set();
      const adminUserIds = new Set();
      const targetProfileIds = new Set();
      const targetOrgIds = new Set();
      
      logs.forEach(log => {
        if (log.user_id) userIds.add(log.user_id);
        if (log.admin_user_id) adminUserIds.add(log.admin_user_id);
        
        // Collect target resource IDs
        if (log.table_name === 'profiles') {
          targetProfileIds.add(log.record_id);
        } else if (log.table_name === 'organizations') {
          targetOrgIds.add(log.record_id);
        }
      });
      
      const allProfileIds = [...new Set([...userIds, ...adminUserIds, ...targetProfileIds])];
      
      // Fetch profiles (actors and targets)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', allProfileIds);
      
      // Fetch target organizations
      const { data: organizations } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', [...targetOrgIds]);
      
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      const orgsMap = new Map(organizations?.map(o => [o.id, o]) || []);
      
      // Transform results
      const transformedData = logs.map(log => {
        const result = {
          ...log,
          profiles: log.actor_type === 'admin'
            ? profilesMap.get(log.admin_user_id) || null
            : profilesMap.get(log.user_id) || null,
          target_name: null,
          target_email: null
        };
        
        // Add target resource info
        if (log.table_name === 'profiles') {
          const targetProfile = profilesMap.get(log.record_id);
          if (targetProfile) {
            result.target_name = targetProfile.name;
            result.target_email = targetProfile.email;
          }
        } else if (log.table_name === 'organizations') {
          const targetOrg = orgsMap.get(log.record_id);
          if (targetOrg) {
            result.target_name = targetOrg.name;
          }
        }
        
        return result;
      });
      
      res.json(transformedData);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);
```

---

## Pattern for Future Admin Actions

When adding new admin actions, follow this pattern:

### Step 1: Authenticate & Authorize
```javascript
router.put('/admin/path', authenticateUser, verifyAdmin, async (req, res) => {
  const adminId = req.user.id;  // Extract admin ID from JWT
```

### Step 2: Validate
```javascript
  // Fetch current state of resource
  const { data: resource, error } = await supabase
    .from('table_name')
    .select('*')
    .eq('id', resourceId)
    .single();
  
  if (error || !resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  // Check if action is valid
  if (resource.status === desiredStatus) {
    return res.status(400).json({ error: 'Already in desired state' });
  }
```

### Step 3: Perform Action
```javascript
  // Update the resource
  const { error: updateError } = await supabase
    .from('table_name')
    .update({ status: newStatus })
    .eq('id', resourceId);
  
  if (updateError) {
    throw updateError;
  }
```

### Step 4: Log Admin Action
```javascript
  // Log to audit_logs
  await logAdminAction({
    adminUserId: adminId,
    tableName: 'table_name',
    recordId: resourceId,
    action: 'UPDATE',
    oldData: { status: oldStatus },
    newData: { status: newStatus }
  });
  
  res.json({ success: true, message: 'Action completed' });
});
```

---

## Middleware Requirements

Ensure the `verifyAdmin` middleware:

1. **Validates JWT token** from `Authorization: Bearer <token>` header
2. **Extracts user ID** from JWT and sets `req.user.id`
3. **Checks superadmin flag** by querying `profiles.superadmin = true`
4. **Returns 403** if user is not a superadmin

Example:
```javascript
async function verifyAdmin(req, res, next) {
  try {
    const userId = req.user.id;  // Set by authenticateUser middleware
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('superadmin')
      .eq('id', userId)
      .single();
    
    if (error || !profile || !profile.superadmin) {
      return res.status(403).json({ 
        error: 'Forbidden: Superadmin access required' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
}
```

---

## Testing Checklist

After implementing the changes, test each endpoint:

### 1. Disable User
- [ ] Call `PUT /admin/users/:userId/disable`
- [ ] Verify response: `{ success: true, message: '...' }`
- [ ] Verify user cannot login (Supabase ban active)
- [ ] Check database: `profiles.status = 'disabled'`
- [ ] Check audit_logs table:
  ```sql
  SELECT * FROM audit_logs 
  WHERE actor_type = 'admin' 
  AND table_name = 'profiles' 
  AND record_id = '<user_id>'
  ORDER BY created_at DESC LIMIT 1;
  ```
- [ ] Verify fields: `admin_user_id` set, `user_id` is NULL, `actor_type = 'admin'`

### 2. Enable User
- [ ] Call `PUT /admin/users/:userId/enable`
- [ ] Verify user can login again
- [ ] Check database: `profiles.status = 'active'`
- [ ] Check audit log created with correct values

### 3. Disable Organization
- [ ] Call `PUT /admin/organizations/:orgId/disable`
- [ ] Verify response: `{ success: true, message: '...' }`
- [ ] Check database: `organizations.is_active = false`
- [ ] Check audit_logs table:
  ```sql
  SELECT * FROM audit_logs 
  WHERE actor_type = 'admin' 
  AND table_name = 'organizations' 
  AND record_id = '<org_id>'
  ORDER BY created_at DESC LIMIT 1;
  ```

### 4. Enable Organization
- [ ] Call `PUT /admin/organizations/:orgId/enable`
- [ ] Check database: `organizations.is_active = true`
- [ ] Check audit log created

### 5. Audit Logs Display
- [ ] Navigate to frontend admin panel → Audit Logs
- [ ] Verify admin actions appear with admin user name
- [ ] Verify regular user actions appear with user name
- [ ] Verify filtering and pagination work

### 6. Query Audit Logs Directly
```sql
-- View all admin actions
SELECT 
  al.created_at,
  al.action,
  al.table_name,
  al.record_id,
  al.old_data,
  al.new_data,
  p.name as admin_name,
  p.email as admin_email
FROM audit_logs al
LEFT JOIN profiles p ON al.admin_user_id = p.id
WHERE al.actor_type = 'admin'
ORDER BY al.created_at DESC;
```

---

## Frontend Display Format

The frontend will display audit logs in a clear, human-readable format:

**List View (Collapsed):**
```
Seth Chesky disabled user John Doe (john@example.com)
profiles • 4 minutes ago
```

**Expanded Detail View:**
```
Admin: Seth Chesky (seth@example.com)
Action: disabled user
Target: John Doe (john@example.com)
Changes: Status changed from active to disabled

Technical Details:
- Record ID: 2c7f7631-0e2b-4446-865b-c18f96921ab8
- Table: profiles
- Timestamp: Jan 13, 2026 at 3:45 PM
```

**Required Fields in API Response:**
- `target_name` - Name of the affected user/organization
- `target_email` - Email of affected user (null for organizations)
- `old_data` - Previous state (used to interpret action)
- `new_data` - New state (used to interpret action)
- `profiles.name` - Admin's name
- `profiles.email` - Admin's email

Without these fields, the frontend cannot display "Admin X disabled user Y" and will fall back to generic "UPDATE • profiles" display.

---

## Summary

**What to Implement:**

1. ✅ Create `logAdminAction()` helper function
2. ✅ Update 4 endpoints to call `logAdminAction()`:
   - `PUT /admin/users/:userId/disable`
   - `PUT /admin/users/:userId/enable`
   - `PUT /admin/organizations/:orgId/disable`
   - `PUT /admin/organizations/:orgId/enable`
3. ✅ Update `GET /admin/audit-logs` to:
   - Join with profiles for both user_id and admin_user_id
   - Join with target resources (profiles/organizations) to fetch affected resource names
   - Return `target_name` and `target_email` fields
   - Support `?actor_type=admin` query parameter filter
4. ✅ Ensure middleware sets `req.user.id` from JWT

**Key Points:**
- Use `admin_user_id` field for admin actions
- Set `actor_type = 'admin'`
- Keep `user_id = NULL` for admin actions
- Basic logging: just old/new state of changed fields
- Audit logging failures should not block the action
- Frontend already has all necessary API client methods

**Frontend Status:**
- ✅ API client methods exist in `lib/api-client.ts`
- ✅ Admin pages make correct API calls
- ✅ No frontend changes needed

