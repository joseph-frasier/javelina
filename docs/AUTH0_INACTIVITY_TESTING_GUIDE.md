# Auth0 Inactivity Auto-Logout Testing Guide

This guide provides step-by-step instructions for testing the updated inactivity timeout feature with Auth0.

## What Changed

- **Removed:** Warning modal at 58 minutes (code preserved for future use)
- **Updated:** Auto-logout after 60 minutes now uses Auth0 logout flow
- **Kept:** Cross-tab synchronization and activity tracking

## Prerequisites

Before testing, ensure:

1. ✅ Backend has implemented session inactivity checks (see `BACKEND_AUTH0_INACTIVITY_IMPLEMENTATION.md`)
2. ✅ Frontend changes deployed (`IdleLogoutGuard.tsx` updated)
3. ✅ Auth0 is properly configured
4. ✅ Express backend is running and accessible

## Test Environment Setup

### For Development Testing

You can temporarily reduce the timeout values to test without waiting 60 minutes:

**Frontend (`.env.dev` or `.env.local`):**
```env
# Temporary test values (change back after testing)
NEXT_PUBLIC_IDLE_TIMEOUT_MS=120000  # 2 minutes (instead of 60 min)
```

**Backend (`.env`):**
```env
# Temporary test values (change back after testing)
SESSION_INACTIVITY_TIMEOUT=120000  # 2 minutes (instead of 60 min)
```

**Important:** Remember to restore production values after testing:
- Frontend: `3600000` (60 minutes)
- Backend: `3600000` (60 minutes)

## Test Suite

### Test 1: Basic Inactivity Logout (Frontend Only)

**Objective:** Verify frontend idle detection triggers Auth0 logout after configured timeout.

**Setup:**
1. Set `NEXT_PUBLIC_IDLE_TIMEOUT_MS=120000` (2 minutes for faster testing)
2. Start frontend: `npm run dev`
3. Login to the application

**Steps:**
1. Login to the application
2. Open browser DevTools → Console tab
3. Do NOT move mouse, type, or interact with the page
4. Wait for the configured timeout (2 minutes if using test config)

**Expected Results:**
- ✅ After 2 minutes of inactivity, browser redirects to `/api/logout`
- ✅ You see Auth0 logout page briefly
- ✅ Redirected to landing page (`/`)
- ✅ Session cookie cleared (check DevTools → Application → Cookies)
- ✅ No warning modal appears

**Console Logs to Look For:**
```
[IdleLogoutGuard] Failed to clear activity: (should not appear unless error)
```

**Failure Modes:**
- ❌ Warning modal appears → Frontend still passing `warningMs` to hook
- ❌ No logout after timeout → `enabled` prop may be false
- ❌ Redirects to `/login` instead of `/api/logout` → Old Supabase logic still in use

---

### Test 2: Active User Stays Logged In

**Objective:** Verify active users are NOT logged out.

**Setup:**
1. Use test timeouts (2 minutes)
2. Start frontend and login

**Steps:**
1. Login to the application
2. Set a timer for 1 minute 45 seconds
3. Every 30 seconds, move your mouse or press a key
4. Continue for at least 5 minutes total

**Expected Results:**
- ✅ User stays logged in beyond the configured timeout
- ✅ Timer resets with each activity
- ✅ No logout occurs

**Activity Events Tracked:**
- Mouse move
- Mouse down
- Key down
- Touch start
- Scroll
- Pointer down

---

### Test 3: Cross-Tab Activity Sync

**Objective:** Verify activity in one tab resets timers in all tabs.

**Setup:**
1. Use test timeouts (2 minutes)
2. Login in Tab 1

**Steps:**
1. Open application in Tab 1, login
2. Open application in Tab 2 (same browser, same domain)
3. In Tab 1: Wait 1 minute 30 seconds without activity
4. In Tab 2: Move mouse or interact with page
5. Switch back to Tab 1 and wait another 1 minute

**Expected Results:**
- ✅ Neither tab logs out after 2 minutes
- ✅ Activity in Tab 2 resets timer in Tab 1
- ✅ Both tabs stay logged in

