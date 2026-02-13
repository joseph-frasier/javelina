# Auth0 Migration - Phase 1 Implementation Plan
## Backend-for-Frontend (BFF) Pattern

**Document Version:** 2.0 (Revised - Accurate to Existing Architecture)  
**Created:** January 23, 2026  
**Revised:** January 23, 2026  
**Phase Scope:** LOGIN + LOGOUT only

---

## 🎯 EXECUTIVE SUMMARY

### What You Already Have ✅
- **Full BFF architecture** - All data access goes through Express API (port 3001)
- **Centralized API client** - `lib/api-client.ts` handles all Express communication
- **JWT token auth** - Frontend sends Supabase JWT to Express in `Authorization` header
- **Auth middleware** - Express validates Supabase JWT tokens
- **All API routes** - zones, DNS records, orgs, billing all use Express API

### What Needs to Change (Phase 1)
**Auth layer only:**
1. Replace Supabase Auth → Auth0 (identity provider)
2. Replace JWT tokens → Session cookies (auth mechanism)
3. Add 4 Express auth endpoints: `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me`
4. Update 5 frontend files to call Express instead of Supabase Auth
5. Update Express auth middleware to validate cookies instead of JWT

**Everything else stays the same** - Your Express API routes, data fetching, components, etc. don't change.

---

## Overview

This plan migrates Javelina from Supabase Auth to Auth0 using your **existing BFF architecture** where:
- **Auth0** becomes the identity provider (replacing Supabase Auth)
- **Express.js backend** handles OAuth flows, token validation, and session management
- **Frontend** (Next.js) makes API calls with httpOnly cookies for session state
- **No frontend Auth0 SDK** - all auth logic is server-side

### Current Architecture (Already BFF ✅)
```
Frontend (Next.js)
    │
    ├─ Auth: Supabase Auth (direct) ❌
    │  └─ Gets JWT token
    │
    └─ Data: Express API ✅
       └─ Sends JWT token in Authorization header
       └─ All zones, DNS records, orgs, billing go through Express
```

### After Phase 1 (Full BFF ✅)
```
Frontend (Next.js)
    │
    └─ Everything: Express API ✅
       ├─ Auth: /auth/* endpoints (Auth0)
       │  └─ Session cookie (httpOnly)
       │
       └─ Data: /api/* endpoints
          └─ Uses same session cookie
```

---

## Phase 1 Scope

### ✅ IN SCOPE
- [ ] **Replace** Supabase Auth calls with Express `/auth/*` endpoints in frontend
- [ ] **Add** 4 new Express auth endpoints: `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me`
- [ ] **Replace** Supabase JWT token auth with session cookie auth
- [ ] **Update** Express authentication middleware (validate cookie instead of JWT)
- [ ] **Update** `api-client.ts` (remove `getAuthToken()`, add `credentials: 'include'`)
- [ ] **Update** `middleware.ts` (check session cookie instead of Supabase session)
- [ ] **Update** `AuthProvider` component (remove Supabase auth listener)
- [ ] **Add** `auth0_user_id` column to profiles table
- [ ] **All existing Express API routes stay the same** (just use new auth middleware)

### ❌ OUT OF SCOPE (Phase 2+)
- Password reset / forgot password flows
- Email verification enforcement
- MFA management UI
- Account linking (Google/GitHub to existing account)
- User migration from Supabase Auth to Auth0
- Admin authentication (keep existing admin auth for now)
- Token refresh flows (Phase 1 uses long-lived sessions)

---

## 1. Auth0 Dashboard Setup (Development Environment)

### Application Configuration

