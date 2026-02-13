# Auth0 Password Reset UX Improvement Guide

## Problem

Users get stuck on Auth0 hosted pages during password reset flow:
1. **After requesting password reset** - "Check Your Email" page has no navigation back to login/home
2. **After clicking reset link** - "Password Changed!" success page has no way to return to login

See screenshots: Both pages trap users with no UI elements to navigate away.

## Solutions Available

Auth0 provides several ways to improve this UX:

### Solution 1: Add Redirect URL to Password Reset Email (Easiest - 5 mins)

This adds a "Continue" or "Return to Login" button in the password reset success page.

#### Steps:

1. **Go to Auth0 Dashboard**
   - Navigate to: **Branding** → **Email Templates**
   - Select: **Change Password Confirmation** template

2. **Add Redirect URL Parameter**
   
   In the template settings, find "Redirect To URL" field and add:
   ```
   https://javelina.cloud/login
   ```
   
   For local development:
   ```
   http://localhost:3000/login
   ```

3. **Customize the Button Text (Optional)**
   
   Auth0 will automatically add a button on the success page. The default text is "Continue" but you can customize the email template to be more explicit about where users will be redirected.

4. **Test the Flow**
   - Trigger a password reset
   - After changing password, you should see a "Continue to Application" button on the success page
   - Button should redirect to your login page

**Pros:**
- ✅ Easy to implement (just add a URL)
- ✅ No code changes needed
- ✅ Works with both classic and new Universal Login

**Cons:**
- ❌ Only solves the post-reset success page (not the "Check Email" page)
- ❌ Limited customization of button appearance

---

### Solution 2: Use Auth0 Actions for Custom Redirect Logic (Advanced - 20 mins)

Actions allow you to programmatically redirect users after password reset with custom logic.

#### Steps:

1. **Go to Auth0 Dashboard**
   - Navigate to: **Actions** → **Flows** → **Post-Login**

2. **Create Custom Action**
   
   Click "+" to add a new custom action:
   
   ```javascript
   /**
    * Handler that will be called during the execution of a PostLogin flow.
    *
    * @param {Event} event - Details about the user and the context in which they are logging in.
    * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
    */
   exports.onExecutePostLogin = async (event, api) => {
     // Check if this is a password reset flow
     if (event.stats.logins_count === 0 || event.request.query.success === 'true') {
       // Redirect to your application's login page with a success message
       api.redirect.sendUserTo(`${event.secrets.FRONTEND_URL}/login?password_reset=success`);
     }
   };
   ```

3. **Add Environment Variable**
   - In the action settings, add secret:
     - Key: `FRONTEND_URL`
     - Value: `https://javelina.cloud` (or your domain)

4. **Deploy the Action**
   - Click "Deploy"
   - Drag the action into your Post-Login flow
   - Click "Apply"

5. **Update Frontend to Show Success Message**
   
   In your login page (`app/login/page.tsx`), detect the query parameter:
   
   ```typescript
   const searchParams = useSearchParams();
   const passwordReset = searchParams.get('password_reset');
   
   useEffect(() => {
     if (passwordReset === 'success') {
       // Show success toast
       toast.success('Password changed successfully! Please log in with your new password.');
     }
   }, [passwordReset]);
   ```

**Pros:**
- ✅ Full control over redirect logic
- ✅ Can pass custom parameters to frontend
- ✅ Works for all Auth0 flows

**Cons:**
- ❌ More complex to implement
- ❌ Requires frontend changes to handle redirect parameters

---

### Solution 3: Customize Email Template with Better Instructions (Quick - 10 mins)

Improve the "Check Your Email" experience by customizing the password reset email to guide users.

#### Steps:

1. **Go to Auth0 Dashboard**
   - Navigate to: **Branding** → **Email Templates**
   - Select: **Change Password** template (the initial request email)

