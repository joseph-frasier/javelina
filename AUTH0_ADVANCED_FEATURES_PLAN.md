---
name: Auth0 Advanced Features - Google OAuth, Passkeys & MFA
overview: Enable Google OAuth, configure passkey (WebAuthn) support, and set up Multi-Factor Authentication on Auth0 free tier
todos:
  - id: google-oauth-setup
    content: Configure Google OAuth in Auth0 and Google Cloud Console
    status: pending
  - id: google-oauth-test
    content: Test Google OAuth login flow end-to-end
    status: pending
    dependencies:
      - google-oauth-setup
  - id: passkey-enable
    content: Enable and test passkey (WebAuthn) support in Auth0
    status: pending
  - id: mfa-configure
    content: Configure MFA options in Auth0 (SMS, Authenticator, Email)
    status: pending
  - id: mfa-test
    content: Test MFA enrollment and login flow
    status: pending
    dependencies:
      - mfa-configure
  - id: frontend-polish
    content: Update UI to reflect new auth options
    status: pending
    dependencies:
      - google-oauth-test
      - passkey-enable
---

# Auth0 Advanced Features Implementation

**Goal**: Enable Google OAuth, passkeys, and MFA to enhance authentication options for Javelina users.

---

## ✅ Free Tier Confirmation

All features in this plan are **FREE** on Auth0:
- ✅ **Google OAuth** - Included in free tier (unlimited social connections)
- ✅ **Passkeys (WebAuthn)** - Included in free tier
- ✅ **MFA** - First 10 MFA enrollments/month free, then $0.05 per enrollment

**Note**: If you exceed 10 MFA enrollments per month, you'll start getting charged. Monitor usage in Auth0 dashboard.

---

## Quick Overview

| Feature | Time Estimate | Complexity |
|---------|--------------|------------|
| Google OAuth Setup | 30 mins | Medium |
| Passkey Configuration | 15 mins | Low |
| MFA Setup | 20 mins | Medium |
| Testing & Polish | 30 mins | Low |
| **TOTAL** | **~1.5 hours** | |

---

## Phase 1: Google OAuth (30 mins)

### Overview
Enable users to sign in with their Google account. Your UI already has placeholder Google buttons!

### Step 1: Google Cloud Console Setup (15 mins)

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select or create a project

2. **Enable Google+ API**
   - Navigation: APIs & Services → Library
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth 2.0 Credentials**
   - Navigation: APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Name: `Javelina DNS - Auth0` (or similar)

4. **Configure Authorized Redirect URIs**
   Add these URLs:
   ```
   https://<YOUR-AUTH0-DOMAIN>/login/callback
   ```
   Example: `https://dev-abc123.us.auth0.com/login/callback`

