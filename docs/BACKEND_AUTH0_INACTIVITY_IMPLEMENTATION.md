# Backend Auth0 Inactivity Timeout Implementation

This document outlines the required backend changes to support 1-hour inactivity timeout with Auth0 authentication.

## Overview

The frontend has been updated to automatically log out users after 60 minutes of inactivity (no warning modal). The backend needs to implement corresponding session expiration logic to ensure proper security.

**Frontend Changes Completed:**
- Auto-logout after 60 minutes of inactivity
- Uses `/api/logout` route which calls Express `/auth/logout`
- Cross-tab logout synchronization
- Activity tracking (mousemove, keydown, scroll, etc.)

**Backend Changes Required:**
- Implement sliding session expiration with 1-hour inactivity timeout
- Track `lastActivity` in session data
- Refresh session cookie on each authenticated request
- Return 401 when session expires due to inactivity

## 1. Session Cookie Expiration Strategy

### Current State

- `SESSION_MAX_AGE` is set to `86400000` (24 hours)
- Session cookie does not expire based on inactivity
- Session is only validated by JWT signature and expiration

### Required Change: Sliding Session Expiration (Recommended)

Implement a **sliding session** that:
1. Tracks the last activity time in the session data
2. Updates `lastActivity` on every authenticated API request
3. Validates that activity occurred within the last 60 minutes
4. Refreshes the session cookie with updated `lastActivity`
5. Returns 401 if inactivity exceeds 1 hour

**Alternative (Not Recommended):** Absolute timeout - setting `SESSION_MAX_AGE` to 1 hour would force logout after 1 hour regardless of user activity, which is not the desired behavior.

## 2. Implementation Steps

> **⚠️ CRITICAL WARNING - READ BEFORE IMPLEMENTING**
>
> **If you update the `authenticateSession` middleware BEFORE updating the `/auth/callback` endpoint, users will experience login loops!**
>
> **Required order:**
> 1. ✅ First: Add `lastActivity: Date.now()` to session data in `/auth/callback`
> 2. ✅ Second: Add environment variable `SESSION_INACTIVITY_TIMEOUT`
> 3. ✅ Third: Update `authenticateSession` middleware with inactivity check
>
> **If you skip step 1, symptoms will be:**
> - User clicks login → Auth0 works → redirected back to login page
> - Repeated Auth0 consent screen on every login attempt
> - Frontend auth store never initializes (no valid session)
> - Backend logs show successful callback but session immediately invalid
>
> **Why?** The middleware checks for `lastActivity` in every request. If it's missing from new sessions, the check fails and rejects all new logins.

### Step 1: Update Environment Variables

Add to your backend `.env` file:

```env
# Session inactivity timeout (1 hour in milliseconds)
SESSION_INACTIVITY_TIMEOUT=3600000
```

**Default:** 3600000 ms (1 hour)

### Step 2: Update Auth Callback to Initialize lastActivity

**⚠️ CRITICAL:** This step is absolutely required or users will experience login loops!

In your `/auth/callback` endpoint, add `lastActivity` to the session data:

**File:** `routes/auth.js` (or wherever your Auth0 callback is implemented)

**Current code (lines ~247-255):**
```javascript
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now()
};
```

**Updated code:**
```javascript
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now(),
  lastActivity: Date.now()  // ADD THIS LINE - CRITICAL!
};
```

**Why this is critical:**
- If `lastActivity` is missing from new sessions, the `authenticateSession` middleware will treat it as undefined
- The inactivity check `if (now - lastActivity > inactivityTimeout)` will fail (NaN comparison)
- Or if using fallback `decoded.lastActivity || decoded.loginTime`, missing `lastActivity` breaks the logic
- Result: Users get stuck in login loop - redirected back to login immediately after Auth0 callback
- Symptom: Repeated Auth0 consent screen on every login attempt

### Step 3: Update authenticateSession Middleware

Update the `authenticateSession` middleware to check inactivity and refresh the session cookie.

**File:** `middleware/auth.js` or wherever `authenticateSession` is defined

**Current implementation:**
```javascript
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies[process.env.SESSION_COOKIE_NAME || 'javelina_session'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Session verification failed:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
```

