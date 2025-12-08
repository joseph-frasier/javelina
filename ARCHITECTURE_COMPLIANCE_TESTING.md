# Architecture Compliance Testing Guide

This guide covers testing all frontend changes made to route data operations through the Express API instead of direct Supabase calls.

---

## Prerequisites

1. **Backend API running** with the new endpoints implemented:
   - `GET /api/users/profile`
   - `PUT /api/users/profile`
   - `GET /api/zones/organization/:orgId`
   - `PUT /api/zones/:id/verification`

2. **Frontend running** (`npm run dev`)

3. **Valid test user account** with:
   - At least one organization membership
   - At least one zone in an organization

---

## Test Cases

### 1. Profile Fetch on Login

**What changed:** `lib/auth-store.ts` now fetches profile via Express API

**Steps:**
1. Clear browser storage (or use incognito)
2. Navigate to `/login`
3. Log in with valid credentials
4. Open browser DevTools → Network tab

**Expected Results:**
- [ ] Network request to `GET /api/users/profile` after login
- [ ] User profile displayed correctly in UI
- [ ] User's organizations appear in sidebar/navigation
- [ ] No direct Supabase calls to `profiles` or `organization_members` tables

**Verify in DevTools:**
```
Look for: GET http://localhost:3001/api/users/profile
Should NOT see: Supabase REST calls to /rest/v1/profiles or /rest/v1/organization_members
```

---

### 2. Edit Profile Modal

**What changed:** `components/modals/EditProfileModal.tsx` uses auth store (→ server action → API)

**Steps:**
1. Log in and navigate to profile page or click profile in header
2. Click "Edit Profile" button
3. Change first name, last name, and/or title
4. Click "Save Changes"

**Expected Results:**
- [ ] Modal opens with current profile data populated
- [ ] Network request to `PUT /api/users/profile` on save
- [ ] Success toast appears: "Profile updated successfully"
- [ ] Updated values reflect immediately in UI
- [ ] No direct Supabase calls to `profiles` table

**Error Cases:**
- [ ] Empty first name shows error toast
- [ ] Empty last name shows error toast
- [ ] API error displays error message in toast

---

### 3. Manage Account Modal

**What changed:** `components/modals/ManageAccountModal.tsx` uses auth store (→ server action → API)

**Steps:**
1. Log in and navigate to profile/settings
2. Click "Manage Account" button
3. Update billing contact fields (email, phone, address)
4. Update admin contact fields
5. Click "Save Changes"

**Expected Results:**
- [ ] Modal opens with current account data populated
- [ ] Network request to `PUT /api/users/profile` on save
- [ ] Success toast appears: "Account information updated successfully"
- [ ] Updated values persist after page refresh
- [ ] No direct Supabase calls

**Validation Tests:**
- [ ] Invalid billing email format shows error
- [ ] Invalid admin email format shows error
- [ ] Phone formatting works correctly (auto-formats to (XXX) XXX-XXXX)

---

### 4. Zones List Hook

**What changed:** `lib/hooks/useZones.ts` fetches from Express API

**Steps:**
1. Log in and navigate to an organization page (`/organization/[orgId]`)
2. Observe zones loading
3. Open Network tab in DevTools

**Expected Results:**
- [ ] Network request to `GET /api/zones/organization/{orgId}`
- [ ] Zones list displays correctly
- [ ] Zone names, status indicators show properly
- [ ] No direct Supabase calls to `zones` table

**Edge Cases:**
- [ ] Organization with no zones shows empty state
- [ ] Unauthorized organization access shows error/redirect

---

### 5. Analytics Page

**What changed:** `app/analytics/page.tsx` fetches orgs and zones via Express API

**Steps:**
1. Log in and navigate to `/analytics`
2. Observe organization dropdown populating
3. Select an organization from dropdown
4. Observe zones dropdown populating
5. Open Network tab in DevTools

**Expected Results:**
- [ ] Network request to `GET /api/users/profile` for organizations
- [ ] Organization dropdown populated with user's orgs
- [ ] Network request to `GET /api/zones/organization/{orgId}` when org selected
- [ ] Zone dropdown populated with org's zones
- [ ] "All Organizations" option fetches zones from all orgs
- [ ] No direct Supabase calls

**Test Scenarios:**
- [ ] Select "All Organizations" → zones from all orgs appear
- [ ] Select specific org → only that org's zones appear
- [ ] Change organization → zone dropdown resets to "All Zones"

---

### 6. Zone Verification

**What changed:** `lib/api/dns.ts` exports verification from server action (→ API)

