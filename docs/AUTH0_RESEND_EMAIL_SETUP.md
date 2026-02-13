# Auth0 Custom Email Setup with Resend

**Goal**: Configure Auth0 to send emails from `hello@javelina.cloud` (or your preferred address) using your existing Resend account.

**Time**: ~20 minutes  
**Cost**: FREE (Resend: 3,000 emails/month, 100/day)

---

## Why Custom Email?

**Before**: Emails come from `no-reply@auth0user.net` ❌  
**After**: Emails come from `Javelina DNS <hello@javelina.cloud>` ✅

**Benefits**:
- 🎯 Professional branding
- 📧 Higher email deliverability
- 🔒 Better trust signals for users
- 📊 Email analytics in Resend dashboard

---

## Prerequisites

- ✅ Resend account (you already have this!)
- ✅ Domain ownership (javelina.cloud)
- ✅ Access to DNS settings for your domain
- ✅ Auth0 account with free tier

---

## Step 1: Verify Domain in Resend (5 mins)

If you haven't already verified your domain in Resend:

1. **Go to Resend Dashboard**
   - Visit: https://resend.com/domains
   - Log in to your account

2. **Add Your Domain**
   - Click "Add Domain"
   - Enter: `javelina.cloud`
   - Click "Add"

3. **Add DNS Records**
   
   Resend will show you DNS records to add. They look like this:
   
   ```
   Type: TXT
   Name: _resend
   Value: resend-verify=abc123xyz...
   
   Type: MX
   Name: @
   Priority: 10
   Value: feedback-smtp.us-east-1.amazonses.com
   
   Type: TXT
   Name: @
   Value: v=spf1 include:amazonses.com ~all
   
   Type: CNAME
   Name: resend._domainkey
   Value: resend._domainkey.resend.com
   ```

4. **Add Records to Your DNS Provider**
   - Go to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
   - Add each DNS record exactly as shown in Resend
   - Save changes

5. **Verify in Resend**
   - Back in Resend dashboard, click "Verify Records"
   - DNS propagation can take 5-60 minutes
   - You'll see "Verified" when it's ready ✅

**Note**: If your domain is already verified in Resend, skip to Step 2!

---

## Step 2: Create Resend API Key (2 mins)

1. **Go to API Keys**
   - Navigate to: https://resend.com/api-keys

2. **Create New API Key**
   - Click "Create API Key"
   - Name: `Auth0 Email Service`
   - Permission: **Sending access** (default)
   - Domain: Select `javelina.cloud`
   - Click "Add"

3. **Copy API Key**
   - Copy the key that starts with `re_...`
   - **IMPORTANT**: Save it somewhere safe - you can only see it once!
   - Example: `re_Abc123Xyz_789DefGhi456JklMno`

---

## Step 3: Configure Auth0 to Use Resend (10 mins)

### Option A: Use Resend API via Custom SMTP (Recommended)

Auth0 doesn't have native Resend integration, but Resend provides SMTP credentials that Auth0 can use.

1. **Get Resend SMTP Credentials**
   
   Resend SMTP settings:
   ```
   SMTP Host: smtp.resend.com
   Port: 465 (SSL) or 587 (TLS)
   Username: resend
   Password: [Your Resend API Key from Step 2]
   ```

2. **Configure in Auth0**
   - Go to Auth0 Dashboard: https://manage.auth0.com/
   - Navigate to: **Branding** → **Email Provider**
   - Click "Use my own Email Provider"

3. **Select SMTP Provider**
   - Provider: Select "Other" or "Custom SMTP"
   - Fill in the form:
     
     ```
     SMTP Host: smtp.resend.com
     Port: 465
     Username: resend
     Password: [Your Resend API Key - paste the re_... key here]
     ```

4. **Configure Sender Details**
   
   ```
   From Email: hello@javelina.cloud
   From Name: Javelina DNS
   ```
   
   **Alternative sender options**:
   - `noreply@javelina.cloud` - If you don't want users to reply
   - `auth@javelina.cloud` - For authentication-specific emails
   - `support@javelina.cloud` - If you want to receive replies

5. **Advanced Settings** (Optional)
   - Reply-To: `support@javelina.cloud` (if different from From)
   - BCC: Leave blank unless you want to receive copies

6. **Save Configuration**
   - Click "Save"
   - Auth0 will test the connection

---

## Step 4: Test Email Configuration (3 mins)

### Test 1: Send Test Email from Auth0

1. **In Auth0 Email Provider Settings**
   - Look for "Send Test Email" button
   - Enter your email address
   - Click "Send"
   - Check your inbox (and spam folder!)

2. **Verify Email Appearance**
   - From: Should show `Javelina DNS <hello@javelina.cloud>`
   - Subject: Should be "Test email from Auth0"
   - Body: Should have Auth0 test message

### Test 2: Trigger Real Auth0 Email

1. **Create Test User**
   - Go to Auth0 Dashboard → Users
   - Click "Create User"
   - Enter a test email you control
   - Create account

