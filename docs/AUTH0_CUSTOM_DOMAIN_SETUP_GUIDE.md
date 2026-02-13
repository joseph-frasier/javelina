# Auth0 Custom Domain Setup Guide

## Overview

Setting up custom domains for Auth0 replaces the long default URLs with your branded domain.

**You'll set up TWO custom domains** (one for each environment):

### Development:
- ❌ `https://dev-pyrfyfctb4wx0f3k.us.auth0.com/...`
- ✅ `https://auth-dev.javelina.cloud/...`

### Production:
- ❌ `https://prod-abc123xyz.us.auth0.com/...` (when you create prod tenant)
- ✅ `https://auth.javelina.cloud/...`

**Why two domains?** Dev should match prod to ensure proper testing. If prod has custom domain features, dev needs them too.

## Benefits

### 1. Better User Experience
- Professional branded URLs
- Users see your domain, not "auth0.com"
- Builds trust and credibility

### 2. Better Customization
- More control over hosted pages
- Easier to customize login/password reset pages
- Better redirect URL control

### 3. Session Cookie Benefits
- Cookies set on your domain (not auth0.com)
- Better cross-subdomain authentication
- More reliable session management

### 4. Eliminates Current Issues
- No more issues with redirect URLs requiring HTTPS
- Can customize success pages more easily
- Better control over password reset flow

### 5. Dev/Prod Parity
- Test exact same Auth0 setup in dev as prod
- No surprises when deploying
- Confident deployments with matching environments

## Difficulty Level

**Rating: 2/10** (Easy)

**Time Required**: 45-90 minutes (for both dev and prod)
- Per domain: 30-45 minutes
- Can do both in parallel

**Technical Skills Needed**:
- Access to DNS settings for javelina.cloud
- Basic understanding of DNS records (CNAME)
- That's it!

## Cost

### Auth0 Pricing

**Important**: Custom domains are available on:
- ✅ **FREE tier** - YES, available!
- ✅ **Essentials tier** ($35/month)
- ✅ **Professional tier** ($240/month)

**Note**: Auth0 changed their pricing in recent years and custom domains are now available on free tier.

### For Two Environments

**Dev Tenant** (free tier):
- Custom domain: `auth-dev.javelina.cloud`
- Cost: $0

**Prod Tenant** (free tier):
- Custom domain: `auth.javelina.cloud`
- Cost: $0

### SSL Certificate

Auth0 provides **FREE SSL certificates** via Let's Encrypt automatically for both domains.

### DNS

Most DNS providers include unlimited CNAME records at no extra cost.

**Total Cost: $0** (both tenants on free tier)

## Prerequisites

- ✅ Domain ownership: `javelina.cloud` (you have this)
- ✅ Access to DNS settings
- ✅ Two Auth0 tenants (dev and prod)
  - You already have dev tenant: `dev-pyrfyfctb4wx0f3k.us.auth0.com`
  - You'll create prod tenant during setup

## Setup Steps

### Step 0: Create Production Auth0 Tenant (5 mins)

If you don't already have a separate production tenant:

1. **Go to Auth0 Dashboard**
   - Top-right corner: Click your tenant name dropdown
   - Click "Create tenant"

2. **Configure New Tenant**
   - Tenant name: `javelina-prod` (or similar)
   - Region: Same as dev (for consistency)
   - Environment: Production

3. **Save Credentials**
   - Note down: Domain, Client ID, Client Secret
   - You'll need these for production deployment

**Now you have:**
- Dev tenant: `dev-pyrfyfctb4wx0f3k.us.auth0.com`
- Prod tenant: `javelina-prod.us.auth0.com` (or similar)

### Step 1: Choose Your Subdomains (2 mins)

Pick subdomains for each environment:

**Development:**
- `auth-dev.javelina.cloud`

**Production:**
- `auth.javelina.cloud`

**Why these names?**
- `auth-dev` clearly indicates development environment
- `auth` is clean and professional for production
- Both follow standard naming conventions

### Step 2: Configure Development Custom Domain (5 mins)

1. **Switch to Dev Tenant**
   - In Auth0 Dashboard, top-right: Select your dev tenant
   - Should be: `dev-pyrfyfctb4wx0f3k`

2. **Navigate to Custom Domains**
   - Go to: **Branding** → **Custom Domains**

3. **Add Development Custom Domain**
   - Click "Set Up a Custom Domain"
   - Enter: `auth-dev.javelina.cloud`
   - Click "Add Domain"