**Console Logs (both tabs):**
Look for activity broadcast messages in the idle sync logic.

---

### Test 4: Cross-Tab Logout Sync

**Objective:** Verify logout in one tab triggers logout in all tabs.

**Setup:**
1. Use test timeouts (2 minutes)
2. Login in Tab 1

**Steps:**
1. Open application in Tab 1, login
2. Open application in Tab 2 (same browser)
3. In both tabs: Wait 2 minutes without activity
4. Observe both tabs

**Expected Results:**
- ✅ Both tabs logout simultaneously (within 1-2 seconds)
- ✅ Both tabs redirect to Auth0 logout
- ✅ Both tabs end up on landing page

**Note:** The logout broadcast happens via `BroadcastChannel` API with localStorage fallback.

---

### Test 5: Admin Route Timeout (15 Minutes)

**Objective:** Verify admin routes use 15-minute timeout.

**Setup:**
1. Set `NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MS=60000` (1 minute for testing)
2. Login as admin user

**Steps:**
1. Navigate to `/admin` routes
2. Do not interact with page
3. Wait for admin timeout (1 minute if using test config)

**Expected Results:**
- ✅ Logout occurs after 1 minute (test value)
- ✅ Redirected to `/admin/login` (NOT `/login`)
- ✅ localStorage has `admin-logout-reason: 'inactivity'`
- ✅ Admin logout page shows inactivity banner

**Verify Admin Banner:**
1. After inactivity logout, check admin login page
2. Should see blue banner: "You were logged out due to inactivity. Please log in again."

---

### Test 6: Backend Session Expiration

**Objective:** Verify backend enforces inactivity timeout independently.

**Setup:**
1. Backend must have `SESSION_INACTIVITY_TIMEOUT=120000` (2 minutes)
2. Backend must have inactivity check in `authenticateSession` middleware

**Steps:**
1. Login to application
2. Get session cookie from browser (DevTools → Application → Cookies)
3. Do NOT interact with frontend for 2+ minutes
4. Make direct API call to backend (e.g., GET `/api/zones`)
   ```bash
   curl -H "Cookie: javelina_session=<your-cookie>" http://localhost:3001/api/zones
   ```

**Expected Results:**
- ✅ API returns 401 status
- ✅ Response body includes `"reason": "inactivity"`
- ✅ Backend logs show "Session expired due to inactivity"

**Backend Response Example:**
```json
{
  "error": "Session expired",
  "reason": "inactivity",
  "message": "Your session expired due to inactivity. Please log in again."
}
```

---

### Test 7: Backend Session Refresh on Activity

**Objective:** Verify backend updates `lastActivity` on each request.

**Setup:**
1. Backend session inactivity timeout: 2 minutes
2. Login to application

**Steps:**
1. Login to application
2. Decode session cookie JWT (use jwt.io or backend logs)
3. Note the `lastActivity` timestamp
4. Wait 30 seconds
5. Make an API call (any authenticated endpoint)
6. Decode the new session cookie from Set-Cookie header
7. Compare `lastActivity` timestamps

**Expected Results:**
- ✅ New session cookie returned in Set-Cookie header
- ✅ `lastActivity` timestamp is updated to current time
- ✅ Old `lastActivity` is preserved in decoded token for comparison

**How to Decode JWT:**
```bash
# Install jwt-cli (optional)
npm install -g jwt-cli

# Decode cookie
jwt decode <your-jwt-token>
```

Or use https://jwt.io (paste your token)

---

### Test 8: Warning Modal Not Shown

**Objective:** Verify warning modal never appears (but code is preserved).

**Setup:**
1. Normal production config (60 minutes or test 2 minutes)
2. Login to application

**Steps:**
1. Login and navigate to any protected route
2. Open React DevTools
3. Find `IdleLogoutGuard` component
4. Inspect state: `showWarningModal` should be `false`
5. Wait for logout to trigger

**Expected Results:**
- ✅ `showWarningModal` state remains `false` throughout
- ✅ No modal appears before logout
- ✅ User is logged out without warning

