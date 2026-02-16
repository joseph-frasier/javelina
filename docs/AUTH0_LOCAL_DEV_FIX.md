# Auth0 Local Development Cookie Fix

## Problem
The "Invalid state parameter" error occurs during Auth0 login because the `auth_state` cookie is not being received in the callback handler.

**Root Cause:** Using `sameSite: "none"` with `secure: false` in local development. Modern browsers reject cookies with `sameSite: "none"` unless `secure: true` is also set.

## Solution
Use `sameSite: "lax"` for local development (HTTP) and `sameSite: "none"` for production (HTTPS).

---

## Backend Changes Required

### File: `routes/auth.js` or `routes/auth.ts`

### 1. Update the `/auth/login` handler

**Find this code:**
```typescript
res.cookie("auth_state", state, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "none",  // ← PROBLEM: This line
  maxAge: 600000,
  path: "/auth",
});

res.cookie("auth_code_verifier", codeVerifier, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: "none",  // ← PROBLEM: This line
  maxAge: 600000,
  path: "/auth",
});
```

**Replace with:**
```typescript
res.cookie("auth_state", state, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",  // ← FIX
  maxAge: 600000,
  path: "/auth",
});

res.cookie("auth_code_verifier", codeVerifier, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",  // ← FIX
  maxAge: 600000,
  path: "/auth",
});
```

---

## Why This Works

### Local Development (HTTP - localhost)
- `secure: false`
- `sameSite: "lax"`
- ✅ Browsers accept this combination
- ✅ Cookies work with OAuth redirects from Auth0
- ✅ Protected against CSRF attacks

### Production (HTTPS)
- `secure: true`
- `sameSite: "none"`
- ✅ Browsers accept this combination (requires secure flag)
- ✅ Allows cross-site requests if needed
- ✅ Works with strict security requirements

---

## Testing After Fix

1. **Restart your backend server** to apply changes

2. **Clear browser cookies** for localhost:
   - Chrome: DevTools → Application → Cookies → localhost → Clear all
   - Or use Incognito/Private mode

3. **Try logging in again:**
   - Go to http://localhost:3000
   - Click login
   - Should redirect to Auth0
   - Should successfully redirect back and log you in

4. **Verify cookies are set:**
   - Before Auth0 redirect: Check for `auth_state` cookie in DevTools
   - After successful login: Check for `javelina_session` cookie

---

## Expected Behavior

**Before fix:**
```
GET /auth/login → Sets cookies (browser rejects them)
Auth0 redirect → GET /auth/callback (no cookies received)
Result: "Invalid state parameter" error
```

**After fix:**
```
GET /auth/login → Sets cookies (browser accepts them) ✅
Auth0 redirect → GET /auth/callback (cookies received) ✅
Result: Successful login ✅
```

---

## Additional Notes

- **No other changes needed** - This is the only issue causing the error
- **Session cookie is already correct** - It uses `sameSite: "none"` which is fine because it's set AFTER successful authentication
- **Production will work as-is** - The conditional logic handles HTTPS automatically

---

## Rollback (If Needed)

If this change causes any issues, simply revert to the original values. However, this is the standard approach for OAuth cookie handling across environments.