4. **Select Certificate Management**
   - Choose: "Auth0-managed certificates" (recommended)
   - This uses Let's Encrypt (free, automatic renewal)

5. **Get DNS Configuration for Dev**
   - Auth0 will show you a CNAME record to add
   - Example:
     ```
     Type: CNAME
     Name: auth-dev
     Value: dev-abc123.edge.tenants.auth0.com
     TTL: 3600 (or automatic)
     ```
   - **Write this down** - you'll add it to DNS in the next step

### Step 2b: Configure Production Custom Domain (5 mins)

1. **Switch to Prod Tenant**
   - In Auth0 Dashboard, top-right: Switch to production tenant
   - Should be: `javelina-prod` (or whatever you named it)

2. **Navigate to Custom Domains**
   - Go to: **Branding** → **Custom Domains**

3. **Add Production Custom Domain**
   - Click "Set Up a Custom Domain"
   - Enter: `auth.javelina.cloud`
   - Click "Add Domain"

4. **Select Certificate Management**
   - Choose: "Auth0-managed certificates" (recommended)

5. **Get DNS Configuration for Prod**
   - Auth0 will show you a CNAME record to add
   - Example:
     ```
     Type: CNAME
     Name: auth
     Value: prod-xyz789.edge.tenants.auth0.com
     TTL: 3600 (or automatic)
     ```
   - **Write this down** - you'll add it to DNS in the next step

**Important**: The CNAME values will be DIFFERENT for dev and prod!

### Step 3: Add DNS Records (10 mins)

Now add BOTH CNAME records to your DNS provider.

#### If using Cloudflare (recommended for DNS):

1. **Go to Cloudflare Dashboard**
   - Select domain: `javelina.cloud`
   - Go to: **DNS** → **Records**

2. **Add Development CNAME Record**
   - Type: `CNAME`
   - Name: `auth-dev`
   - Target: `[value from Dev Auth0 - looks like: dev-abc123.edge.tenants.auth0.com]`
   - Proxy status: **DNS only** (gray cloud, not orange) - Important!
   - TTL: Auto
   - Click "Save"

3. **Add Production CNAME Record**
   - Type: `CNAME`
   - Name: `auth`
   - Target: `[value from Prod Auth0 - looks like: prod-xyz789.edge.tenants.auth0.com]`
   - Proxy status: **DNS only** (gray cloud, not orange) - Important!
   - TTL: Auto
   - Click "Save"

4. **Verify Both Records Are DNS Only**
   - This is critical - records must be DNS only
   - Orange cloud = Proxied (wrong)
   - Gray cloud = DNS only (correct)
   - Both `auth-dev` and `auth` should have gray clouds

**Result**: You should now have two CNAME records:
```
auth-dev.javelina.cloud → dev-abc123.edge.tenants.auth0.com
auth.javelina.cloud → prod-xyz789.edge.tenants.auth0.com
```

#### If using other DNS provider:

1. Log into your DNS provider (GoDaddy, Namecheap, etc.)
2. Add BOTH CNAME records as shown by Auth0
3. Save changes

### Step 4: Verify Domains in Auth0 (10 mins)

You need to verify both domains (do them in parallel to save time).

#### Verify Development Domain:

1. **Switch to Dev Tenant in Auth0**
   - Go to: **Branding** → **Custom Domains**

2. **Click "Verify" for auth-dev.javelina.cloud**
   - Auth0 will check if DNS record exists

3. **Wait for DNS Propagation**
   - Usually takes 5-15 minutes
   - Check status: https://dnschecker.org/ (search for `auth-dev.javelina.cloud`)

4. **Wait for SSL Certificate**
   - Once DNS verified, Auth0 provisions SSL certificate
   - Takes 5-10 minutes
   - Status will change to "Ready"

#### Verify Production Domain:

1. **Switch to Prod Tenant in Auth0**
   - Go to: **Branding** → **Custom Domains**

2. **Click "Verify" for auth.javelina.cloud**
   - Auth0 will check if DNS record exists

3. **Wait for DNS Propagation**
   - Check status: https://dnschecker.org/ (search for `auth.javelina.cloud`)

4. **Wait for SSL Certificate**
   - Status will change to "Ready"

**Tip**: While waiting for DNS propagation, you can work on both tenants simultaneously. Check status every 5 minutes.

### Step 5: Update Application Configuration (15 mins)

Once both domains are verified and SSL is provisioned, update your applications.

#### Development Tenant Configuration:

1. **Switch to Dev Tenant**
   - In Auth0 Dashboard

