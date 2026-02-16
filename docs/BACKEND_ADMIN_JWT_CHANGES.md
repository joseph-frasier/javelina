# Backend Changes: Admin Panel JWT Authentication

**Date:** February 16, 2026  
**Priority:** High — admin panel is currently non-functional  
**Type:** Bandaid fix (long-term plan is to migrate admin panel to Auth0)

## Problem

The admin panel login authenticates via Supabase Auth and sets an `admin_session` cookie. But all admin data endpoints live on the Express backend, which only accepts `javelina_session` cookies (Auth0). The Express backend rejects every admin API call with **403 "This endpoint requires superuser access"**.

## Solution

The frontend now signs the `admin_session` cookie as a **JWT** (instead of an opaque UUID). The Express backend needs to accept this JWT as an alternative authentication method alongside the existing `javelina_session` cookie.

Both systems share a secret (`ADMIN_JWT_SECRET`) so the Express backend can verify the JWT signature and trust the claims inside it.

## JWT Specification

| Field | Value |
|---|---|
| Algorithm | HS256 |
| Issuer | `javelina-admin` |
| Expiry | 1 hour |
| Secret env var | `ADMIN_JWT_SECRET` |

**Payload claims:**

```json
{
  "userId": "uuid-from-profiles-table",
  "email": "admin@example.com",
  "name": "Admin Name",
  "isSuperAdmin": true,
  "iss": "javelina-admin",
  "iat": 1708099200,
  "exp": 1708102800
}
```

**Cookie names (check both):**

- Development: `admin_session`
- Production: `__Host-admin_session`

---

## Required Changes

### 1. Add Environment Variable

Add `ADMIN_JWT_SECRET` to all backend environments. The value **must match** the frontend value exactly.

**Dev/staging:**

```
ADMIN_JWT_SECRET=
```

**Production:**

Generate a separate production secret and set the same value in both frontend and backend:

```bash
openssl rand -hex 32
```

### 2. Update Auth Middleware

In the middleware that parses `javelina_session` and sets `req.user` (likely `src/middleware/auth.ts` or similar), add a fallback check for the admin JWT cookie **after** the existing `javelina_session` logic.

```typescript
import jwt from "jsonwebtoken";

// ─── Existing code ───
// ... your existing javelina_session parsing that sets req.user ...

// ─── Add this block after the existing session check ───
// Fallback: check for admin panel JWT cookie
if (!req.user) {
  const adminToken =
    req.cookies["__Host-admin_session"] || req.cookies["admin_session"];

  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, process.env.ADMIN_JWT_SECRET!, {
        issuer: "javelina-admin",
        algorithms: ["HS256"],
      }) as {
        userId: string;
        email: string;
        name: string | null;
        isSuperAdmin: boolean;
      };

      if (decoded.isSuperAdmin === true && decoded.userId) {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          isAdminSession: true, // flag for downstream code if needed
        };
      }
    } catch (err) {
      // Invalid or expired admin token — ignore, request continues as unauthenticated
    }
  }
}
```

**Why this works:** Once `req.user.id` is set from the admin JWT, the existing `isSuperAdmin()` function in controllers (which queries `profiles.superadmin` by `req.user.id`) will pass, and all admin endpoints will work as expected.

### 3. Verify CORS Configuration

The admin cookie is set by the Next.js frontend (`app.javelina.cloud`) and sent cross-origin to the Express backend (`javelina-api-backend.vercel.app`). Ensure:

- CORS `origin` includes the frontend domain
- CORS `credentials: true` is set
- `cookie-parser` middleware is active and parses `admin_session` / `__Host-admin_session`

This should already be configured correctly since `javelina_session` uses the same cross-origin cookie pattern.

### 4. Verify `cookie-parser` Reads Both Cookies

The `__Host-admin_session` cookie uses the `__Host-` prefix which requires:

- `Secure` flag (HTTPS only)
- `Path=/`
- No `Domain` attribute

`cookie-parser` should read it without issues, but verify in your production logs that the cookie arrives in `req.cookies`.

---

## Testing Checklist

- [ ] `ADMIN_JWT_SECRET` env var is set in backend (same value as frontend)
- [ ] Auth middleware falls through to admin JWT check when no `javelina_session` exists
- [ ] Superadmin can log in at `/admin/login` with Supabase Auth credentials
- [ ] Admin dashboard loads data (no 403 errors)
- [ ] Admin organizations page shows real data
- [ ] Admin users page shows real data
- [ ] Admin audit logs page shows real data
- [ ] Admin discount codes page shows real data
- [ ] Invalid/expired admin JWT is rejected (returns 401/403)
- [ ] Non-superadmin user cannot forge admin access (even with valid JWT format, `isSuperAdmin()` DB check still runs)
- [ ] Regular Auth0 users are unaffected (their `javelina_session` flow still works)

---

## Security Notes

1. **Double verification:** Even though the JWT claims `isSuperAdmin: true`, the backend controllers still query `profiles.superadmin` from the database on every admin request. The JWT claim is not solely trusted.

2. **Short-lived tokens:** Admin JWTs expire after 1 hour (vs 24 hours for regular sessions). Superadmins must re-authenticate after expiry.

3. **Shared secret rotation:** If `ADMIN_JWT_SECRET` is compromised, rotate it in both frontend and backend simultaneously. All active admin sessions will be invalidated.

4. **This is temporary:** The long-term plan is to migrate the admin panel to Auth0, eliminating the dual-auth approach entirely.

---

## Files Changed (Frontend)

| File | Change |
|---|---|
| `lib/admin-auth.ts` | Replaced in-memory UUID session store with JWT signing/verification using `jose` library |
| `package.json` | Added `jose` dependency |
| `.env.local` | Added `ADMIN_JWT_SECRET` |
| `.env.dev` | Added `ADMIN_JWT_SECRET` |
| `.env.production` | Added `ADMIN_JWT_SECRET` placeholder |
| `.env.local.example` | Added `ADMIN_JWT_SECRET` template |