2. **Trigger Password Reset**
   - In your Javelina app, go to login page
   - Click "Forgot Password"
   - Enter the test email
   - Check inbox for password reset email

3. **Verify Email Headers**
   - Open the email
   - Check that sender is `Javelina DNS <hello@javelina.cloud>`
   - Check that email passed SPF/DKIM checks (click "Show Original" in Gmail)

---

## Step 5: Customize Email Templates (Optional - 10 mins)

Now that emails come from your domain, make them look professional!

1. **Go to Email Templates**
   - Auth0 Dashboard → Branding → Email Templates

2. **Available Templates**
   - Welcome Email
   - Verification Email
   - Change Password Confirmation
   - Blocked Account Email
   - Password Breach Alert
   - Enrollment Email (MFA)
   - MFA OTP Code

3. **Customize Each Template**
   
   **Example: Verification Email**
   
   **Subject**: (Customize this)
   ```
   Verify your Javelina DNS account
   ```
   
   **Body**: (You can use HTML)
   ```html
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
       .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
       .button { background: #2563eb; color: white; padding: 12px 24px; 
                 text-decoration: none; border-radius: 6px; display: inline-block; }
       .footer { color: #6b7280; font-size: 14px; margin-top: 40px; }
     </style>
   </head>
   <body>
     <div class="container">
       <h1>Verify Your Email</h1>
       <p>Hi there,</p>
       <p>Thanks for signing up with Javelina DNS! To complete your registration, please verify your email address:</p>
       <p style="margin: 30px 0;">
         <a href="{{ url }}" class="button">Verify Email Address</a>
       </p>
       <p>Or copy and paste this link into your browser:</p>
       <p style="color: #6b7280; word-break: break-all;">{{ url }}</p>
       <p>This link will expire in 5 days.</p>
       <div class="footer">
         <p>If you didn't create a Javelina DNS account, you can safely ignore this email.</p>
         <p>© 2026 Javelina DNS. All rights reserved.</p>
       </div>
     </div>
   </body>
   </html>
   ```

4. **Test Custom Template**
   - Click "Preview" to see how it looks
   - Click "Send Test Email"
   - Verify it renders correctly

5. **Available Variables**
   
   You can use these in your templates:
   ```
   {{ application.name }}  - "Javelina DNS"
   {{ user.email }}        - User's email address
   {{ user.name }}         - User's name
   {{ url }}               - Action URL (verify, reset, etc.)
   {{ code }}              - Verification code (for MFA)
   ```

---

## Step 6: Monitor Email Delivery (Ongoing)

### In Resend Dashboard

1. **View Email Logs**
   - Go to: https://resend.com/emails
   - See all emails sent via Auth0
   - Check delivery status, opens, clicks

2. **Check Deliverability**
   - Resend shows bounce rates
   - Monitor for spam reports
   - Check for blocked recipients

### In Auth0 Dashboard

1. **View Email Stats**
   - Go to: Auth0 Dashboard → Monitoring → Logs
   - Filter by: `type:sapi` (server API events)
   - Look for email-related events

2. **Common Email Events**
   - `s` - Success (email sent)
   - `f` - Failed (delivery failed)
   - `limit_wc` - Rate limit exceeded

---

## Troubleshooting

### Issue: Test Email Not Received

**Solution 1: Check Spam Folder**
- Gmail often puts verification emails in spam initially
- Mark as "Not Spam" to improve future deliverability

**Solution 2: Verify SMTP Settings**
- Double-check SMTP host: `smtp.resend.com`
- Verify API key is correct (starts with `re_`)
- Try port 587 instead of 465

**Solution 3: Check Resend Logs**
- Go to Resend → Emails
- Look for failed deliveries
- Check error messages

---

### Issue: "SMTP Authentication Failed"

**Cause**: Incorrect API key or username

**Solution**:
1. Verify username is exactly: `resend` (lowercase)
2. Verify password is your full API key (starts with `re_`)
3. Create a new API key if needed
4. Make sure API key has "Sending access" permission

---

### Issue: Emails Sent but Not Delivered

**Cause**: Domain not verified or DNS records not propagated

**Solution**:
1. Check domain verification status in Resend
2. Wait 24-48 hours for DNS propagation
3. Use `dig` or `nslookup` to verify DNS records:
   ```bash
   dig TXT _resend.javelina.cloud
   dig TXT javelina.cloud
   dig CNAME resend._domainkey.javelina.cloud
   ```
4. Re-verify domain in Resend dashboard

---

### Issue: Emails Go to Spam

**Cause**: Missing or incorrect SPF/DKIM records

**Solution**:
1. Verify all DNS records from Resend are added correctly
2. Check SPF record includes Resend:
   ```
   v=spf1 include:amazonses.com ~all
   ```
3. Check DKIM record (resend._domainkey) is a CNAME
4. Use mail-tester.com to check email score
5. Send test email to check@mail-tester.com
6. Follow recommendations to improve score

---

