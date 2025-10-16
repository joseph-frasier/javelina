# OAuth Verification & Diagnostics

Use this guide to verify your Google OAuth setup and diagnose issues.

---

## 🔍 Pre-Flight Checks

### Check 1: Environment Variables

```bash
# In your project directory, verify .env.local exists:
ls -la .env.local

# You should see:
# -rw-r--r--  .env.local

# Content should have:
# NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
```

### Check 2: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Verify your project is selected (top dropdown)
3. Go to **APIs & Services** → **Credentials**
4. Look for your OAuth 2.0 Client ID
5. Click it to verify redirect URIs:
   - [ ] `http://localhost:3000/auth/callback`
   - [ ] `https://<your-domain>/auth/callback`
   - [ ] `https://<your-vercel-url>/auth/callback`

### Check 3: Supabase Dashboard

1. Go to [Supabase](https://app.supabase.com/)
2. Select your project
3. Go to **Authentication** → **Providers**
4. Verify Google provider is **ENABLED**
5. Verify credentials are saved:
   - [ ] Client ID filled in
   - [ ] Client Secret filled in
   - [ ] No error messages

6. Go to **Authentication** → **URL Configuration**
7. Verify settings:
   - [ ] **Site URL**: `http://localhost:3000` or `https://<domain>`
   - [ ] **Redirect URLs** contains callback URL

---

## 🧪 Local Testing Steps

### Test 1: Dev Server Runs

```bash
npm run dev

# You should see:
# > next dev
# ▲ Next.js 15.x.x
# - Local: http://localhost:3000
```

### Test 2: Login Page Loads

1. Open `http://localhost:3000/login`
2. You should see:
   - [ ] Email input field
   - [ ] Password input field
   - [ ] "Google" button (with Google icon)
   - [ ] "GitHub" button (with GitHub icon)

### Test 3: OAuth Button Click

1. Click the **Google** button
2. You should be redirected to Google login
3. You should **NOT** see:
   - [ ] "Invalid client" error
   - [ ] "Redirect URI mismatch" error
   - [ ] 404 page

### Test 4: Google Authorization

1. On Google login page, sign in with your Google account
2. You should see app authorization request
3. Click **Allow** or **Authorize**
4. You should be redirected back to app

### Test 5: Session Created

After OAuth redirect:
1. You should be at app home page (authenticated)
2. Check browser DevTools:
   - Open **F12** → **Application** tab
   - Click **Cookies**
   - Look for cookies from your domain
   - Should see `sb-` prefixed cookies (Supabase auth)

### Test 6: Session Persistence

1. Refresh page (Cmd+R / Ctrl+F5)
2. You should still be logged in
3. Cookies should still be present

### Test 7: Logout

1. Look for logout button (usually in header or profile menu)
2. Click logout
3. You should be redirected to login page
4. Cookies should be cleared

---

## 🛠️ Browser DevTools Diagnostics

### Check Network Tab

1. Open DevTools → **Network** tab
2. Clear history
3. Click Google OAuth button
4. You should see:
   - [ ] Request to Google (`accounts.google.com`)
   - [ ] Redirect back to your domain
   - [ ] Request to `/auth/callback`
   - [ ] Final redirect to home page

### Check Console Tab

1. Open DevTools → **Console** tab
2. Look for errors (red text)
3. Common errors:
   - "Supabase not initialized" → Check `.env.local`
   - "Invalid client" → Check Google credentials in Supabase
   - "Redirect URI mismatch" → Check callback URL configuration

### Check Storage Tab

1. Open DevTools → **Application** tab
2. Click **Cookies**
3. Look for your domain
4. Should see cookies like:
   - `sb-<project-id>-auth-token`
   - `sb-<project-id>-auth-token-code-verifier`

If these are missing after OAuth, session isn't being persisted.

---

## 📋 Verification Checklist

### Google Cloud Console
- [ ] Project created
- [ ] Google+ API enabled
- [ ] OAuth 2.0 credentials created
- [ ] Client ID visible
- [ ] Client Secret saved (securely, not in code)
- [ ] Redirect URIs include callback URL

### Supabase Dashboard
- [ ] Google provider appears in Providers list
- [ ] Google provider is ENABLED
- [ ] Client ID pasted into Supabase
- [ ] Client Secret pasted into Supabase
- [ ] Save successful (no error)
- [ ] Site URL configured correctly
- [ ] Redirect URLs include callback URL

### Local Environment
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_SUPABASE_URL` set
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` set
- [ ] `.env.local` in `.gitignore`

### Code
- [ ] Google button visible on login page
- [ ] `lib/auth-store.ts` has `loginWithOAuth` method
- [ ] `/app/auth/callback/route.ts` exists
- [ ] `components/auth/AuthProvider.tsx` exists

### OAuth Flow
- [ ] Click button → redirects to Google
- [ ] Authorize → redirects back to app
- [ ] Page loads → user is authenticated
- [ ] Refresh → session persists
- [ ] Cookies present in DevTools
- [ ] Logout works and clears session

---

## 🔧 Troubleshooting Guide

### OAuth Button Does Nothing

**Diagnosis**:
1. Open DevTools → **Console**
2. Look for JavaScript errors
3. Check `.env.local` variables

**Solutions**:
```bash
# 1. Restart dev server
npm run dev

# 2. Verify .env.local is loaded
grep NEXT_PUBLIC_SUPABASE_URL .env.local

# 3. Clear cache
rm -rf .next
npm run dev

# 4. Check Supabase Google provider is enabled
# Go to Supabase → Authentication → Providers → Google (should be ON)
```

### "Redirect URI mismatch" Error

**Diagnosis**:
1. Google is rejecting the redirect URL
2. URLs don't match between Google Console and actual request

**Solutions**:
1. **Check exact URL**:
   - Google Console: Settings → Authorized redirect URIs
   - Should be exactly: `http://localhost:3000/auth/callback`
   - ⚠️ Watch for typos, extra slashes, or protocol mismatches

2. **Update if needed**:
   - Google Console → Credentials → OAuth 2.0 Client
   - Edit → Update redirect URI → Save
   - Wait 1-2 minutes for changes to propagate

### "Invalid client" Error

**Diagnosis**:
1. Client ID or Client Secret is wrong
2. Credentials aren't configured in Supabase

**Solutions**:
1. Verify credentials in Supabase:
   ```bash
   # Go to Supabase → Authentication → Providers → Google
   # Verify Client ID and Secret are filled in
   # Check for typos
   ```

2. Get fresh credentials:
   - Go to Google Cloud Console
   - Create new OAuth 2.0 credentials
   - Copy Client ID and Secret
   - Update in Supabase

### Session Not Persisting

**Diagnosis**:
1. Cookies aren't being set or persisted
2. Supabase session configuration issue

**Solutions**:
1. Check Site URL in Supabase:
   - For local: `http://localhost:3000`
   - For production: `https://<your-domain>`
   - Should match your domain exactly

2. Check cookie settings:
   - DevTools → Application → Cookies
   - Look for `sb-` cookies
   - If none exist, cookies aren't being set

3. Try clearing cookies:
   ```bash
   # DevTools → Application → Cookies → Right-click domain → Clear
   # Then retry OAuth flow
   ```

### Works Locally but Not in Production

**Diagnosis**:
1. Vercel environment variables not set
2. Production redirect URI not configured

**Solutions**:
1. Verify Vercel environment variables:
   - Vercel Dashboard → Project Settings → Environment Variables
   - Ensure:
     - `NEXT_PUBLIC_SUPABASE_URL` is set
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
   - Click "Redeploy" if changed

2. Verify Google Cloud Console:
   - Add production domain to redirect URIs:
     - `https://<your-vercel-url>/auth/callback`
     - `https://<your-domain>/auth/callback`

3. Verify Supabase URL Configuration:
   - Site URL should be production domain
   - Redirect URLs should include production URLs

---

## 📊 Debug Output

### Checking Environment Variables (Local)

```bash
# See what's loaded in dev
npm run dev

# Check .env.local has values
cat .env.local | grep NEXT_PUBLIC

# Verify no typos
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Checking Supabase Configuration

Via browser console:
```javascript
// Check what Supabase client sees
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
console.log(supabase) // Should show initialized client
```

---

## ✅ Final Verification

When everything is working:

1. ✅ Click Google button
2. ✅ Redirected to Google login page
3. ✅ Sign in with Google account
4. ✅ See authorization request
5. ✅ Redirected back to app
6. ✅ User is logged in
7. ✅ Refresh → still logged in
8. ✅ `sb-*` cookies visible
9. ✅ Logout clears session

---

## 📞 Getting Help

If stuck:

1. Check **Supabase logs**: Authentication → Logs
2. Check **Vercel logs**: Settings → Logs (in production)
3. Check **browser console**: F12 → Console tab
4. Check **Google Cloud console**: Credentials → OAuth 2.0 logs
5. Review `GOOGLE_OAUTH_SETUP.md` → Troubleshooting section

