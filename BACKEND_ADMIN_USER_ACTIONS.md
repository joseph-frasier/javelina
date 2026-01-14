# Backend Admin User Actions API Specification

## Implementation Approach

This implementation uses Supabase's native ban functionality combined with the profiles.status field:

- **Supabase Ban**: Prevents authentication (user cannot login at all)
- **profiles.status**: For UI display (shows "Disabled" badge in admin panel)

**How It Works:**

When a user is disabled:
1. Backend bans them in Supabase Auth using admin API (`supabaseAdmin.auth.admin.updateUserById()`)
2. Backend updates `profiles.status` to 'disabled' (for UI display)
3. User cannot login - Supabase returns ban error before any profile fetching
4. Frontend catches the ban error and shows: "Your account has been disabled. Please contact support for assistance."

**Benefits:**
- Simpler: Error happens at authentication, not profile fetch
- More Secure: User truly cannot authenticate (not just profile check)
- Cleaner Error Handling: Catch error at login, repackage with custom message
- Standard Practice: Uses Supabase's built-in security features

---

## Overview

This document specifies the backend API requirements for admin user management actions. The disable/enable endpoints use the Express API with Supabase ban functionality and audit logging. Password reset uses direct Supabase calls for simplicity and consistency with user-initiated password resets.

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

### Supabase Clients

The backend uses TWO Supabase clients:

**1. Regular Client** (for normal operations):

```javascript
// utils/supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // ← Regular anon key
);

module.exports = { supabase };
```

**2. Admin Client** (for ban/unban operations):

```typescript
// utils/supabase-admin.ts
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // ← Service role key (required for ban API)
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export { supabaseAdmin }
```

**Environment Variables Required:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public anon key (same as frontend)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (get from Supabase Dashboard → Project Settings → API)

---

## API Endpoints

> **Note**: Password reset is handled via direct Supabase call from the frontend (see [Password Reset Section](#password-reset-direct-supabase-call) below). Only disable/enable endpoints are implemented in the backend API.

### 1. Disable User

**Endpoint**: `PUT /admin/users/:userId/disable`

**Authentication**: Requires admin JWT (verify `profiles.superadmin = true`)

**Implementation**:

```javascript
import { supabaseAdmin } from '../../utils/supabase-admin'

router.put('/:userId/disable', authenticateUser, verifyAdmin, async (req, res) => {
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
    
    if (targetUser.status === 'disabled') {
      return res.status(400).json({ error: 'User is already disabled' });
    }
    
    // 2. Ban user in Supabase Auth (prevents login)
    const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: 'none' // Permanent ban
    });
    
    if (banError) {
      console.error('Failed to ban user:', banError);
      return res.status(500).json({ error: 'Failed to ban user in Supabase' });
    }
    
    // 3. Update profile status (for UI display)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'disabled' })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Failed to update profile:', updateError);
      // Continue anyway - user is banned in auth, status is just for UI
    }
    
    // 4. Log audit event
    await supabase.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: userId,
      action: 'UPDATE',
      user_id: adminId,
      old_data: { status: 'active', banned: false },
      new_data: { 
        status: 'disabled',
        banned: true,
        disabled_by: adminId,
        disabled_at: new Date().toISOString()
      }
    });
    
    res.json({
      success: true,
      message: `User ${targetUser.email} has been disabled and banned from authentication`
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
- User is banned in Supabase Auth - they cannot generate new JWT tokens
- User will see "Your account has been disabled. Please contact support for assistance." when trying to login
- Existing sessions remain valid but user cannot login again after logout
- The `profiles.status` field is for UI display in admin panel (shows "Disabled" badge)

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
    
    // 2. Unban user in Supabase Auth
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: '0s' // Remove ban
    });
    
    if (unbanError) {
      console.error('Failed to unban user:', unbanError);
      return res.status(500).json({ error: 'Failed to unban user in Supabase' });
    }
    
    // 3. Update profile status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);
    
    if (updateError) {
      console.error('Failed to update profile:', updateError);
    }
    
    // 4. Log audit event
    await supabase.from('audit_logs').insert({
      table_name: 'profiles',
      record_id: userId,
      action: 'UPDATE',
      user_id: adminId,
      old_data: { status: 'disabled', banned: true },
      new_data: { 
        status: 'active',
        banned: false,
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

### 3. Profile Endpoint (Simplified)

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
    
    // NO status check needed - banned users can't authenticate
    // They'll never reach this endpoint
    
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

**Note**: Disabled users cannot reach this endpoint because they cannot authenticate. Supabase will reject their login attempt before any profile fetching occurs.

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

Banned users' existing sessions remain valid until they expire naturally. However:
- They cannot generate new JWT tokens (Supabase blocks authentication)
- They cannot login again after logout
- Once their session expires, they're fully locked out

This is standard behavior for ban systems and is secure enough for most use cases.

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
- [ ] User is banned in Supabase Auth (check via Supabase dashboard)
- [ ] Profile status changes to 'disabled' in database
- [ ] Disabled user cannot login (receives clear error message: "Your account has been disabled. Please contact support for assistance.")
- [ ] Admin UI shows "Disabled" badge for disabled users
- [ ] Audit log entry created with admin ID, timestamp, and ban status
- [ ] Non-admin users get 403 error when attempting to disable
- [ ] Confirmation modal shows before action
- [ ] Already disabled users return appropriate error

### Enable User
- [ ] Admin can re-enable previously disabled user
- [ ] User is unbanned in Supabase Auth (check via Supabase dashboard)
- [ ] Profile status changes to 'active' in database
- [ ] Re-enabled user can login successfully
- [ ] Admin UI shows "Active" status for re-enabled users
- [ ] Audit log entry created with admin ID, timestamp, and unban status
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
- [ ] Audit logs capture all required information (including ban status)
- [ ] Banned users cannot authenticate (Supabase blocks them)
- [ ] Frontend catches ban errors and shows custom message
- [ ] Service role key is properly secured in backend environment

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
1. **Disable User** - Bans in Supabase Auth + sets status to 'disabled' (via Express API)
2. **Enable User** - Unbans in Supabase Auth + sets status to 'active' (via Express API)
3. **Send Password Reset** - Triggers password reset email for any user (direct Supabase call)

**Key Points**:
- Disable/Enable use Supabase ban API + Express API with audit logging
- Password reset uses direct Supabase call (consistent with user password reset)
- Uses Supabase service role key for ban operations (required)
- Supabase ban prevents authentication (more secure than status check)
- Frontend catches ban errors and shows custom message
- profiles.status field is for UI display in admin panel
- Database-changing actions are audited (including ban status)
- Rate limiting prevents abuse
- Security through Supabase's built-in features

