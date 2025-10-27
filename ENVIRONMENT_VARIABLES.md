# Environment Variables Reference

Complete list of required and optional environment variables for Javelina.

## Required Variables

### Supabase Configuration

```bash
# Supabase project URL
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anonymous key (safe for client-side)
# Get from: Supabase Dashboard → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role key (server-side only, full access)
# Get from: Supabase Dashboard → Settings → API
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Stripe Configuration

```bash
# Stripe publishable key (safe for client-side)
# Test mode: pk_test_...
# Live mode: pk_live_...
# Get from: Stripe Dashboard → Developers → API keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key

# Stripe secret key (server-side only)
# Test mode: sk_test_...
# Live mode: sk_live_...
# Get from: Stripe Dashboard → Developers → API keys
STRIPE_SECRET_KEY=sk_test_your_secret_key

# Stripe webhook signing secret
# Different for each webhook endpoint
# Get from: Stripe Dashboard → Developers → Webhooks
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### Application Configuration

```bash
# Base URL of your application (no trailing slash)
# Local development: http://localhost:3000
# Production: https://yourdomain.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Optional Variables

```bash
# Node environment
NODE_ENV=development

# Enable debug logging
DEBUG=true
```

---

## Setup Instructions

### 1. Create .env.local file

```bash
# In project root
cp .env.example .env.local  # If .env.example exists
# OR create new .env.local file
```

### 2. Fill in Supabase values

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - Project URL
   - `anon` `public` key
   - `service_role` `secret` key

### 3. Fill in Stripe values

#### For Development (Test Mode):

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Ensure you're in **Test mode** (toggle in top-right)
3. Go to **Developers** → **API keys**
4. Copy:
   - Publishable key (pk_test_...)
   - Secret key (sk_test_...)

5. Set up webhooks (see below)

#### For Production (Live Mode):

1. Switch to **Live mode** in Stripe Dashboard
2. Go to **Developers** → **API keys**
3. Copy **Live** keys (pk_live_..., sk_live_...)
4. Set up production webhook endpoint

### 4. Configure webhook secret

#### Local Development:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret from output
# It starts with whsec_
```

#### Production:

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter: `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the signing secret

---

## Environment-Specific Configuration

### Local Development (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe CLI)

NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Production (Vercel/Railway/etc.)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from production webhook)

NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

---

## Security Best Practices

### DO:
- ✅ Keep `.env.local` in `.gitignore`
- ✅ Use environment variables for all secrets
- ✅ Use test keys in development
- ✅ Use live keys only in production
- ✅ Rotate keys periodically
- ✅ Use different webhook secrets per environment

### DON'T:
- ❌ Commit secrets to git
- ❌ Share secrets in Slack/email
- ❌ Use production keys in development
- ❌ Hardcode secrets in code
- ❌ Expose service role key to client
- ❌ Use same webhook secret for multiple endpoints

---

## Variable Prefixes

### NEXT_PUBLIC_*
- Exposed to the browser
- Safe for client-side code
- Visible in browser dev tools
- Use for: API URLs, publishable keys

### Without prefix
- Server-side only
- Never sent to browser
- Use for: Secret keys, service role keys

---

## Troubleshooting

### "Invalid API key" errors

**Check:**
- Using correct mode (test vs live)
- Key matches Stripe dashboard
- No extra spaces in .env.local
- Server restarted after changing .env

### "Webhook signature verification failed"

**Check:**
- Webhook secret matches Stripe
- Using correct environment's secret
- No extra spaces in .env.local
- Webhook endpoint is accessible

### "Supabase client initialization failed"

**Check:**
- URL starts with https://
- URL ends with .supabase.co
- No trailing slashes
- Keys are from same project

---

## Quick Test

Test your configuration:

```bash
# 1. Start dev server
npm run dev

# 2. Check Supabase connection (should see no errors)
# Visit: http://localhost:3000

# 3. Check Stripe (in separate terminal)
stripe listen --forward-to localhost:3000/api/stripe/webhook

# 4. Trigger test webhook
stripe trigger invoice.payment_succeeded
```

---

## Additional Resources

- [Supabase Environment Variables](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Stripe API Keys](https://stripe.com/docs/keys)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)

