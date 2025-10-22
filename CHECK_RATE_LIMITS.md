# How to Check for Rate Limit Issues

## Quick Check - Browser Console
1. Open your app: `http://localhost:3000/forgot-password`
2. Open DevTools Console (F12 or Cmd+Option+I)
3. Try password reset
4. Look for error message - if rate limited, you'll see it clearly

## Supabase Dashboard - Multiple Options

### Option 1: Auth Logs (Best for Auth Issues)
**URL**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/logs/auth-logs

What to look for:
- Failed password reset attempts
- Rate limit errors
- Timestamps of attempts

### Option 2: API Logs (Shows All API Calls)
**URL**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/logs/explorer

What to look for:
- Search for "resetPasswordForEmail" 
- Look for status codes: 429 (Too Many Requests)
- Check response messages

### Option 3: Edge Logs (Network Level)
**URL**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/logs/edge-logs

Shows all requests to your Supabase project.

### Option 4: Reports (Overview)
**URL**: https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/reports

- View API requests over time
- Spot patterns of failures

## Browser DevTools - Network Tab

1. Open DevTools → **Network** tab
2. Try password reset
3. Look for requests to `supabase.co`
4. Click on the failed request
5. Check the **Response** tab

**Rate limit response looks like:**
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "status": 429
}
```

## Supabase Rate Limits for Password Reset

### Free Tier Limits:
- **Email sending**: 3-4 emails per hour (using default Supabase SMTP)
- **Password reset attempts**: Usually limited to prevent abuse

### If You Hit Rate Limits:
1. **Wait**: Usually 1 hour for email rate limits
2. **Use Custom SMTP**: Configure your own SMTP provider (no limits from Supabase)
3. **Upgrade**: Pro plan has higher limits

## Quick Test Command

Check recent logs via Supabase CLI (if installed):
```bash
# Install if you don't have it
npm install -g supabase

# Login
supabase login

# View logs
supabase logs --project-ref uhkwiqupiekatbtxxaky --filter auth
```

## Common Rate Limit Scenarios

### Scenario 1: Testing Too Much
**Problem**: You tried password reset 5+ times in a few minutes
**Solution**: Wait 1 hour, then test again

### Scenario 2: Email Rate Limit
**Problem**: Using Supabase default email (3 emails/hour limit)
**Solution**: Configure custom SMTP provider
- Go to: Settings → Auth → SMTP Settings
- Use SendGrid, Mailgun, AWS SES, etc.

### Scenario 3: Security Rate Limit
**Problem**: Multiple failed attempts from same IP
**Solution**: Wait 10-30 minutes, Supabase will auto-reset

## Check Current Rate Limit Status

Unfortunately, Supabase doesn't show a "current rate limit status" dashboard, but you can infer it:

1. **Try a test request** - See if it succeeds or fails
2. **Check logs** - Count recent password reset attempts
3. **Check email count** - How many emails were sent in the last hour?

## Your Project Specific Links

Replace sections as needed:

**Auth Logs**: 
https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/logs/auth-logs

**Settings → Auth**:
https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/settings/auth

**SMTP Configuration**:
https://supabase.com/dashboard/project/uhkwiqupiekatbtxxaky/settings/auth
(Scroll to "SMTP Settings")

## Testing Strategy to Avoid Rate Limits

1. **Test once** with console logging enabled
2. Check the **exact error** from console
3. Fix the root cause (not just retry multiple times)
4. Test again after fix is applied
5. If testing frequently, use **mock mode**:

### Enable Mock Mode for Testing:
```bash
# In .env.local, temporarily change to:
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-key

# Restart server
npm run dev

# Now password reset will log to console instead of sending emails
```

## What You Should See (No Rate Limit)

### Success Case:
```
Console: Sending password reset email to: user@example.com
Console: Reset URL: http://localhost:3000/reset-password
Console: Password reset email sent successfully
```

### Rate Limit Case:
```
Console: Sending password reset email to: user@example.com
Console: Reset URL: http://localhost:3000/reset-password
Console: Password reset error: { message: "rate limit exceeded", status: 429 }
Page: "Too many requests. Please try again later."
```

### Other Error Case:
```
Console: Sending password reset email to: user@example.com
Console: Reset URL: http://localhost:3000/reset-password
Console: Password reset error: { message: "Email provider not configured" }
Page: "Unable to send email. Please check your email address."
```

## Next Steps

1. **Clear any rate limits**: Wait 1 hour if you've been testing
2. **Run ONE test** with console open
3. **Check the console output** for the exact error
4. **Then check Supabase logs** to confirm

The console will tell you immediately if it's a rate limit issue!

