# Google OAuth Setup Guide for Javelina

This guide provides step-by-step instructions for setting up Google OAuth with Supabase.

## Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- Access to your Supabase project dashboard
- Your application domains ready (local, Vercel, or production)

---

## Phase 1: Google Cloud Console Setup

### Step 1.1: Create or Select a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Either:
   - Click **NEW PROJECT** to create a new one
   - Select an existing project
4. Name your project (e.g., "Javelina DNS")
5. Click **CREATE**

### Step 1.2: Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on **Google+ API**
4. Click **ENABLE**
5. Wait for the API to be enabled (this may take a few moments)

### Step 1.3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** button
3. Select **OAuth client ID**
4. You may see a warning about "OAuth consent screen". If so:
   - Click **CONFIGURE CONSENT SCREEN**
   - Select **External** as the user type
   - Click **CREATE**
   - Fill in the required fields:
     - **App name**: Javelina DNS Management
     - **User support email**: Your email
     - **Developer contact information**: Your email
   - Click **SAVE AND CONTINUE**
   - On "Scopes" page, click **SAVE AND CONTINUE**
   - On "Test users" page, click **SAVE AND CONTINUE**
   - Review summary and click **BACK TO DASHBOARD**

5. Now create the credential:
   - Go back to **Credentials**
   - Click **+ CREATE CREDENTIALS** → **OAuth client ID**
   - Select **Web application** as the application type
   - Name it (e.g., "Javelina Web App")

### Step 1.4: Configure Authorized Redirect URIs

In the OAuth client ID creation form, add **Authorized redirect URIs**:

```
http://localhost:3000/auth/callback
```

**For production, also add:**

```
https://<your-vercel-url>/auth/callback
https://<your-domain>/auth/callback
```

Replace placeholders:
- `<your-vercel-url>` - Your Vercel deployment URL (e.g., `javelina.vercel.app`)
- `<your-domain>` - Your production domain (e.g., `javelina.com`)

Then click **CREATE**.

### Step 1.5: Copy Your Credentials

After creation, you'll see a modal with your credentials:

- **Client ID** - Copy this
- **Client Secret** - Copy this (keep this secret!)

Store these temporarily in a secure location. You'll need them in Phase 2.

---

## Phase 2: Supabase Provider Configuration

### Step 2.1: Access Supabase Authentication Settings