2. **Update Dev Application URLs**
   
   Go to: **Applications** → [Your Dev Application] → **Settings**
   
   Update these URLs:
   ```
   Application Login URI:
   http://localhost:3000/
   
   Allowed Callback URLs:
   http://localhost:3001/auth/callback
   
   Allowed Logout URLs:
   http://localhost:3000/
   
   Allowed Web Origins:
   http://localhost:3000
   ```

3. **Update Dev Backend Environment Variables**
   
   In your backend `.env.development` or `.env.local`:
   ```env
   # Before:
   AUTH0_DOMAIN=dev-pyrfyfctb4wx0f3k.us.auth0.com
   
   # After:
   AUTH0_DOMAIN=auth-dev.javelina.cloud
   
   # Other settings:
   AUTH0_CLIENT_ID=<dev_client_id>
   AUTH0_CLIENT_SECRET=<dev_client_secret>
   FRONTEND_URL=http://localhost:3000
   AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback
   ```

#### Production Tenant Configuration:

1. **Switch to Prod Tenant**
   - In Auth0 Dashboard

2. **Create Production Application**
   - Go to: **Applications** → **Create Application**
   - Name: "Javelina DNS Production"
   - Type: Regular Web Application
   - Click "Create"

3. **Update Prod Application URLs**
   
   Go to: **Applications** → [Your Prod Application] → **Settings**
   
   Update these URLs:
   ```
   Application Login URI:
   https://javelina.cloud/
   
   Allowed Callback URLs:
   https://api.javelina.cloud/auth/callback
   
   Allowed Logout URLs:
   https://javelina.cloud/
   
   Allowed Web Origins:
   https://javelina.cloud
   ```

4. **Update Prod Backend Environment Variables**
   
   In your backend `.env.production`:
   ```env
   AUTH0_DOMAIN=auth.javelina.cloud
   AUTH0_CLIENT_ID=<prod_client_id>
   AUTH0_CLIENT_SECRET=<prod_client_secret>
   FRONTEND_URL=https://javelina.cloud
   AUTH0_CALLBACK_URL=https://api.javelina.cloud/auth/callback
   ```

5. **No Code Changes Needed**
   - Your backend code doesn't need to change
   - Just environment variables

### Step 6: Test Both Environments (20 mins)

Test both domains to ensure everything works.

#### Test Development Domain (Local):

1. **Restart Backend Server**
   - Restart to pick up new `AUTH0_DOMAIN` env var

2. **Test Dev Login Flow**
   - Go to: `http://localhost:3000`
   - Click "Login"
   - Backend should redirect to: `https://auth-dev.javelina.cloud/authorize?...`
   - Complete login flow
   - Verify callback works
   - You should be logged in

3. **Test Dev Password Reset**
   - Go to password reset flow
   - Request password reset
   - Check email - links should point to `auth-dev.javelina.cloud`
   - Click reset link
   - Should open: `https://auth-dev.javelina.cloud/u/reset-password/...`
   - Enter new password
   - Success page should show "Continue" button (if Application Login URI is set)
   - Click button - should redirect to `http://localhost:3000`

4. **Check Dev SSL Certificate**
   - In browser, open: `https://auth-dev.javelina.cloud`
   - Click padlock icon
   - Verify certificate is valid
   - Issued by: Let's Encrypt
   - Valid for: `auth-dev.javelina.cloud`

#### Test Production Domain (When Deployed):

Do the same tests for production:
- Login should redirect to: `https://auth.javelina.cloud/authorize?...`
- Password reset links should use: `https://auth.javelina.cloud/u/reset-password/...`
- Redirects should go to: `https://javelina.cloud`
- SSL certificate should be valid for: `auth.javelina.cloud`

## Post-Setup: Customize Pages

Now that you have custom domains, you can customize both environments.

### 1. Customize Login Pages (Both Tenants)

Go to: **Branding** → **Universal Login** (in each tenant)

- Add custom logo
- Change colors
- Customize text
- Add custom CSS

**Tip**: Keep dev and prod branding similar for consistency, but you can add a visual indicator (like a "DEV" badge) in the dev environment.

### 2. Customize Password Reset Pages (Both Tenants)

Go to: **Branding** → **Universal Login** → **Advanced Options** (in each tenant)

With custom domains, you have MORE control over page templates:
- Can add custom JavaScript
- Can add redirect buttons
- Can customize success messages

### 3. Set Application Login URI (CRITICAL for UX Fix)

This is what solves your password reset UX problem!

**Dev Tenant:**
- Go to: **Applications** → [Your Dev App] → **Settings**
- Set: `Application Login URI: http://localhost:3000/`

