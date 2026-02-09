# Auth0 Post-Login Issues Fix

Two issues to resolve:
1. **Consent screen appearing** (confusing for users)
2. **Not staying logged in** after successful Auth0 callback (redirected to landing page)

---

## Issue 1: Remove Consent Screen

### Problem
Auth0 is showing a consent screen asking users to authorize your application. This is confusing for first-party applications.

### Solution: Configure Auth0 Application Settings

**In Auth0 Dashboard:**

1. Go to **Applications** → Your Application → **Settings**

2. Scroll down to **Advanced Settings** → **OAuth** tab

3. Find **Skip Consent for Verifiable First-Party Applications**
   - Toggle this **ON** ✅

4. Alternatively, if that option isn't available:
   - Go to **APIs** → Your Custom API (e.g., "Javelina API")
   - Under **Settings**, find **Allow Skipping User Consent**
   - Toggle this **ON** ✅

5. **Save Changes**

**Why this works:** Your application is first-party (you own both the app and the Auth0 tenant), so users shouldn't need to consent to sharing their own data with your own app.

---

## Issue 2: Session Not Persisting After Login

### Problem
After successful Auth0 login and redirect back to your app, you're not staying logged in. The landing page shows as if you're not authenticated.

### Root Cause
The `javelina_session` cookie is being set by the backend with `sameSite: "none"`, but in local development (HTTP), this requires `secure: true` which doesn't work over HTTP.

### Solution: Fix Session Cookie Settings in Backend

**File:** `routes/auth.ts` (in your backend repo)

**Find this code in `/auth/callback` handler:**

```typescript
res.cookie(env.session.cookieName, sessionToken, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "none",  // ← PROBLEM: Same issue as before
  maxAge: env.session.maxAge,
  path: "/",
});
```

**Replace with:**

```typescript
res.cookie(env.session.cookieName, sessionToken, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",  // ← FIX
  maxAge: env.session.maxAge,
  path: "/",
});
```

---

## Additional Backend Check: CORS Configuration

The session cookie must be sent with cross-origin requests. Verify your CORS configuration allows credentials.

**File:** Your main server file (e.g., `server.ts`, `index.ts`, `app.ts`)

**Ensure CORS is configured like this:**

```typescript
import cors from 'cors';

app.use(cors({
  origin: [
    'http://localhost:3000',  // Frontend URL
    'http://127.0.0.1:3000'   // Alternative localhost
  ],
  credentials: true,  // ← CRITICAL: Allows cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Frontend Check: Ensure Credentials are Included

Verify your frontend sends cookies with requests.

**File:** `lib/auth-store.ts` (in your frontend repo)

**Check the `initializeAuth` and `fetchProfile` functions use `credentials: 'include'`:**

```typescript
const response = await fetch(`${API_URL}/auth/me`, {
  credentials: 'include', // ← Should already be there
});
```

This should already be correct based on the code I saw, but verify it's there.

---

## Testing After Fixes

### 1. Clear Everything
```bash
# Clear browser cookies for localhost
# DevTools → Application → Cookies → Delete all for localhost:3000 and localhost:3001
```

### 2. Restart Backend
```bash
# Restart your Express backend server to apply cookie changes
```

### 3. Test Login Flow
1. Go to `http://localhost:3000`
2. Click "Login" or "Get Started"
3. **Should redirect to Auth0** (NO consent screen after Auth0 config change)
4. Log in with your Auth0 account
5. **Should redirect to `http://localhost:3000/`**
6. **Should show the authenticated dashboard** (Welcome to Javelina page)

### 4. Verify Cookies in Browser
After successful login, check DevTools → Application → Cookies → `http://localhost:3000`:

You should see:
- `javelina_session` cookie with your session token
- Cookie should have:
  - `SameSite`: `Lax` (in development)
  - `HttpOnly`: ✓
  - `Secure`: (empty in development)

### 5. Verify Session Persistence
1. Refresh the page (`Cmd+R` or `F5`)
2. **Should stay logged in** (not redirected to landing page)
3. Open a new tab to `http://localhost:3000`
4. **Should show authenticated dashboard**

---

## Expected Flow After Fixes

```
1. User clicks "Login" on landing page
   ↓
2. Backend /auth/login sets auth_state cookie (sameSite: lax)
   ↓
3. Redirect to Auth0 (NO CONSENT SCREEN)
   ↓
4. User logs in at Auth0
   ↓
5. Auth0 redirects to /auth/callback with code & state
   ↓
6. Backend validates state, exchanges code for tokens
   ↓
7. Backend creates user in database (if new)
   ↓
8. Backend sets javelina_session cookie (sameSite: lax)
   ↓
9. Backend redirects to http://localhost:3000/
   ↓
10. Frontend AuthProvider.initializeAuth() runs
    ↓
11. Calls /auth/me with credentials (sends javelina_session cookie)
    ↓
12. Backend validates session, returns user data
    ↓
13. Frontend sets isAuthenticated = true, user = {...}
    ↓
14. HomePage sees isAuthenticated = true
    ↓
15. Shows "Welcome to Javelina" dashboard ✅
```

---

## Debugging Tips

### If consent screen still appears:
- Double-check Auth0 API settings (Allow Skipping User Consent)
- Make sure you're using the correct Auth0 application (not a different one)
- Try clearing Auth0 session by logging out completely

### If session still doesn't persist:
1. Check backend logs for session cookie being set:
   ```
   [AUTH] Setting session cookie: javelina_session
   ```

2. Check browser console for auth initialization:
   ```
   [AUTH] Checking session with backend
   [AUTH] Session check response: 200
   [AUTH] Fetching profile from: http://localhost:3001/api/users/profile
   ```

3. Check if `/auth/me` returns 401 (cookie not sent):
   ```bash
   # In browser console after login:
   fetch('http://localhost:3001/auth/me', { credentials: 'include' })
     .then(r => r.json())
     .then(console.log)
   ```
   Should return: `{ userId: "...", email: "...", ... }`

4. Manually check cookies in DevTools:
   - Application tab → Cookies → localhost:3000
   - Should see `javelina_session` with a JWT token

---

## Summary of Backend Changes

**Both changes are in your backend `routes/auth.ts` file:**

1. **`/auth/login` handler** - Change auth_state cookie:
   ```typescript
   sameSite: env.nodeEnv === "production" ? "none" : "lax"
   ```

2. **`/auth/callback` handler** - Change session cookie:
   ```typescript
   sameSite: env.nodeEnv === "production" ? "none" : "lax"
   ```

These are THE SAME issue - cookies with `sameSite: "none"` don't work in local development (HTTP). Use `"lax"` for localhost.
