# Supabase Integration Setup Checklist

## Phase 1: Infrastructure Setup ✅ (Partially Complete)

### 1.1 Package Installation
- [x] Install `@supabase/ssr` package
- [x] Install `@supabase/supabase-js` package

### 1.2 Environment Variables
- [ ] Create `.env.local` file in project root
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` (get from Supabase dashboard)
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` (get from Supabase dashboard)
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` (get from Supabase dashboard)
- [ ] Add `NEXT_PUBLIC_SITE_URL=http://localhost:3000`
- [ ] Verify variables are synced in Vercel dashboard

### 1.3 Database Setup
- [ ] Open Supabase SQL Editor
- [ ] Run `supabase/schema.sql` file
- [ ] Verify tables created: `profiles`, `organizations`, `organization_members`
- [ ] Verify RLS is enabled on all tables
- [ ] Test trigger by signing up a test user

### 1.4 OAuth Configuration
- [ ] Create Google OAuth credentials (optional but recommended)
- [ ] Add Google Client ID/Secret to Supabase
- [ ] Create GitHub OAuth app (optional but recommended)
- [ ] Add GitHub Client ID/Secret to Supabase
- [ ] Configure redirect URLs in Supabase
- [ ] Update email templates with correct URLs

### 1.5 Verification
- [ ] Test connection to Supabase (can run test query in SQL Editor)
- [ ] Verify environment variables are accessible in local dev
- [ ] Check Vercel environment variables are set correctly

---

## Phase 2: Core Authentication Files (Next)

### 2.1 Supabase Client Utilities
- [ ] Create `lib/supabase/client.ts` (browser client)
- [ ] Create `lib/supabase/server.ts` (server client)

### 2.2 Middleware
- [ ] Create root `middleware.ts` for route protection
- [ ] Test middleware protects routes correctly

### 2.3 Auth Routes
- [ ] Create `app/auth/callback/route.ts` (OAuth callback handler)
- [ ] Create `app/auth/signout/route.ts` (sign out route)

### 2.4 Custom Hooks
- [ ] Create `lib/hooks/useUser.ts`
- [ ] Create `lib/hooks/useProfile.ts`

### 2.5 TypeScript Types
- [ ] Generate or create `types/supabase.ts`

---

## Phase 3: Update Existing Files (After Phase 2)

### 3.1 Auth Store
- [ ] Update `lib/auth-store.ts` to use Supabase
- [ ] Replace mock login with real auth
- [ ] Replace mock logout with real signout
- [ ] Add signup function
- [ ] Add password reset function

### 3.2 Components
- [ ] Update `components/auth/ProtectedRoute.tsx`
- [ ] Update `components/layout/Header.tsx`
- [ ] Update `app/providers.tsx`

### 3.3 Pages
- [ ] Update `app/login/page.tsx` with Supabase auth
- [ ] Create `app/signup/page.tsx` (new)
- [ ] Create `app/forgot-password/page.tsx` (new)
- [ ] Update `app/page.tsx` (dashboard) if needed

---

## Phase 4: Testing & Validation

### 4.1 Local Testing
- [ ] Test email/password signup
- [ ] Test email/password login
- [ ] Test Google OAuth (if configured)
- [ ] Test GitHub OAuth (if configured)
- [ ] Test logout
- [ ] Test session persistence (refresh page)
- [ ] Test protected routes redirect to login
- [ ] Test password reset flow

### 4.2 Vercel Preview Testing
- [ ] Deploy to preview branch
- [ ] Test all auth flows on preview URL
- [ ] Verify cookies work correctly
- [ ] Check Vercel logs for errors

### 4.3 Production Testing
- [ ] Deploy to production
- [ ] Test all auth flows on production
- [ ] Monitor for any errors
- [ ] Verify session management works

---

## Current Status: Phase 1 Infrastructure Setup

✅ **Completed:**
- Supabase packages installed
- Database schema SQL file created
- Setup documentation created
- OAuth configuration guide created

⏳ **Next Steps:**
1. Create `.env.local` with your Supabase credentials
2. Run the SQL schema in Supabase SQL Editor
3. (Optional) Configure OAuth providers
4. Verify setup is complete

Then we can move to **Phase 2: Core Authentication Files**