5. **Save Credentials**
   - Copy **Client ID** and **Client Secret** (you'll need these in Auth0)

### Step 2: Auth0 Configuration (10 mins)

1. **Go to Auth0 Dashboard**
   - Navigate to: Authentication → Social

2. **Enable Google Connection**
   - Find "Google / Gmail" in the list
   - Click the toggle or "+" button

3. **Enter Google Credentials**
   - **Client ID**: Paste from Google Cloud Console
   - **Client Secret**: Paste from Google Cloud Console
   
4. **Configure Permissions**
   - Attributes to request:
     - ✅ Basic Profile
     - ✅ Email Address
   
5. **Select Applications**
   - Enable for your "Javelina Local" application (or whatever you named it)

6. **Save Changes**

### Step 3: Testing (5 mins)

1. **Test Login Flow**
   - Open `http://localhost:3000` in **incognito mode**
   - Click "Sign In with Auth0"
   - You should now see a "Continue with Google" button on Auth0's Universal Login
   - Click it and sign in with a Google account
   - Verify you're redirected back to your app

2. **Verify User Data**
   - Check Auth0 dashboard → Users
   - Your Google user should appear
   - Check Supabase `profiles` table - user should be synced

---

## Phase 2: Passkey Support (15 mins)

### Overview
Passkeys (WebAuthn) let users sign in with biometrics, security keys, or device authentication. **Auth0 may already have this enabled!**

### Step 1: Check Current Status (2 mins)

1. **Go to Auth0 Dashboard**
   - Navigate to: Authentication → Passwordless

2. **Check WebAuthn Status**
   - Look for "WebAuthn with Device Biometrics" or "Passwordless" options
   - If you see "WebAuthn" already enabled, you're done! Skip to testing.

### Step 2: Enable Passkeys (5 mins)

1. **Enable WebAuthn**
   - Toggle on "WebAuthn with Device Biometrics"
   - OR: Click "+ Passwordless" and select "WebAuthn"

2. **Configure Settings**
   - **Authenticator Type**: Both platform and cross-platform (default)
   - **User Verification**: Required (for better security)
   - **Resident Key**: Preferred (for better UX)

3. **Select Applications**
   - Enable for your "Javelina Local" application

4. **Save Changes**

### Step 3: Testing (8 mins)

Passkeys work best on:
- ✅ MacBooks with Touch ID
- ✅ Windows with Windows Hello
- ✅ iPhones/Android with biometrics
- ✅ Hardware security keys (YubiKey, etc.)

**Test Flow:**
1. Open `http://localhost:3000` in incognito
2. Click "Sign In with Auth0"
3. On Auth0 login screen:
   - Look for "Use Passkey" or biometric option
   - If enrolling for first time: Complete email/password signup first
   - Then Auth0 will prompt to "Add Passkey"
4. Follow device prompts (Touch ID, Face ID, etc.)
5. On subsequent logins, you should be able to skip password!

**Note**: Not all devices support passkeys. This is a progressive enhancement.

---

## Phase 3: Multi-Factor Authentication (20 mins)

### Overview
Add an extra security layer. Free tier includes 10 enrollments/month.

### Step 1: Enable MFA in Auth0 (10 mins)

1. **Go to Auth0 Dashboard**
   - Navigate to: Security → Multi-factor Auth

2. **Choose MFA Factors**
   
   **Recommended for Free Tier:**
   - ✅ **One-time Password (OTP) via Authenticator Apps** (Google Authenticator, Authy, etc.)
     - **Cost**: FREE, unlimited
     - **Best option for free tier**
   
   **Other Options:**
   - ⚠️ **SMS** - First 10/month free, then $0.05 each (can get expensive!)
   - ⚠️ **Email** - First 10/month free, then $0.05 each
   - ✅ **Push Notifications** (Guardian) - FREE, unlimited
   
   **My Recommendation**: Enable **Authenticator Apps** only to start.

3. **Configure Authenticator Apps**
   - Click the toggle to enable
   - Settings:
     - **TOTP Algorithm**: SHA1 (default, most compatible)
     - **Period**: 30 seconds (default)
     - **Digits**: 6 (default)

4. **Set MFA Policy**
   
   Choose when to require MFA:
   
   - **Option A: Optional** (User chooses)
     - Policy: "Never" require MFA
     - Users can enroll via Account Settings
     - Good for demo day
   
   - **Option B: Required for All** (Most secure)
     - Policy: "Always" require MFA
     - Every user must enroll on first login
     - May frustrate users during demo
   
   - **Option C: Required for Specific Conditions** (Balanced)
     - Policy: "Adaptive MFA"
     - Require MFA for:
       - New devices
       - New locations
       - Suspicious activity
     - **Requires paid plan** (skip for free tier)
   
   **For Demo Day**: Choose Option A (Optional) so it doesn't block testers.

5. **Select Applications**
   - Enable for your "Javelina Local" application

6. **Save Changes**

### Step 2: Testing MFA (10 mins)

**Test Enrollment:**
1. Sign in to your app with a test account
2. In Auth0's user menu, look for "Enroll MFA" or "Security Settings"
3. OR: Auth0 may prompt automatically if set to "Always"
4. Scan QR code with Google Authenticator or Authy
5. Enter the 6-digit code to verify

**Test Login with MFA:**
1. Log out
2. Sign in again with same account
3. After entering password, you should be prompted for MFA code
4. Enter code from authenticator app
5. Verify successful login

**Test Account Lockout Protection:**
- Auth0 automatically locks accounts after too many failed MFA attempts
- Test by entering wrong codes 10 times
- Account should be temporarily locked (you'll see an error message)

---

## Phase 4: Frontend Polish (Optional - 30 mins)

### Current State
Your Google/GitHub buttons already exist but redirect to standard Auth0 login. Auth0's Universal Login handles showing the Google option once configured.

### Improvements You Can Make

#### Option A: Keep Current Approach (Recommended)
- ✅ No code changes needed
- ✅ Auth0 Universal Login automatically shows Google button once enabled
- ✅ Single "Sign In with Auth0" button keeps UI clean
- ✅ Users see all options (Email, Google, Passkeys, MFA) on Auth0's page

#### Option B: Direct OAuth Links (More Work)
If you want Google/GitHub buttons to directly trigger Google OAuth:

```typescript
// In lib/auth-store.ts - loginWithOAuth function
loginWithOAuth: (provider: 'google' | 'github') => {
  // Auth0 direct connection link
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || '',
    redirect_uri: `${API_URL}/auth/callback`,
    scope: 'openid profile email',
    connection: provider, // Direct to specific provider
  });
  
  window.location.href = `https://${process.env.NEXT_PUBLIC_AUTH0_DOMAIN}/authorize?${params.toString()}`;
},
```

**My Recommendation**: Stick with Option A. Auth0's Universal Login page is better UX and shows all options.

---

## Testing Checklist

### Google OAuth
- [ ] Sign in with Google account
- [ ] User appears in Auth0 dashboard
- [ ] User synced to Supabase `profiles` table
- [ ] Profile shows correct email and name from Google
- [ ] Avatar uploaded from Google profile picture (if configured)
- [ ] Email verification status synced correctly

### Passkeys
- [ ] Prompt to add passkey after initial signup
- [ ] Successfully enroll passkey (Touch ID, Face ID, etc.)
- [ ] Sign in using passkey (skip password)
- [ ] Passkey works across different browsers on same device
- [ ] Can manage/delete passkeys in Auth0 profile

### MFA
- [ ] Prompted to enroll in MFA (if policy is "Always")
- [ ] Successfully scan QR code with authenticator app
- [ ] Enter 6-digit code and verify enrollment
- [ ] Subsequent logins require MFA code
- [ ] Can't login with wrong MFA code (account locks after 10 attempts)
- [ ] Can still login if lose access (Auth0 provides recovery codes)

---

## Troubleshooting

### Google OAuth Issues

**Problem**: "redirect_uri_mismatch" error
- **Fix**: Check that Google Cloud Console has EXACT Auth0 callback URL
- **Format**: `https://YOUR-AUTH0-DOMAIN/login/callback` (no trailing slash)

**Problem**: Google button doesn't appear in Auth0 login
- **Fix**: Verify Google connection is enabled for your application in Auth0 dashboard

**Problem**: "User canceled" error
- **Fix**: User closed Google sign-in popup - this is expected behavior

### Passkey Issues

**Problem**: "Passkey not supported" error
- **Fix**: Device/browser doesn't support WebAuthn
- **Supported**: Chrome 67+, Safari 13+, Firefox 60+, Edge 18+

**Problem**: Can't enroll passkey on mobile
- **Fix**: Ensure you're using HTTPS in production (localhost is OK for testing)

**Problem**: Passkey works on one device but not another
- **Expected**: Passkeys are device-specific (use recovery email or add multiple passkeys)

### MFA Issues

**Problem**: Not prompted for MFA after enabling
- **Fix**: Policy might be set to "Optional" - change to "Always" to force enrollment

**Problem**: Lost access to authenticator app
- **Fix**: Use Auth0's account recovery flow (sends recovery codes via email)

**Problem**: Hitting free tier limit (10 enrollments/month)
- **Fix**: Either upgrade plan or limit MFA to critical accounts only

---

## Cost Monitoring

### Auth0 Free Tier Limits (as of 2026)

✅ **FREE (Unlimited)**:
- Google OAuth logins
- Passkey enrollments
- Authenticator app MFA (unlimited)
- 7,000 active users
- 2 social connections

⚠️ **FREE (Limited)**:
- MFA via SMS/Email: First 10 enrollments/month free
- After 10: $0.05 per enrollment

💰 **Paid Features** (Not needed for this plan):
- Adaptive MFA
- Advanced attack protection
- Custom domains
- SSO integrations

**Recommendation**: Stick with Authenticator App MFA to avoid any charges.

---

## Post-Implementation: Multi-Environment Setup

Once these features work perfectly in local, you'll need to configure for other environments:

### Environment-Specific Setup

**Production** (`app.javelina.cloud`):
1. Create new Auth0 application for production
2. Add production callback URL to Google OAuth
3. Update environment variables

**QA/Dev** (Vercel deployments):
1. Create separate Auth0 apps for each environment
2. Or: Use wildcard redirects if Auth0 plan supports it

### Configuration Matrix

| Environment | Auth0 App | Google OAuth | Passkeys | MFA |
|-------------|-----------|--------------|----------|-----|
| Local | ✅ Already configured | ⏳ This plan | ⏳ This plan | ⏳ This plan |
| Dev | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo |
| QA | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo |
| Production | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo | 📝 Post-demo |

---

## Summary

**What You're Enabling:**
1. ✅ Google OAuth - Easy sign-in with Google accounts
2. ✅ Passkeys - Biometric authentication (Touch ID, Face ID, etc.)
3. ✅ MFA - Extra security with authenticator apps

**What It Costs:**
- 💰 $0/month if you use Authenticator App MFA only
- 💰 ~$5/month if 100 users enroll with SMS MFA

**Time Investment:**
- ⏱️ ~1.5 hours total setup
- ⏱️ Mostly configuration, minimal coding

**User Benefits:**
- 🚀 Faster login with Google
- 🔒 More secure with MFA
- 📱 Convenient with passkeys
- ✨ Professional auth experience

---

## Next Steps

After completing this plan:
1. Test all flows end-to-end
2. Update user documentation/onboarding
3. Monitor Auth0 dashboard for usage/errors
4. Consider enabling for production after demo day
5. Add MFA requirement for admin accounts

**Questions or issues?** Check Auth0 docs or ask for help!