**Application Type:** Regular Web Application  
*(Auth0's "Regular Web Application" type is designed for server-side apps using Authorization Code Flow with PKCE or standard Authorization Code Flow - perfect for our BFF pattern)*

### Setup Steps

1. **Create Application**
   - Go to Auth0 Dashboard → Applications → Create Application
   - Name: `Javelina Dev` (or `Javelina Backend`)
   - Type: **Regular Web Application**
   - Click Create

2. **Configure URLs**
   - **Allowed Callback URLs:**
     ```
     http://localhost:3000/api/auth/callback
     http://localhost:3001/auth/callback
     ```
     *(Note: If Express API runs on separate port 3001, use that. If Next.js proxies to Express, use Next.js port)*
   
   - **Allowed Logout URLs:**
     ```
     http://localhost:3000/login
     http://localhost:3001/logout-redirect
     ```
   
   - **Allowed Web Origins:** (for CORS if needed)
     ```
     http://localhost:3000
     ```

3. **Enable Connections**
   - Under "Connections" tab, enable:
     - ✅ Username-Password-Authentication (email/password)
     - ✅ Google OAuth (configure with Google Cloud Console credentials)
     - ✅ GitHub OAuth (configure with GitHub OAuth App)

4. **Application Settings (Required Values)**
   - **Domain:** e.g., `dev-abc123.us.auth0.com`
   - **Client ID:** e.g., `xxxxxxxxxxx`
   - **Client Secret:** e.g., `yyyyyyyyyyy` (⚠️ Keep secret, server-side only)
   
5. **Advanced Settings**
   - Grant Types: Ensure **Authorization Code** is enabled
   - Token Endpoint Authentication Method: **Post** (default)
   - ID Token Expiration: `36000` seconds (10 hours, adjust as needed)
   - Refresh Token: Enable for future phases

6. **APIs (Create Custom API for Token Audience)**
   - Go to Auth0 Dashboard → APIs → Create API
   - Name: `Javelina API`
   - Identifier (Audience): `https://api.javelina.io` or `https://your-backend-api.com`
   - Signing Algorithm: RS256
   - ⚠️ This audience is critical for token validation

### Environment Variables (Backend)

Add these to your Express.js backend `.env` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://dev-abc123.us.auth0.com/
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback

# Session Configuration
SESSION_SECRET=your-random-32-char-secret-key-here
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=86400000   # 24 hours in milliseconds

# Frontend URL (for redirects after login/logout)
FRONTEND_URL=http://localhost:3000
```

### Environment Variables (Frontend - Next.js)

Add to `.env.local`:

```env
# Backend API URL (auth endpoints)
NEXT_PUBLIC_API_URL=http://localhost:3001

# OR if Next.js proxies all API requests:
# NEXT_PUBLIC_API_URL=http://localhost:3000
```

---

## 2. Backend API Endpoints (Express.js)

**Your app already has Express.js backend on port 3001.** We're adding auth endpoints to it.

### Current Express Auth Flow (Supabase JWT)
```javascript
// Current middleware validates Supabase JWT tokens
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Validate token with Supabase...
  req.user = user;
  next();
}
```

### New Express Auth Flow (Session Cookie)
```javascript
// New middleware validates session cookies
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies.javelina_session;
  const decoded = jwt.verify(sessionToken, SESSION_SECRET);
  req.user = decoded;
  next();
}
```

**All your existing `/api/*` routes keep working** - just replace the auth middleware.

---

### Endpoint Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/login` | GET | Initiates Auth0 login (redirects to Auth0) |
| `/auth/callback` | GET | Handles Auth0 callback, validates tokens, creates session |
| `/auth/logout` | POST | Clears session cookie, logs out of Auth0 |
| `/auth/me` | GET | Returns current user session info (for frontend) |

---

### 2.1 GET `/auth/login`

**Purpose:** Initiates Authorization Code Flow by redirecting user to Auth0 login page.

**Flow:**
1. Generate `state` parameter (CSRF protection, store in cookie or session)
2. Generate `code_verifier` and `code_challenge` for PKCE (optional but recommended)
3. Redirect user to Auth0 `/authorize` endpoint

**Dependencies:**
- `express`
- `crypto` (for state/PKCE generation)
- `cookie-parser` (for setting state cookie)

**Pseudocode:**

```javascript
// routes/auth.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

router.get('/login', (req, res) => {
  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Generate PKCE code_verifier and code_challenge (optional, but recommended)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Store state and code_verifier in httpOnly cookie (expires in 10 min)
  res.cookie('auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000, // 10 minutes
    path: '/auth'
  });
  
  res.cookie('auth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000,
    path: '/auth'
  });
  
  // Construct Auth0 authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.AUTH0_CLIENT_ID,
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    scope: 'openid profile email', // Add offline_access for refresh tokens in Phase 2
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    audience: process.env.AUTH0_AUDIENCE // Important for API access
  });
  
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params.toString()}`;
  
  // Redirect user to Auth0
  res.redirect(authUrl);
});

module.exports = router;
```

**Error Handling:**
- If Auth0 config is missing, return 500 error (don't redirect)
- Log errors for debugging

---

### 2.2 GET `/auth/callback`

**Purpose:** Receives authorization code from Auth0, exchanges it for tokens, validates tokens, creates session cookie.

**Flow:**
1. Validate `state` parameter (compare with stored cookie)
2. Extract `code` from query params
3. Exchange code for tokens (POST to `/oauth/token`)
4. Validate ID token (JWKS, issuer, audience, expiration)
5. Create local user record in Supabase (optional, if not exists)
6. Create session cookie with user info
7. Redirect to frontend dashboard

**Dependencies:**
- `axios` or `node-fetch` (for token exchange)
- `jsonwebtoken` (for JWT validation)
- `jwks-rsa` (for fetching Auth0 public keys)
- `@supabase/supabase-js` (optional, for user record creation)

**Pseudocode:**

```javascript
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { createClient } = require('@supabase/supabase-js');

// Initialize JWKS client (reuse across requests)
const jwks = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  rateLimit: true
});

// Helper: Get signing key from JWKS
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Helper: Verify ID token
function verifyToken(idToken) {
  return new Promise((resolve, reject) => {
    jwt.verify(idToken, getKey, {
      audience: process.env.AUTH0_CLIENT_ID, // ID token audience is client_id
      issuer: process.env.AUTH0_ISSUER,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
}

router.get('/callback', async (req, res) => {
  try {
    // 1. Validate state (CSRF protection)
    const { code, state, error, error_description } = req.query;
    const storedState = req.cookies.auth_state;
    const codeVerifier = req.cookies.auth_code_verifier;
    
    if (error) {
      console.error('Auth0 error:', error, error_description);
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=${error}`);
    }
    
    if (!state || !storedState || state !== storedState) {
      console.error('State mismatch - possible CSRF attack');
      return res.status(400).json({ error: 'Invalid state parameter' });
    }
    
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }
    
    // 2. Exchange code for tokens
    const tokenResponse = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
      {
        grant_type: 'authorization_code',
        client_id: process.env.AUTH0_CLIENT_ID,
        client_secret: process.env.AUTH0_CLIENT_SECRET,
        code: code,
        redirect_uri: process.env.AUTH0_CALLBACK_URL,
        code_verifier: codeVerifier // PKCE
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    const { id_token, access_token } = tokenResponse.data;
    
    if (!id_token) {
      throw new Error('No ID token received from Auth0');
    }
    
    // 3. Validate ID token (JWKS, issuer, audience, exp)
    const decoded = await verifyToken(id_token);
    
    // Decoded contains: sub (user ID), email, name, picture, etc.
    const auth0UserId = decoded.sub; // e.g., "auth0|123456" or "google-oauth2|123456"
    const email = decoded.email;
    const name = decoded.name || email;
    const emailVerified = decoded.email_verified || false;
    
    // 4. Optional: Create/update local user record in Supabase
    // This maintains a users table for app-specific data (roles, preferences, etc.)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
    );
    
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles') // Assuming profiles table stores user data
      .select('*')
      .eq('auth0_user_id', auth0UserId) // Add auth0_user_id column to profiles table
      .single();
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      // Optional: Update last_login timestamp
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);
    } else {
      // Create new user record
      const { data: newUser, error: createError } = await supabase
        .from('profiles')
        .insert({
          auth0_user_id: auth0UserId,
          email: email,
          name: name,
          email_verified: emailVerified,
          last_login: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }
      
      userId = newUser.id;
    }
    
    // 5. Create session data
    const sessionData = {
      userId: userId, // Local DB user ID
      auth0UserId: auth0UserId,
      email: email,
      name: name,
      emailVerified: emailVerified,
      loginTime: Date.now()
    };
    
    // 6. Set session cookie (signed with SESSION_SECRET)
    // Option A: Store session data directly in cookie (for simplicity)
    const sessionToken = jwt.sign(sessionData, process.env.SESSION_SECRET, {
      expiresIn: '24h' // Match SESSION_MAX_AGE
    });
    
    res.cookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // or 'strict' for stricter CSRF protection
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000, // 24 hours
      path: '/'
    });
    
    // Clear temporary auth state cookies
    res.clearCookie('auth_state', { path: '/auth' });
    res.clearCookie('auth_code_verifier', { path: '/auth' });
    
    // 7. Redirect to frontend dashboard
    res.redirect(`${process.env.FRONTEND_URL}/`);
    
  } catch (error) {
    console.error('Callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});
```

**Error Handling:**
- Log all errors for debugging
- Redirect to login page with error query param
- Don't expose sensitive error details to frontend

**Security Notes:**
- ID token validation is critical (prevents token forgery)
- State validation prevents CSRF attacks
- PKCE adds extra security layer for Authorization Code Flow

---

### 2.3 POST `/auth/logout`

**Purpose:** Clears session cookie and optionally logs user out of Auth0 (federated logout).

**Flow:**
1. Clear session cookie
2. Optionally redirect to Auth0 logout endpoint (logs out of Auth0 session)
3. Auth0 redirects back to frontend login page

**Pseudocode:**

```javascript
router.post('/logout', (req, res) => {
  // 1. Clear session cookie
  res.clearCookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  // 2. Option A: Simple logout (clear cookie only)
  // return res.json({ success: true });
  
  // 2. Option B: Federated logout (log out of Auth0 too)
  const auth0LogoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
    new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: `${process.env.FRONTEND_URL}/login`
    }).toString();
  
  res.json({ 
    success: true, 
    redirectUrl: auth0LogoutUrl // Frontend redirects to this URL
  });
});
```

**Alternative Implementation (GET endpoint):**
If you prefer GET for logout:
```javascript
router.get('/logout', (req, res) => {
  res.clearCookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', { path: '/' });
  
  // Redirect to Auth0 logout (federated)
  const auth0LogoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
    new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: `${process.env.FRONTEND_URL}/login`
    }).toString();
  
  res.redirect(auth0LogoutUrl);
});
```

**Error Handling:**
- Always clear cookie, even if Auth0 logout fails
- Log errors but don't block logout

**CSRF Note:** 
- For POST requests, consider CSRF token validation (see Section 3)
- Or use a simple nonce in the request body

---

### 2.4 GET `/auth/me`

**Purpose:** Returns current user session info (for frontend to display logged-in state).

**Flow:**
1. Read session cookie
2. Verify and decode JWT (using SESSION_SECRET)
3. Optional: Fetch fresh user data from Supabase
4. Return user info

**Pseudocode:**

```javascript
// Middleware: Authenticate session
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies[process.env.SESSION_COOKIE_NAME || 'javelina_session'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    req.user = decoded; // Attach user data to request
    next();
  } catch (error) {
    console.error('Session verification failed:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}

router.get('/me', authenticateSession, async (req, res) => {
  try {
    // Option A: Return session data directly (fast)
    // return res.json({ user: req.user });
    
    // Option B: Fetch fresh data from Supabase (slower, but up-to-date)
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: user, error } = await supabase
      .from('profiles')
      .select('id, email, name, avatar_url, role, organizations(*)')
      .eq('id', req.user.userId)
      .single();
    
    if (error || !user) {
      console.error('Error fetching user:', error);
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
    
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Error Handling:**
- Return 401 if no session or invalid token
- Return 404 if user not found in DB
- Return 500 for unexpected errors

**Performance Note:**
- For Phase 1, returning session data directly (Option A) is sufficient
- In Phase 2, add caching or optimize DB queries for fresh data

---

### Backend Dependencies

Install required packages in Express.js backend:

```bash
npm install express cookie-parser jsonwebtoken jwks-rsa axios @supabase/supabase-js
```

Or if using Yarn:
```bash
yarn add express cookie-parser jsonwebtoken jwks-rsa axios @supabase/supabase-js
```

---

## 3. Session Design

### Session Storage Strategy

**Approach:** Signed JWT cookie (no server-side session store for Phase 1)

**Rationale:**
- Simplicity: No Redis or database session store needed
- Stateless: Backend doesn't need to maintain session state
- Scalability: Works across multiple backend instances (load balancing)

**Limitations (addressed in Phase 2+):**
- Can't revoke sessions immediately (must wait for expiration)
- Cookie size limit (~4KB, sufficient for user info)
- Stolen cookie remains valid until expiration

**Alternative (Phase 2):** Server-side session store (Redis, PostgreSQL)
- Store session ID in cookie, session data in Redis/DB
- Allows immediate session revocation
- Better for sensitive data

---

### Cookie Settings

**Cookie Name:** `javelina_session` (or configurable via `SESSION_COOKIE_NAME`)

**Cookie Attributes:**

```javascript
{
  httpOnly: true,         // Prevents JavaScript access (XSS protection)
  secure: true,           // HTTPS only in production (set to false for local dev)
  sameSite: 'lax',        // CSRF protection (allows GET from external sites, blocks POST)
  maxAge: 86400000,       // 24 hours (in milliseconds)
  path: '/'               // Cookie available to all routes
}
```

**Attribute Details:**

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | `true` | Prevents client-side JavaScript from reading cookie (mitigates XSS attacks) |
| `secure` | `true` (prod) / `false` (dev) | Cookie only sent over HTTPS (use `false` for `http://localhost`) |
| `sameSite` | `lax` | **CSRF protection:** Blocks cross-site POST requests, allows GET (e.g., OAuth redirects) |
| `maxAge` | `86400000` | 24 hours (adjust based on security requirements) |
| `path` | `/` | Cookie sent to all routes (needed for frontend and API) |

**SameSite Options:**
- `strict` - Most secure, blocks all cross-site requests (may break OAuth redirects)
- `lax` - **Recommended** - Blocks cross-site POST, allows top-level navigation (GET)
- `none` - Allows all cross-site requests (requires `secure: true`)

---

### CSRF Considerations

**Phase 1 Protection:**

1. **SameSite Cookie (`lax`):**
   - Primary CSRF defense
   - Blocks cross-site POST requests (e.g., malicious form submission)
   - Allows Auth0 redirect callbacks (GET requests)

2. **State Parameter (OAuth flow):**
   - Already implemented in `/auth/login` and `/auth/callback`
   - Prevents CSRF during OAuth flow

3. **POST Logout Endpoint:**
   - Consider adding a simple CSRF token for `/auth/logout` (POST)
   - Or use a nonce in request body

**CSRF Token Implementation (Optional for Phase 1):**

```javascript
// Generate CSRF token on login/session creation
const csrfToken = crypto.randomBytes(32).toString('hex');
sessionData.csrfToken = csrfToken;

// Return CSRF token in /me response
res.json({ user, csrfToken });

// Validate CSRF token in POST requests (e.g., /auth/logout)
router.post('/logout', authenticateSession, (req, res) => {
  const csrfToken = req.body.csrfToken || req.headers['x-csrf-token'];
  
  if (!csrfToken || csrfToken !== req.user.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // ... proceed with logout
});
```

**For Phase 1:** SameSite `lax` + state parameter is sufficient. Add explicit CSRF tokens in Phase 2 if needed.

---

### Session Expiration & Refresh (Phase 2+)

**Phase 1:** Sessions expire after `maxAge` (24 hours). User must re-login.

**Phase 2:** Implement token refresh flow:
- Store Auth0 refresh token (request `offline_access` scope)
- Backend refreshes access token before expiration
- Update session cookie with new tokens
- Or implement sliding session (extend maxAge on activity)

---

## 4. Frontend Changes (Next.js)

### 4.1 Update `lib/auth-store.ts`

**Replace Supabase Auth with Express API calls.**

**Changes needed:**

```typescript
// REMOVE these Supabase imports/calls:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
await supabase.auth.signInWithPassword(...)
await supabase.auth.signOut()
await supabase.auth.getUser()
await supabase.auth.signInWithOAuth(...)

// REPLACE WITH Express API calls:
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Login - redirect to Express
login: () => {
  window.location.href = `${API_URL}/auth/login`;
}

// Logout - call Express
logout: async () => {
  const response = await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include' // ← Sends session cookie
  });
  
  if (response.ok) {
    const data = await response.json();
    // Redirect to Auth0 logout if provided
    if (data.redirectUrl) {
      window.location.href = data.redirectUrl;
    }
  }
}

// Initialize auth - check session
initializeAuth: async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include'
  });
  
  if (response.ok) {
    const data = await response.json();
    set({ user: data.user, isAuthenticated: true });
  } else {
    set({ user: null, isAuthenticated: false });
  }
}

// Fetch profile - get fresh user data
fetchProfile: async () => {
  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include'
  });
  
  if (response.ok) {
    const data = await response.json();
    set({ user: data.user, isAuthenticated: true });
  }
}
```

**Critical:** Add `credentials: 'include'` to ALL fetch calls so cookies are sent.

### 4.2 Update `lib/api-client.ts`

**Remove Supabase token fetching, use session cookies instead.**

**REMOVE these lines (27-31):**
```typescript
// Get JWT token from Supabase auth
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}
```

**REMOVE these lines (39-51):**
```typescript
// Get auth token
const token = await getAuthToken();

// Build headers
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(options.headers as Record<string, string> || {}),
};

// Add auth token if available
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

**REPLACE WITH:**
```typescript
// Build headers (no token needed, session cookie sent automatically)
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  ...(options.headers as Record<string, string> || {}),
};

// Make request WITH CREDENTIALS
const url = `${API_BASE_URL}/api${endpoint}`;
const response = await fetch(url, {
  ...options,
  headers,
  credentials: 'include' // ← Sends session cookie automatically
});
```

**Result:** All your existing API calls (`zonesApi`, `dnsRecordsApi`, etc.) automatically use session cookie auth. No other changes needed!

---

### 4.3 Update `app/login/page.tsx`

**REPLACE the existing login form with Auth0 redirect:**

```tsx
// BEFORE: Complex form with email/password
const handleSubmit = async (e: React.FormEvent) => {
  const result = await login(email, password, captchaToken);
  // ...
};

// AFTER: Simple redirect to Express
const { login } = useAuthStore();

<Button onClick={login}>
  Login with Auth0
</Button>
```

**For Phase 1:** Simplify to single "Login with Auth0" button. Auth0 Universal Login handles email/password, Google, GitHub, etc.

**Your existing login UI can be removed** or you can keep a simple button that redirects to Auth0.

---

### 4.4 Update `components/auth/AuthProvider.tsx`

**REMOVE Supabase auth state listener:**

```typescript
// REMOVE these lines:
const supabase = createClient();
const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
  // ... handler code
});

return () => {
  subscription.unsubscribe();
};
```

**KEEP ONLY:**
```tsx
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from Express session
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}
```

**Why:** Auth state changes are now managed by Express, not Supabase. No need to listen for Supabase events.

### 4.5 Update `middleware.ts`

**Replace Supabase session check with session cookie check.**

**REMOVE these lines (20-74):**
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: { /* ... */ }
  }
);