**Updated implementation with inactivity check:**
```javascript
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies[process.env.SESSION_COOKIE_NAME || 'javelina_session'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    
    // Check if last activity was within the configured timeout
    const inactivityTimeout = parseInt(process.env.SESSION_INACTIVITY_TIMEOUT) || 3600000; // Default 1 hour
    const now = Date.now();
    const lastActivity = decoded.lastActivity || decoded.loginTime;
    
    // Defensive check: if lastActivity is still undefined, log error and allow session
    // This prevents login loops if callback doesn't set lastActivity yet
    if (!lastActivity) {
      console.error('[Auth] WARNING: Session missing lastActivity AND loginTime!');
      console.error('[Auth] Session data:', { ...decoded, email: '[REDACTED]' });
      console.error('[Auth] This session was likely created with an old callback implementation.');
      console.error('[Auth] Allowing session but this should be fixed in /auth/callback');
      // Allow the session but it won't have proper inactivity tracking
      req.user = decoded;
      next();
      return;
    }
    
    if (now - lastActivity > inactivityTimeout) {
      console.log('[Auth] Session expired due to inactivity');
      console.log('[Auth] Last activity:', new Date(lastActivity).toISOString());
      console.log('[Auth] Current time:', new Date(now).toISOString());
      console.log('[Auth] Inactive for:', Math.round((now - lastActivity) / 60000), 'minutes');
      
      return res.status(401).json({ 
        error: 'Session expired',
        reason: 'inactivity',
        message: 'Your session expired due to inactivity. Please log in again.'
      });
    }
    
    // Update last activity time
    const updatedSession = {
      ...decoded,
      lastActivity: now
    };
    
    // Refresh session cookie with updated lastActivity
    const newToken = jwt.sign(updatedSession, process.env.SESSION_SECRET, {
      expiresIn: '24h' // Keep JWT valid for 24h, but enforce inactivity separately
    });
    
    res.cookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400000, // 24 hours (but inactivity check happens above)
      path: '/'
    });
    
    req.user = decoded; // Keep original decoded data for this request
    next();
  } catch (error) {
    console.error('Session verification failed:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
```

### Step 4: Add Session Status Endpoint (Optional but Recommended)

This endpoint allows the frontend to check session validity without triggering a full API call.

**File:** `routes/auth.js`

```javascript
/**
 * GET /auth/session-status
 * Check if the current session is valid and active
 * This endpoint uses authenticateSession middleware, so it:
 * 1. Validates the session
 * 2. Checks inactivity timeout
 * 3. Refreshes lastActivity timestamp
 */
router.get('/session-status', authenticateSession, (req, res) => {
  res.json({
    valid: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      emailVerified: req.user.emailVerified,
      lastActivity: req.user.lastActivity,
      loginTime: req.user.loginTime
    }
  });
});
```

## 3. How It Works

### User Flow

1. **User logs in via Auth0:**
   - Express `/auth/callback` receives Auth0 tokens
   - Session data created with `loginTime` and `lastActivity` set to current timestamp
   - Session cookie (`javelina_session`) sent to browser

2. **User makes API requests:**
   - Frontend sends session cookie with each request
   - `authenticateSession` middleware runs:
     - Verifies JWT signature
     - Checks if `lastActivity` is within 1 hour
     - If yes: updates `lastActivity` and refreshes cookie
     - If no: returns 401 with inactivity reason

3. **User inactive for 60 minutes:**
   - Frontend idle logout timer triggers (no warning)
   - Frontend redirects to `/api/logout`
   - Next.js API route calls Express `/auth/logout`
   - Express clears session cookie and returns Auth0 logout URL
   - Browser redirected to Auth0 logout, then back to app

4. **User tries to use API after 60 minutes of inactivity:**
   - Backend `authenticateSession` detects `lastActivity` > 1 hour
   - Returns 401 with `reason: 'inactivity'`
   - Frontend can catch this and redirect to login

### Cross-Tab Behavior

The frontend already handles cross-tab synchronization:
- Activity in any tab resets the timer in all tabs
- Logout in any tab triggers logout in all tabs
- Uses BroadcastChannel API + localStorage fallback

The backend doesn't need to handle this - the session cookie is shared across all tabs automatically.

## 4. Environment Variables Summary

### Backend `.env`

Add this new variable:
```env
SESSION_INACTIVITY_TIMEOUT=3600000  # 1 hour in milliseconds
```

**Existing variables to keep:**
```env
SESSION_MAX_AGE=86400000            # 24 hours (JWT expiration)
SESSION_SECRET=<your-secret>
SESSION_COOKIE_NAME=javelina_session
AUTH0_DOMAIN=<your-domain>
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-secret>
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://<your-auth0-domain>/
AUTH0_CALLBACK_URL=<your-callback>
FRONTEND_URL=<your-frontend-url>
```

### Frontend `.env` (No Changes Required)

The frontend already has:
```env
NEXT_PUBLIC_IDLE_TIMEOUT_MS=3600000      # 60 minutes (unchanged)
NEXT_PUBLIC_IDLE_WARNING_MS=3480000      # 58 minutes (unused but kept for future)
NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MS=900000 # 15 minutes (unchanged)
```

