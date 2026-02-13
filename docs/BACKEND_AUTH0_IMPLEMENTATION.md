# Backend Auth0 Implementation Guide

This document outlines the required changes to the Express.js backend to support Auth0 authentication as part of Phase 1 migration.

## Overview

The backend needs to:
1. Add 4 new auth endpoints for Auth0 OAuth flow
2. Replace Supabase JWT validation with session cookie validation
3. Update CORS to support credentials (cookies)
4. Sync Auth0 users with Supabase profiles table

## 1. Install Dependencies

```bash
npm install cookie-parser jsonwebtoken jwks-rsa axios
```

## 2. Environment Variables

Add these to your backend `.env` file:

```env
# Auth0 Configuration
AUTH0_DOMAIN=<your-auth0-domain>          # e.g., dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://<your-auth0-domain>/
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback

# Session Configuration
SESSION_SECRET=<generate-64-char-random-string>
SESSION_COOKIE_NAME=javelina_session
SESSION_MAX_AGE=86400000                  # 24 hours in milliseconds

# URLs
FRONTEND_URL=http://localhost:3000

# Existing Supabase vars (keep these)
SUPABASE_URL=<your-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

**Generate SESSION_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. New Auth Endpoints

Create `routes/auth.js` with the following 4 endpoints:

### GET `/auth/login`

Initiates the Auth0 OAuth flow:

```javascript
const express = require('express');
const crypto = require('crypto');
const router = express.Router();

router.get('/login', (req, res) => {
  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Store state and code_verifier in httpOnly cookies (expires in 10 min)
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
  // ⚠️ CRITICAL: audience parameter is REQUIRED if using Auth0 API
  // Without it, users may see consent screens or authentication fails
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.AUTH0_CLIENT_ID,
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    scope: 'openid profile email',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    audience: process.env.AUTH0_AUDIENCE  // ⚠️ REQUIRED - DO NOT OMIT!
  });
  
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params.toString()}`;
  
  // Redirect user to Auth0
  res.redirect(authUrl);
});

module.exports = router;
```

### GET `/auth/callback`

Handles Auth0 callback, validates tokens, creates session:

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
      audience: process.env.AUTH0_CLIENT_ID,
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
        code_verifier: codeVerifier
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
    const auth0UserId = decoded.sub;
    const email = decoded.email;
    const name = decoded.name || email;
    const emailVerified = decoded.email_verified || false;
    
    // 4. Create/update local user record in Supabase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth0_user_id', auth0UserId)
      .single();
    
    let userId;
    
    if (existingUser) {
      userId = existingUser.id;
      // Update last_login timestamp
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
      userId: userId,
      auth0UserId: auth0UserId,
      email: email,
      name: name,
      emailVerified: emailVerified,
      loginTime: Date.now()
    };
    
    // 6. Set session cookie (signed with SESSION_SECRET)
    const sessionToken = jwt.sign(sessionData, process.env.SESSION_SECRET, {
      expiresIn: '24h'
    });
    
    res.cookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: parseInt(process.env.SESSION_MAX_AGE) || 86400000,
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

### POST `/auth/logout`

Clears session and provides Auth0 logout URL:

```javascript
router.post('/logout', (req, res) => {
  // Clear session cookie
  res.clearCookie(process.env.SESSION_COOKIE_NAME || 'javelina_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  
  // Return Auth0 logout URL for federated logout
  const auth0LogoutUrl = `https://${process.env.AUTH0_DOMAIN}/v2/logout?` +
    new URLSearchParams({
      client_id: process.env.AUTH0_CLIENT_ID,
      returnTo: `${process.env.FRONTEND_URL}/login`
    }).toString();
  
  res.json({ 
    success: true, 
    redirectUrl: auth0LogoutUrl
  });
});
```

### GET `/auth/me`

Returns current user session info:

```javascript
// Middleware: Authenticate session
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

router.get('/me', authenticateSession, async (req, res) => {
  try {
    // Option A: Return session data directly
    return res.json({ user: req.user });
    
    // Option B: Fetch fresh data from Supabase (uncomment if needed)
    /*
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
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
    */
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 4. Update Existing Auth Middleware

Replace your current Supabase JWT validation middleware with session cookie validation:

**Old middleware (remove):**
```javascript
async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  // Validate token with Supabase...
  req.user = user;
  next();
}
```

**New middleware (use this):**
```javascript
function authenticateSession(req, res, next) {
  const sessionToken = req.cookies[process.env.SESSION_COOKIE_NAME || 'javelina_session'];
  
  if (!sessionToken) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  try {
    const decoded = jwt.verify(sessionToken, process.env.SESSION_SECRET);
    req.user = decoded; // Contains userId, auth0UserId, email, etc.
    next();
  } catch (error) {
    console.error('Session verification failed:', error);
    return res.status(401).json({ error: 'Invalid session' });
  }
}
```

**Apply to all protected routes:**
- Replace old auth middleware with `authenticateSession`
- All `/api/*` routes should use this middleware
- Keep your existing RBAC middleware - it will work with `req.user` from session

## 5. Update Express App Configuration

**Add cookie-parser:**
```javascript
const cookieParser = require('cookie-parser');

app.use(cookieParser());
```

**Update CORS:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true // ← Critical for cookies
}));
```

**Mount auth routes:**
```javascript
const authRoutes = require('./routes/auth');

