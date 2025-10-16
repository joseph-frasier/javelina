<!-- f2a4a077-3c75-45ec-ac6c-ebef79e3a4e3 fc235675-0fe4-4920-9fbe-9b6bcb21d2e4 -->
# Google OAuth Implementation Plan

## Overview

The app already has OAuth infrastructure in place (UI buttons, callback handler, auth store method). We need to complete the Google Cloud and Supabase configuration, set up environment variables securely, and validate the flow works in both local and production environments.

## Key Existing Components

- **OAuth UI**: Google button on `/app/login/page.tsx` (line 266)
- **Auth Logic**: `loginWithOAuth('google')` in `/lib/auth-store.ts` (line 355-366)
- **Callback Handler**: `/app/auth/callback/route.ts` exchanges code for session
- **Auth Provider**: `/components/auth/AuthProvider.tsx` manages session state

## Implementation Steps

### Phase 1: Google Cloud Console Setup

1. Create or select a Google Cloud project
2. Enable Google+ API
3. Create OAuth 2.0 Web Application credentials
4. Configure authorized redirect URIs:

- Local: `http://localhost:3000/auth/callback`
- Production: `https://<your-domain>/auth/callback`
- Vercel: `https://<your-vercel-url>/auth/callback`

5. Save Client ID and Client Secret

### Phase 2: Supabase Provider Configuration

1. Navigate to Authentication → Providers in Supabase dashboard
2. Enable Google provider
3. Paste Client ID and Client Secret from Google Console
4. Verify Site URL and Redirect URLs are correct in Authentication → URL Configuration:

- Site URL: `https://<your-domain>` or `http://localhost:3000`
- Redirect URLs: Include all URIs from Phase 1

### Phase 3: Environment Variables Setup

1. Create or update `.env.local` with:

- `NEXT_PUBLIC_SUPABASE_URL` (already exists)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (already exists)

2. Create `.env.example` template for reference
3. Document which variables are public (NEXT_PUBLIC_*) vs private
4. Verify Vercel environment variables are synced (Settings → Environment Variables)

### Phase 4: Verify OAuth Flow

1. Test locally: Click Google button → Redirect to Google → Authorize → Return to callback → Check session
2. Verify session persistence across page reloads
3. Check browser DevTools → Application → Cookies for Supabase auth cookie
4. Test logout flow clears session

### Phase 5: Production Deployment

1. Deploy to Vercel (should auto-sync from GitHub)
2. Verify Vercel has all environment variables set
3. Test OAuth flow in production
4. Monitor Vercel function logs for any auth errors

### Phase 6: Documentation

1. Update `/supabase/OAUTH_SETUP.md` with any production-specific notes
2. Document the current implementation status
3. Add quick reference for troubleshooting

## Files to Reference

- `/supabase/OAUTH_SETUP.md` - Existing setup guide (mostly complete)
- `/app/login/page.tsx` - OAuth UI (already implemented)
- `/lib/auth-store.ts` - OAuth logic (already implemented)
- `/app/auth/callback/route.ts` - Callback handler (already implemented)
- `.env.example` - Create template if doesn't exist

## Success Criteria

- Google OAuth button successfully redirects to Google login
- User is redirected back to app after authorization
- Session is created and persists across page reloads
- Works in local development and production
- No console errors related to OAuth flow

### To-dos

- [ ] Create Google Cloud project credentials (Client ID & Secret)
- [ ] Enable Google provider in Supabase and add credentials
- [ ] Set up environment variables for local and production
- [ ] Test OAuth flow locally (login, callback, session)
- [ ] Deploy to Vercel and verify environment variables
- [ ] Test OAuth flow in production
- [ ] Update OAUTH_SETUP.md with completion status and notes