**Code Verification:**
- Check that `IdleLogoutGuard` does NOT pass `warningMs` or `onWarning` to `useIdleLogout`
- Verify `handleWarning` callback exists but is never called

---

### Test 9: Placeholder/Mock Mode

**Objective:** Verify behavior when using placeholder Supabase credentials.

**Setup:**
```env
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
```

**Steps:**
1. Set placeholder URL in environment
2. Login to application
3. Trigger inactivity logout

**Expected Results:**
- ✅ Logout still works
- ✅ Redirects to `/api/logout`
- ✅ Auth0 logout flow works correctly

**Note:** Admin routes don't use Supabase, so no special handling needed.

---

### Test 10: Multiple Timeout Scenarios

**Objective:** Test edge cases and timing boundaries.

**Test 10a: Logout at Exact Timeout**
- Wait exactly 2 minutes (test config)
- Verify logout occurs within 1-2 seconds of timeout

**Test 10b: Activity at Last Second**
- Wait 1 minute 59 seconds
- Interact with page
- Verify timer resets and logout does NOT occur

**Test 10c: Rapid Tab Switching**
- Open 5 tabs
- Let all sit idle for 2 minutes
- Verify all logout simultaneously

**Test 10d: Logout During API Call**
- Trigger inactivity logout while API request is in flight
- Verify request fails gracefully (401 from backend)

---

## Production Testing

Once development testing is complete, test in production with full 60-minute timeouts:

### Preparation
1. Restore production timeout values:
   - Frontend: `NEXT_PUBLIC_IDLE_TIMEOUT_MS=3600000`
   - Backend: `SESSION_INACTIVITY_TIMEOUT=3600000`
2. Deploy to staging environment first

### Accelerated Production Test

Since waiting 60 minutes is impractical, use these strategies:

**Strategy 1: Temporarily Reduce Prod Timeouts**
- Set timeouts to 5 minutes in production for testing
- Test all scenarios
- Restore to 60 minutes after validation

**Strategy 2: Manual JWT Manipulation (Backend Testing)**
- Create a test user session
- Manually modify JWT `lastActivity` to be 61 minutes ago
- Verify backend rejects the session

**Strategy 3: Monitor Real Users**
- Deploy with 60-minute timeout
- Monitor analytics/logs for:
  - Inactivity logouts occurring
  - User complaints about unexpected logouts
  - Session refresh patterns

---

## Automated Testing (Optional)

### Playwright E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test('inactivity logout after 60 minutes', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Wait for timeout (use reduced timeout for test)
  // Assumes NEXT_PUBLIC_IDLE_TIMEOUT_MS=120000 (2 min)
  await page.waitForTimeout(125000); // 2 min 5 sec
  
  // Should be logged out
  await expect(page).toHaveURL('/');
  
  // Session cookie should be cleared
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'javelina_session');
  expect(sessionCookie).toBeUndefined();
});

