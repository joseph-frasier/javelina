# Express Backend Cookie Configuration Analysis

This document provides a comprehensive overview of the Express backend cookie settings for the `javelina_session` cookie and related authentication flow.

## Table of Contents
1. [Cookie Set After Auth0 Callback](#1-cookie-set-after-auth0-callback)
2. [Cookie Options Used](#2-cookie-options-used)
3. [Session Middleware Configuration](#3-session-middleware-configuration)
4. [Redirect URL to Next.js](#4-redirect-url-to-nextjs)
5. [Cookie Refresh Logic](#5-cookie-refresh-logic)
6. [Logout Cookie Clearing](#6-logout-cookie-clearing)

---

## 1. Cookie Set After Auth0 Callback

**Location:** `src/routes/auth.ts` (lines 226-237)

After Auth0 successfully validates the user and exchanges the authorization code for tokens, the Express backend creates a session cookie.

```typescript
// 5. Create session data
const sessionData = {
  userId: userId,
  auth0UserId: auth0UserId,
  email: email,
  name: name,
  emailVerified: emailVerified,
  loginTime: Date.now(),
  lastActivity: Date.now(),
};

// 6. Set session cookie (signed with SESSION_SECRET)
const sessionToken = jwt.sign(sessionData, env.session.secret, {
  expiresIn: "24h",
});

res.cookie(env.session.cookieName, sessionToken, {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: (env.nodeEnv === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: env.session.maxAge,
  path: "/",
});
```

**Key Points:**
- Cookie name: `javelina_session` (configured via `SESSION_COOKIE_NAME` in `.env`)
- Cookie value: JWT token containing user session data (userId, email, name, emailVerified, loginTime, lastActivity)
- JWT expires in 24 hours
- Cookie is set on the Express backend domain after Auth0 callback

---

## 2. Cookie Options Used

### Production Settings (`NODE_ENV === "production"`)

```typescript
{
  httpOnly: true,           // Prevents JavaScript access (XSS protection)
  secure: true,             // HTTPS only
  sameSite: "none",         // Allows cross-site requests (required for cross-domain)
  maxAge: 86400000,         // 24 hours in milliseconds (configurable via SESSION_MAX_AGE)
  path: "/"                 // Cookie available on all paths
}
```

### Development Settings (`NODE_ENV !== "production"`)

```typescript
{
  httpOnly: true,           // Prevents JavaScript access
  secure: false,            // HTTP allowed (localhost)
  sameSite: "lax",          // Prevents CSRF while allowing same-site navigation
  maxAge: 86400000,         // 24 hours in milliseconds
  path: "/"                 // Cookie available on all paths
}
```

### Configuration Source

**File:** `src/config/env.ts` (lines 102-107)

```typescript
session: {
  secret: process.env.SESSION_SECRET!,
  cookieName: process.env.SESSION_COOKIE_NAME || "javelina_session",
  maxAge: parseInt(process.env.SESSION_MAX_AGE || "86400000", 10),
  inactivityTimeout: parseInt(process.env.SESSION_INACTIVITY_TIMEOUT || "3600000", 10),
},
```

### Environment Variables

From `.env` file (lines 1-41):

```env
SESSION_SECRET=your-secret-here
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=86400000              # 24 hours
SESSION_INACTIVITY_TIMEOUT=3600000    # 1 hour
```

**Important Note:** The `domain` attribute is **NOT** explicitly set. This means:
- The cookie is bound to the exact domain that sets it (e.g., `api.javelina.io`)
- The cookie will NOT be shared with subdomains or other domains
- Cross-domain cookie access requires `sameSite: "none"` and `secure: true` in production

---

## 3. Session Middleware Configuration

### Express Session Middleware

**File:** `src/index.ts` (lines 62-63)

```typescript
// Cookie parser middleware (for session cookies)
app.use(cookieParser());
```

The backend uses `cookie-parser` middleware (not `express-session`). This is a **stateless JWT session** approach:
- No session store (Redis, memory, etc.)
- Session data is encoded in the JWT itself
- JWT is signed with `SESSION_SECRET`
- JWT verification happens in authentication middleware

### Authentication Middleware

**File:** `src/middleware/auth.ts` (lines 23-159)

The main authentication middleware that reads and validates the `javelina_session` cookie:

```typescript
export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Skip authentication for OPTIONS requests (CORS preflight)
    if (req.method === "OPTIONS") {
      return next();
    }

    // ─── Admin JWT check (separate auth path, runs first) ───
    const adminToken =
      req.cookies["__Host-admin_session"] ||
      req.cookies["admin_session"] ||
      extractBearerToken(req);

    if (adminToken && env.adminJwtSecret) {
      try {
        const decoded = jwt.verify(adminToken, env.adminJwtSecret, {
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
            name: decoded.name || undefined,
            emailVerified: true,
            isAdminSession: true,
          };
          return next();
        }
      } catch (adminJwtError) {
        // Admin JWT invalid/expired — fall through to regular session check
      }
    }

    // ─── Regular Auth0 session check ───
    const sessionToken = req.cookies[env.session.cookieName];

    if (!sessionToken) {
      throw new AuthError("Not authenticated");
    }

    // Verify JWT session token
    const decoded = jwt.verify(sessionToken, env.session.secret) as any;
    
    // Check if last activity was within the configured timeout
    const inactivityTimeout = env.session.inactivityTimeout;
    const now = Date.now();
    const lastActivity = decoded.lastActivity || decoded.loginTime;
    
    if (now - lastActivity > inactivityTimeout) {
      console.log('[Auth] Session expired due to inactivity');
      res.status(401).json({ 
        error: 'Session expired',
        reason: 'inactivity',
        message: 'Your session expired due to inactivity. Please log in again.'
      });
      return;
    }

    // Fetch user role from Supabase profiles
    const { data: profile, error } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", decoded.userId)
      .single();

    if (error || !profile) {
      throw new AuthError("User profile not found");
    }
    
    // Update last activity time
    const updatedSession = {
      ...decoded,
      lastActivity: now
    };
    
    // Remove old JWT metadata to avoid conflicts
    delete updatedSession.exp;
    delete updatedSession.iat;
    
    // Refresh session cookie with updated lastActivity
    const newToken = jwt.sign(updatedSession, env.session.secret, {
      expiresIn: '24h'
    });
    
    // *** Cookie refresh with same options ***
    res.cookie(env.session.cookieName, newToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as "none" | "lax",
      maxAge: env.session.maxAge,
      path: '/'
    });

    // Attach user to request object
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      auth0UserId: decoded.auth0UserId,
      emailVerified: decoded.emailVerified,
      role: profile.role,
    };

    next();
  } catch (error) {
    if (error instanceof AuthError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthError("Invalid session"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthError("Session expired"));
    } else {
      console.error("Unexpected authentication error:", error);
      next(new AuthError("Authentication failed"));
    }
  }
};
```

**Key Features:**
1. **Dual authentication path**: Checks admin JWT first, then falls back to Auth0 session
2. **Inactivity timeout**: Validates that user was active within the last hour (configurable)
3. **Session refresh**: Updates `lastActivity` timestamp on every authenticated request
4. **Cookie refresh**: Sets a new JWT cookie with updated `lastActivity` on every request
5. **No domain attribute**: Cookie options do not include `domain` attribute

---

## 4. Redirect URL to Next.js

**Location:** `src/routes/auth.ts` (lines 243-246)

After setting the `javelina_session` cookie, the Express backend redirects to the Next.js frontend session relay endpoint:

```typescript
// 7. Redirect to frontend session relay to set cookie on frontend domain
const relayUrl = new URL('/api/auth/session', env.frontendUrls[0]);
relayUrl.searchParams.set('token', sessionToken);
res.redirect(relayUrl.toString());
```

**Example URLs:**
- Development: `http://localhost:3000/api/auth/session?token=eyJhbG...`
- Production: `https://app.javelina.io/api/auth/session?token=eyJhbG...`

**Purpose:**
This redirect is part of a "session relay" pattern where:
1. Express backend (e.g., `api.javelina.io`) sets `javelina_session` cookie on its domain
2. User is redirected to Next.js frontend (e.g., `app.javelina.io`) with the session token in query string
3. Next.js `/api/auth/session` route can optionally set a duplicate cookie on the frontend domain
4. This allows both backend and frontend to access session data

**Environment Variable:**
```env
FRONTEND_URL=https://app.javelina.io
```

From `src/config/env.ts` (lines 79-83):
```typescript
// Parse FRONTEND_URL as comma-separated list of allowed origins
const frontendUrls = (process.env.FRONTEND_URL || "http://localhost:3000")
  .split(",")
  .map((url) => url.trim())
  .filter((url) => url.length > 0);
```

---

## 5. Cookie Refresh Logic

### When Cookies Are Refreshed

**Location:** `src/middleware/auth.ts` (lines 112-133)

On **every authenticated request**, the middleware:
1. Verifies the JWT
2. Checks inactivity timeout
3. Updates `lastActivity` timestamp
4. Signs a new JWT
5. Sets a new cookie with the same options

```typescript
// Update last activity time
const updatedSession = {
  ...decoded,
  lastActivity: now
};

// Remove old JWT metadata to avoid conflicts
delete updatedSession.exp;
delete updatedSession.iat;

// Refresh session cookie with updated lastActivity
const newToken = jwt.sign(updatedSession, env.session.secret, {
  expiresIn: '24h'
});

res.cookie(env.session.cookieName, newToken, {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as "none" | "lax",
  maxAge: env.session.maxAge,
  path: '/'
});
```

**Also in:** `src/routes/auth.ts` (lines 402-423) in the `authenticateSession` function

### Inactivity Timeout

**Default:** 1 hour (3600000 milliseconds)

If `lastActivity` is older than 1 hour, the session is rejected with:
```json
{
  "error": "Session expired",
  "reason": "inactivity",
  "message": "Your session expired due to inactivity. Please log in again."
}
```

---

## 6. Logout Cookie Clearing

### GET /auth/logout (Recommended)

**Location:** `src/routes/auth.ts` (lines 263-301)

```typescript
router.get("/logout", (req: Request, res: Response) => {
  try {
    // Clear the session cookie — browser is directly on this domain so this works
    const cookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" as const : "lax" as const,
      path: "/",
    };

    res.clearCookie(env.session.cookieName, cookieOptions);

    // Also set an expired cookie as a belt-and-suspenders fallback
    res.cookie(env.session.cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    console.log("[Auth] GET /auth/logout — session cookie cleared:", env.session.cookieName);

    // Redirect browser to Auth0 logout, which will destroy Auth0's session
    // and then redirect to the frontend landing page via returnTo
    const auth0LogoutUrl =
      `https://${env.auth0.domain}/v2/logout?` +
      new URLSearchParams({
        client_id: env.auth0.clientId,
        returnTo: `${env.frontendUrls[0]}/`,
      }).toString();

    console.log("[Auth] Redirecting to Auth0 logout, returnTo:", `${env.frontendUrls[0]}/`);

    res.redirect(auth0LogoutUrl);
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect(`${env.frontendUrls[0]}/`);
  }
});
```

**Cookie clearing strategy:**
1. Call `res.clearCookie()` with **exact same options** used when setting the cookie
2. Also set an expired cookie as a fallback (belt-and-suspenders)
3. Redirect to Auth0 logout to clear Auth0 session
4. Auth0 redirects back to frontend landing page

**Important:** Cookie options in `clearCookie()` **must match exactly** the options used in `res.cookie()` for the clear to work. This includes:
- `httpOnly: true`
- `secure: true` (in production)
- `sameSite: "none"` (in production)
- `path: "/"`
- **No `domain` attribute** (just like when setting the cookie)

---

## Summary of Findings

### Cookie Configuration
- **Name:** `javelina_session`
- **Value:** JWT token with session data
- **httpOnly:** `true` (always)
- **secure:** `true` in production, `false` in development
- **sameSite:** `"none"` in production, `"lax"` in development
- **maxAge:** 86400000 ms (24 hours, configurable)
- **path:** `/` (all paths)
- **domain:** **Not set** (defaults to exact domain that set the cookie)

### Cross-Domain Implications

The **lack of a `domain` attribute** means:
- Cookie set by `api.javelina.io` is **only** sent to `api.javelina.io`
- Cookie is **not** shared with `app.javelina.io` automatically
- `sameSite: "none"` allows the cookie to be sent in cross-site requests (e.g., when frontend on `app.javelina.io` makes fetch to `api.javelina.io`)
- The browser must include the cookie in requests via `credentials: "include"` in fetch options

### Session Relay Pattern

The backend uses a "session relay" pattern:
1. Auth0 callback → Express sets `javelina_session` cookie on backend domain
2. Express redirects to Next.js `/api/auth/session?token=...`
3. Next.js can optionally mirror the cookie on frontend domain
4. This allows both domains to independently validate the session

### Potential Cookie Issues

If cookies are not being sent cross-domain, check:
1. **Frontend fetch calls include:** `credentials: "include"`
2. **CORS headers allow credentials:** `Access-Control-Allow-Credentials: true`
3. **CORS origin is exact match:** No wildcards when using credentials
4. **HTTPS in production:** `secure: true` requires HTTPS
5. **sameSite: "none" in production:** Required for cross-site cookies with `secure: true`
6. **Browser compatibility:** Some browsers are strict about `sameSite: "none"` + `secure: true`

---

## Recommendations

Based on this analysis, here are the key areas to investigate for cross-domain cookie issues:

1. **Verify CORS configuration** allows credentials and matches the frontend origin exactly
2. **Verify frontend fetch calls** include `credentials: "include"`
3. **Verify both domains use HTTPS** in production (required for `secure: true` + `sameSite: "none"`)
4. **Consider adding explicit `domain` attribute** if you want the cookie shared across subdomains (e.g., `.javelina.io`)
5. **Test cookie clearing** matches exact same options as cookie setting
6. **Check browser DevTools** for cookie warnings or rejections

---

## Related Files

- **Cookie setting:** `src/routes/auth.ts` (lines 231-237)
- **Cookie validation:** `src/middleware/auth.ts` (lines 23-159)
- **Cookie refresh:** `src/middleware/auth.ts` (lines 112-133), `src/routes/auth.ts` (lines 402-423)
- **Cookie clearing:** `src/routes/auth.ts` (lines 263-301, 312-363)
- **Configuration:** `src/config/env.ts` (lines 102-107)
- **Express setup:** `src/index.ts` (lines 1-153)