### Issue: Rate Limit Exceeded

**Cause**: Exceeded Resend free tier limits
- 100 emails per day
- 3,000 emails per month

**Solution**:
1. Check Resend dashboard for current usage
2. Upgrade to paid plan if needed ($20/month for 50k emails)
3. Or optimize email usage:
   - Disable unnecessary email notifications
   - Batch verification emails
   - Use email verification only when required

---

## Free Tier Limits & Costs

### Resend Free Tier
```
✅ 3,000 emails/month
✅ 100 emails/day
✅ Unlimited domains
✅ Full API access
✅ Email analytics
```

### When You Might Need to Upgrade

**Scenario 1: High User Growth**
- If you onboard 100+ users/day
- Upgrade to $20/month (50,000 emails)

**Scenario 2: Marketing Emails**
- If you send newsletters via Resend
- Consider separating transactional vs marketing emails

**Scenario 3: Testing/Development**
- Use Resend's test mode for development
- Only use production API key in prod Auth0

---

## Best Practices

### 1. Use Descriptive Sender Names
```
✅ Good: "Javelina DNS <hello@javelina.cloud>"
❌ Bad: "noreply@javelina.cloud"
```

### 2. Set Up Reply-To Address
```
From: hello@javelina.cloud
Reply-To: support@javelina.cloud
```
This lets users reply while keeping sender clean.

### 3. Monitor Bounce Rates
- Check Resend dashboard weekly
- Remove bounced emails from your system
- High bounce rate hurts deliverability

### 4. Separate Dev and Prod
- Use different API keys for development vs production
- Test with real emails in dev (not test@example.com)
- Monitor both environments separately

### 5. Keep Templates Updated
- Update copyright year
- Keep branding consistent
- A/B test subject lines for better open rates

---

## Email Templates Checklist

After setup, customize these Auth0 templates:

- [ ] **Verification Email** - First email users receive
- [ ] **Welcome Email** - After verification
- [ ] **Change Password Confirmation** - After password reset
- [ ] **Blocked Account Email** - Security notification
- [ ] **MFA Enrollment Email** - When user adds MFA
- [ ] **MFA Code Email** - If using email-based MFA

**Priority**: Start with Verification Email - it's the most common!

---

## Testing Checklist

After configuration, test all flows:

- [ ] Test email sends successfully from Auth0
- [ ] Email appears from `Javelina DNS <hello@javelina.cloud>`
- [ ] Email doesn't go to spam
- [ ] Links in email work correctly
- [ ] Email renders well on mobile
- [ ] Email renders well in Gmail, Outlook, Apple Mail
- [ ] Resend dashboard shows delivery
- [ ] SPF/DKIM pass (check email headers)
- [ ] Reply-to works (if configured)
- [ ] Unsubscribe works (if configured)

---

## Next Steps

1. ✅ Complete this setup guide
2. 📝 Update Auth0 email templates with Javelina branding
3. 🧪 Test all email flows (signup, password reset, MFA)
4. 📊 Monitor Resend dashboard for first week
5. 🔄 Replicate for production environment when ready

---

## Quick Reference

**Resend SMTP Settings:**
```
Host: smtp.resend.com
Port: 465 (SSL) or 587 (TLS)
Username: resend
Password: [Your API Key]
```

**Recommended Sender:**
```
From: hello@javelina.cloud
From Name: Javelina DNS
Reply-To: support@javelina.cloud
```

**Auth0 Configuration:**
```
Location: Branding → Email Provider
Provider: Custom SMTP / Other
```

**Resend Dashboard:**
```
Domains: https://resend.com/domains
API Keys: https://resend.com/api-keys
Email Logs: https://resend.com/emails
```

---

## Support Resources

**Resend Documentation:**
- Docs: https://resend.com/docs
- SMTP Guide: https://resend.com/docs/send-with-smtp
- API Reference: https://resend.com/docs/api-reference

**Auth0 Documentation:**
- Email Provider Setup: https://auth0.com/docs/customize/email/email-providers
- Email Templates: https://auth0.com/docs/customize/email/email-templates

**DNS Tools:**
- MXToolbox: https://mxtoolbox.com/
- Mail Tester: https://www.mail-tester.com/
- DNS Checker: https://dnschecker.org/

---

## Summary

**What You Did:**
1. ✅ Verified domain in Resend (if not already done)
2. ✅ Created Resend API key for Auth0
3. ✅ Configured Auth0 to use Resend SMTP
4. ✅ Set sender as `Javelina DNS <hello@javelina.cloud>`
5. ✅ Tested email delivery
6. ✅ (Optional) Customized email templates

**Result:**
- All Auth0 emails now come from your brand
- Professional appearance builds trust
- Better deliverability with SPF/DKIM
- Full analytics in Resend dashboard

**Cost:**
- 💰 $0/month (stays free under 3,000 emails/month)

**Time Spent:**
- ⏱️ ~20 minutes

---

**Questions?** Check troubleshooting section or Resend docs!
