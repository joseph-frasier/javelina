# Google OAuth Implementation Checklist

This is a quick reference checklist for implementing Google OAuth. For detailed instructions, see `GOOGLE_OAUTH_SETUP.md`.

## Pre-Setup
- [ ] Have Google account ready
- [ ] Have access to Google Cloud Console
- [ ] Have access to Supabase project
- [ ] Know your application domains (localhost, Vercel URL, production domain)

## Google Cloud Console (Phase 1)

### Create Project & Enable API
- [ ] Create new Google Cloud project or select existing one
- [ ] Enable Google+ API in the project
- [ ] Navigate to APIs & Services → Credentials

### OAuth Consent Screen
- [ ] Configure OAuth consent screen (External)
- [ ] Fill in app name, support email, developer contact
- [ ] Accept default scopes
- [ ] Add test users if needed

### Create OAuth Credentials
- [ ] Create OAuth 2.0 Web Application credentials
- [ ] Add redirect URI: `http://localhost:3000/auth/callback`
- [ ] Add redirect URI: `https://<vercel-url>/auth/callback`
- [ ] Add redirect URI: `https://<production-domain>/auth/callback`
- [ ] Copy and securely store:
  - [ ] Client ID
  - [ ] Client Secret

## Supabase Configuration (Phase 2)

### Enable Google Provider
- [ ] Go to Authentication → Providers
- [ ] Find and click Google provider
- [ ] Toggle Enable switch ON
- [ ] Paste Client ID
- [ ] Paste Client Secret
- [ ] Click Save

### Verify URL Configuration
- [ ] Go to Authentication → URL Configuration
- [ ] Set Site URL to `http://localhost:3000` or `https://<domain>`
- [ ] Verify redirect URLs include:
  - [ ] `http://localhost:3000/auth/callback`
  - [ ] `https://<vercel-url>/auth/callback`
  - [ ] `https://<production-domain>/auth/callback`

## Local Environment (Phase 3)

### Setup
- [ ] Copy `.env.example` to `.env.local`
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` from Supabase Settings → API
- [ ] Set `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase Settings → API
- [ ] Verify `.env.local` is in `.gitignore`

### Testing
- [ ] Start dev server: `npm run dev`
- [ ] Go to `http://localhost:3000/login`
- [ ] Click Google button
- [ ] Complete OAuth flow
- [ ] Verify logged in status
- [ ] Refresh page - verify session persists
- [ ] Check browser cookies for `sb-*` auth cookies
- [ ] Click logout
- [ ] Verify logged out and cookies cleared

## Production Deployment (Phase 4)

### Deployment
- [ ] Push code to GitHub on `feat/google-oauth` branch
- [ ] Create and merge Pull Request to `main`
- [ ] Vercel auto-deploys
- [ ] Verify deployment succeeded (check Vercel dashboard)

### Vercel Configuration
- [ ] Go to Vercel project Settings → Environment Variables
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Redeploy from Vercel dashboard (or push new commit)

### Production Testing
- [ ] Go to production URL: `https://<vercel-url>/login`
- [ ] Click Google button
- [ ] Complete OAuth flow
- [ ] Verify logged in
- [ ] Test other app features work
- [ ] Check Vercel logs for errors (Settings → Logs)
- [ ] Test logout

## Verification

### OAuth Flow
- [ ] Google button visible on login page
- [ ] Clicking redirects to Google login
- [ ] After authorization, redirects back to app
- [ ] User is authenticated in the app
- [ ] Session persists across page reloads
- [ ] Logout clears session

### Browser Verification
- [ ] No console errors related to OAuth
- [ ] Supabase auth cookies present: `sb-*`
- [ ] Cookies cleared after logout

### Security
- [ ] No credentials in code or git history
- [ ] `.env.local` not committed
- [ ] Google credentials only in Supabase
- [ ] HTTPS used in production
- [ ] RLS policies in place (if applicable)

## Rollback (If Issues)

If OAuth stops working:

1. Check Google Cloud Console redirect URIs match
2. Check Supabase credentials are still valid
3. Verify Supabase URL Configuration is correct
4. Restart dev server or Vercel deployment
5. Clear browser cookies and cache
6. Check console for error messages

---

## Completion

- [ ] All checklist items completed
- [ ] OAuth working in local environment
- [ ] OAuth working in production
- [ ] Documentation updated
- [ ] Branch merged to main
- [ ] Ready for users