## 5. Testing Checklist

### Backend Testing

- [ ] **Login creates session with `lastActivity`**
  - Check JWT payload includes `lastActivity` field
  - Verify `lastActivity` equals `loginTime` on initial login

- [ ] **API requests refresh `lastActivity`**
  - Make an API call, decode the returned session cookie
  - Verify `lastActivity` is updated to current time

- [ ] **Inactivity timeout enforced**
  - Create a session, wait >1 hour (or manually modify JWT for testing)
  - Make an API request
  - Verify 401 response with `reason: 'inactivity'`

- [ ] **Active users stay logged in**
  - Make API calls every 30 seconds for 2+ hours
  - Verify user stays authenticated (no unexpected 401s)

- [ ] **Session cookie properties correct**
  - Verify `httpOnly: true`
  - Verify `secure: true` in production
  - Verify `sameSite: 'lax'`
  - Verify `path: '/'`

### Integration Testing

- [ ] **Frontend idle timeout works with backend**
  - User inactive for 60 minutes
  - Frontend redirects to `/api/logout`
  - Auth0 session cleared
  - User redirected to landing page

- [ ] **Backend rejects expired sessions**
  - User inactive for 60 minutes
  - Try to make API call
  - Verify 401 response

- [ ] **Admin routes use separate timeout**
  - Admin inactive for 15 minutes
  - Verify admin logged out
  - Regular user routes still use 60 minutes

- [ ] **Cross-tab logout works**
  - Open 2 tabs
  - Let one tab sit for 60 minutes
  - When idle logout triggers, both tabs should logout

## 6. Security Considerations

### Why Sliding Session?

**Sliding session (implemented above):**
- ✅ Active users stay logged in
- ✅ Inactive users forced to re-authenticate
- ✅ Balances security and user experience
- ✅ Industry standard approach

**Absolute timeout (not recommended):**
- ❌ Active users forced to re-login every hour
- ❌ Poor user experience
- ❌ Doesn't match inactivity requirement

### Session Cookie Security

The session cookie is already configured securely:
- `httpOnly: true` - prevents JavaScript access (XSS protection)
- `secure: true` (production) - HTTPS only
- `sameSite: 'lax'` - CSRF protection
- JWT signed with `SESSION_SECRET` - tampering protection

### JWT Expiration vs Inactivity Timeout

The implementation uses:
- **JWT expiration: 24 hours** - maximum session lifetime
- **Inactivity timeout: 1 hour** - enforced separately via `lastActivity`

This means:
- Sessions can last up to 24 hours if user is active
- But user must have activity at least once per hour
- After 24 hours, user must re-authenticate regardless of activity

## 7. Troubleshooting

### Issue: Login loop - redirected back to login after Auth0 callback

**Symptoms:**
- User clicks login, goes through Auth0 successfully
- Gets redirected back to landing page instead of dashboard
- Clicking login again shows Auth0 consent screen again
- Infinite loop of login attempts

**Root Cause:** 
`lastActivity` field is missing from session data created in `/auth/callback` endpoint.

**What happens:**
1. User completes Auth0 login
2. Backend creates session WITHOUT `lastActivity` field
3. Frontend tries to initialize auth by calling `/auth/me`
4. `authenticateSession` middleware runs and checks: `if (now - lastActivity > inactivityTimeout)`
5. Since `lastActivity` is `undefined`, the check fails or produces NaN
6. Middleware rejects session (returns 401)
7. Frontend redirects user back to login
8. Repeat forever

**Solution:**
1. Open your `/auth/callback` endpoint in the backend
2. Find where `sessionData` is created
3. Verify it includes: `lastActivity: Date.now()`
4. Restart backend server
5. Clear browser cookies (or use incognito mode)
6. Try login again

**Code check:**
```javascript
// WRONG - Missing lastActivity
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now()
  // lastActivity is MISSING!
};

// CORRECT - Includes lastActivity
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now(),
  lastActivity: Date.now()  // ✅ REQUIRED!
};
```

### Issue: Users logged out immediately after login (different from login loop)

**Cause:** `lastActivity` not set in callback endpoint OR inactivity check has no fallback

**Solution:** 
1. Verify `lastActivity: Date.now()` is added to session data in `/auth/callback`
2. Ensure middleware has fallback: `const lastActivity = decoded.lastActivity || decoded.loginTime`

### Issue: Users can stay logged in for >1 hour without activity

**Cause:** Middleware not checking `lastActivity` or inactivity timeout not configured

