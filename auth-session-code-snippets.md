# Auth Session Code Snippets

Reference document for authentication middleware and route handlers. Auth routes are mounted at `/auth` (e.g. `/auth/me`, `/auth/callback`, `/auth/logout`).

---

## 1. `authenticateSession` middleware

**Location:** `src/routes/auth.ts`

Used by `/auth/me`, `/auth/session-status`, `/auth/resend-verification`, `/auth/refresh-verification-status`. This is the middleware the frontend hits during `initializeAuth` when calling `/auth/me`.

```typescript
/**
 * Middleware: Authenticate session
 */
export function authenticateSession(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const sessionToken = req.cookies[env.session.cookieName];

  if (!sessionToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const decoded = jwt.verify(sessionToken, env.session.secret) as any;
    
    // Check if last activity was within the configured timeout
    const inactivityTimeout = env.session.inactivityTimeout;
    const now = Date.now();
    const lastActivity = decoded.lastActivity || decoded.loginTime;
    
    if (now - lastActivity > inactivityTimeout) {
      console.log('[Auth] Session expired due to inactivity');
      console.log('[Auth] Last activity:', new Date(lastActivity).toISOString());
      console.log('[Auth] Current time:', new Date(now).toISOString());
      console.log('[Auth] Inactive for:', Math.round((now - lastActivity) / 60000), 'minutes');
      
      res.status(401).json({ 
        error: 'Session expired',
        reason: 'inactivity',
        message: 'Your session expired due to inactivity. Please log in again.'
      });
      return;
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
    
    res.cookie(env.session.cookieName, newToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: (env.nodeEnv === 'production' ? 'none' : 'lax') as "none" | "lax",
      maxAge: env.session.maxAge,
      path: '/'
    });
    
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      auth0UserId: decoded.auth0UserId,
      emailVerified: decoded.emailVerified,
    };
    next();
  } catch (error) {
    console.error("Session verification failed:", error);
    res.status(401).json({ error: "Invalid session" });
    return;
  }
}
```

**Details:**
- Includes `lastActivity` check against `env.session.inactivityTimeout`
- Verifies JWT with `jwt.verify(sessionToken, env.session.secret)`
- Re-signs and refreshes the session cookie with updated `lastActivity` on each request
- Falls back to `decoded.loginTime` if `lastActivity` is missing (legacy tokens)

---

## 2. `/auth/callback` — sessionData creation and JWT signing

**Location:** `src/routes/auth.ts`

Section where `sessionData` is created and the JWT is signed immediately after Auth0 login.

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

    // Clear temporary auth state cookies
    res.clearCookie("auth_state", { path: "/auth" });
    res.clearCookie("auth_code_verifier", { path: "/auth" });

    // 7. Redirect to frontend session relay to set cookie on frontend domain
    const relayUrl = new URL('/api/auth/session', env.frontendUrls[0]);
    relayUrl.searchParams.set('token', sessionToken);
    res.redirect(relayUrl.toString());
```

**Details:**
- `lastActivity: Date.now()` is included in `sessionData` at login
- JWT is signed with `env.session.secret`, 24h expiry
- Cookie is set on backend domain, then user is redirected to frontend `/api/auth/session?token=<jwt>` for cross-domain cookie setup

---

## 3. `/auth/logout` route handlers

**Location:** `src/routes/auth.ts`

### GET /auth/logout (browser redirect flow)

```typescript
router.get("/logout", (req: Request, res: Response) => {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" as const : "lax" as const,
      path: "/",
    };

    res.clearCookie(env.session.cookieName, cookieOptions);

    res.cookie(env.session.cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    const auth0LogoutUrl =
      `https://${env.auth0.domain}/v2/logout?` +
      new URLSearchParams({
        client_id: env.auth0.clientId,
        returnTo: `${env.frontendUrls[0]}/`,
      }).toString();

    res.redirect(auth0LogoutUrl);
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect(`${env.frontendUrls[0]}/`);
  }
});
```

### POST /auth/logout (API-style, returns JSON)

```typescript
router.post("/logout", (req: Request, res: Response) => {
  try {
    const sessionToken = req.cookies[env.session.cookieName];
    if (!sessionToken) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    try {
      jwt.verify(sessionToken, env.session.secret);
    } catch {
      res.status(401).json({ error: "Invalid session" });
      return;
    }

    const cookieOptions = {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" as const : "lax" as const,
      path: "/",
    };

    res.clearCookie(env.session.cookieName, cookieOptions);
    res.cookie(env.session.cookieName, "", {
      ...cookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    const auth0LogoutUrl =
      `https://${env.auth0.domain}/v2/logout?` +
      new URLSearchParams({
        client_id: env.auth0.clientId,
        returnTo: `${env.frontendUrls[0]}/`,
      }).toString();

    res.json({
      success: true,
      redirectUrl: auth0LogoutUrl,
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ error: "Failed to logout" });
  }
});
```

**Details:**
- POST response format: `{ success: true, redirectUrl: auth0LogoutUrl }`
- Cookie clearing: `res.clearCookie()` plus `res.cookie(..., "", { maxAge: 0, expires: new Date(0) })`

---

## 4. `/auth/me` route handler

**Location:** `src/routes/auth.ts`

Endpoint used by the frontend during `initializeAuth` to check session validity.

```typescript
/**
 * GET /auth/me
 * Returns current user session info
 */
router.get("/me", authenticateSession, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Fetch fresh data from Supabase
    const { data: user, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, name, display_name, avatar_url, role, superadmin, email_verified")
      .eq("id", req.user!.id)
      .single();

    if (error || !user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({ user });
  } catch (error) {
    console.error("Error in /me:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

**Details:**
- Uses `authenticateSession` middleware
- On success, returns `{ user }` with profile data from Supabase

---

## Related: `authenticate` middleware (API routes)

**Location:** `src/middleware/auth.ts`

Used by most API routes (e.g. `/api/organizations`, `/api/zones`). Similar to `authenticateSession` but also handles admin JWT and fetches `role` from Supabase. Includes the same `lastActivity` check and session cookie refresh logic.
