# Auth0 Hosted Pages Inventory

## Overview

This document lists **every Auth0 hosted page** currently used in your application and how each one is triggered.

**TL;DR**: You use **6 Auth0 hosted pages** (4 primary + 2 secondary). All would benefit from custom domain.

---

## Primary Auth0 Hosted Pages (User-Facing)

These are the main pages users interact with:

### 1. **Login Page** (Universal Login)
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/login/identifier?state=...`

**When shown**:
- User clicks "Login" button on landing page
- Triggered by: `lib/auth-store.ts` → `login()` function
- Flow: Frontend → `${API_URL}/auth/login` (backend) → Auth0 login page

**Code reference**:
```typescript:270:283:lib/auth-store.ts
// Login - redirect to Auth0 via Express
login: () => {
  // Check if we're using placeholder Supabase credentials (development mode with mock data)
  const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
  
  if (isPlaceholderMode) {
    // Mock mode - no-op for now (would need custom mock login flow)
    console.warn('Mock mode login not implemented for Auth0 migration')
    return
  }
  
  // Redirect to Express auth endpoint which will redirect to Auth0
  window.location.href = `${API_URL}/auth/login`
},
```

**What users see**:
- Login form (email/password)
- "Sign up" link
- OAuth buttons (Google, GitHub)
- "Forgot password?" link

**Custom domain impact**: HIGH - This is the most visible page to users

---

### 2. **Signup Page** (Universal Login with screen_hint)
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/signup?state=...`

**When shown**:
- User clicks "Get Started" button on landing page
- Triggered by: `lib/auth-store.ts` → `signup()` function
- Flow: Frontend → `${API_URL}/auth/login?screen_hint=signup` → Auth0 signup page

**Code reference**:
```typescript:285:299:lib/auth-store.ts
// Signup - redirect to Auth0 via Express with screen_hint=signup
signup: () => {
  // Check if we're using placeholder Supabase credentials (development mode with mock data)
  const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
  
  if (isPlaceholderMode) {
    // Mock mode - no-op for now (would need custom mock signup flow)
    console.warn('Mock mode signup not implemented for Auth0 migration')
    return
  }
  
  // Redirect to Express auth endpoint with screen_hint=signup parameter
  // This tells Auth0 to show the signup screen instead of login screen
  window.location.href = `${API_URL}/auth/login?screen_hint=signup`
},
```

**What users see**:
- Signup form (email/password/name)
- OAuth signup options
- "Already have an account?" link

**Custom domain impact**: HIGH - First impression for new users

---

### 3. **Password Reset Request Page** (Check Your Email)
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/reset-password/request?state=...`

**When shown**:
- User clicks "Forgot password?" on Auth0 login page
- Triggered by: Auth0 Universal Login UI
- OR: User navigates to deprecated `/forgot-password` page (see note below)

**What users see**:
- "Check Your Email" message
- **THE PROBLEM**: No navigation back to app (this is the UX issue you reported!)

**Custom domain impact**: HIGH - This is one of the pages causing your UX problem

**Note**: You have a deprecated frontend forgot password page at `app/forgot-password/page.tsx`, but `resetPassword()` function now returns an error directing users to Auth0:

```typescript:320:329:lib/auth-store.ts
// Reset password - Auth0 handles this via Universal Login
resetPassword: async (email: string, captchaToken?: string) => {
  // With Auth0 migration, password resets happen through Auth0's password reset flow
  // Users should use the "Forgot Password" link on the Auth0 login page
  console.warn('Direct password reset not supported with Auth0 - use Universal Login forgot password flow');
  return { 
    success: false, 
    error: 'Please use the forgot password link on the login page'
  }
},
```

---

### 4. **Password Reset Success Page** (Password Changed!)
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/reset-password/change?state=...`

**When shown**:
- User clicks password reset link from email
- User enters new password and submits
- Success page shows confirmation

**What users see**:
- Green checkmark icon
- "Password Changed!" message
- "Your password has been changed successfully."
- **THE PROBLEM**: No button to return to app (second screenshot you shared!)

**Custom domain impact**: CRITICAL - This is the other page causing your UX problem. With custom domain + Application Login URI set, Auth0 will automatically add a "Continue" button here

---

## Secondary Auth0 Hosted Pages (Less Common)