**Solution:**
1. Verify `SESSION_INACTIVITY_TIMEOUT` is set in `.env`
2. Verify `authenticateSession` middleware includes inactivity check
3. Check logs for "Session expired due to inactivity" messages

### Issue: Users logged out despite being active

**Cause:** Cookie not being refreshed or frontend not sending cookies

**Solution:**
1. Verify frontend uses `credentials: 'include'` in API calls
2. Check that middleware refreshes cookie with `res.cookie()`
3. Verify cookie `maxAge` is set correctly

### Issue: 401 errors not handled in frontend

**Cause:** Frontend may need to catch 401 with `reason: 'inactivity'`

**Solution:** Add error handling in frontend API client:
```typescript
if (response.status === 401) {
  const data = await response.json().catch(() => ({}));
  if (data.reason === 'inactivity') {
    // Redirect to login
    window.location.href = '/login';
  }
}
```

### Verify the Fix Works

After adding `lastActivity` to the callback, verify it's working:

**1. Check backend logs during login:**
```bash
# Should NOT see this error:
[Auth] WARNING: Session missing lastActivity AND loginTime!

# Should see successful callback with no errors
```

**2. Decode the session JWT:**
After login, copy the `javelina_session` cookie from browser DevTools and decode it:
```bash
# Using jwt-cli (npm install -g jwt-cli)
jwt decode <your-cookie-value>

# Or use https://jwt.io

# Should see in payload:
{
  "userId": "...",
  "auth0UserId": "...",
  "email": "...",
  "name": "...",
  "emailVerified": true,
  "loginTime": 1707746400000,
  "lastActivity": 1707746400000,  // ✅ Should be present!
  "iat": ...,
  "exp": ...
}
```

**3. Test login flow:**
```bash
# 1. Clear all cookies (or use incognito)
# 2. Click login
# 3. Complete Auth0 flow
# 4. Should redirect to dashboard (NOT back to login)
# 5. Should stay logged in
# 6. Check browser DevTools → Application → Cookies
# 7. javelina_session cookie should exist
```

**4. Test API request:**
```bash
# After successful login, make API request
curl -H "Cookie: javelina_session=<your-cookie>" http://localhost:3001/api/zones

# Should return 200 OK with data (not 401)
```

## 8. Deployment Instructions

### Step 1: Deploy Backend Changes

1. Add `SESSION_INACTIVITY_TIMEOUT=3600000` to backend `.env`
2. Update `authenticateSession` middleware with inactivity check
3. Update `/auth/callback` to include `lastActivity` in session data
4. (Optional) Add `/auth/session-status` endpoint
5. Deploy backend changes
6. Verify with integration tests

### Step 2: Deploy Frontend Changes

Frontend changes are already complete. The frontend will:
- Continue to use frontend-side idle detection (60 min timer)
- Redirect to `/api/logout` when idle timeout triggers
- Automatically handle 401 responses from backend

### Step 3: Verify End-to-End

1. Test login flow - verify `lastActivity` in session cookie
2. Test active user - make API calls, verify session refreshes
3. Test inactive user - wait 60 min, verify logout
4. Test cross-tab - verify logout syncs across tabs

## 9. Rollback Plan

If issues arise:

1. **Revert middleware changes:**
   - Remove inactivity check from `authenticateSession`
   - Remove `lastActivity` update logic

2. **Keep environment variable:**
   - Can leave `SESSION_INACTIVITY_TIMEOUT` in `.env` (unused)

3. **Frontend still works:**
   - Frontend idle timeout will trigger `/api/logout` normally
   - Backend won't enforce inactivity (relies on frontend only)
   - Less secure but functional

## 10. Future Enhancements

### Configurable Timeout Per User Role

Could implement different timeouts based on user role:
```javascript
const getInactivityTimeout = (user) => {
  if (user.role === 'admin') return 900000; // 15 min
  if (user.role === 'enterprise') return 7200000; // 2 hours
  return 3600000; // 1 hour default
};
```

### Remember Me / Extended Sessions

Could add a "Remember Me" option at login:
- Normal session: 1 hour inactivity
- Extended session: 7 days inactivity
- Store preference in session data

### Session Analytics

Track session duration and inactivity patterns:
- Log session duration on logout
- Track average active time per user
- Identify optimal timeout values

## 11. References

- [Express Session Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Auth0 Session Lifetime Documentation](https://auth0.com/docs/manage-users/sessions/session-lifetime)
- Frontend implementation: `components/auth/IdleLogoutGuard.tsx`
- Existing backend auth guide: `BACKEND_AUTH0_IMPLEMENTATION.md`
