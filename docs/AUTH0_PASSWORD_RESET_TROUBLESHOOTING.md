# Auth0 Password Reset Redirect Troubleshooting

## Issue
Set "Redirect To" field to `http://localhost:3000/` in "Change Password (Link)" template, but no button appears on success page.

## Troubleshooting Steps

### Step 1: Verify Template Settings

1. **Check you saved the template**
   - In Auth0 Dashboard → Branding → Email Templates
   - Select "Change Password (Link)" template
   - Scroll to "Redirect To" field
   - Confirm it shows: `http://localhost:3000/`
   - Click "Save" if not already saved

2. **Check template is enabled**
   - Toggle should be ON (green)
   - If disabled, enable it and save

### Step 2: Test with Fresh Password Reset Flow

Auth0 might cache the success page. Start completely fresh:

1. **Clear browser cache and cookies**
   - Or use an incognito/private window

2. **Initiate new password reset**
   - Go to your app's password reset flow
   - Enter email address
   - Check email for reset link

3. **Click the reset link**
   - This should be a FRESH link from the email you just received
   - Enter new password
   - Submit

4. **Check success page**
   - Look for a button (might say "Continue", "Back to Application", or "Go to Login")
   - Or check if page automatically redirects after a few seconds

### Step 3: Check Auth0 Template Documentation

The "Redirect To" field behavior might depend on:

1. **Universal Login vs Classic Login**
   - Go to: Branding → Universal Login → Settings
   - Check which experience you're using (New or Classic)
   - The redirect behavior might differ

2. **Template Variables**
   - Some templates might require you to add redirect links manually in HTML
   - Check if you need to customize the template body itself

### Step 4: Alternative - Add Redirect in Template HTML

If the "Redirect To" field doesn't automatically create a button, you can add one manually:

1. **Edit Template HTML**
   - In "Change Password (Link)" template
   - Scroll to the HTML editor
   - Add a redirect button manually

2. **Add This HTML** (at the bottom of the email body):

```html
<div style="margin-top: 40px; text-align: center;">
  <p>After resetting your password:</p>
  <a href="http://localhost:3000/" 
     style="display: inline-block; background: #2563eb; color: white; 
            padding: 12px 24px; text-decoration: none; border-radius: 6px; 
            margin: 20px 0;">
    Return to Application
  </a>
</div>
```

**But wait** - this only adds the link to the EMAIL, not the success page.

### Step 5: Check if Using New Universal Login

If you're using New Universal Login, the "Redirect To" behavior might be different:

1. **Go to**: Branding → Universal Login → Advanced Options

2. **Look for "Redirect URI" settings** in the page template

3. **You might need to customize the page template itself** to add a redirect button

### Step 6: Alternative Solution - Use ResultUrl Parameter

Auth0 might require the redirect to be passed as a query parameter in the password reset URL:

1. **Check Password Reset Email Template**
   - The email should contain a link like: `{{ url }}`

2. **Modify the URL to include resultUrl**:
   
   Change from:
   ```liquid
   {{ url }}
   ```
   
   To:
   ```liquid
   {{ url }}&resultUrl=http://localhost:3000/
   ```

   This tells Auth0 where to redirect after successful password change.

### Step 7: Use Custom Success Page (Advanced)

If none of the above work, you might need to customize the password reset success page itself:

1. **Go to**: Branding → Universal Login → Advanced Options

2. **Enable Custom Pages**

3. **Customize the Password Reset Result Page**
   - This requires editing the page template HTML/CSS/JS
   - You can add a custom redirect button

## Expected Behavior

After setting "Redirect To" field, one of these should happen:

1. **Automatic redirect** - Page redirects to your URL after 3-5 seconds
2. **Button appears** - "Continue" or "Return to application" button shows up
3. **Link appears** - Text link saying "Return to [your app]"

## Quick Test Commands

### Check if redirect is in email link:
```bash
# Request password reset and check the email source
# Look for the reset URL and see if it contains resultUrl parameter
```

### Check Auth0 logs:
1. Go to: Monitoring → Logs in Auth0 Dashboard
2. Look for password reset events
3. Check for any errors related to redirects

## Working Alternative Solution

If the "Redirect To" field continues not to work, use this approach:

### Option A: Add "Back to Login" in Email Template

In the "Change Password (Link)" email body HTML, add clear instructions:

```html
<div style="margin-top: 30px; padding: 20px; background: #f3f4f6; border-radius: 6px;">
  <p><strong>After resetting your password:</strong></p>
  <ol>
    <li>You'll see a success message</li>
    <li>Close that browser tab</li>
    <li>Return to <a href="http://localhost:3000/">Javelina DNS</a></li>
    <li>Click the Login button to sign in with your new password</li>
  </ol>
</div>
```

### Option B: Set Application URLs in Auth0 Application Settings

1. **Go to**: Applications → [Your Application] → Settings

2. **Scroll to "Application URIs"**

3. **Set these URLs**:
   - Allowed Logout URLs: `http://localhost:3000/`
   - Allowed Web Origins: `http://localhost:3000`
   - Allowed Origins (CORS): `http://localhost:3000`

4. **Save Changes**

This might enable Auth0 to show navigation elements back to your application.

## Still Not Working?

If none of these solutions work, the issue might be:

1. **Auth0 tenant settings** preventing redirects to HTTP URLs
2. **New Universal Login** requiring different configuration
3. **Custom domain required** for redirect to work
4. **Auth0 plan limitations** (free tier might have restrictions)

### Contact Auth0 Support

If this is critical, you can:
1. Check Auth0 Community Forums
2. Open a support ticket with Auth0
3. Check their documentation on password reset customization

## Recommended Next Steps

1. Try the "resultUrl" approach (Step 6)
2. Check if automatic redirect happens (wait 5 seconds on success page)
3. Customize email template with clear instructions (Option A)
4. Consider setting up local HTTPS for full compatibility

---

**Status**: Investigating why "Redirect To" field doesn't create button on success page
**Next**: Try resultUrl parameter in email template
