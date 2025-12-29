# Signup Email Exists - Testing Guide

## Prerequisites
- Development or staging environment running with Supabase auth configured
- Access to Supabase dashboard to verify user creation/non-creation

## Test Scenarios

### Scenario 1: New User Signup (Happy Path)
**Steps:**
1. Navigate to `/signup`
2. Enter a NEW email that doesn't exist in the system
3. Enter name, valid password (8+ chars, uppercase, lowercase, number)
4. Confirm password (match)
5. Check "I agree to terms"
6. Click "Create Account"

**Expected Result:**
- ✅ Form submits successfully
- ✅ Success message displays: "Account created! Please check your email to verify your account, then return here to sign in."
- ✅ "Sign In" button appears
- ✅ In Supabase dashboard: New user row created with `email_confirmed_at` = null
- ✅ Confirmation email sent to user

---

### Scenario 2: Existing Email Signup (Main Fix)
**Steps:**
1. Navigate to `/signup`
2. Enter an EXISTING email (one already registered)
3. Enter name, valid password
4. Confirm password
5. Check "I agree to terms"
6. Click "Create Account"

**Expected Result:**
- ✅ Red error banner appears at top of form: "A user with this email address already exists. Please sign in instead."
- ✅ Form does NOT show success message
- ✅ User stays on signup page (no navigation)
- ✅ In Supabase dashboard: No new user created, no duplicate entries
- ✅ Error banner disappears when user starts typing in email field

**On Desktop:**
- Error banner shows above the form fields

**On Mobile (flip card):**
- Error banner shows on the form side (after flip)

---

### Scenario 3: Unconfirmed Email Resend
**Steps:**
1. Create a new account but DON'T confirm the email
2. Try signing up again with the SAME unconfirmed email

**Expected Result:**
- ✅ Shows "A user with this email address already exists" error
- ✅ No duplicate user created
- ⚠️ Note: User should use "Forgot password" flow or check their email for original confirmation

---

### Scenario 4: Invalid Email Format
**Steps:**
1. Navigate to `/signup`
2. Enter invalid email (e.g., "notanemail", "test@", "@example.com")
3. Try to submit

**Expected Result:**
- ✅ Field-level validation error under email field: "Please enter a valid email"
- ✅ Form does NOT submit
- ✅ No global error banner

---

### Scenario 5: Weak Password
**Steps:**
1. Navigate to `/signup`
2. Enter valid email
3. Enter weak password (e.g., "pass", "12345678", "Password")
4. Try to submit

**Expected Result:**
- ✅ Field-level validation error under password field
- ✅ Error message indicates specific requirement (length, uppercase, lowercase, number)
- ✅ Form does NOT submit

---

### Scenario 6: Password Mismatch
**Steps:**
1. Navigate to `/signup`
2. Enter valid email and name
3. Enter password: "Password123"
4. Confirm password: "Password456"
5. Try to submit

**Expected Result:**
- ✅ Field-level error under confirm password: "Passwords do not match"
- ✅ Form does NOT submit

---

### Scenario 7: Terms Not Agreed
**Steps:**
1. Fill out entire form correctly
2. Do NOT check "I agree to terms"
3. Try to submit

**Expected Result:**
- ✅ Field-level error under terms checkbox: "You must agree to the terms and conditions"
- ✅ Form does NOT submit

---

### Scenario 8: Network Error / API Failure
**Steps:**
1. Disconnect from internet OR use browser dev tools to simulate offline
2. Try to sign up with valid data

**Expected Result:**
- ✅ Field-level error on email field with network error message
- ✅ No success message shown
- ✅ Form remains editable

---

### Scenario 9: Double Submit Prevention
**Steps:**
1. Fill out form with valid data
2. Click "Create Account"
3. Quickly click again before first request completes

**Expected Result:**
- ✅ Button shows "Creating account..." with spinner
- ✅ Button is disabled during submission
- ✅ Only ONE request sent to Supabase
- ✅ No duplicate users created

---

### Scenario 10: Error Banner Auto-Clear
**Steps:**
1. Trigger "email already exists" error (see Scenario 2)
2. Red error banner displays
3. Start typing in the email field (change even one character)

**Expected Result:**
- ✅ Red error banner disappears immediately as user types
- ✅ User can try again with different email

---

### Scenario 11: Mobile Layout (Flip Card)
**Steps:**
1. Resize browser to mobile width (< 768px) OR use mobile device
2. See hero screen with "Sign Up" button
3. Click "Sign Up" (card flips to form)
4. Try existing email signup

**Expected Result:**
- ✅ Card flips smoothly to show form
- ✅ Error banner displays correctly in mobile layout
- ✅ All form functionality works same as desktop
- ✅ "Back" button returns to hero screen

---

## Verification in Supabase Dashboard

### After New User Signup:
1. Go to Authentication > Users in Supabase dashboard
2. Find the newly created user
3. Verify:
   - Email matches what was entered
   - `email_confirmed_at` is `null` (pending confirmation)
   - `user_metadata` contains the name
   - `identities` array has one entry (email provider)

### After Existing Email Attempt:
1. Check Authentication > Users
2. Verify:
   - No new user row created
   - Existing user row unchanged
   - No duplicate emails in the list

---

## Browser Testing

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Additional Edge Cases

### Email Case Sensitivity
- Try signing up with `Test@Example.com` if `test@example.com` exists
- Expected: Should treat as same email (Supabase handles case-insensitivity)

### Special Characters in Name
- Try name with accents: "José García"
- Expected: Should accept and store correctly

### Very Long Inputs
- Try very long email or name (200+ characters)
- Expected: Should handle gracefully (validation or truncation)

---

## Rollback Plan

If issues are found in production:
1. The classifier logic can stay in place
2. Update `app/signup/page.tsx` to show generic message for both outcomes:
   ```ts
   if (result.success || result.outcome === 'existing_email') {
     // Show generic "check your email" message for both
   }
   ```
3. This maintains security while we debug the specific issue

---

## Success Criteria

All scenarios pass ✅ and:
- No duplicate users created in any scenario
- Clear, actionable error messages for each case
- Smooth UX on both desktop and mobile
- Error states are clearable/recoverable
- No console errors during testing