### 5. **Email Verification Page**
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/email-verification?state=...`

**When shown**:
- User clicks email verification link from welcome/verification email
- Shown if Auth0 is configured to require email verification

**What users see**:
- "Email verified!" success message
- Redirect to application

**Custom domain impact**: MEDIUM - Less frequently seen, but still benefits from branding

**Note**: You have email verification handling in your app:
- `app/email-verified/page.tsx` - Frontend success page
- `components/auth/EmailVerificationBanner.tsx` - Banner prompting verification
- But Auth0's hosted verification page is shown first

---

### 6. **Logout Confirmation Page** (Federated Logout)
**Current URL**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/v2/logout?...`

**When shown**:
- User clicks "Log Out" 
- Triggered by: `lib/auth-store.ts` → `logout()` function
- Flow: Frontend → `/api/logout` → Backend `/auth/logout` → Auth0 logout → Redirect to frontend

**Code reference**:
```typescript:352:405:lib/auth-store.ts
// Logout - navigate to Next.js API route for smooth transition
logout: async () => {
  console.log('[AUTH] Logout initiated')
  
  // Check if we're using placeholder Supabase credentials (development mode with mock data)
  const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
  
  // CRITICAL: Set flag to prevent re-initialization after logout
  // This allows AuthProvider to skip session check when page reloads after logout
  try {
    sessionStorage.setItem('just-logged-out', 'true')
  } catch (error) {
    console.error('[AUTH] Could not set logout flag:', error)
  }
  
  if (isPlaceholderMode) {
    // Mock mode - clear state and redirect
    set({
      user: null,
      isAuthenticated: false,
      profileReady: false,
      profileError: null,
    })
    
    // Broadcast logout to other tabs
    try {
      const sync = getIdleSync()
      sync.publishLogout()
      localStorage.removeItem('javelina-last-activity')
    } catch (error) {
      console.error('Error broadcasting logout:', error)
    }
    
    // Redirect to root
    window.location.href = '/'
    return
  }
  
  // Broadcast logout to other tabs (non-blocking, fires before navigation)
  try {
    const sync = getIdleSync()
    sync.publishLogout()
    localStorage.removeItem('javelina-last-activity')
  } catch (error) {
    // Ignore broadcast errors to avoid delaying logout
  }
  
  // Navigate to Next.js API route - single smooth transition
  // Flow: /api/logout → Express → Auth0 logout → Auth0 redirects to /
  // When page loads at /, AuthProvider sees 'just-logged-out' flag and skips auth check
  // Result: One clean transition, no flicker, no intermediate states
  console.log('[AUTH] Navigating to /api/logout')
  window.location.href = '/api/logout'
},
```

**What users see**:
- Usually a brief flash (very quick redirect)
- Sometimes shows "Logging out..." message
- Then redirects to your frontend landing page

**Custom domain impact**: LOW - Page is rarely visible (fast redirect)

---

## Auth0 Email Templates (Not Pages, But Related)

These send users TO the hosted pages above:

### 1. **Change Password (Link) Email**
**Triggers**: Password Reset Request Page (#3)
**Links to**: Password Reset Success Page (#4)

**Current From**: `no-reply@auth0user.net` (or your Resend custom: `hello@javelina.cloud`)
**Link contains**: `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/reset-password/...`

**Custom domain impact**: HIGH - Links in email will show your domain instead of Auth0

### 2. **Verification Email (Welcome)**
**Triggers**: Email Verification Page (#5)
**Links to**: Email verified success

**Custom domain impact**: MEDIUM - Professional appearance in welcome email

### 3. **Change Password Confirmation Email**
**Triggers**: Sent AFTER password is successfully changed
**Purpose**: Notification only (no link)

**Custom domain impact**: LOW - No hosted page involved

---

## Summary Table

| # | Page Name | Current URL | User Visibility | UX Issue? | Custom Domain Impact |
|---|-----------|-------------|-----------------|-----------|----------------------|
| 1 | Login | `dev-pyrf...auth0.com/u/login` | HIGH | No | HIGH - Most seen page |
| 2 | Signup | `dev-pyrf...auth0.com/u/signup` | HIGH | No | HIGH - First impression |
| 3 | Password Reset Request | `dev-pyrf...auth0.com/u/reset-password/request` | MEDIUM | **YES** - No back button | HIGH - Fixes UX issue |
| 4 | Password Reset Success | `dev-pyrf...auth0.com/u/reset-password/change` | MEDIUM | **YES** - No continue button | **CRITICAL** - Fixes UX issue |
| 5 | Email Verification | `dev-pyrf...auth0.com/u/email-verification` | LOW | No | MEDIUM |
| 6 | Logout | `dev-pyrf...auth0.com/v2/logout` | VERY LOW | No | LOW - Barely visible |

---

## Custom Domain Benefits by Page

### With Custom Domain (`auth.javelina.cloud`):

**All pages** would change from:
```
https://dev-pyrfyfctb4wx0f3k.us.auth0.com/u/login/...
```

To:
```
https://auth.javelina.cloud/u/login/...
```

### Specific Benefits:

**Login & Signup (Pages 1-2)**:
- ✅ Professional appearance
- ✅ Users trust the domain
- ✅ Consistent branding
- ✅ Can customize page templates more easily

**Password Reset Pages (Pages 3-4)**:
- ✅ **SOLVES YOUR UX ISSUE**: Can set Application Login URI with HTTPS
- ✅ Auth0 automatically adds "Return to Application" buttons
- ✅ No more trapped users!
- ✅ Professional URLs in password reset emails

**Email Verification (Page 5)**:
- ✅ Professional links in verification emails
- ✅ Branded success page

**Logout (Page 6)**:
- ✅ Consistent domain (though rarely seen)

---

## Pages You DON'T Use (But Available)

These Auth0 hosted pages exist but you're not using them:

- ❌ **MFA Enrollment Page** - Not enabled yet
- ❌ **MFA Challenge Page** - Not enabled yet
- ❌ **Consent Page** - Not needed for your use case
- ❌ **Custom Error Pages** - Using defaults

If you enable MFA in the future, those would also benefit from custom domain.

---

## Deprecated Frontend Pages (Can Be Removed)

These frontend pages are now handled by Auth0:

1. **`app/login/page.tsx`** - Replaced by Auth0 Universal Login
   - Status: Deprecated (not removed yet)
   - Can safely delete or redirect to landing page

2. **`app/signup/page.tsx`** - Replaced by Auth0 Universal Login
   - Status: Deprecated (not removed yet)
   - Can safely delete

3. **`app/forgot-password/page.tsx`** - Replaced by Auth0 password reset
   - Status: Deprecated but still exists
   - `resetPassword()` function returns error directing to Auth0

4. **`app/reset-password/page.tsx`** - Replaced by Auth0 password reset success
   - Status: Deprecated (not removed yet)
   - Can safely delete

**Recommendation**: Clean up these pages after Auth0 migration is complete.

---

## OAuth Provider Pages (External, Not Auth0)

When users click "Continue with Google" or "Continue with GitHub":
- They're redirected to Google/GitHub login pages
- These are NOT Auth0 pages (external providers)
- Custom domain doesn't affect these
- Users return to Auth0 callback after OAuth

---

## Backend Endpoints (Not Hosted Pages)

These are YOUR backend endpoints that interact with Auth0:

1. **`/auth/login`** - Initiates Auth0 flow
2. **`/auth/callback`** - Handles Auth0 callback
3. **`/auth/logout`** - Clears session, returns Auth0 logout URL
4. **`/auth/me`** - Returns current session info

These are not affected by custom domain (they're your backend).

---

## Answer: How Many Pages Need Custom Domain?

**Short answer**: **All 6 hosted pages** benefit from custom domain.

**Priority ranking**:

1. **CRITICAL** (Fixes your UX issue):
   - Password Reset Success Page (#4)
   - Password Reset Request Page (#3)

2. **HIGH** (Most visible to users):
   - Login Page (#1)
   - Signup Page (#2)

3. **MEDIUM** (Less frequently seen):
   - Email Verification Page (#5)

4. **LOW** (Rarely visible):
   - Logout Page (#6)

**Reality**: You can't apply custom domain to SOME pages - it's all or nothing. When you set up a custom domain, ALL Auth0 hosted pages automatically use it.

---

## Recommendation

**Set up custom domain now** because:

1. ✅ Fixes password reset UX issue (your main problem)
2. ✅ Improves all 6 pages at once
3. ✅ One-time 30-minute setup
4. ✅ Free (no additional cost)
5. ✅ Production-ready
6. ✅ Can't selectively apply - all pages benefit together

**You're not setting up custom domain for 6 separate pages - you're setting it up ONCE for your entire Auth0 tenant, and all pages automatically benefit.**

---

## Next Steps

1. Follow `AUTH0_CUSTOM_DOMAIN_SETUP_GUIDE.md`
2. Set up `auth.javelina.cloud`
3. Update backend `AUTH0_DOMAIN` env var
4. Test all 6 flows
5. Enjoy professional URLs and fixed UX!

---

**Bottom Line**: Custom domain affects **all 6 Auth0 hosted pages** you currently use, and there's no way to apply it selectively. The good news: one setup fixes everything!