const { data: { user } } = await supabase.auth.getUser();
```

**REPLACE WITH:**
```typescript
// Check for session cookie
const sessionCookie = request.cookies.get('javelina_session'); // Match Express cookie name
const isAuthenticated = !!sessionCookie;
```

**Updated middleware.ts:**

```typescript
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    // Check for session cookie (set by Express backend)
    const sessionCookie = request.cookies.get('javelina_session');
    const isAuthenticated = !!sessionCookie;

    // Password reset flow - keep as-is
    const passwordResetRequired = request.cookies.get('password_reset_required')?.value === 'true';
    const isLoginPage = request.nextUrl.pathname === '/login';
    
    if (passwordResetRequired && !isLoginPage && request.nextUrl.pathname !== '/reset-password') {
      return NextResponse.redirect(new URL('/reset-password?recovery=true', request.url));
    }

    // Public routes
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password', '/email-verified', '/admin/login', '/pricing', '/checkout'];
    const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route));

    const paymentComplete = request.nextUrl.searchParams.get('payment_complete') === 'true';

    // Protect routes
    if (!isAuthenticated && !isPublicRoute && !request.nextUrl.pathname.startsWith('/admin') && !paymentComplete) {
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect authenticated users away from login/signup
    if (isAuthenticated && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      // Note: Can't check organizations from middleware anymore (no DB access)
      // Just redirect to dashboard, let dashboard handle onboarding check
      return NextResponse.redirect(new URL('/', request.url));
    }
  } catch (error) {
    console.error('Middleware error:', error);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

**Note:** Middleware just checks cookie presence. Express backend validates the JWT signature.

---

### 4.6 Summary of Frontend Changes

**Files to modify:**
1. `lib/auth-store.ts` - Remove Supabase auth, add Express API calls
2. `lib/api-client.ts` - Remove `getAuthToken()`, add `credentials: 'include'`
3. `app/login/page.tsx` - Simplify to Auth0 redirect button
4. `components/auth/AuthProvider.tsx` - Remove Supabase listener
5. `middleware.ts` - Check session cookie instead of Supabase session

**Files that DON'T change:**
- All API usage (`zonesApi`, `dnsRecordsApi`, `organizationsApi`, etc.) - already goes through Express ✅
- Components that fetch data - no changes needed ✅
- Routing/navigation - works the same ✅

**DO NOT install:** `@auth0/auth0-react` or `@auth0/auth0-spa-js` - All Auth0 logic is backend-only.

---

## 5. Local Dev & Testing Checklist

### Setup Instructions

1. **Auth0 Setup**
   - [ ] Create Auth0 account and application (Regular Web App)
   - [ ] Configure callback URLs: `http://localhost:3001/auth/callback`
   - [ ] Configure logout URLs: `http://localhost:3000/login`
   - [ ] Enable Username-Password, Google, GitHub connections
   - [ ] Create API with audience: `https://api.javelina.io`
   - [ ] Copy Domain, Client ID, Client Secret to backend `.env`

2. **Backend Setup (Express.js)**
   - [ ] Install dependencies: `npm install express cookie-parser jsonwebtoken jwks-rsa axios @supabase/supabase-js`
   - [ ] Add environment variables to `.env` (see Section 1)
   - [ ] Create `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me` routes
   - [ ] Start backend server: `npm run dev:backend` (port 3001)

3. **Database Setup (Supabase)**
   - [ ] Add `auth0_user_id` column to `profiles` table:
     ```sql
     ALTER TABLE profiles ADD COLUMN auth0_user_id TEXT UNIQUE;
     CREATE INDEX idx_profiles_auth0_user_id ON profiles(auth0_user_id);
     ```
   - [ ] Verify Supabase service role key in backend `.env`

4. **Frontend Setup (Next.js)**
   - [ ] Update `lib/auth-store.ts` with new methods (see Section 4)
   - [ ] Update `app/login/page.tsx` to redirect to backend (see Section 4)
   - [ ] Update `middleware.ts` to check session cookie (see Section 4)
   - [ ] Add `NEXT_PUBLIC_API_URL=http://localhost:3001` to `.env.local`
   - [ ] Ensure `credentials: 'include'` in all fetch calls to backend
   - [ ] Start frontend server: `npm run dev` (port 3000)

5. **CORS Configuration**
   - [ ] In Express backend, configure CORS to allow frontend origin:
     ```javascript
     const cors = require('cors');
     app.use(cors({
       origin: process.env.FRONTEND_URL,
       credentials: true // Allow cookies
     }));
     ```

---

### Manual Test Cases

#### Test 1: Login Success (Email/Password)
1. **Navigate** to `http://localhost:3000/login`
2. **Click** "Login with Auth0" button
3. **Verify** redirect to Auth0 Universal Login (`dev-abc123.us.auth0.com`)
4. **Enter** email and password
5. **Verify** redirect back to `http://localhost:3000/` (dashboard)
6. **Check** browser cookies: `javelina_session` should be present
7. **Check** UI: User name/email displayed in header
8. **Open** DevTools → Application → Cookies → Verify `httpOnly`, `secure`, `sameSite` attributes

**Expected Result:** ✅ User logged in, session cookie set, dashboard loads

---

#### Test 2: Login Success (OAuth - Google)
1. **Navigate** to `http://localhost:3000/login`
2. **Click** "Login with Auth0" button
3. **On Auth0 page**, click "Continue with Google"
4. **Authenticate** with Google account
5. **Verify** redirect back to `http://localhost:3000/`
6. **Check** session cookie and UI as above

**Expected Result:** ✅ OAuth login works, session created

---

#### Test 3: Session Persists Across Refresh
1. **Login** (Test 1 or 2)
2. **Refresh** page (`Cmd+R` or `Ctrl+R`)
3. **Verify** user remains logged in (no redirect to login page)
4. **Check** DevTools Network tab: `/auth/me` request should return user data

**Expected Result:** ✅ Session persists, user auto-logged in

---

#### Test 4: Logout Success
1. **Login** (Test 1 or 2)
2. **Click** logout button in UI
3. **Verify** redirect to Auth0 logout page (briefly)
4. **Verify** redirect back to `http://localhost:3000/login`
5. **Check** cookies: `javelina_session` should be deleted
6. **Try** navigating to dashboard (`/`) - should redirect to `/login`

**Expected Result:** ✅ User logged out, cookie cleared, protected routes inaccessible

---

#### Test 5: Session Cleared on Logout
1. **Login** (Test 1 or 2)
2. **Open** DevTools → Application → Cookies
3. **Copy** `javelina_session` cookie value
4. **Logout**
5. **Manually** add cookie back (DevTools → Application → Cookies → Add)
6. **Refresh** page
7. **Verify** session is invalid (expired token, should redirect to login)

**Expected Result:** ✅ Old session token doesn't work after logout

---

#### Test 6: Invalid Callback Parameters Rejected
1. **Manually** navigate to `http://localhost:3001/auth/callback?code=invalid&state=invalid`
2. **Verify** redirect to login with error: `http://localhost:3000/login?error=auth_failed`
3. **Check** backend logs: Should log "State mismatch" or "Invalid code"

**Expected Result:** ✅ Invalid callback rejected, user redirected to login

---

#### Test 7: Protected Routes Blocked Without Session
1. **Clear** all cookies (DevTools → Application → Clear storage)
2. **Navigate** to `http://localhost:3000/` (dashboard)
3. **Verify** redirect to `/login`
4. **Navigate** to `http://localhost:3000/settings`
5. **Verify** redirect to `/login`

**Expected Result:** ✅ Unauthenticated users can't access protected routes

---

#### Test 8: Auth0 Error Handling
1. **Navigate** to `http://localhost:3000/login`
2. **On Auth0 page**, click "Back to login" or close tab (simulate error)
3. **Verify** redirect back to login page with error message
4. **Check** backend logs for error handling

**Expected Result:** ✅ Errors handled gracefully, no crashes

---

#### Test 9: CSRF Protection (State Parameter)
1. **Open** DevTools → Network tab
2. **Navigate** to `http://localhost:3000/login`
3. **Capture** redirect URL to Auth0 (check `state` parameter)
4. **Modify** `state` parameter in callback URL manually
5. **Navigate** to modified URL
6. **Verify** error: "Invalid state parameter"

**Expected Result:** ✅ State mismatch rejected (CSRF protection works)

---

#### Test 10: Session Expiration (Manual)
1. **Login** (Test 1 or 2)
2. **Wait** 24 hours (or manually modify session cookie to expire)
3. **Refresh** page
4. **Verify** redirect to login (expired session)

**For faster testing:** Set `SESSION_MAX_AGE=60000` (1 minute) in backend `.env`, wait 1 minute, refresh.

**Expected Result:** ✅ Expired session redirects to login

---

### Debugging Tips

**Backend Logs:**
```bash
# In Express backend, add logging:
console.log('Auth0 callback received:', req.query);
console.log('Token response:', tokenResponse.data);
console.log('Decoded ID token:', decoded);
```

**Frontend Network Tab:**
- Check `/auth/me` requests (should include `Cookie: javelina_session=...`)
- Verify `credentials: 'include'` is set in fetch calls

**Auth0 Dashboard:**
- Go to "Monitoring" → "Logs" to see login attempts, errors, token exchanges

**Cookie Inspector:**
- Chrome DevTools → Application → Cookies → `localhost:3000`
- Verify `httpOnly`, `secure`, `sameSite`, expiration

**Common Issues:**
- **CORS errors:** Ensure backend CORS allows frontend origin with `credentials: true`
- **Cookies not sent:** Add `credentials: 'include'` to all fetch calls
- **State mismatch:** Clear cookies and try again (old state cookies may persist)
- **Token validation fails:** Verify `AUTH0_ISSUER` ends with `/` and matches Auth0 domain

---

## 6. Database Migrations (Supabase)

### Add Auth0 User ID to Profiles Table

**File:** `supabase/migrations/YYYYMMDD_add_auth0_user_id.sql`

```sql
-- Add auth0_user_id column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS auth0_user_id TEXT UNIQUE;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_auth0_user_id ON profiles(auth0_user_id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.auth0_user_id IS 'Auth0 user ID (e.g., auth0|123456, google-oauth2|123456)';
```

**Apply Migration:**
```bash
# Using Supabase CLI
supabase db push

# Or execute in Supabase Dashboard → SQL Editor
```

---

### Optional: Add Email Verified Column

If not already present:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
```

---

## 7. What's NOT in Phase 1 (Future Phases)

### Phase 2: Advanced Auth Features
- [ ] Password reset flow (Auth0 password reset)
- [ ] Email verification enforcement
- [ ] MFA enable/disable UI (Auth0 MFA)
- [ ] Account linking (merge OAuth accounts)
- [ ] Profile update (change email, name)
- [ ] Token refresh flow (use Auth0 refresh tokens)
- [ ] Admin user management (ban/disable users)

### Phase 3: User Migration
- [ ] Migrate existing Supabase Auth users to Auth0
- [ ] Dual authentication support (Supabase + Auth0 during migration)
- [ ] Data migration scripts (email, password hashes)
- [ ] Communication plan for users

### Phase 4: Roles & Permissions
- [ ] Map Auth0 roles to app roles (SuperAdmin, Admin, etc.)
- [ ] Store roles in Auth0 user metadata
- [ ] Update RBAC system to use Auth0 roles
- [ ] RLS policies based on Auth0 user ID

### Phase 5: Data Access Refactoring
- [ ] Refactor DNS record API calls to use backend (BFF pattern)
- [ ] Refactor zones, organizations, billing to use backend
- [ ] Remove direct Supabase client calls from frontend
- [ ] Backend validates Auth0 tokens for all API requests

### Phase 6: Production Hardening
- [ ] Server-side session store (Redis)
- [ ] Session revocation (logout all devices)
- [ ] Rate limiting (login attempts, API calls)
- [ ] Audit logging (all auth events)
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Production Auth0 tenant setup
- [ ] Penetration testing

---

## 8. Deployment Considerations (Production)

### Backend (Express.js)
- [ ] Use **Auth0 Production Tenant** (separate from dev)
- [ ] Set `NODE_ENV=production`
- [ ] Use strong `SESSION_SECRET` (64+ random characters)
- [ ] Enable `secure: true` for cookies (HTTPS only)
- [ ] Configure Auth0 callback URLs for production domain (e.g., `https://api.javelina.io/auth/callback`)
- [ ] Set `CORS` origin to production frontend URL
- [ ] Use environment-specific `.env` files (`.env.production`)

### Frontend (Next.js)
- [ ] Set `NEXT_PUBLIC_API_URL` to production backend URL
- [ ] Verify `credentials: 'include'` works with production CORS
- [ ] Test session cookies on production domain (same-site vs cross-site)

### Auth0 Production Setup
- [ ] Create production Auth0 tenant
- [ ] Create production application (Regular Web App)
- [ ] Configure production callback/logout URLs
- [ ] Enable production Google/GitHub OAuth apps
- [ ] Set up custom domain (optional): `auth.javelina.io`
- [ ] Configure email templates (welcome, password reset)
- [ ] Set up Auth0 Rules/Actions for custom logic (e.g., add user to DB on first login)

### Database (Supabase)
- [ ] Apply migrations to production database
- [ ] Test RLS policies with Auth0 user IDs
- [ ] Backup database before migration

### Monitoring & Logging
- [ ] Set up error tracking (Sentry, Rollbar)
- [ ] Monitor Auth0 logs (dashboard or export to Splunk/Datadog)
- [ ] Set up alerts for failed logins, token validation errors
- [ ] Log all auth events to audit table

---

## 9. Express Backend Changes Summary

**Your Express backend already exists.** We're just adding auth endpoints and updating the auth middleware.

### What to Add:
1. **4 new auth endpoints** in `routes/auth.js`:
   - `GET /auth/login`
   - `GET /auth/callback`
   - `POST /auth/logout`
   - `GET /auth/me`

2. **New auth middleware** in `middleware/authenticateSession.js`:
   - Validates session cookie (JWT signed by Express)
   - Replaces current Supabase JWT validation

3. **Dependencies:**
   ```bash
   npm install cookie-parser jsonwebtoken jwks-rsa axios
   ```

### What to Update:
1. **Existing auth middleware** - Replace Supabase JWT validation with session cookie validation
2. **All existing `/api/*` routes** - Use new `authenticateSession` middleware instead of old auth middleware

### What Stays the Same:
- All your existing Express routes (`/api/zones`, `/api/dns-records`, etc.) ✅
- Database queries using Supabase service role ✅
- RBAC middleware ✅
- Error handling ✅
- CORS configuration (just verify it allows `credentials: true`) ✅

---

## 10. Success Metrics & Acceptance Criteria

### Phase 1 is complete when:

- [x] User can login via Auth0 (email/password)
- [x] User can login via Auth0 (Google OAuth)
- [x] User can login via Auth0 (GitHub OAuth)
- [x] User can logout successfully
- [x] Session persists across page refresh
- [x] Session cookie is httpOnly, secure, and sameSite
- [x] Protected routes redirect to login when not authenticated
- [x] `/auth/me` returns current user session
- [x] Invalid callback parameters are rejected (CSRF protection)
- [x] Frontend does not use Auth0 SDK (BFF only)
- [x] All 10 manual test cases pass
- [x] No Supabase Auth calls remain in login/logout flow
- [x] Local user record created/updated in Supabase on login

---

## 11. Team Handoff Checklist

Before marking Phase 1 complete:

- [ ] **Documentation:** Update README with new auth flow
- [ ] **Environment Variables:** Document all required vars for team
- [ ] **Auth0 Credentials:** Share dev tenant credentials securely (1Password, etc.)
- [ ] **Demo:** Record screen demo of login/logout flow
- [ ] **Code Review:** PR reviewed by at least one other engineer
- [ ] **Testing:** All manual test cases pass (screenshots or video)
- [ ] **Rollback Plan:** Document how to revert to Supabase Auth if needed
- [ ] **Phase 2 Planning:** Schedule kickoff meeting for next phase

---

## 12. Rollback Strategy (If Needed)

If Phase 1 has critical issues, rollback to Supabase Auth:

1. **Git:** Revert commits or checkout previous stable branch
2. **Environment Variables:** Switch back to Supabase vars
3. **Database:** No rollback needed (auth0_user_id column is optional)
4. **Auth0:** Disable Auth0 application (don't delete yet)
5. **Deploy:** Redeploy previous version (frontend + backend)
6. **Communication:** Notify team and users (if in prod)

**Mitigation:** Test Phase 1 thoroughly in dev/staging before prod deployment.

---

## 13. Questions & Clarifications

### Q1: Should we use PKCE for Authorization Code Flow?
**A:** Yes, recommended. PKCE adds extra security for public clients. Even though backend is confidential (has client secret), PKCE is best practice.

### Q2: Do we need a session store (Redis)?
**A:** Not for Phase 1. Signed JWT cookies are sufficient. Add Redis in Phase 2 for session revocation.

### Q3: How to handle existing users with Supabase Auth?
**A:** Out of scope for Phase 1. Phase 3 will cover user migration. For Phase 1, new users start with Auth0, old users can still use Supabase Auth (dual mode).

### Q4: What about password reset in Phase 1?
**A:** Out of scope. Users can use Auth0's password reset flow directly (Auth0 sends reset email). No custom UI needed.

### Q5: Should frontend call backend directly or proxy through Next.js?
**A:** Either works. Direct calls to Express backend (port 3001) are simpler. If you prefer Next.js API routes as proxy, add a proxy route (`app/api/[...proxy]/route.ts`) that forwards to Express.

### Q6: Do we need to modify RLS policies?
**A:** Not for Phase 1. Keep existing RLS based on Supabase user IDs. Phase 4 will refactor RLS to use Auth0 user IDs.

---

## 14. Support Resources

### Auth0 Documentation
- [Authorization Code Flow](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow)
- [PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce)
- [Token Validation](https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens)
- [Logout](https://auth0.com/docs/authenticate/login/logout)

### Libraries
- [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) - JWT signing and verification
- [jwks-rsa](https://www.npmjs.com/package/jwks-rsa) - JWKS key fetching
- [cookie-parser](https://www.npmjs.com/package/cookie-parser) - Express cookie middleware

### Troubleshooting
- [Auth0 Community](https://community.auth0.com/)
- [Auth0 Support](https://support.auth0.com/) (if you have paid plan)

---

## 15. Next Steps (After Phase 1)

Once Phase 1 is complete and tested:

1. **Retrospective:** What went well? What could improve?
2. **Documentation:** Update README and onboarding docs
3. **Monitoring:** Set up error tracking and alerts
4. **Phase 2 Planning:** Prioritize password reset, MFA, token refresh
5. **User Testing:** Get feedback from beta users
6. **Performance:** Measure login latency (Auth0 redirect adds ~500ms)
7. **Security Audit:** Review code for vulnerabilities

---

**End of Phase 1 Implementation Plan**

**Document Owner:** [Your Name]  
**Last Updated:** January 23, 2026  
**Status:** Ready for Implementation

---

## Appendix A: Environment Variable Reference

### Backend (.env)
```env
# Auth0
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=xxxxxxxxxxx
AUTH0_CLIENT_SECRET=yyyyyyyyyyy
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://dev-abc123.us.auth0.com/
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback

# Session
SESSION_SECRET=your-random-64-char-secret
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=86400000

# URLs
FRONTEND_URL=http://localhost:3000

# Supabase (for user record creation)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Server
PORT=3001
NODE_ENV=development
```

### Frontend (.env.local)
```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: If you still need Supabase for data access (Phase 1)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

---

## Appendix B: Exact File Changes Summary

### Backend (Express.js) - PORT 3001

**NEW FILES:**
- `routes/auth.js` - 4 Auth0 endpoints (login, callback, logout, me)
- `middleware/authenticateSession.js` - Session cookie validation
- Update `.env` - Add Auth0 + session config vars

**MODIFIED FILES:**
- `server.js` (or `app.js`) - Add `cookie-parser`, mount auth routes
- Existing auth middleware - Replace with `authenticateSession`
- All protected routes - Use new middleware

**VERIFY:**
- CORS allows `credentials: true`
- Cookie-parser is before auth routes

---

### Frontend (Next.js) - PORT 3000

**MODIFIED FILES:**
1. `lib/auth-store.ts` (lines 27-535)
   - Remove: All `supabase.auth.*` calls
   - Add: Express API calls with `credentials: 'include'`

2. `lib/api-client.ts` (lines 27-51)
   - Remove: `getAuthToken()` function
   - Remove: `Authorization` header logic
   - Add: `credentials: 'include'` to fetch

3. `app/login/page.tsx` (entire file)
   - Replace: Complex form → Simple Auth0 redirect button

4. `components/auth/AuthProvider.tsx` (lines 18-47)
   - Remove: Supabase `onAuthStateChange` listener
   - Keep: Only `initializeAuth()` call

5. `middleware.ts` (lines 20-133)
   - Remove: Supabase client setup
   - Replace: Check `javelina_session` cookie instead

6. `.env.local`
   - Add: `NEXT_PUBLIC_API_URL=http://localhost:3001`

**NO CHANGES NEEDED:**
- `lib/hooks/useZones.ts` ✅ (already uses Express API)
- `lib/actions/dns-records.ts` ✅ (already uses Express API)
- All API client methods (`zonesApi`, `dnsRecordsApi`, etc.) ✅
- Components that fetch data ✅
- Routing/pages ✅

---

### Database (Supabase)

**NEW MIGRATION:**
- `supabase/migrations/YYYYMMDD_add_auth0_user_id.sql`
  ```sql
  ALTER TABLE profiles ADD COLUMN auth0_user_id TEXT UNIQUE;
  CREATE INDEX idx_profiles_auth0_user_id ON profiles(auth0_user_id);
  ```

---

## Phase 1 Complete When:

- [x] User can login via Auth0 (redirects work)
- [x] User can logout successfully
- [x] Session cookie is set (httpOnly, secure, sameSite)
- [x] Session persists across page refresh
- [x] Protected routes work with session cookie
- [x] All existing API calls work with new auth
- [x] No Supabase Auth calls remain in frontend
- [x] Express validates session cookies
- [x] All 10 manual tests pass (Section 5)

---

**That's it! Plan is now accurate to your actual BFF architecture. Ready to implement?**