**Steps:**
1. Navigate to a zone detail page (`/zone/[id]`)
2. Find the "Verify Nameservers" button (if zone is unverified)
3. Click the button
4. Observe the verification process

**Expected Results:**
- [ ] Network request to `PUT /api/zones/{id}/verification`
- [ ] Loading state while verification in progress
- [ ] Success/failure message displayed
- [ ] Zone verification status updates in UI
- [ ] No direct Supabase calls to `zones` table

**Note:** This test requires the zone verification backend endpoint to be fully implemented.

---

## Network Inspection Checklist

Use browser DevTools (Network tab) to verify compliance:

### Should See These Requests:
```
✓ GET  /api/users/profile
✓ PUT  /api/users/profile
✓ GET  /api/zones/organization/{orgId}
✓ PUT  /api/zones/{id}/verification
✓ GET  /api/dns-records/zone/{zoneId}  (existing)
```

### Should NOT See These Patterns:
```
✗ POST /rest/v1/profiles (direct Supabase)
✗ PATCH /rest/v1/profiles (direct Supabase)
✗ GET /rest/v1/profiles?select=* (direct Supabase)
✗ GET /rest/v1/organization_members (direct Supabase)
✗ GET /rest/v1/zones (direct Supabase - except from server components)
```

### Allowed Direct Supabase Calls:
```
✓ /auth/* - Authentication endpoints (login, signup, OAuth, password reset)
✓ Server Components - These run server-side and are acceptable
```

---

## Console Error Check

After testing each feature, check browser console for:

- [ ] No "Failed to fetch profile" errors
- [ ] No "Not authenticated" errors (when logged in)
- [ ] No CORS errors
- [ ] No 401/403 errors (when properly authenticated)

---

## Mock Mode Testing

If using placeholder Supabase credentials (`https://placeholder.supabase.co`):

**Steps:**
1. Set `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co`
2. Restart the dev server
3. Log in with mock credentials:
   - `sarah.chen@company.com` / `password123`
   - `marcus.rodriguez@company.com` / `admin2024`

**Expected Results:**
- [ ] Mock login works
- [ ] Mock user data displays
- [ ] Profile updates work (stored in memory)
- [ ] Organizations display from mock data

**Note:** API calls will fail in mock mode since there's no real backend. This tests only the auth store's mock mode functionality.

---

## Regression Tests

Verify these existing features still work:

### Authentication
- [ ] Login with email/password
- [ ] Logout
- [ ] Sign up new account
- [ ] Password reset flow
- [ ] OAuth login (Google/GitHub) if configured

### Navigation
- [ ] Sidebar shows user's organizations
- [ ] Can navigate between organizations
- [ ] Can navigate to zone details
- [ ] Protected routes redirect to login when not authenticated

### Zone Operations
- [ ] Create new zone (via Add Zone modal)
- [ ] Edit zone settings
- [ ] Delete zone
- [ ] View zone DNS records

### Organization Operations
- [ ] Create new organization
- [ ] View organization members
- [ ] Organization settings accessible

---

## Troubleshooting

### "Not authenticated" errors
1. Check that you're logged in
2. Verify Supabase session exists (check Application → Cookies)
3. Check that access token is being passed to API

### API calls returning 404
1. Verify backend is running on correct port (default: 3001)
2. Check `NEXT_PUBLIC_API_URL` environment variable
3. Verify endpoint is implemented in backend

### Profile not loading after login
1. Check Network tab for `/api/users/profile` response
2. Verify backend returns profile with organizations
3. Check console for errors

### Zones not loading
1. Verify organization ID is correct
2. Check user is member of organization
3. Verify `/api/zones/organization/:orgId` endpoint exists

---

## Files Changed Reference

| File | Change |
|------|--------|
| `lib/auth-store.ts` | Uses server action for profile fetch/update |
| `lib/actions/profile.ts` | NEW - Server action for profile CRUD |
| `lib/actions/zones.ts` | Added `verifyZoneNameservers` |
| `lib/api/dns.ts` | Re-exports verification from server action |
| `lib/hooks/useZones.ts` | Fetches from Express API |
| `components/modals/EditProfileModal.tsx` | Uses auth store for updates |
| `components/modals/ManageAccountModal.tsx` | Uses auth store for updates |
| `app/analytics/page.tsx` | Fetches orgs/zones via API |
| `lib/hooks/useProfile.ts` | DELETED (unused) |
| `lib/api/hierarchy.ts` | DELETED (unused) |

