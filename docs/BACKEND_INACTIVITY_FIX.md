# Backend Inactivity Timeout Fix

Required and recommended backend changes to align with the updated inactivity architecture.

## Architecture

The frontend and backend serve different roles in inactivity enforcement:

- **Frontend (60 min)** — Authority on user activity. Monitors real human interaction (mouse, keyboard, scroll, touch) via DOM events. When 60 minutes of inactivity pass, the frontend logs the user out via `/api/logout` -> Express `/auth/logout` -> Auth0 logout.
- **Backend (75 min)** — Security safety net. Cannot measure human activity; only sees API calls. Its timeout is intentionally wider than the frontend's so it only activates when the frontend timer failed (laptop sleep/wake, background tab throttling, etc.).

Under normal operation the frontend always logs the user out first. The backend only kicks in for edge cases.

## Current State (Verified)

The following are already implemented correctly and require no changes:

- `/auth/callback` includes `lastActivity: Date.now()` in session data
- `authenticateSession` middleware checks `lastActivity`, returns `{ reason: 'inactivity' }` on 401
- `authenticateSession` re-signs the JWT with updated `lastActivity` on each valid request
- `authenticate` middleware (API routes in `src/middleware/auth.ts`) has the same `lastActivity` check
- `/auth/logout` POST returns `{ success: true, redirectUrl }` and clears cookies
- `/auth/me` uses `authenticateSession` middleware

## Required Change

### Increase `SESSION_INACTIVITY_TIMEOUT` to 75 minutes

**File:** `.env` (or environment variable configuration)

```diff
- SESSION_INACTIVITY_TIMEOUT=3600000
+ SESSION_INACTIVITY_TIMEOUT=4500000
```

**Why:** The backend timeout is currently 60 minutes — the same as the frontend's DOM-based idle timer. Because the backend only sees API calls (not human interaction), a user who is actively reading a page for 61 minutes without triggering an API call will be rejected by the backend even though they are genuinely active. Increasing the backend timeout to 75 minutes (15-minute buffer) ensures the frontend timer fires first under normal conditions. The backend only rejects sessions when the frontend truly failed to log the user out.

**Where `env.session.inactivityTimeout` is read:** The `authenticateSession` middleware in `src/routes/auth.ts` and the `authenticate` middleware in `src/middleware/auth.ts` both read this value. No code changes needed — just update the environment variable.

## Recommended Improvements

### 1. Add defensive check for missing `lastActivity`

**File:** `src/routes/auth.ts` — `authenticateSession` function

The current code uses `decoded.lastActivity || decoded.loginTime` as a fallback. If both are somehow missing (corrupted token, very old session), `now - undefined` evaluates to `NaN`, and `NaN > inactivityTimeout` is `false` — so the session silently passes the check. Add an explicit guard:

```typescript
const lastActivity = decoded.lastActivity || decoded.loginTime;

if (!lastActivity) {
  console.error('[Auth] Session missing both lastActivity and loginTime, rejecting');
  res.status(401).json({ error: 'Invalid session', reason: 'missing_activity' });
  return;
}

if (now - lastActivity > inactivityTimeout) {
  // ... existing inactivity rejection
}
```

Apply the same change to the `authenticate` middleware in `src/middleware/auth.ts`.

### 2. Throttled write to `profiles.last_activity` in the database

**File:** `src/routes/auth.ts` — `authenticateSession` function (and/or `src/middleware/auth.ts` — `authenticate` function)

The `profiles.last_activity` column exists in the database but is never written to after the initial migration backfill. Updating it periodically makes it useful for admin dashboards and cleanup jobs.

Add a non-blocking, throttled write after the session is validated. Fire-and-forget to avoid adding latency to every request:

```typescript
// After validating and refreshing the session (before calling next()):

// Throttle DB writes to once per 5 minutes per user
const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;
const lastDbWrite = decoded.lastDbActivityWrite || 0;

if (now - lastDbWrite > ACTIVITY_WRITE_INTERVAL_MS) {
  // Fire-and-forget — don't block the request
  supabaseAdmin
    .from('profiles')
    .update({ last_activity: new Date(now).toISOString() })
    .eq('id', decoded.userId)
    .then(() => {})
    .catch((err: Error) => console.error('[Auth] Failed to update last_activity:', err));

  // Track when we last wrote so we can throttle
  updatedSession.lastDbActivityWrite = now;
}
```

This adds `lastDbActivityWrite` to the JWT payload to track the throttle window without needing an external cache. The DB write is non-blocking and has no effect on request latency.

## Deployment

1. Update `SESSION_INACTIVITY_TIMEOUT` to `4500000` in environment config
2. (Optional) Add defensive `!lastActivity` check to both middleware functions
3. (Optional) Add throttled `profiles.last_activity` write
4. Deploy backend
5. No frontend deployment needed for the timeout change — frontend changes are independent

## Testing

After deploying, verify:

- [ ] User reading a page for 65 minutes without API calls is NOT rejected by the backend (75-min timeout gives buffer)
- [ ] Frontend idle timer still fires at 60 minutes and logs user out cleanly
- [ ] If frontend timer is bypassed (e.g., manually disable it in DevTools), backend rejects at 75 minutes with `{ reason: 'inactivity' }`
- [ ] Frontend catches the 401 inactivity response and triggers clean logout (redirects to landing page)
- [ ] JWT decoding after login shows `lastActivity` field present
- [ ] (If defensive check added) Sessions with missing `lastActivity` and `loginTime` are rejected
- [ ] (If DB write added) `profiles.last_activity` column updates within ~5 minutes of user activity
