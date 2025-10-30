# Stripe Integration Testing Guide

This guide walks you through testing the complete Stripe subscription flow in local development.

## Prerequisites

- Stripe account (test mode)
- Stripe CLI installed
- Node.js and npm installed
- Supabase project set up

## Installation

### 1. Install Stripe CLI

**macOS (using Homebrew):**
```bash
brew install stripe/stripe-cli/stripe
```

**Windows:**
```bash
scoop install stripe
```

**Linux:**
```bash
# Download and extract
wget https://github.com/stripe/stripe-cli/releases/latest/download/stripe_linux_x86_64.tar.gz
tar -xvf stripe_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

### 2. Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with Stripe.

## Local Development Setup

### Step 1: Environment Variables

Make sure your `.env.local` file has these Stripe variables:

```env
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Will be updated in Step 2

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 2: Start Development Servers

You need **TWO terminal windows** running simultaneously:

#### Terminal 1: Next.js Development Server
```bash
npm run dev
```

This starts your app at `http://localhost:3000`

#### Terminal 2: Stripe Webhook Listener
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

**IMPORTANT**: This command will output a webhook signing secret like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxxxxxxxxxxx
```

Copy this secret and update your `.env.local`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxx
```

Then **restart your Next.js server** (Terminal 1) for the new secret to take effect.

### Step 3: Verify Webhook Listener

In Terminal 2, you should see:
```
Ready! You're using Stripe API Version [2024-06-20]. Your webhook signing secret is whsec_xxxxx (^C to quit)
```

Keep this terminal running! If you close it, webhooks will stop working.

## Testing the Complete Flow

### Test Scenario: Create Organization with Paid Plan

#### 1. Create a New Organization

- Go to `http://localhost:3000/dashboard`
- Click **"+ Add Organization"**
- Enter name: **"Test Org"**
- Click **"Create Organization"**

#### 2. Select a Plan

- After creation, you'll be prompted to select a plan (or go to `/pricing`)
- Click **"Select Plan"** on either Basic or Pro
- Choose monthly or annual billing

#### 3. Complete Checkout

- You'll be redirected to `/checkout`
- Use Stripe test card: **4242 4242 4242 4242**
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits (e.g., 12345)
- Click **"Subscribe"**

#### 4. Verify Success

**In Terminal 2 (Stripe CLI), you should see:**
```
2024-10-29 12:34:56   --> customer.subscription.created [evt_xxxxx]
2024-10-29 12:34:57   --> invoice.payment_succeeded [evt_xxxxx]
2024-10-29 12:34:58   <-- [200] POST http://localhost:3000/api/stripe/webhook [evt_xxxxx]
```

**In Terminal 1 (Next.js), you should see:**
```
✅ Stripe client initialized with API version: 2024-06-20
✅ Subscription created: sub_xxxxx
💳 Returning PaymentIntent client_secret
💰 Invoice payment succeeded: in_xxxxx
✅ Subscription created: sub_xxxxx
✅ Subscription record synced: sub_xxxxx
```

**In your browser:**
- You'll be redirected to `/stripe/success`
- Go to `/settings/billing`
- Your organization should show the correct plan and status: **"active"**

#### 5. Verify in Database

Run this query in Supabase SQL Editor:
```sql
SELECT 
  o.name as org_name,
  p.name as plan_name,
  s.status,
  s.stripe_subscription_id,
  s.current_period_end
FROM organizations o
JOIN subscriptions s ON s.org_id = o.id
JOIN plans p ON p.id = s.plan_id
WHERE o.name = 'Test Org';
```

You should see your organization with an active subscription!

## Stripe Test Cards

### Successful Payments

| Card Number | Description |
|-------------|-------------|
| 4242 4242 4242 4242 | Visa - Succeeds |
| 5555 5555 5555 4444 | Mastercard - Succeeds |
| 3782 822463 10005 | American Express - Succeeds |

### Failed Payments

| Card Number | Description |
|-------------|-------------|
| 4000 0000 0000 0002 | Card declined |
| 4000 0000 0000 9995 | Insufficient funds |
| 4000 0000 0000 0069 | Expired card |

### 3D Secure Authentication

| Card Number | Description |
|-------------|-------------|
| 4000 0027 6000 3184 | 3D Secure required |
| 4000 0025 0000 3155 | 3D Secure required |

For more test cards, see: https://stripe.com/docs/testing

## Testing Different Plans

### Free Plan
- No checkout required
- Subscription created automatically on org creation
- No Stripe customer created

### Basic Plan ($3.50/month)
- Monthly: `price_1SL5NJA8kaNOs7rywCjYzPgH`
- Annual: `price_1SLSWiA8kaNOs7ryllPfcTHx`

### Pro Plan ($6.70/month)
- Monthly: `price_1SLSXKA8kaNOs7ryKJ6hCHd5`
- Annual: `price_1SLSYMA8kaNOs7ryrJU9oOYL`

### Enterprise Plan ($450/month)
- Monthly: `price_1SLSZFA8kaNOs7rywWLjhQ8b`

## Testing Subscription Changes

### Upgrade Plan

1. Go to `/settings/billing`
2. Click **"Manage Billing"** on your organization
3. Click **"Change Plan"**
4. Select a higher tier plan
5. Complete checkout (use test card)
6. Verify old subscription is canceled and new one is active