1. Go to your [Supabase project dashboard](https://app.supabase.com)
2. Click on your project
3. In the left sidebar, go to **Authentication** → **Providers**

### Step 2.2: Enable Google Provider

1. In the Providers list, find **Google**
2. Click on it to expand
3. Toggle the **Enabled** switch to ON
4. Paste your **Client ID** from Phase 1.5 into the "Client ID" field
5. Paste your **Client Secret** from Phase 1.5 into the "Client Secret" field
6. Click **Save**

### Step 2.3: Verify URL Configuration

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to:
   - For development: `http://localhost:3000`
   - For production: `https://<your-domain>`

3. Under **Redirect URLs**, verify these are present:
   - `http://localhost:3000/auth/callback`
   - `https://<your-vercel-url>/auth/callback` (if using Vercel)
   - `https://<your-domain>/auth/callback` (if using custom domain)

---

## Phase 3: Local Testing

### Step 3.1: Set Up Local Environment

1. Ensure you have `.env.local` in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Get these values from Supabase: **Settings** → **API**

2. Start the development server:

```bash
npm run dev
```

3. Open `http://localhost:3000/login`

### Step 3.2: Test OAuth Flow

1. Click the **Google** button
2. You'll be redirected to Google's login page
3. Sign in with your Google account
4. Authorize the app to access your basic profile
5. You should be redirected back to the app
6. Check that you're logged in (look for user info in the sidebar/header)

### Step 3.3: Verify Session Persistence

1. Refresh the page (F5 or Cmd+R)
2. You should remain logged in
3. Open **DevTools** → **Application** → **Cookies**
4. Look for `sb-*` cookies (Supabase auth cookies)
5. If cookies are present, the session is properly persisted

### Step 3.4: Test Logout

1. Click **Sign Out** (usually in profile menu or sidebar)
2. You should be logged out
3. The `sb-*` cookies should be cleared
4. Try refreshing - you should remain logged out

---

## Phase 4: Production Deployment (Vercel)

### Step 4.1: Deploy to Vercel

1. Push your code to GitHub:

```bash
git add .
git commit -m "feat: implement google oauth"
git push origin feat/google-oauth
```

2. Create a Pull Request and merge to `main`
3. Vercel will auto-deploy when `main` is updated

### Step 4.2: Verify Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Ensure these variables are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Note: You don't need to add Google credentials to Vercel - they're stored in Supabase, which your app accesses via the anon key.

### Step 4.3: Test OAuth in Production

1. Go to your production URL: `https://<your-vercel-url>/login`
2. Click the **Google** button
3. Complete the OAuth flow
4. Verify you're logged in and can navigate the app
5. Check Vercel function logs if there are any errors: **Settings** → **Logs**

---

## Troubleshooting

### "Redirect URI mismatch" Error

**Problem**: OAuth fails with "redirect_uri_mismatch"

**Solution**:
1. Verify the callback URL in Google Cloud Console matches exactly:
   - Should be: `https://<your-domain>/auth/callback` or `http://localhost:3000/auth/callback`
2. Check Supabase URL Configuration has the same URLs
3. Ensure you saved changes in both places

### "Invalid client" Error

**Problem**: OAuth shows "invalid_client" error

**Solution**:
1. Double-check Client ID and Secret are correct in Supabase
2. Verify they haven't been regenerated in Google Cloud Console
3. If you regenerated credentials, update them in Supabase immediately

### OAuth Button Does Nothing

**Problem**: Clicking Google button has no effect

**Solution**:
1. Check browser console (F12) for JavaScript errors
2. Verify Supabase credentials are set in `.env.local`
3. Verify Google provider is ENABLED in Supabase
4. Restart dev server: `npm run dev`

### Session Not Persisting After OAuth

**Problem**: User logged in but gets logged out after refresh

**Solution**:
1. Check browser cookies (DevTools → Application → Cookies)
2. Verify `sb-*` cookies are present and not marked as "Secure" only (if testing locally without HTTPS)
3. Check that Site URL in Supabase matches your domain
4. Verify middleware is working (check server logs)

### Works Locally but Not in Production

**Problem**: OAuth works on `localhost:3000` but fails on production domain

**Solution**:
1. Verify production URL is added to Google Cloud Console redirect URIs
2. Verify production URL is added to Supabase URL Configuration
3. Check Vercel environment variables are set correctly
4. Look at Vercel function logs for specific error messages
5. Clear browser cache and cookies, then test again

---

## Security Checklist

Before going live:

- [ ] Google OAuth credentials are stored only in Supabase (not in code)
- [ ] `.env.local` is in `.gitignore` (don't commit credentials)
- [ ] Production redirect URIs don't include `localhost`
- [ ] Supabase RLS (Row Level Security) policies are configured
- [ ] Email verification is enabled (if required)
- [ ] MFA is available for admin users
- [ ] You're using HTTPS in production (Vercel provides this by default)

---

## Testing OAuth with Different Users

You can test OAuth with multiple Google accounts:

1. Log in with Account A
2. Go to logout page or clear cookies
3. Log in with Account B
4. Each user should have their own profile and data

This verifies that each OAuth login creates a unique user in your system.

---

## Next Steps

After OAuth is working:

1. Configure GitHub OAuth (similar process) if desired
2. Add profile data syncing (picture, name, etc.) from OAuth providers
3. Set up email verification
4. Implement role-based access control (RBAC)
5. Add multi-factor authentication (MFA)

---

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Supabase Dashboard](https://app.supabase.com/)