app.use('/auth', authRoutes);
```

**Order matters:**
```javascript
// 1. Cookie parser (before auth routes)
app.use(cookieParser());

// 2. CORS with credentials
app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));

// 3. Body parser
app.use(express.json());

// 4. Auth routes
app.use('/auth', authRoutes);

// 5. Protected API routes (with authenticateSession middleware)
app.use('/api', authenticateSession, apiRoutes);
```

## 6. Session Cookie Configuration

The session cookie should be configured with these attributes:

```javascript
{
  httpOnly: true,           // Prevents JavaScript access (XSS protection)
  secure: true,             // HTTPS only in production
  sameSite: 'lax',          // CSRF protection
  maxAge: 86400000,         // 24 hours
  path: '/'                 // Available to all routes
}
```

## 7. Testing the Backend

### Test Authentication Flow

1. **Test /auth/login:**
   ```bash
   curl http://localhost:3001/auth/login
   # Should redirect to Auth0
   ```

2. **Test /auth/me (without session):**
   ```bash
   curl http://localhost:3001/auth/me
   # Should return 401 Unauthorized
   ```

3. **Test /auth/logout:**
   ```bash
   curl -X POST http://localhost:3001/auth/logout \
     -H "Content-Type: application/json"
   # Should return Auth0 logout URL
   ```

4. **Test full OAuth flow:**
   - Visit http://localhost:3001/auth/login in browser
   - Complete Auth0 login
   - Should redirect to frontend with session cookie
   - Verify cookie in browser DevTools

### Test Protected API Routes

After logging in via browser:

```bash
# Should work with session cookie
curl http://localhost:3001/api/zones \
  --cookie "javelina_session=<your-session-token>"
```

## 8. Auth0 Dashboard Setup

Before testing, configure Auth0:

1. **Create Application** (Regular Web Application)
   - Name: "Javelina Dev"

2. **Configure URLs:**
   - Allowed Callback URLs: `http://localhost:3001/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000/login`
   - Allowed Web Origins: `http://localhost:3000`

3. **Enable Connections:**
   - Username-Password-Authentication
   - Google OAuth
   - GitHub OAuth

4. **Create API:**
   - Name: "Javelina API"
   - Identifier: `https://api.javelina.io`

5. **Copy Credentials:**
   - Save Domain, Client ID, Client Secret to `.env`

## 9. What Stays the Same

- All your existing API routes (just use new middleware)
- All database queries (Supabase service role)
- All business logic
- All RBAC checks
- All data validation

## 10. Common Issues

### Cookies Not Sent

- Verify CORS has `credentials: true`
- Verify frontend uses `credentials: 'include'` in fetch calls
- Check cookie domain/path settings

### JWKS Validation Fails

- Verify `AUTH0_ISSUER` ends with `/`
- Check `AUTH0_DOMAIN` is correct
- Ensure internet connectivity for JWKS fetching

### State Mismatch

- Cookies may persist between tests - clear cookies
- Verify cookie path is `/auth` for temporary cookies
- Check cookie expiration (10 minutes)

### User Creation Fails

- Verify `auth0_user_id` column exists in profiles table
- Check Supabase service role key has write permissions
- Verify user doesn't already exist with same email

## 11. Security Checklist

- [ ] SESSION_SECRET is random and ≥32 characters
- [ ] Cookies have `httpOnly: true`
- [ ] Cookies have `secure: true` in production
- [ ] CORS restricted to frontend origin only
- [ ] Auth0 Client Secret is in `.env`, not committed
- [ ] ID token validation includes issuer and audience checks
- [ ] State parameter validated on callback
- [ ] PKCE code_verifier stored securely in cookie

## 12. Next Steps

After implementing:

1. Apply the database migration to add `auth0_user_id` column
2. Test the complete auth flow locally
3. Verify all existing API routes work with new auth
4. Deploy to staging/dev environment
5. Test in dev environment
6. Deploy to production with production Auth0 tenant

## Support

For questions or issues during implementation, refer to:
- [Auth0 Regular Web App Quickstart](https://auth0.com/docs/quickstart/webapp)
- [PKCE Flow Documentation](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce)
- [JWT Validation](https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens)
