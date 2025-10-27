# Email Verification Flow - Testing Guide

## Overview
The signup flow follows Supabase's standard email confirmation pattern: Sign up → Verify email → Sign in → Access app.

## ✅ Current Implementation
- User signs up → Success screen with green checkmark and "Sign In" button
- User receives verification email
- User clicks email link → Opens `/email-verified` page in new tab
- Email-verified page prompts user to sign in
- User signs in → Redirected to pricing page

## Prerequisites: Configure Supabase Redirect URLs

Before testing, ensure your Supabase project allows both localhost and production URLs:

### In Supabase Dashboard:
1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add both:
   ```
   http://localhost:3000/auth/callback
   https://your-production-url.vercel.app/auth/callback
   ```
3. Click **Save**

✅ **You only need to do this once!** Both URLs can coexist. No need to reconfigure when deploying.

---

## Test Flow

### Step 1: Start Your Dev Server
```bash
npm run dev
```

### Step 2: Open Two Browser Tabs
- **Tab 1:** `http://localhost:3000/signup`
- **Tab 2:** `https://www.mailinator.com`

### Step 3: Sign Up with Mailinator
On Tab 1, create an account with:
- **Name:** Test User
- **Email:** `javelina-test-1@mailinator.com`
- **Password:** `TestPass123!`
- Check the terms checkbox
- Click "Create Account"

### Step 4: Success Screen
You should stay on the signup page showing:
- ✅ Green checkmark icon
- ✅ "Success!" heading
- ✅ "Account created! Please check your email to verify your account, then return here to sign in."
- ✅ "Already verified your email?" with "Sign In" button
- ✅ "Already have an account? Sign in" link at bottom

### Step 5: Check Mailinator Inbox
On Tab 2:
1. Type `javelina-test-1` in the search box (or click the blue link on the verify page)
2. You should see an email from Supabase with subject like "Confirm Your Email" or "Verify Your Email"
3. Click on the email to open it

### Step 6: Click Verification Link
- In the email, click the verification/confirmation button/link
- **NEW TAB opens** showing `/email-verified` page with:
  - ✅ Green success checkmark
  - "Email Verified!" heading
  - Next Steps with numbered instructions
  - "Sign In to Continue" button

### Step 7: Sign In
- Click "Sign In to Continue" button (or use original tab's Sign In button)
- Enter your email and password
- Successfully logs in
- **Redirected to `/pricing`** ✅

### Result
- User has verified account ✅
- User is signed in ✅
- User can select pricing plan ✅

## Test Scenarios

### Scenario 1: Basic Happy Path ✓
- Sign up → Success screen → Check inbox → Click link → Email verified page → Sign in → Pricing page

### Scenario 2: User Uses Original Tab
1. Sign up with `javelina-test-2@mailinator.com`
2. See success screen
3. Check email and verify
4. Return to **original tab** (still showing success screen)
5. Click "Sign In" button
6. Login → Redirected to pricing

### Scenario 3: Multiple Test Accounts
Create accounts with:
- `javelina-test-3@mailinator.com`
- `javelina-test-4@mailinator.com`
- `javelina-test-5@mailinator.com`

Test each follows the same flow.

### Scenario 4: User Leaves and Returns
1. Sign up with `javelina-test-6@mailinator.com`
2. Close the browser entirely
3. Check email and click verification link
4. See email-verified page
5. Click "Sign In to Continue"
6. Login with credentials → Redirected to pricing

### Scenario 5: Try Logging In Before Verification
1. Sign up with `javelina-test-7@mailinator.com`
2. Before verifying email, try to login
3. Should get error (email not confirmed)
4. Verify email via link
5. Try login again → Success ✅

## Expected Behavior

### ✅ Correct Behaviors
- User signs up successfully
- User receives verification email
- Clicking verification link shows success page
- User must manually sign in after verification
- After sign in, user can access pricing page
- Cannot access protected routes without signing in

### ❌ Incorrect Behaviors to Watch For
- User can access pricing without verifying email
- User can sign in before verifying email
- Verification link doesn't work
- Email-verified page doesn't show
- No emails arriving (check Supabase email settings)

## Troubleshooting

### No Email Arriving?
1. Check Supabase Dashboard → Authentication → Email Templates
2. Verify "Confirm signup" template is enabled
3. Check Mailinator after 30-60 seconds
4. Try resend button

### Can't Sign In After Verification?
1. Make sure you clicked the verification link in the email
2. Check Supabase Dashboard → Authentication → Users
3. Verify the user shows "email_confirmed_at" timestamp
4. Try the "forgot password" flow if needed

### Email Verified Page Not Showing?
1. Check browser console for errors
2. Verify URL is `http://localhost:3000/email-verified`
3. Check that `/email-verified` is in middleware public routes

## Quick Mailinator Links

For your test emails:
- Test 1: `https://www.mailinator.com/v4/public/inboxes.jsp?to=javelina-test-1`
- Test 2: `https://www.mailinator.com/v4/public/inboxes.jsp?to=javelina-test-2`
- Test 3: `https://www.mailinator.com/v4/public/inboxes.jsp?to=javelina-test-3`

## Success Criteria

✅ User can sign up successfully
✅ Success screen shows with clear instructions
✅ Email arrives in Mailinator within 60 seconds
✅ Clicking verification link shows email-verified page
✅ Email-verified page has "Sign In to Continue" button
✅ User can sign in after verification
✅ After sign in, user is redirected to pricing page
✅ Cannot sign in before email is verified

## Next Steps After Testing

Once verified working:
1. Test with real email (Gmail, Outlook) to ensure it works beyond Mailinator
2. Consider adding email verification status to user profile
3. Consider adding "verified" badge in UI
4. Test password reset flow (should work similarly)

