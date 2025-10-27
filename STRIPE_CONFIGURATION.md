# Stripe Configuration Guide

Complete guide for configuring Stripe with Javelina.

## Prerequisites

- Stripe account (https://dashboard.stripe.com)
- Supabase project with billing schema deployed
- Application deployed or running locally

---

## Step 1: Get Stripe API Keys

### Test Mode (Development)

1. Go to **Stripe Dashboard** → **Developers** → **API keys**
2. Copy your **Publishable key** (starts with `pk_test_`)
3. Copy your **Secret key** (starts with `sk_test_`)
4. Add to `.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Live Mode (Production)

1. Toggle to **Live mode** in Stripe dashboard
2. Copy your **Live Publishable key** (starts with `pk_live_`)
3. Copy your **Live Secret key** (starts with `sk_live_`)
4. Add to production environment variables

---

## Step 2: Configure Webhook Endpoint

Webhooks are **CRITICAL** for subscription activation and management.

### Local Development (Using Stripe CLI)

1. **Install Stripe CLI:**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe
   
   # Windows
   scoop install stripe
   
   # Linux
   # Download from https://github.com/stripe/stripe-cli/releases
   ```

2. **Login to Stripe:**
   ```bash
   stripe login
   ```

3. **Forward webhooks to localhost:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Copy the webhook signing secret** (starts with `whsec_`):
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Production Deployment

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL:
   ```
   https://yourdomain.com/api/stripe/webhook
   ```

4. Select events to listen for:
   - ✅ `invoice.payment_succeeded` (CRITICAL)
   - ✅ `invoice.payment_failed`
   - ✅ `customer.subscription.created`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`

5. Click **Add endpoint**
6. Copy the **Signing secret** and add to production env:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

---

## Step 3: Verify Products and Prices

Your Stripe products should already be created. Verify they match your plan configuration:

### Check Current Products

1. Go to **Stripe Dashboard** → **Products**
2. Verify you have:
   - **Free** (or no product needed)
   - **Basic** with monthly and annual prices
   - **Pro** with monthly and annual prices
   - **Enterprise** with monthly price

### Verify Price IDs Match

Open `lib/plans-config.ts` and verify price IDs match Stripe:

```typescript
// Example verification
Free: price_1SL5MCA8kaNOs7rye16c39RS
Basic Monthly: price_1SL5NJA8kaNOs7rywCjYzPgH
Basic Annual: price_1SLSWiA8kaNOs7ryllPfcTHx
Pro Monthly: price_1SLSXKA8kaNOs7ryKJ6hCHd5
Pro Annual: price_1SLSYMA8kaNOs7ryrJU9oOYL
Enterprise Monthly: price_1SLSZFA8kaNOs7rywWLjhQ8b
```

---

## Step 4: Configure Billing Portal

The Customer Portal allows customers to self-manage their subscriptions.

### Enable Customer Portal

1. Go to **Stripe Dashboard** → **Settings** → **Billing** → **Customer portal**
2. Click **Activate**
3. Configure settings:

#### Features to Enable:
- ✅ **Invoice history** - Let customers view past invoices
- ✅ **Update payment method** - Let customers update cards
- ✅ **Cancel subscriptions** - Let customers cancel (recommended)

#### Cancellation Settings:
- **When customers cancel**: Choose behavior
  - Recommended: "Cancel at end of billing period"
  - This prevents immediate service loss

#### Payment Method Settings:
- ✅ Allow customers to update payment methods
- ✅ Allow customers to remove payment methods

4. Click **Save**

---

## Step 5: Test the Integration

### Test Webhooks

1. **Start your application:**
   ```bash
   npm run dev
   ```

2. **Start Stripe webhook forwarding** (separate terminal):
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

3. **Trigger a test webhook:**
   ```bash
   stripe trigger invoice.payment_succeeded
   ```

4. **Check your application logs** for webhook processing

### Test Payment Flow

1. **Navigate to pricing page:**
   ```
   http://localhost:3000/pricing
   ```

2. **Select a paid plan** (Basic or Pro)

3. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

4. **Complete payment** on embedded form

5. **Verify:**
   - Redirect to success page ✓
   - Webhook fires and processes ✓
   - Subscription status becomes "active" ✓
   - Organization subscription record created ✓

### Test Customer Portal

1. **Go to billing settings:**
   ```
   http://localhost:3000/settings/billing?org_id=YOUR_ORG_ID
   ```

2. **Click "Manage Billing"**

3. **Verify portal features work:**
   - View invoices ✓
   - Update payment method ✓
   - Cancel subscription ✓

---

## Step 6: Production Deployment

### Environment Variables

Set in your hosting platform (Vercel, Railway, etc.):

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe (LIVE MODE)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_... (from production webhook)

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Webhook Configuration

1. **Add production webhook endpoint** in Stripe
2. **Use your production domain:**
   ```
   https://yourdomain.com/api/stripe/webhook
   ```
3. **Select same events** as test mode
4. **Copy new signing secret** (different from test mode!)
5. **Update production env** with new webhook secret

### Switch to Live Mode

1. **In Stripe dashboard**, toggle from **Test mode** to **Live mode**
2. **Update all keys** in production environment
3. **Verify products exist** in live mode
4. **Test with real card** (small amount)

---

## Troubleshooting

### Webhook Not Firing

**Symptom:** Subscription stays "incomplete", never becomes "active"

**Solutions:**
1. Check webhook endpoint is accessible (not localhost in production)
2. Verify webhook signing secret matches environment
3. Check webhook logs in Stripe dashboard for errors
4. Ensure webhook events are selected correctly

### Payment Succeeds but Subscription Not Created

**Symptom:** Payment goes through, but no subscription in database

**Solutions:**
1. Check webhook handler logs for errors
2. Verify `org_id` is in subscription metadata
3. Check database permissions (service role key)
4. Verify billing schema is deployed

### Invalid Price ID Errors

**Symptom:** "No such price" error during checkout

**Solutions:**
1. Verify price IDs in `lib/plans-config.ts` match Stripe
2. Ensure using correct mode (test vs live)
3. Check products are active in Stripe dashboard

### Portal Session Creation Fails

**Symptom:** "Customer not found" when opening billing portal

**Solutions:**
1. Verify organization has `stripe_customer_id`
2. Check customer exists in Stripe
3. Verify service role key has database access

---

## Security Checklist

Before going live:

- [ ] All secret keys are in environment variables (not code)
- [ ] `.env.local` is in `.gitignore`
- [ ] Using live mode keys in production
- [ ] Webhook signing secret is set correctly
- [ ] Service role key is secure
- [ ] HTTPS enabled on production domain
- [ ] Webhook endpoint returns 200 OK quickly
- [ ] Error logging configured
- [ ] Test mode keys removed from production

---

## Support

- **Stripe Docs:** https://stripe.com/docs
- **Stripe CLI:** https://stripe.com/docs/stripe-cli
- **Webhook Testing:** https://stripe.com/docs/webhooks/test
- **Customer Portal:** https://stripe.com/docs/billing/subscriptions/customer-portal

---

## Quick Reference

### Test Cards

| Card Number | Scenario |
|-------------|----------|
| 4242 4242 4242 4242 | Success |
| 4000 0000 0000 0002 | Decline |
| 4000 0025 0000 3155 | Requires authentication |

### Webhook Events

| Event | Purpose |
|-------|---------|
| `invoice.payment_succeeded` | Activate subscription (CRITICAL) |
| `invoice.payment_failed` | Mark subscription past_due |
| `customer.subscription.created` | Initial subscription sync |
| `customer.subscription.updated` | Plan changes, renewals |
| `customer.subscription.deleted` | Subscription cancellation |

### API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/stripe/create-subscription-intent` | Start checkout |
| `/api/stripe/webhook` | Receive Stripe events |
| `/api/stripe/create-portal-session` | Open billing portal |
| `/api/subscriptions/current` | Get subscription details |
| `/api/subscriptions/can-create` | Check resource limits |

