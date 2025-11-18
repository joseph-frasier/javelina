# Password Reset Configuration

This document explains how to configure password reset functionality for the Javelina application.

## Overview

The password reset flow uses Supabase's PKCE (Proof Key for Code Exchange) authentication flow for enhanced security. When a user requests a password reset:

1. User enters their email on `/forgot-password`
2. Supabase sends an email with a reset link
3. Link redirects to `/auth/callback?type=recovery` with a code
4. The callback route exchanges the code for a session
5. User is redirected to `/reset-password` with tokens in the hash
6. User enters new password and it's updated via Supabase

## Supabase Dashboard Configuration

### 1. Navigate to Authentication Settings

Go to your Supabase project dashboard:
- Click on **Authentication** in the left sidebar
- Click on **URL Configuration**

### 2. Configure Redirect URLs

Add the following URLs to the **Redirect URLs** allowlist:

**For Production:**
```
https://yourdomain.com/auth/callback
https://yourdomain.com/reset-password
```

**For Local Development:**
```
http://localhost:3000/auth/callback
http://localhost:3000/reset-password
http://127.0.0.1:3000/auth/callback
http://127.0.0.1:3000/reset-password
```

**For Vercel Preview Deployments:**
```
https://*.vercel.app/auth/callback
https://*.vercel.app/reset-password
```

### 3. Configure Site URL

Set the **Site URL** to your primary domain:

**Production:**
```
https://yourdomain.com
```

**Local Development:**
```
http://localhost:3000
```

### 4. Email Template Configuration (Optional)

By default, Supabase will use the redirect URL specified in the API call. However, you can customize the email template:

1. Go to **Authentication** → **Email Templates**
2. Select **Reset Password**
3. The template should use the `{{ .ConfirmationURL }}` variable which will contain the correct callback URL

Example template:
```html
<h2>Reset Password</h2>
<p>Follow this link to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

## Testing the Flow

### Test Password Reset

1. Go to `/forgot-password`
2. Enter a valid user email
3. Check the email inbox (or Supabase logs in development)
4. Click the reset link in the email
5. Should be redirected through `/auth/callback` to `/reset-password`
6. Enter new password
7. Should be redirected to `/login`
8. Login with new password

### Common Issues

#### 404 Error on Reset Link Click

**Problem:** Clicking the reset link shows a 404 "DEPLOYMENT_NOT_FOUND" error.

**Solution:** 
- Check that `/auth/callback` is in the Redirect URLs allowlist
- Verify the Site URL is set correctly
- Make sure the application is deployed and accessible at the configured URL

#### Invalid or Missing Token

**Problem:** Reset page shows "Invalid or missing reset token" error.

**Solution:**
- Ensure the callback route is properly handling the `type=recovery` parameter
- Check that the session tokens are being passed in the URL hash
- Verify the Supabase client is configured correctly

#### Rate Limiting

**Problem:** "Too many requests" error when testing.

**Solution:**
- Supabase has rate limits on password reset emails (default: 2 per hour per email)
- Wait an hour or use a different email address
- Adjust rate limits in Supabase Dashboard → Authentication → Rate Limits

## Code Structure

### Files Involved

1. **`app/forgot-password/page.tsx`** - Password reset request page
2. **`app/auth/callback/route.ts`** - Handles OAuth, email verification, and password reset callbacks
3. **`app/reset-password/page.tsx`** - Password update form
4. **`lib/auth-store.ts`** - Auth state management and reset password logic
5. **`components/modals/ChangePasswordModal.tsx`** - In-app password change (also uses reset flow)

### Key Configuration

The redirect URL is configured in two places:

```typescript
// lib/auth-store.ts - Line ~447
const resetUrl = `${window.location.origin}/auth/callback?type=recovery`
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: resetUrl,
})
```

```typescript
// components/modals/ChangePasswordModal.tsx - Line ~93
await supabase.auth.resetPasswordForEmail(user.email, {
  redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
})
```

## Local Development

For local development with Supabase CLI:

1. The redirect URLs are configured in `supabase/config.toml`:
```toml
[auth]
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = ["https://127.0.0.1:3000"]
```

2. Add the callback URL to the list:
```toml
additional_redirect_urls = [
  "http://localhost:3000/auth/callback",
  "http://127.0.0.1:3000/auth/callback"
]
```

## Security Considerations

1. **PKCE Flow**: Uses authorization code exchange instead of implicit flow for better security
2. **Session Tokens**: Tokens are passed via URL hash (client-side only, not sent to server)
3. **Rate Limiting**: Supabase enforces rate limits to prevent abuse
4. **Token Expiry**: Password reset tokens expire after a short period (configurable in Supabase)

## References

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [PKCE Flow](https://supabase.com/docs/guides/auth/server-side/pkce-flow)
- [Password Reset Guide](https://supabase.com/docs/guides/auth/passwords)