2. **Customize the HTML Template**
   
   Add helpful instructions at the bottom:
   
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
       .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
       .button { background: #2563eb; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; display: inline-block; }
       .back-link { color: #6b7280; font-size: 14px; margin-top: 40px; }
       .back-link a { color: #2563eb; text-decoration: none; }
     </style>
   </head>
   <body>
     <div class="container">
       <h1>Reset Your Password</h1>
       <p>Hi {{ user.email }},</p>
       <p>You requested to reset your password for Javelina DNS.</p>
       <p style="margin: 30px 0;">
         <a href="{{ url }}" class="button">Reset Password</a>
       </p>
       <p>Or copy and paste this link into your browser:</p>
       <p style="color: #6b7280; word-break: break-all;">{{ url }}</p>
       <p>This link will expire in 5 days.</p>
       <p>If you didn't request a password reset, you can safely ignore this email.</p>
       <div class="back-link">
         <p>Changed your mind? <a href="https://javelina.cloud/login">Return to login</a></p>
         <p>Need help? <a href="https://javelina.cloud/support">Contact support</a></p>
       </div>
     </div>
   </body>
   </html>
   ```

3. **Update "Check Your Email" Page Text**
   
   Go to: **Branding** → **Universal Login** → **Text Customization**
   
   Find the password reset flow texts and add helpful messages like:
   - "Check your email for a reset link"
   - "Return to login page"

**Pros:**
- ✅ Improves user guidance immediately
- ✅ No backend code changes
- ✅ Maintains your branding

**Cons:**
- ❌ Doesn't add actual UI buttons to hosted pages
- ❌ Relies on users reading email carefully

---

### Solution 4: Configure Application Login URI (Recommended - 2 mins)

This is the simplest and most effective solution that works with Auth0's built-in redirect logic.

#### Steps:

1. **Go to Auth0 Dashboard**
   - Navigate to: **Applications** → Select your application

2. **Set Application Login URI**
   
   Scroll to "Application URIs" section:
   - **Application Login URI**: `https://javelina.cloud/login`
   - **Allowed Callback URLs**: Ensure `http://localhost:3001/auth/callback` is listed
   - **Allowed Logout URLs**: Ensure `https://javelina.cloud/login` is listed

3. **Save Changes**

4. **Update Tenant Default URLs**
   
   Also go to: **Branding** → **Universal Login** → **Settings**
   - **Default Login Route**: `/login`
   
   This ensures Auth0 knows where to send users by default.

**Pros:**
- ✅ Easiest to implement
- ✅ Works globally for all flows
- ✅ Auth0 automatically adds "Return to login" links
- ✅ No code changes needed

**Cons:**
- ❌ Limited customization of appearance

---

## Recommended Implementation Plan

### Quick Fix (5 minutes)

Implement **Solution 4** + **Solution 1**:

1. Set Application Login URI in Auth0 dashboard
2. Add Redirect URL to "Change Password Confirmation" email template
3. Test the flow

This will:
- Add navigation back to login from success page
- Set a default return path for all Auth0 flows

### Complete UX Overhaul (30 minutes)

Implement **All Solutions** in order:

1. **Solution 4** - Set Application Login URI (2 mins)
2. **Solution 1** - Add redirect URL to email template (5 mins)
3. **Solution 3** - Customize email templates with better copy (10 mins)
4. **Solution 2** - Add Actions for custom redirect logic (20 mins)
5. Update frontend to handle `password_reset=success` parameter

This provides:
- Seamless navigation on all password reset pages
- Branded email templates with clear CTAs
- Success feedback in your app
- Better overall user experience

---

## Testing Checklist

After implementing solutions, test:

- [ ] Request password reset from app
- [ ] "Check Your Email" page appears
- [ ] Email arrives with branded template
- [ ] Click reset link in email
- [ ] Enter new password
- [ ] Success page appears with "Continue" button
- [ ] Click "Continue" - redirects to login page
- [ ] Log in with new password successfully
- [ ] (If using Solution 2) Success toast appears on login page

---

## Configuration Quick Reference

### Auth0 Dashboard Locations

**Email Templates:**
```
Branding → Email Templates → Change Password
Branding → Email Templates → Change Password Confirmation
```

**Application Settings:**
```
Applications → [Your App] → Settings
- Application Login URI: https://javelina.cloud/login
- Allowed Callback URLs: http://localhost:3001/auth/callback
- Allowed Logout URLs: https://javelina.cloud/login
```

**Universal Login Settings:**
```
Branding → Universal Login → Settings
- Default Login Route: /login
```

**Actions (Optional):**
```
Actions → Flows → Post-Login
- Create custom action for redirect logic
```

---

## Environment-Specific Configuration

### Development
```
Application Login URI: http://localhost:3000/login
Email Redirect URL: http://localhost:3000/login
```

### Production
```
Application Login URI: https://javelina.cloud/login
Email Redirect URL: https://javelina.cloud/login
```

**Note:** If you have separate Auth0 tenants for dev/prod, configure each separately.

---

## Additional UX Improvements (Optional)

### 1. Add "Back to Home" Link in Email Footer

In all email templates, add:
```html
<div class="footer">
  <p><a href="https://javelina.cloud">← Back to Javelina DNS</a></p>
</div>
```

### 2. Customize Success Page Message

Go to: **Branding** → **Universal Login** → **Page Templates**

If using New Universal Login, you can customize the success message:
```javascript
// In your page template customization
{
  "passwordResetSuccess": {
    "title": "Password Changed!",
    "description": "Your password has been successfully updated.",
    "buttonText": "Continue to Login"
  }
}
```

### 3. Add Contextual Help Links

In password reset emails, add:
```html
<p>Having trouble? <a href="https://javelina.cloud/help/password-reset">View our guide</a></p>
```

---

## Troubleshooting

### Issue: "Continue" Button Not Appearing

**Solution:**
- Verify "Redirect To URL" is set in "Change Password Confirmation" template (not the request email)
- Check that the URL is valid and accessible
- Clear browser cache and test again

### Issue: Redirect Goes to Wrong URL

**Solution:**
- Check Application Login URI in Auth0 dashboard
- Ensure URL matches exactly (http vs https)
- Verify no trailing slashes in URLs

### Issue: Email Links Not Working

**Solution:**
- Check email template syntax for `{{ url }}` variable
- Test email template with "Send Test Email" button
- Verify reset link hasn't expired (default: 5 days)

---

## Security Notes

- Password reset links expire after 5 days by default (configurable in Auth0)
- Links can only be used once
- All redirects should use HTTPS in production
- Validate redirect URLs to prevent open redirect vulnerabilities
- Don't include sensitive data in redirect URLs

---

## Next Steps

1. Choose your implementation approach (Quick Fix or Complete Overhaul)
2. Apply Auth0 dashboard configuration changes
3. Test the flow end-to-end
4. Update documentation for your team
5. Monitor user feedback on password reset experience

---

## Summary

**Problem:** Users trapped on Auth0 pages during password reset  
**Root Cause:** Missing redirect configuration in Auth0 settings  
**Solution:** Configure Application Login URI + Email Redirect URL  
**Time to Implement:** 5-30 minutes depending on approach  
**Result:** Users can navigate back to login from all password reset screens  

---

**Questions?** Check Auth0 documentation:
- [Password Reset Customization](https://auth0.com/docs/customize/login-pages/classic-login/customize-password-reset-page)
- [Universal Login Configuration](https://auth0.com/docs/customize/login-pages/universal-login)
- [Email Template Variables](https://auth0.com/docs/customize/email/email-templates)
