# Testing Password Reset Bug

## Quick Test Instructions

### 1. Start the Dev Server
```bash
npm run dev
```

### 2. Open Browser with Console
1. Navigate to: `http://localhost:3000/forgot-password`
2. Open DevTools: **F12** (Windows/Linux) or **Cmd+Option+I** (Mac)
3. Click on **Console** tab

### 3. Test Password Reset
1. Enter email: `ken.benavides@irongrove.com`
2. Click "Send Reset Instructions"
3. **Watch the console** - you should now see:
   ```
   Sending password reset email to: ken.benavides@irongrove.com
   Reset URL: http://localhost:3000/reset-password
   ```
4. Look for any error messages in **red**

### 4. Capture the Error
Take a screenshot or copy:
- ✅ The error message shown on the page
- ✅ **The console logs** (this is the important part now!)
- ✅ Any network errors (Network tab)

## What the New Code Does

The updated `resetPassword` function now logs:
- ✅ When it starts sending the email
- ✅ The reset URL being used
- ✅ Detailed error information if it fails
- ✅ Success confirmation if it works

## Expected Outcomes

### If Supabase Email is Not Configured:
```
Console: Sending password reset email to: ken.benavides@irongrove.com
Console: Reset URL: http://localhost:3000/reset-password
Console: Password reset error: {detailed error from Supabase}
Page shows: Unable to send email. Please check your email address.
```

### If Redirect URL Not Whitelisted:
```
Console: Password reset error: {error about redirect URL}
Page shows: {Supabase error message}
```

### If Rate Limited:
```
Console: Password reset error: {rate limit message}
Page shows: Too many requests. Please try again later.
```

### If Everything Works:
```
Console: Sending password reset email to: ken.benavides@irongrove.com
Console: Reset URL: http://localhost:3000/reset-password
Console: Password reset email sent successfully
Page shows: Success message with email icon
```

## Most Likely Issues

Based on "Load failed" error, it's probably one of these:

### 1. **Email Not Configured** (Most Likely)
Fix: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/auth/templates
- Enable email auth
- Configure SMTP or use default Supabase email

### 2. **User Doesn't Exist**
- Supabase still returns success (to prevent email enumeration)
- But email won't actually send
- Check if `ken.benavides@irongrove.com` exists in your Users table

### 3. **Network/Connection Issue**
- Check if Supabase project is accessible
- Verify API keys are correct

## Supabase Dashboard Quick Links

Replace `YOUR_PROJECT_ID` with your actual project ID (uhkwiqupiekatbtxxaky):

- **Users**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/auth/users
- **Email Templates**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/auth/templates  
- **URL Configuration**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/auth/url-configuration
- **Email Provider**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/settings/auth

## After Testing

Once you run the test and check the console, you'll see the **actual error message** which will tell us exactly what's wrong!

Then we can apply the specific fix needed.

