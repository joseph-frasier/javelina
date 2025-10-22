# Password Reset Debugging Guide

## The Issue
"Load failed" error appears when trying to reset password on `/forgot-password` page.

## Potential Causes

### 1. Supabase Email Configuration
**Symptom:** Error occurs immediately when submitting email
**Cause:** SMTP not configured in Supabase project
**Check:**
- Go to Supabase Dashboard → Authentication → Email Templates
- Verify email provider is set up (default or custom SMTP)

### 2. Redirect URL Not Whitelisted
**Symptom:** Error about redirect URL
**Cause:** `http://localhost:3000/reset-password` not in allowed list
**Fix:**
- Go to Supabase Dashboard → Authentication → URL Configuration
- Add to "Redirect URLs": `http://localhost:3000/reset-password`
- For production, add: `https://yourdomain.com/reset-password`

### 3. Rate Limiting
**Symptom:** Error after multiple attempts
**Cause:** Too many password reset requests
**Fix:** Wait a few minutes before trying again

### 4. Invalid Supabase Credentials
**Symptom:** Connection errors
**Check:** Verify `.env.local` has correct Supabase URL and key

## Testing Steps

### Step 1: Check Browser Console
1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Try password reset again
4. Look for logs:
   - "Sending password reset email to: [email]"
   - "Reset URL: [url]"
   - Any error messages in red

### Step 2: Check Network Tab
1. Open DevTools → Network tab
2. Try password reset
3. Look for failed requests to Supabase
4. Click on failed request to see error details

### Step 3: Test with Known User
Try these test scenarios:
- Use an email that you know exists in your database
- Use the exact email from your screenshot: `ken.benavides@irongrove.com`
- Check if this user exists in Supabase Dashboard → Authentication → Users

### Step 4: Verify Supabase Setup
```bash
# Check your Supabase configuration
cat .env.local | grep SUPABASE
```

Expected output should have valid URL and anon key (not placeholder values).

### Step 5: Test in Mock Mode (Optional)
To test without real email sending:
1. Temporarily change `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key
   ```
2. Restart dev server
3. Try password reset - should show console log instead of sending email
4. Restore real credentials when done

## Code Changes Made

✅ Added mock mode support to `resetPassword` function
✅ Added detailed console logging
✅ Added specific error message handling
✅ Better error messages for rate limiting and email issues

## Next Steps

1. **Run the app** and open browser console
2. **Try password reset** with the same email
3. **Check console logs** - you should now see detailed error information
4. **Share the console output** to identify the exact issue

## Common Error Messages

| Error Message | Likely Cause | Solution |
|--------------|--------------|----------|
| "rate limit" | Too many requests | Wait 5-10 minutes |
| "email" error | SMTP not configured | Set up email in Supabase Dashboard |
| "redirect" error | URL not whitelisted | Add URL to Supabase settings |
| Connection refused | Wrong Supabase URL | Check `.env.local` |

## Supabase Dashboard Checklist

- [ ] Email auth is enabled (Authentication → Providers → Email)
- [ ] Email templates are configured
- [ ] SMTP is set up (or using default Supabase SMTP)
- [ ] Redirect URLs include your app URL + `/reset-password`
- [ ] User with that email exists (if testing)

## Files Modified

- `lib/auth-store.ts` - Enhanced `resetPassword` function with better error handling