**Prod Tenant:**
- Go to: **Applications** → [Your Prod App] → **Settings**
- Set: `Application Login URI: https://javelina.cloud/`

**Result**: Auth0 will automatically add "Return to Application" or "Continue" buttons on password reset success pages!

### 4. Configure Email Templates (Both Tenants)

**Dev Tenant Email Templates:**
- Go to: **Branding** → **Email Templates**
- **Change Password (Link)** template:
  - Redirect To: `http://localhost:3000/`
- Customize subject/body as needed

**Prod Tenant Email Templates:**
- Go to: **Branding** → **Email Templates**
- **Change Password (Link)** template:
  - Redirect To: `https://javelina.cloud/`
- Keep subject/body consistent with dev

**Tip**: Copy email template HTML from dev to prod to ensure consistency.

## Troubleshooting

### DNS Verification Failing

**Issue**: Auth0 can't verify DNS record

**Solutions**:
1. Check CNAME record is correct in DNS
2. Ensure Cloudflare proxy is disabled (gray cloud)
3. Wait 15-30 minutes for DNS propagation
4. Use `dig` to verify:
   ```bash
   dig auth.javelina.cloud CNAME
   ```
5. Should return the Auth0 edge domain

### SSL Certificate Not Provisioning

**Issue**: Domain verified but certificate stuck

**Solutions**:
1. Wait 10-15 minutes - certificate provisioning takes time
2. Check Auth0 status page for incidents
3. Verify CAA records don't block Let's Encrypt
4. Contact Auth0 support if stuck for > 1 hour

### Login Redirecting to Old Domain

**Issue**: Still seeing dev-pyrf...auth0.com URLs

**Solutions**:
1. Verify `AUTH0_DOMAIN` updated in backend `.env`
2. Restart backend server
3. Clear backend server cache
4. Check for hardcoded URLs in code
5. Clear browser cache/cookies

### Mixed Content Errors

**Issue**: HTTP/HTTPS mixing causing errors

**Solutions**:
1. Ensure all callback URLs use correct protocol
2. Production should use HTTPS exclusively
3. Local dev can use HTTP for backend callbacks

## Environment Configuration Summary

### Development Environment

**Auth0 Tenant**: Dev tenant (`dev-pyrfyfctb4wx0f3k`)
**Custom Domain**: `auth-dev.javelina.cloud`

```env
# Backend .env.development or .env.local
AUTH0_DOMAIN=auth-dev.javelina.cloud
AUTH0_CLIENT_ID=<dev_client_id>
AUTH0_CLIENT_SECRET=<dev_client_secret>
AUTH0_CALLBACK_URL=http://localhost:3001/auth/callback
FRONTEND_URL=http://localhost:3000
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://auth-dev.javelina.cloud/
```

**Application URLs** (in Auth0 dashboard):
- Application Login URI: `http://localhost:3000/`
- Allowed Callback URLs: `http://localhost:3001/auth/callback`
- Allowed Logout URLs: `http://localhost:3000/`

**Email Templates**:
- Redirect To: `http://localhost:3000/`

### Production Environment

**Auth0 Tenant**: Prod tenant (`javelina-prod` or similar)
**Custom Domain**: `auth.javelina.cloud`

```env
# Backend .env.production
AUTH0_DOMAIN=auth.javelina.cloud
AUTH0_CLIENT_ID=<prod_client_id>
AUTH0_CLIENT_SECRET=<prod_client_secret>
AUTH0_CALLBACK_URL=https://api.javelina.cloud/auth/callback
FRONTEND_URL=https://javelina.cloud
AUTH0_AUDIENCE=https://api.javelina.io
AUTH0_ISSUER=https://auth.javelina.cloud/
```

**Application URLs** (in Auth0 dashboard):
- Application Login URI: `https://javelina.cloud/`
- Allowed Callback URLs: `https://api.javelina.cloud/auth/callback`
- Allowed Logout URLs: `https://javelina.cloud/`

**Email Templates**:
- Redirect To: `https://javelina.cloud/`

### Benefits of This Setup

✅ Dev/prod parity - test exactly what you deploy
✅ Isolated user databases
✅ Can break things in dev safely
✅ Professional URLs in both environments
✅ Same customization capabilities
✅ No surprises when deploying to production

## Custom Domain Limitations

### Free Tier Limitations

On Auth0 free tier with custom domain:
- ✅ Custom domain works
- ✅ SSL certificate included
- ✅ Page customization available
- ❌ Limited to 7,000 active users
- ❌ Limited to 1 application (or a few)
- ❌ No access to Actions (might be limited)

