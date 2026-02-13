# Fix: Auth0 Consent Screen Appearing for First-Party App

## Problem

Auth0 consent screen is appearing when users log in. This should NEVER happen for your own application (first-party app). The consent screen should only appear for third-party applications.

## Root Cause

Auth0 is treating your application as a "third-party" app requiring user consent, when it should be a trusted first-party app that skips consent entirely.

## Solutions

### Solution 1: Disable User Consent in Application Settings

**Auth0 Dashboard → Applications → Your App → Settings**

1. Scroll down to "Application Properties"
2. Find "Consent" section
3. **Uncheck** "Requires user consent" or similar setting
4. Save changes
5. Try login again - consent screen should not appear

### Solution 2: Mark API as First-Party

If you're using an API with `audience` parameter:

**Auth0 Dashboard → APIs → Your API → Settings**

1. Find "Allow Skipping User Consent" setting
2. **Enable** this option
3. Save changes
4. Try login again

### Solution 3: Use Implicit Grant with Trusted App

**Auth0 Dashboard → Applications → Your App → Settings**

1. Go to "Advanced Settings" → "Grant Types"
2. Ensure these are enabled:
   - ✅ Authorization Code
   - ✅ Refresh Token
   - ✅ Implicit (if needed)
3. Go to "Advanced Settings" → "OAuth"
4. Set "OIDC Conformant" to enabled
5. Check "Trust Token Endpoint IP Header" if behind proxy
6. Save changes

### Solution 4: Check Application Type

**Auth0 Dashboard → Applications → Your App → Settings**

1. Check "Application Type":
   - Should be: **Regular Web Application** (for backend BFF pattern)
   - Should NOT be: Third Party Application
2. If it's set to wrong type, change it and save

### Solution 5: Remove Consent-Requiring Scopes

Check your `/auth/login` endpoint - ensure you're not requesting scopes that require consent:

**Backend code:**
```javascript
router.get('/login', (req, res) => {
  // ...
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.AUTH0_CLIENT_ID,
    redirect_uri: process.env.AUTH0_CALLBACK_URL,
    scope: 'openid profile email',  // ONLY basic scopes
    // Remove any custom scopes like 'read:admin', 'write:data', etc.
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    audience: process.env.AUTH0_AUDIENCE
  });
  // ...
});
```

**Important:** Only use these scopes:
- ✅ `openid` - required
- ✅ `profile` - basic profile
- ✅ `email` - email address
- ❌ Remove any custom scopes (they trigger consent)

### Solution 6: Verify Auth0 Tenant Settings

**Auth0 Dashboard → Tenant Settings → Advanced**

1. Check "Default Directory" is set correctly
2. Ensure "Disable Clickjacking Protection" is appropriate for your setup

### Solution 7: Check if Prompt Parameter is Set

In your `/auth/login` endpoint, make sure you're NOT using `prompt=consent`:

**Wrong:**
```javascript
const params = new URLSearchParams({
  // ...
  prompt: 'consent',  // ❌ REMOVE THIS - forces consent screen
});
```

**Correct:**
```javascript
const params = new URLSearchParams({
  // ...
  // No prompt parameter - or use 'prompt: none' for silent auth
});
```

### Solution 8: Application is "Authorized" for API

If using an API (audience):

**Auth0 Dashboard → APIs → Your API → Machine to Machine Applications**

1. Find your application in the list
2. Ensure the toggle is **ON** (authorized)
3. Check which scopes are selected - only select necessary ones
4. Save if you made changes

## Testing After Fix

1. Log out completely from Auth0 (clear cookies)
2. Use fresh incognito window
3. Click login
4. **Should go straight to dashboard** (no consent screen)
5. Only see Auth0 login form (email/password or social login)

## Expected Flow (No Consent)

1. User clicks "Login"
2. Redirected to Auth0 login page
3. Enter email/password (or social login)
4. **Immediately redirected back to app** (no consent screen)
5. Lands on dashboard

## Why Consent Screen Should Never Appear

For **first-party applications** (your own app):
- ✅ User is logging into YOUR app
- ✅ You own both the app and the API
- ✅ No third-party access involved
- ✅ Consent screen is unnecessary and confusing

Consent screens are ONLY for:
- ❌ Third-party apps accessing your API
- ❌ Apps requesting sensitive scopes
- ❌ OAuth integrations (like "Login with Javelina" for external apps)

## Quick Checklist

- [ ] Application Type is "Regular Web Application"
- [ ] "Requires user consent" is DISABLED in application settings
- [ ] API has "Allow Skipping User Consent" ENABLED
- [ ] Only using scopes: `openid profile email`
- [ ] NO `prompt=consent` parameter in login URL
- [ ] Application is authorized for the API (if using audience)
- [ ] Not requesting any custom/sensitive scopes

## If Consent Screen Still Appears

If consent screen persists after trying all solutions above, check:

1. **Auth0 Dashboard → Tenant Settings → Advanced → Allowed Logout URLs**
   - Verify your callback URL is whitelisted

2. **Auth0 Dashboard → Applications → Your App → Settings → Allowed Callback URLs**
   - Must exactly match `AUTH0_CALLBACK_URL` in your backend `.env`
   - Example: `http://localhost:3001/auth/callback`

3. **Clear Auth0 session completely:**
   ```
   1. Go to: https://<your-auth0-domain>/v2/logout
   2. Clear browser cookies
   3. Try login again
   ```

4. **Check Auth0 logs:**
   - Auth0 Dashboard → Monitoring → Logs
   - Look for errors or warnings during login flow
   - May show why consent is being triggered

## Common Mistakes

### ❌ Wrong Application Type
```
Application Type: Third Party Application
```
**Fix:** Change to "Regular Web Application"

### ❌ Consent Required in Settings
```
☑️ Requires user consent
```
**Fix:** Uncheck this option

### ❌ API Doesn't Allow Skipping Consent
```
Allow Skipping User Consent: OFF
```
**Fix:** Turn ON in API settings

### ❌ Requesting Custom Scopes
```javascript
scope: 'openid profile email read:admin write:data'
       // ^^^^^^^^^^^^^^^^^^^^^^^^^ triggers consent
```
**Fix:** Only use `openid profile email`

## Contact Auth0 Support

If none of these solutions work:

1. Auth0 Dashboard → Support → Create Ticket
2. Explain: "Consent screen appearing for first-party application"
3. Provide:
   - Application Client ID
   - Tenant domain
   - Expected behavior: No consent screen for first-party app
   - Screenshots of consent screen

Auth0 support can check if there's a tenant-level setting forcing consent.

---

**Bottom line:** The consent screen is a configuration issue in Auth0, not a code issue. Once configured correctly, users should never see it for your own application.
