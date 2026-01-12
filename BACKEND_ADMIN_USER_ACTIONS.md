# Backend Admin User Actions API Specification

## Overview

This document specifies the backend API requirements for admin user management actions. The disable/enable endpoints use the Express API with audit logging, while password reset uses direct Supabase calls for simplicity and consistency with user-initiated password resets.

---

## Architecture

- **Frontend**: 
  - Disable/Enable User: Makes API calls to Express backend with admin JWT
  - Password Reset: Direct Supabase call (same as user-initiated password reset)
- **Backend**: Validates admin privileges, performs database operations, logs audit events
- **Authentication**: Uses standard JWT tokens from Supabase Auth
- **Database**: Updates `profiles` table status field, logs to `audit_logs` table

---

## Setup

### Supabase Client

The backend uses the regular Supabase client with JWT authentication:

```javascript
// utils/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // ← Regular anon key
);

module.exports = { supabase };
```

**No special environment variables needed** - uses the same anon key as the frontend.

---

## API Endpoints

> **Note**: Password reset is handled via direct Supabase call from the frontend (see [Password Reset Section](#password-reset-direct-supabase-call) below). Only disable/enable endpoints are implemented in the backend API.

### 1. Disable User

**Endpoint**: `PUT /admin/users/:userId/disable`

**Authentication**: Requires admin JWT (verify `profiles.superadmin = true`)

**Implementation**:

```javascript
router.put('/:userId/disable', authenticateUser, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;
    
    // 1. Get user info for audit log
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('email, name, status')
      .eq('id', userId)
      .single();
    
    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (targetUser.status === 'disabled') {
      return res.status(400).json({ error: 'User is already disabled' });
    }
    
    // 2. Update profile status to disabled
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'disabled' })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile status' });
    }
    
    // 3. Log audit event
    await supabase.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: userId,
      action: 'UPDATE',
      user_id: adminId,
      old_data: { status: 'active' },
      new_data: { 
        status: 'disabled', 
        disabled_by: adminId,
        disabled_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: `User ${targetUser.email} has been disabled`
    });
  } catch (error) {
    console.error('Disable user error:', error);
    res.status(500).json({ error: 'Failed to disable user' });
  }
});
```

**Response**:

```json
{
  "success": true,
  "message": "User john@example.com has been disabled"
}
```

**Error Responses**:
- 400: User already disabled
- 401: Not authenticated
- 403: Not authorized (not admin)
- 404: User not found
- 500: Internal error

**Important Notes**:
- User will not be able to log in on next login attempt
- Existing sessions will remain valid until they try to navigate or the session expires
- The frontend fetchProfile check will catch disabled users on next page load

---

### 2. Enable User

**Endpoint**: `PUT /admin/users/:userId/enable`

**Authentication**: Requires admin JWT

**Implementation**:

```javascript
router.put('/:userId/enable', authenticateUser, verifyAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.id;
    
    // 1. Get user info
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('email, name, status')
      .eq('id', userId)
      .single();
    
    if (userError || !targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (targetUser.status === 'active') {
      return res.status(400).json({ error: 'User is already enabled' });
    }
    
    // 2. Update profile status to active
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Failed to update profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile status' });
    }
    
    // 3. Log audit event
    await supabase.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: userId,
      action: 'UPDATE',
      user_id: adminId,
      old_data: { status: 'disabled' },
      new_data: { 
        status: 'active', 
        enabled_by: adminId,
        enabled_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: `User ${targetUser.email} has been re-enabled`
    });
  } catch (error) {
    console.error('Enable user error:', error);
    res.status(500).json({ error: 'Failed to enable user' });
  }
});
```

**Response**: Same structure as disable endpoint

**Error Responses**:
- 400: User already enabled
- 401: Not authenticated
- 403: Not authorized (not admin)
- 404: User not found
- 500: Internal error

---

### 3. Update Profile Endpoint (Status Check)

**Endpoint**: `GET /api/users/profile`

**Authentication**: Requires user JWT

**Implementation**:

```javascript
router.get('/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }
    
    // CRITICAL: Check if user is disabled
    // This error message will be displayed to the user on the login page
    if (profile.status === 'disabled') {
      return res.status(403).json({ 
        error: 'Your account has been disabled. Please contact support for assistance.'
      });
    }
    
    // Fetch organizations with roles
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        organization_members!inner(role)
      `)
      .eq('organization_members.user_id', userId);
    
    if (orgsError) {
      return res.status(500).json({ error: 'Failed to fetch organizations' });
    }
    
    // Format organizations array
    const organizations = orgs.map(org => ({
      id: org.id,
      name: org.name,
      role: org.organization_members[0].role
    }));
    
    res.json({
      data: {
        ...profile,
        organizations
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
```

**Response (Success)**:

```json
{
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "active",
    "organizations": [
      {
        "id": "org-uuid",
        "name": "My Organization",
        "role": "Admin"
      }
    ]
  }
}
```

**Response (Disabled User)**:

```json
{
  "error": "Your account has been disabled. Please contact support for assistance.",
  "code": "ACCOUNT_DISABLED"
}
```

---

### 4. Password Reset (Direct Supabase Call)

**Implementation**: Password reset is handled directly from the frontend using Supabase's `resetPasswordForEmail()` method. **No backend endpoint is needed.**

**Why Direct Call?**
- Consistency: User-initiated password reset also uses direct Supabase call
- Simplicity: No backend endpoint needed, no audit logging complexity
- Security: Doesn't change any database state, just triggers an email
- Same Flow: Admin and user password resets work identically

**Frontend Implementation**:

```typescript
// In app/admin/users/page.tsx
const handleSendResetEmail = async (email: string) => {
  try {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      addToast('error', error.message || 'Failed to send password reset email');
    } else {
      addToast('success', 'Password reset email sent');
    }
  } catch (error: any) {
    addToast('error', error.message || 'Failed to send password reset email');
  }
};
```

**How It Works**:
1. Admin clicks "Send Password Reset" for a user
2. Frontend calls `supabase.auth.resetPasswordForEmail(email)`
3. Supabase sends password reset email to the user
4. User clicks link in email → redirected to `/reset-password`
5. User enters new password → password updated via Supabase
6. User logs in with new password

**Important Notes**:
- Uses `supabase.auth.resetPasswordForEmail()` - no admin privileges needed
- Supabase automatically sends the email
- The `redirectTo` URL should point to your frontend reset-password page
- The reset link expires after 1 hour by default (Supabase setting)
- No audit logging (optional: could add client-side logging if needed)

**Backend Action Required**: ❌ **None** - This is handled entirely on the frontend

---

## Middleware

### Admin Verification Middleware

**File**: `middleware/verifyAdmin.js`

```javascript
async function verifyAdmin(req, res, next) {
  try {
    // req.user.id should already be set by authenticateUser middleware
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('superadmin')
      .eq('id', req.user.id)
      .single();
    
    if (error || !profile || !profile.superadmin) {
      return res.status(403).json({ 
        error: 'Access denied. Admin privileges required.' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({ error: 'Failed to verify admin status' });
  }
}

module.exports = { verifyAdmin };
```

---

## Security Considerations

### Rate Limiting

Apply strict rate limits to prevent abuse:

- **Disable/Enable user**: 10 requests per minute per admin

Note: Password reset rate limiting is handled by Supabase automatically (direct call, no backend endpoint).

### Audit Logging

Admin actions that change database state MUST be logged with:

- Admin user ID (who performed the action)
- Target user ID
- Action type (disable, enable)
- Timestamp
- Before/after state (for disable/enable)

Note: Password reset is not audited as it doesn't change database state (just triggers an email).

### Session Handling

Disabled users' existing sessions will remain valid until:
- They navigate to a new page (middleware check)
- They refresh the page (fetchProfile check)
- Their session expires naturally

This is acceptable since it's not instant, but secure enough for most use cases.

### Additional Security

Consider implementing:
- IP address logging for admin actions
- Notification emails when accounts are disabled
- "Reason" field for disable actions (for compliance)
- Maximum number of disable actions per day per admin

---

## Testing Checklist

### Disable User
- [ ] Admin can disable any user
- [ ] Disabled user cannot login (receives clear error message)
- [ ] Disabled user is logged out on next page navigation/refresh
- [ ] Profile status changes to 'disabled' in database
- [ ] Audit log entry created with admin ID and timestamp
- [ ] Non-admin users get 403 error when attempting to disable
- [ ] Confirmation modal shows before action
- [ ] Already disabled users return appropriate error

### Enable User
- [ ] Admin can re-enable previously disabled user
- [ ] Re-enabled user can login successfully
- [ ] Profile status changes to 'active' in database
- [ ] Audit log entry created
- [ ] Confirmation modal shows before action
- [ ] Already enabled users return appropriate error

### Password Reset (Frontend Only)
- [ ] Admin can trigger password reset for any user
- [ ] User receives password reset email
- [ ] Reset link redirects to correct frontend URL (`/reset-password`)
- [ ] Reset link works and allows password change
- [ ] Confirmation modal shows before action
- [ ] Supabase rate limiting prevents abuse (automatic)
- [ ] Works identically to user-initiated password reset

### Security
- [ ] Non-admin users cannot access any admin endpoints (403)
- [ ] Rate limiting works correctly
- [ ] Audit logs capture all required information
- [ ] Profile endpoint returns 403 for disabled users
- [ ] Middleware catches disabled users
- [ ] Auth store catches disabled users during login

---

## Database Schema

### Profiles Table

The `status` field should exist in the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
```

Valid values: `'active'`, `'disabled'`

### Audit Logs Table

The existing `audit_logs` table is used for logging:

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

---

## Summary

**Supported Admin Actions**:
1. **Disable User** - Sets status to 'disabled', prevents future logins (via Express API)
2. **Enable User** - Sets status to 'active', allows login again (via Express API)
3. **Send Password Reset** - Triggers password reset email for any user (direct Supabase call)

**Key Points**:
- Disable/Enable use Express API with audit logging
- Password reset uses direct Supabase call (consistent with user password reset)
- Uses regular Supabase client (no service role key needed)
- Simple status field check in database
- Frontend checks status during login and profile fetch
- Middleware provides additional protection
- Database-changing actions are audited
- Rate limiting prevents abuse
- Security through simplicity

