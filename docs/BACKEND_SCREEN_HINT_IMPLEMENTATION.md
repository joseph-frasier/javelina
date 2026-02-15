# Backend Implementation: screen_hint Parameter Support

## Overview

The frontend now sends a `screen_hint` query parameter to differentiate between signup and login flows. The backend `/auth/login` endpoint needs to pass this parameter through to Auth0's authorization URL.

## Current Implementation

The `/auth/login` endpoint in your Express backend currently builds the Auth0 authorization URL like this (from BACKEND_AUTH0_IMPLEMENTATION.md lines 92-103):

```javascript
const params = new URLSearchParams({
  response_type: 'code',
  client_id: process.env.AUTH0_CLIENT_ID,
  redirect_uri: process.env.AUTH0_CALLBACK_URL,
  scope: 'openid profile email',
  state: state,
  code_challenge: codeChallenge,
  code_challenge_method: 'S256',
  audience: process.env.AUTH0_AUDIENCE
});
```

## Required Changes

### Update GET `/auth/login` Endpoint

**File:** `routes/auth.js` (or wherever your auth routes are defined)

**Change:** Extract the `screen_hint` query parameter from the request and include it in the Auth0 authorization URL.

```javascript
router.get('/login', (req, res) => {
  // Extract screen_hint from query parameters
  const { screen_hint } = req.query;
  
  // Generate state for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');
  
  // Generate PKCE code_verifier and code_challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  // Store state and code_verifier in httpOnly cookies
  res.cookie('auth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000,
    path: '/auth'
  });
  
  res.cookie('auth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600000,
    path: '/auth'
  });
  
  // Construct Auth0 authorization URL parameters
  const authParams = {
    response_type: 'code',
    client_id: process.env.AUTH0_CLIENT_ID,
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    scope: 'openid profile email',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    audience: process.env.AUTH0_AUDIENCE
  };
  
  // ADD THIS: Include screen_hint if provided
  if (screen_hint === 'signup') {
    authParams.screen_hint = 'signup';
  }
  
  const params = new URLSearchParams(authParams);
  const authUrl = `https://${process.env.AUTH0_DOMAIN}/authorize?${params.toString()}`;
  
  // Redirect user to Auth0
  res.redirect(authUrl);
});
```

## How It Works

### Login Flow (Existing)
- Frontend calls: `window.location.href = '${API_URL}/auth/login'`
- Backend redirects to: `https://{AUTH0_DOMAIN}/authorize?...` (no screen_hint)
- Auth0 shows: Default login screen

### Signup Flow (New)
- Frontend calls: `window.location.href = '${API_URL}/auth/login?screen_hint=signup'`
- Backend redirects to: `https://{AUTH0_DOMAIN}/authorize?...&screen_hint=signup`
- Auth0 shows: Signup screen

## Auth0 screen_hint Documentation

The `screen_hint` parameter is officially supported by Auth0's Universal Login:
- `screen_hint=signup` - Shows the signup form
- Omitted or any other value - Shows the default login form

Reference: This parameter is part of Auth0's standard authorization parameters and is already documented in BACKEND_BFF_REQUIREMENTS.md (lines 100-136).

## Testing

### Test Login Flow
```bash
# Should show login screen
curl -I http://localhost:3001/auth/login
```

### Test Signup Flow
```bash
# Should show signup screen
curl -I "http://localhost:3001/auth/login?screen_hint=signup"
```

### Verify in Browser
1. Visit your app's landing page
2. Click "Login" button → should see login screen
3. Click "Get Started" button → should see signup screen

## Security Notes

- The `screen_hint` parameter is purely a UI hint to Auth0
- It does NOT bypass any security checks
- Auth0 still validates all authentication flows normally
- Users can switch between login/signup on the Auth0 screen itself

## No Breaking Changes

This change is backward compatible:
- Existing `/auth/login` calls (without screen_hint) work exactly as before
- No changes to callback handling
- No changes to session creation
- No changes to any other endpoints

## Frontend Implementation Status

✅ **Frontend Implementation Complete** (as of this document)

The frontend has been updated to support the signup flow:

### Changes Made:
1. **lib/auth-store.ts**: Added `signup()` function that redirects to `/auth/login?screen_hint=signup`
2. **app/page.tsx**: Updated "Get Started" buttons to call `signup()` instead of `login()`

### Button Mapping:
- "Login" button → calls `login()` → `/auth/login` (default login screen)
- "Get Started" button → calls `signup()` → `/auth/login?screen_hint=signup` (signup screen)
- "Get Started Now" button → calls `signup()` → `/auth/login?screen_hint=signup` (signup screen)

## What You Need to Do

The backend implementation requires **ONE SIMPLE CHANGE**:

In your `/auth/login` route handler, extract the `screen_hint` query parameter and conditionally add it to the Auth0 authorization URL parameters. That's it!

The code change is approximately 5 lines:
```javascript
const { screen_hint } = req.query;  // Extract parameter

// Later, when building authParams object:
if (screen_hint === 'signup') {
  authParams.screen_hint = 'signup';
}
```

## Expected Behavior After Implementation

### Before Backend Change:
- Both "Login" and "Get Started" buttons will show the Auth0 login screen (because backend doesn't pass through screen_hint)

### After Backend Change:
- "Login" button → Auth0 login screen
- "Get Started" button → Auth0 signup screen

## Questions?

If you have questions about this implementation, refer to:
- [Auth0 Universal Login Documentation](https://auth0.com/docs/authenticate/login/auth0-universal-login)
- [Auth0 Authorization Parameters](https://auth0.com/docs/authenticate/login/auth0-universal-login/configure-default-login-routes#signup)
- Existing documentation in this repo: `BACKEND_AUTH0_IMPLEMENTATION.md` and `BACKEND_BFF_REQUIREMENTS.md`