Check Auth0 current pricing for exact limits.

### Features Requiring Paid Plans

These features might require paid plans:
- Multiple custom domains
- Advanced page template customization
- Custom database connections
- MFA for all users
- Advanced anomaly detection

**But for your use case** (custom domain + password reset customization), free tier should work!

## Security Considerations

### 1. DNS Security

- Use DNS provider with good security (Cloudflare recommended)
- Enable DNSSEC if provider supports it
- Protect DNS account with 2FA

### 2. Monitor Certificate Expiry

- Auth0 auto-renews Let's Encrypt certificates
- Set up monitoring to alert if certificate issues occur
- Check certificate status in Auth0 dashboard monthly

### 3. HTTPS Everywhere

- Never use custom domain with HTTP (always HTTPS)
- Update all callback URLs to match protocol
- Set secure cookie flags in production

## Rollback Plan

If something goes wrong:

1. **Keep Old Domain Active**
   - Don't delete old tenant immediately
   - Keep old configuration as backup

2. **Quick Rollback**
   - Change `AUTH0_DOMAIN` back to old domain
   - Restart services
   - Debug custom domain separately

3. **DNS Rollback**
   - Remove CNAME record if needed
   - Takes 5-15 minutes to propagate

## Timeline

**Minimum**: 45 minutes (for both domains)
- 5 min: Create prod tenant (if needed)
- 5 min: Choose subdomains
- 10 min: Configure both custom domains in Auth0
- 10 min: Add both DNS records
- 10 min: Wait for verification (can do both in parallel)
- 5 min: Update application configs

**Realistic**: 1.5-2 hours (for both domains)
- Includes troubleshooting
- Includes thorough testing of both environments
- Includes email template configuration
- Includes customization

**With DNS Propagation Delays**: Up to 24 hours
- Rare, but DNS can be slow
- Usually 15-30 minutes in practice
- Both domains can propagate simultaneously

## Recommendation

**Yes, absolutely set up TWO custom domains (dev and prod)!**

**Why**:
1. ✅ Easy to set up (just add two DNS records)
2. ✅ Free (both tenants on free tier, no additional cost)
3. ✅ Solves your current password reset UX issues in BOTH environments
4. ✅ Professional appearance everywhere
5. ✅ Better customization options
6. ✅ Dev/prod parity - test what you deploy
7. ✅ Production-ready

**When**:
- Set up dev domain first (`auth-dev.javelina.cloud`)
- Test thoroughly in local development
- Set up prod domain when ready to deploy (`auth.javelina.cloud`)
- One-time setup per environment, works forever

**Difficulty**: Still easy! Just two DNS records instead of one, and you can add them at the same time.

## Next Steps

1. **Create production Auth0 tenant** (if you haven't already)
2. **Choose subdomains**: `auth-dev.javelina.cloud` and `auth.javelina.cloud`
3. **Configure both domains in Auth0 dashboard** (Branding → Custom Domains)
4. **Add both CNAME records** to your DNS provider
5. **Wait for verification** (15 minutes, both can verify in parallel)
6. **Update backend env vars** for both environments
7. **Configure email templates** in both tenants
8. **Test thoroughly** in dev
9. **Deploy to production** with confidence
10. **Enjoy branded URLs** in both environments and fixed UX!

## Resources

- [Auth0 Custom Domain Docs](https://auth0.com/docs/customize/custom-domains)
- [DNS Checker Tool](https://dnschecker.org/)
- [SSL Labs Test](https://www.ssllabs.com/ssltest/)
- [Auth0 Pricing](https://auth0.com/pricing)

---

## Quick Reference: DNS Records

When you're done, your DNS should look like this:

```
# Development
Type: CNAME
Name: auth-dev
Value: <value-from-dev-auth0-tenant>.edge.tenants.auth0.com
Result: auth-dev.javelina.cloud

# Production  
Type: CNAME
Name: auth
Value: <value-from-prod-auth0-tenant>.edge.tenants.auth0.com
Result: auth.javelina.cloud
```

**Two DNS records, two Auth0 tenants, perfect dev/prod parity.**

---

**Bottom Line**: Setting up TWO custom domains (dev and prod) is **MUCH easier** than trying to work around Auth0's hosted page limitations, and ensures you're testing exactly what you'll deploy. It's a one-time 45-90 minute task that solves multiple problems and gives you professional, tested infrastructure.

**Do it!** 🚀
