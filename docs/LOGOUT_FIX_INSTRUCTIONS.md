# Logout Redirect Issue - Fix Instructions

## Problem
After clicking the sign-out button on the Vercel dev environment:
1. Auth0 logs show successful logout
2. User is not redirected to login or landing page
3. User appears on the main dashboard showing as "Unknown"

## Root Cause
The Express backend's logout endpoint is likely setting the Auth0 `returnTo` parameter to `/login` instead of `/` (root). This causes issues because:

1. After Auth0 logout, it redirects to `/login`
2. The middleware sees no session cookie and redirects from `/login` to `/`
3. BUT if the session cookie wasn't properly cleared, or there's a timing issue, the middleware might see a stale cookie
4. This results in the user appearing authenticated but with no profile data ("Unknown")

## Frontend Fixes Applied

### 1. `/app/api/logout/route.ts`
- Added comprehensive logging to debug the logout flow
- Added error handling for backend failures
- Added logging for Set-Cookie header forwarding
- Added documentation about the returnTo URL requirement

### 2. `/lib/auth-store.ts` - `logout()` function
- **CRITICAL FIX**: Now clears local auth state immediately before redirecting
- This prevents stale state from persisting after Auth0 redirects back
- Ensures `user`, `isAuthenticated`, `profileReady`, and `profileError` are all cleared

## Backend Fix Required

### Update Express Backend Logout Endpoint

**File:** `server/routes/auth.js` (or wherever your Express auth routes are)

**Current Code (PROBLEMATIC):**
```javascript
router.post('/logout', (req, res) => {
  res.clearCookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  const auth0LogoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
    new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: `${process.env.FRONTEND_URL}/login`  // ❌ WRONG - causes redirect loop
    }).toString();
  
  res.json({ 
    success: true, 
    redirectUrl: auth0LogoutUrl
  });
});
```

**Fixed Code:**
```javascript
router.post('/logout', (req, res) => {
  // Clear session cookie
  res.clearCookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  // Return Auth0 logout URL with returnTo set to ROOT (/)
  const auth0LogoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
    new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: `${process.env.FRONTEND_URL}/`  // ✅ CORRECT - redirect to root
    }).toString();
  
  console.log('[Auth] Logout successful, Auth0 returnTo:', `${process.env.FRONTEND_URL}/`);
  
  res.json({ 
    success: true, 
    redirectUrl: auth0LogoutUrl
  });
});
```

### Auth0 Configuration Update

**CRITICAL**: The `returnTo` URL must be whitelisted in Auth0:

1. Go to Auth0 Dashboard
2. Navigate to: Applications → Your Application → Settings
3. Scroll to "Allowed Logout URLs"
4. Add (if not already there):
   ```
   https://your-vercel-dev-url.vercel.app/
   https://your-production-url.com/
   http://localhost:3000/ (for local dev)
   ```
5. Click "Save Changes"

**Note**: Auth0 requires the EXACT URL (including trailing slash if present in your code)

## Testing the Fix

### 1. Check Browser Console
After deploying the frontend fix, check the browser console for:
```
[Logout API] Calling Express logout endpoint: https://your-backend.com/auth/logout
[Logout API] Auth0 logout URL: https://your-domain.auth0.com/v2/logout?...
[Logout API] Forwarding Set-Cookie headers to clear session
```

### 2. Check Network Tab
1. Click Sign Out
2. Open Network tab
3. Look for:
   - Request to `/api/logout`
   - Request to backend `/auth/logout`
   - Redirect to Auth0 logout URL
   - Redirect back to your app root `/`
4. Verify the session cookie is cleared (check Application → Cookies)

### 3. Expected Flow After Fix
1. User clicks "Sign Out"
2. Frontend immediately clears local state (user set to null)
3. Browser navigates to `/api/logout`
4. Next.js route calls Express backend `/auth/logout`
5. Express clears `javelina_session` cookie
6. Express returns Auth0 logout URL (with `returnTo=/`)
7. Browser redirects to Auth0 logout
8. Auth0 clears Auth0 session
9. Auth0 redirects back to `/` (root)
10. User sees landing page (unauthenticated view)

### 4. If Still Not Working

Check these common issues:

**A. Session Cookie Not Clearing**
- Verify `clearCookie` options match exactly with how the cookie was set
- Check `domain`, `path`, `secure`, `sameSite` all match
- In production, ensure `secure: true` matches HTTPS

**B. Auth0 Redirect Failing**
- Check Auth0 logs for errors
- Verify "Allowed Logout URLs" includes the exact returnTo URL
- Check for typos in `AUTH0_DOMAIN` or `AUTH0_CLIENT_ID`

**C. Middleware Still Seeing Session**
- Add logging to `middleware.ts` to see if session cookie is present
- Check if cookie is httpOnly (can't see in JS, but can in Network tab)
- Verify cookie domain matches your Vercel deployment domain

**D. Cross-Origin Cookie Issues**
- If backend and frontend are on different domains, ensure:
  - Backend sets cookie with correct `domain` attribute
  - CORS is configured properly
  - `credentials: 'include'` is used in fetch calls

## Verification Checklist

- [ ] Backend logout endpoint updated to use `returnTo: ${FRONTEND_URL}/`
- [ ] Auth0 "Allowed Logout URLs" includes root URL (`/`)
- [ ] Frontend changes deployed to Vercel
- [ ] Browser console shows logout logs
- [ ] Network tab shows session cookie being cleared
- [ ] After logout, user sees landing page (not "Unknown" dashboard)
- [ ] Can successfully log back in after logout

## Additional Notes

### Why `/` and not `/login`?

The root path (`/`) is better because:
1. It's the natural entry point for the application
2. The `app/page.tsx` already handles both authenticated and unauthenticated states
3. No extra redirect needed (middleware doesn't redirect from `/` to `/`)
4. Simpler flow = less chance of race conditions or timing issues

### Debugging Commands

**Check session cookie in deployed app:**
```javascript
// Run in browser console on your Vercel deployment
document.cookie.split(';').find(c => c.includes('javelina_session'))
```

**Check Auth0 logout URL:**
```bash
# Should be in Next.js logs (Vercel deployment logs)
grep "Auth0 logout URL" /var/log/nextjs.log
```

**Test backend logout directly:**
```bash
curl -X POST https://your-backend.com/auth/logout \
  -H "Cookie: javelina_session=YOUR_SESSION_TOKEN" \
  -v
```

## Contact

If issues persist after applying these fixes, check:
1. Vercel deployment logs for errors
2. Express backend logs for logout endpoint errors
3. Auth0 logs for application errors
4. Browser console for client-side errors