### Cancel Subscription

1. Go to Stripe Dashboard → Customers
2. Find your test customer
3. Click on the subscription
4. Click **"Cancel subscription"**
5. Choose immediate or end of period
6. Verify in your app that status updates to "canceled"

## Troubleshooting

### Issue: Webhook Not Received

**Symptoms:**
- Subscription created in Stripe
- No subscription record in database
- No webhook logs in Terminal 2

**Solution:**
1. Check that `stripe listen` is running in Terminal 2
2. Verify webhook secret in `.env.local` matches output from `stripe listen`
3. Restart Next.js server after updating webhook secret

### Issue: "No signature provided" Error

**Symptoms:**
- Server logs show: `No signature provided`

**Solution:**
- Make sure `STRIPE_WEBHOOK_SECRET` is set in `.env.local`
- Restart your Next.js server

### Issue: "Webhook Error: No signatures found matching the expected signature"

**Symptoms:**
- Webhook received but signature verification fails

**Solution:**
1. Stop `stripe listen`
2. Run it again: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. Copy the NEW webhook secret
4. Update `.env.local` with the new secret
5. Restart Next.js server

### Issue: Plan Shows as "Free" Despite Successful Payment

**Symptoms:**
- Subscription exists in database
- `plan_id` is NULL

**Solution:**
1. Check that plans table has `price_id` in metadata:
   ```sql
   SELECT code, metadata->>'price_id' as price_id FROM plans;
   ```
2. If missing, run: `supabase/verify-and-fix-plan-mappings.sql`

### Issue: Duplicate Subscriptions

**Symptoms:**
- Organization has multiple active subscriptions

**Solution:**
```sql
-- Find duplicates
SELECT org_id, COUNT(*) 
FROM subscriptions 
WHERE status IN ('active', 'trialing')
GROUP BY org_id 
HAVING COUNT(*) > 1;

-- Cancel old ones in Stripe Dashboard, then delete from DB
DELETE FROM subscriptions 
WHERE id = 'old_subscription_id';
```

## Viewing Stripe Dashboard Data

### Test Mode Data

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
2. Make sure you're in **Test Mode** (toggle in top right)

### Useful Views

- **Customers**: See all test customers and their subscriptions
- **Subscriptions**: View all active/canceled subscriptions
- **Payments**: See successful/failed payments
- **Webhooks**: View webhook events and delivery status
  - Go to Developers → Webhooks
  - Click on the webhook endpoint
  - View event logs

## Production Deployment Checklist

Before deploying to production:

### 1. Switch to Live Mode Keys

Update environment variables in Vercel/production:
```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx  # Not pk_test_
STRIPE_SECRET_KEY=sk_live_xxxxx  # Not sk_test_
```

### 2. Configure Production Webhook

In Stripe Dashboard (Live Mode):

1. Go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. **Endpoint URL**: `https://your-production-domain.com/api/stripe/webhook`
4. **Events to send**: Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Vercel environment variables:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### 3. Test Production Webhook

After deploying:

1. Create a test subscription in your production app
2. Check Stripe Dashboard → Webhooks → Event logs
3. Verify events show green checkmarks (200 status)
4. If red X (failed), click to see error details

### 4. Monitor Webhook Delivery

Set up monitoring for failed webhooks:
- Stripe Dashboard → Developers → Webhooks → Configure alerts
- Add email for failed webhook notifications

## Quick Reference Commands

### Start Development
```bash
# Terminal 1
npm run dev

# Terminal 2
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

### Test Subscription Flow
```bash
# 1. Go to http://localhost:3000/dashboard
# 2. Create organization
# 3. Select plan at /pricing
# 4. Checkout with card: 4242 4242 4242 4242
# 5. Verify at /settings/billing
```

### View Stripe Events
```bash
stripe events list --limit 10
```

### View Specific Event
```bash
stripe events retrieve evt_xxxxx
```

### Trigger Test Webhook Manually
```bash
stripe trigger customer.subscription.created
```

### View Webhooks in Real-Time
```bash
stripe listen --print-json
```

## Helpful Resources

- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Test Card Numbers](https://stripe.com/docs/testing#cards)

## Need Help?

If you encounter issues:

1. Check server logs (Terminal 1) for errors
2. Check webhook logs (Terminal 2) for delivery issues
3. Check Stripe Dashboard → Webhooks → Events for failed events
4. Run diagnostic query:
   ```sql
   SELECT 
     o.name,
     o.stripe_customer_id,
     s.stripe_subscription_id,
     p.name as plan,
     s.status
   FROM organizations o
   LEFT JOIN subscriptions s ON s.org_id = o.id
   LEFT JOIN plans p ON p.id = s.plan_id
   ORDER BY o.created_at DESC;
   ```

## Summary

✅ **Key Takeaway**: For local development, you MUST run `stripe listen` in a separate terminal for webhooks to work. Just having the webhook secret in `.env.local` is not enough!

The complete flow:
```
User → Select Plan → Checkout → Stripe Payment
  ↓
Stripe Webhooks → stripe listen (Terminal 2) → localhost:3000/api/stripe/webhook
  ↓
Create Subscription Record → Update Database → Show in UI
```

Happy testing! 🎉

