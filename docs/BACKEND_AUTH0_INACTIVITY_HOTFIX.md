# HOTFIX: Auth0 Login Loop Issue

## Problem

Users experiencing infinite login loop after Auth0 authentication:
- User clicks login → Auth0 succeeds → redirected back to login page
- Repeated Auth0 consent screen on every login attempt
- Session cookie created but immediately invalid

## Root Cause

The `/auth/callback` endpoint creates session data WITHOUT the `lastActivity` field, but the `authenticateSession` middleware expects it to be present for inactivity checks.

When `lastActivity` is missing:
1. Middleware checks: `if (now - lastActivity > inactivityTimeout)`
2. `lastActivity` is `undefined` 
3. Math operation fails or produces unexpected result
4. Session rejected with 401
5. User redirected back to login
6. Infinite loop

## The Fix

### File: `routes/auth.js` (or your auth routes file)

**Location:** In the `/auth/callback` endpoint, find where session data is created (around line 247-255)

**Change this:**
```javascript
// WRONG - Missing lastActivity
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now()
};
```

**To this:**
```javascript
// CORRECT - Includes lastActivity
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now(),
  lastActivity: Date.now()  // ADD THIS LINE!
};
```

### Also Update: `authenticateSession` Middleware

Add defensive check for missing `lastActivity`:

```javascript
const lastActivity = decoded.lastActivity || decoded.loginTime;

// Add this safety check BEFORE the timeout comparison:
if (!lastActivity) {
  console.error('[Auth] WARNING: Session missing lastActivity AND loginTime!');
  console.error('[Auth] Allowing session but inactivity tracking disabled');
  req.user = decoded;
  next();
  return;
}

// Then continue with normal inactivity check:
if (now - lastActivity > inactivityTimeout) {
  // ... reject session
}
```

## Testing the Fix

### 1. Backend Logs
After implementing, backend should NOT show:
```
[Auth] WARNING: Session missing lastActivity AND loginTime!
```

### 2. Decode Session JWT
After login, check the session cookie includes `lastActivity`:

```bash
# Copy javelina_session cookie from browser DevTools
# Decode at https://jwt.io or using jwt-cli

# Payload should include:
{
  "userId": "...",
  "loginTime": 1707746400000,
  "lastActivity": 1707746400000,  // ✅ Should be present!
  ...
}
```

### 3. Login Flow Test
```
1. Clear all browser cookies (or use incognito mode)
2. Click "Login"
3. Complete Auth0 authentication
4. Should redirect to dashboard ✅ (NOT back to login ❌)
5. Should stay logged in ✅
6. Session cookie should exist in DevTools → Application → Cookies ✅
```

### 4. API Test
```bash
# Should return 200 OK (not 401)
curl -H "Cookie: javelina_session=<cookie-value>" \
  http://localhost:3001/api/zones
```

## Deployment

1. ✅ Update `/auth/callback` to include `lastActivity`
2. ✅ Update `authenticateSession` with defensive check
3. ✅ Restart backend server
4. ✅ Test login flow
5. ✅ Verify session cookie contains `lastActivity`

## Verification Checklist

- [ ] `/auth/callback` includes `lastActivity: Date.now()` in session data
- [ ] `authenticateSession` has fallback: `decoded.lastActivity || decoded.loginTime`
- [ ] Backend logs show no "missing lastActivity" warnings
- [ ] Login flow completes successfully (no loop)
- [ ] Session JWT contains `lastActivity` field
- [ ] API requests work with session cookie (200 OK)
- [ ] No repeated Auth0 consent screens

## Related Documentation

- Full implementation guide: `BACKEND_AUTH0_INACTIVITY_IMPLEMENTATION.md`
- Frontend changes: `AUTH0_INACTIVITY_IMPLEMENTATION_SUMMARY.md`
- Testing procedures: `AUTH0_INACTIVITY_TESTING_GUIDE.md`

## Additional Notes

- This fix is backward compatible - existing valid sessions will continue to work
- The middleware's defensive check ensures old sessions (without `lastActivity`) still work
- New sessions will have proper inactivity tracking
- No database changes required
- No frontend changes required
- Only backend code changes needed

## Contact

If issues persist after implementing this fix:
1. Check backend logs for errors during `/auth/callback`
2. Verify `SESSION_SECRET` is correctly set
3. Verify `SESSION_INACTIVITY_TIMEOUT` is set (default 3600000)
4. Check that session cookie is being set (httpOnly, secure, sameSite settings)
5. Decode session JWT to verify all fields are present