test('activity resets timer', async ({ page }) => {
  await page.goto('/login');
  // ... login ...
  
  // Wait 1.5 minutes, then move mouse
  await page.waitForTimeout(90000);
  await page.mouse.move(100, 100);
  
  // Wait another 1.5 minutes (total 3 min with activity)
  await page.waitForTimeout(90000);
  
  // Should still be logged in (timeout is 2 min of INACTIVITY)
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Troubleshooting

### Issue: Login loop - can't login at all

**Symptoms:**
- Click login → Auth0 works → redirected back to login
- Have to authorize Auth0 again on every attempt
- Never reach dashboard

**Root Cause:**
Backend `/auth/callback` is missing `lastActivity` field in session data.

**Check:**
1. Decode session JWT from browser cookies (use jwt.io)
2. Verify payload includes `lastActivity` field
3. Check backend logs for "WARNING: Session missing lastActivity"

**Fix:**
Update backend `/auth/callback` to include:
```javascript
const sessionData = {
  // ... other fields ...
  loginTime: Date.now(),
  lastActivity: Date.now()  // ADD THIS!
};
```

See `BACKEND_AUTH0_INACTIVITY_IMPLEMENTATION.md` section 7 for detailed fix.

### Issue: Logout not happening

**Check:**
1. `IdleLogoutGuard` is rendered in app (check `ConditionalLayout.tsx`)
2. `enabled` prop is true (user is authenticated, not on auth page)
3. `idleTimeoutMs` is set correctly
4. Browser console for errors

**Debug:**
```typescript
// Add temporary logging to handleLogout
console.log('[TEST] handleLogout triggered', { isAdminRoute, timestamp: Date.now() });
```

### Issue: Warning modal appearing

**Check:**
1. `warningMs` and `onWarning` are NOT passed to `useIdleLogout`
2. `showWarningModal` state is always false

**Fix:**
Ensure line 110 in `IdleLogoutGuard.tsx` does NOT include:
```typescript
// WRONG - remove these
warningMs: warningTimeout,
onWarning: handleWarning,
```

### Issue: Cross-tab sync not working

**Check:**
1. Both tabs are on same domain
2. Browser supports `BroadcastChannel` (all modern browsers)
3. localStorage is accessible (not in private mode)

**Debug:**
Open console in both tabs, look for messages from `idleSync.ts`

### Issue: Backend returning 401 unexpectedly

**Check:**
1. Backend `SESSION_INACTIVITY_TIMEOUT` matches frontend
2. Backend middleware is updating `lastActivity`
3. Check backend logs for "Session expired due to inactivity"

**Debug:**
Decode session JWT before and after API call to verify `lastActivity` updates.

---

## Verification Checklist

Before marking as complete, verify:

- [ ] Frontend auto-logout works after configured timeout
- [ ] No warning modal appears
- [ ] Active users stay logged in (activity resets timer)
- [ ] Cross-tab activity sync works
- [ ] Cross-tab logout sync works
- [ ] Admin routes use 15-minute timeout
- [ ] Auth0 logout flow completes (session cleared, redirected)
- [ ] Backend enforces inactivity timeout independently
- [ ] Backend refreshes `lastActivity` on each request
- [ ] Session cookie properties correct (httpOnly, secure, sameSite)
- [ ] No linter errors in updated files
- [ ] Code comments updated to reflect new behavior
- [ ] Documentation complete (`BACKEND_AUTH0_INACTIVITY_IMPLEMENTATION.md`)

---

## Rollback Plan

If critical issues are found in production:

1. **Frontend Rollback:**
   - Revert `IdleLogoutGuard.tsx` changes
   - Re-enable warning modal by passing `warningMs` and `onWarning`
   - Restore Supabase logout logic

2. **Backend Rollback:**
   - Remove inactivity check from `authenticateSession` middleware
   - Keep environment variables (harmless if unused)

3. **Hotfix:**
   - Increase timeout values to 4+ hours temporarily
   - Gives time to debug without impacting users

---

## Success Criteria

The implementation is successful when:

1. ✅ Users automatically logged out after 60 minutes of inactivity
2. ✅ Active users can work for hours without interruption
3. ✅ No unexpected logouts reported
4. ✅ Auth0 session properly cleared on inactivity logout
5. ✅ Cross-tab synchronization works correctly
6. ✅ Backend independently enforces timeout for security
7. ✅ Admin routes maintain 15-minute timeout
8. ✅ Zero user complaints about logout UX

---

## Next Steps After Testing

1. **Monitor in Production:**
   - Track inactivity logout frequency
   - Monitor for user complaints
   - Analyze session duration patterns

2. **Gather Feedback:**
   - Survey users about logout experience
   - Check if 60 minutes is appropriate for your use case

3. **Future Enhancements:**
   - Re-enable warning modal if requested by users
   - Add "Remember Me" option for extended sessions
   - Implement role-based timeout durations
   - Add session analytics

---

## Related Documentation

- Frontend implementation: `components/auth/IdleLogoutGuard.tsx`
- Backend requirements: `BACKEND_AUTH0_INACTIVITY_IMPLEMENTATION.md`
- Auth0 setup: `BACKEND_AUTH0_IMPLEMENTATION.md`
- Implementation plan: `.cursor/plans/auth0_inactivity_auto-logout_*.plan.md`
