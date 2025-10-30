# Quick Onboarding Flow Reference

## What Changed? 🔄

### Before (Broken)
```
Sign Up → Verify Email Message → Click Email Link → ❌ Back to Login → Dashboard
                                                     (Session lost, bad UX)
```

### After (Fixed) ✅
```
Sign Up → Verify Email Message → Click Email Link → ✅ Pricing Page → Dashboard
                                                     (Session kept, smooth UX)
```

---

## The Fix in 4 Steps

### 1️⃣ Auth Callback - Smart Routing
**File:** `app/auth/callback/route.ts`

```typescript
// After email verification, check if user has organizations
if (!hasOrganizations) {
  redirect('/pricing?onboarding=true')  // First-time user
} else {
  redirect('/')  // Returning user
}
```

### 2️⃣ Middleware - Respects Onboarding Status
**File:** `middleware.ts`

```typescript
// Don't force redirect to dashboard if user has no organizations
if (user && on_login_page) {
  if (hasOrganizations) {
    redirect('/')  // Dashboard
  } else {
    redirect('/pricing?onboarding=true')  // Complete onboarding
  }
}
```

### 3️⃣ Email Verified Page - Auto-Redirect
**File:** `app/email-verified/page.tsx`

```typescript
// Check auth status and auto-redirect
if (isAuthenticated) {
  if (hasOrganizations) redirect('/')
  else redirect('/pricing?onboarding=true')
}
```

### 4️⃣ Pricing Page - Welcome Banner
**File:** `app/pricing/page.tsx`

```typescript
// Show welcoming message for first-time users
if (isOnboarding) {
  <Banner>🎉 Welcome to Javelina!</Banner>
}
```

---

## Key Concepts

### Organization Status = Onboarding Status
- **Has organizations** = Completed onboarding → Dashboard
- **No organizations** = New user → Pricing Page

### The Onboarding Flag
- `?onboarding=true` parameter signals first-time user
- Shows tailored messaging and welcome banner
- Makes the experience feel curated

### Session Management
- Email verification now creates AND keeps the session
- No more forced re-login
- User flows directly from email → pricing → dashboard

---

## Testing the Flow

### Manual Test (End-to-End)
```bash
1. Go to /signup
2. Enter email + password + name
3. Submit form
4. Check email inbox
5. Click verification link
6. ✅ Should see pricing page with welcome banner
7. Select free plan
8. ✅ Should see dashboard
```

### Test with Existing User
```bash
1. Go to /login
2. Login with account that has organizations
3. ✅ Should go to dashboard (not pricing)
```

---

## Quick Troubleshooting

### User stuck on login page?
- Check middleware - ensure organization check is working
- Verify user has valid session

### User not seeing pricing page?
- Check auth callback route - organization query might be failing
- Verify `organization_members` table has correct data

### Onboarding banner not showing?
- Check URL has `?onboarding=true` parameter
- Verify `useSearchParams()` is working

---

## Visual Flow Chart

```
┌─────────────┐
│   Sign Up   │
└──────┬──────┘
       │
       v
┌─────────────────┐
│ Verify Email Msg│
└──────┬──────────┘
       │
       v
┌────────────────────┐
│ User Clicks Link   │
└──────┬─────────────┘
       │
       v
┌────────────────────┐
│  Auth Callback     │
│  (checks orgs)     │
└──────┬─────────────┘
       │
       ├─────── Has Orgs ─────> Dashboard ✅
       │
       └───── No Orgs ─────> Pricing Page 🎉
                                    │
                                    v
                              Select Plan
                                    │
                                    v
                              Dashboard ✅
```

---

## Critical Files

| File | Purpose |
|------|---------|
| `app/auth/callback/route.ts` | Routes users based on org status |
| `middleware.ts` | Protects routes, respects onboarding |
| `app/email-verified/page.tsx` | Auto-redirects authenticated users |
| `app/pricing/page.tsx` | Shows onboarding welcome banner |
| `app/login/page.tsx` | Routes to pricing for first-time users |

---

## Success Metrics

Once deployed, monitor:
- ✅ Email verification → Pricing page conversion rate
- ✅ Pricing page → Plan selection conversion rate
- ✅ Time from signup to dashboard access
- ✅ Drop-off points in the flow

Target: **< 2 minutes from signup to dashboard access**

---

**Last Updated:** October 24, 2025  
**Status:** Ready for testing ✅

