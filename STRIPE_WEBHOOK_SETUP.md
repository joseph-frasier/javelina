# Stripe Webhook Setup Guide

## Overview
Stripe webhooks are now handled by the Express API backend at `/api/stripe/webhooks`. This guide explains how to configure and test webhooks for both local development and production.

---

## 🔧 Configuration

### 1. Environment Variables

Add the following to your backend `.env.local` file:

```bash
# backend/.env.local
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

### 2. Get Your Webhook Secret

#### **For Local Development (Stripe CLI)**

1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
   ```bash
   brew install stripe/stripe-cli/stripe
   ```

2. Login to Stripe CLI:
   ```bash
   stripe login
   ```

3. Forward webhooks to local backend:
   ```bash
   stripe listen --forward-to http://localhost:3001/api/stripe/webhooks
   ```

4. Copy the webhook signing secret (starts with `whsec_`) and add to `backend/.env.local`

#### **For Production (Stripe Dashboard)**

1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your production URL: `https://your-api-domain.com/api/stripe/webhooks`
4. Select events to listen for:
   - `invoice.payment_succeeded`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click "Add endpoint"
6. Copy the "Signing secret" and add to your production environment variables

---

## 🎯 Webhook Events Handled

The Express API handles the following Stripe events:

| Event | Handler | Description |
|-------|---------|-------------|
| `invoice.payment_succeeded` | `handleInvoicePaymentSucceeded` | Activates subscription after successful payment |
| `invoice.paid` | `handleInvoicePaymentSucceeded` | Activates subscription (alias) |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | Marks subscription as past_due |
| `customer.subscription.created` | `handleSubscriptionCreated` | Creates subscription record in database |
| `customer.subscription.updated` | `handleSubscriptionUpdated` | Syncs subscription changes |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | Cancels subscription |

---

## 🧪 Testing Webhooks

### Local Testing with Stripe CLI

1. **Start the backend server:**
   ```bash
   cd backend
   npm run dev
   ```

2. **In a new terminal, start Stripe CLI forwarding:**
   ```bash
   stripe listen --forward-to http://localhost:3001/api/stripe/webhooks
   ```

3. **Trigger a test webhook:**
   ```bash
   # Test successful payment
   stripe trigger invoice.payment_succeeded

   # Test failed payment
   stripe trigger invoice.payment_failed

   # Test subscription created
   stripe trigger customer.subscription.created
   ```

4. **Watch backend logs** to see webhook processing

### Test with Real Subscription Flow

1. Navigate to `http://localhost:3000/checkout`
2. Create a test subscription using Stripe test card: `4242 4242 4242 4242`
3. Watch webhook events arrive in real-time:
   - `customer.subscription.created`
   - `invoice.payment_succeeded`
4. Verify subscription appears in database

### Verify Webhook Endpoint

```bash
# Test webhook endpoint is accessible
curl -X POST http://localhost:3001/api/stripe/webhooks \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Expected response (will fail signature verification):
# {"success":false,"error":"No signature provided"}
```

---

## 🔍 Monitoring & Debugging

### Check Backend Logs

When a webhook is received, you'll see logs like:
```
💰 Invoice payment succeeded: in_xxxx
✅ Subscription activated: sub_xxxx
```

### Check Stripe Dashboard

1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. View recent deliveries and responses
4. See any failed webhooks and retry them

### Common Issues

#### ❌ "Webhook signature verification failed"
- **Cause:** Wrong webhook secret or raw body parsing issue
- **Fix:** Verify `STRIPE_WEBHOOK_SECRET` matches your endpoint secret
- **Check:** Backend has raw body parsing for `/api/stripe/webhooks` (already configured in `backend/src/index.ts`)

#### ❌ "Webhook Error: No signature provided"
- **Cause:** Missing `stripe-signature` header
- **Fix:** Ensure requests are coming from Stripe, not manual curl

#### ❌ "Unable to associate invoice with a subscription"
- **Cause:** Invoice doesn't have subscription metadata
- **Fix:** Ensure subscriptions are created with proper `org_id` metadata

---

## 📝 Architecture Notes

### Why Express Handles Webhooks

1. **Security:** Webhook signature verification requires raw body access
2. **Centralization:** All Stripe logic in one place (Express backend)
3. **Database Access:** Direct Supabase Admin SDK access for subscription updates
4. **Consistency:** Same error handling and logging as other API routes

### Old vs New

| Location | Old (Next.js) | New (Express) |
|----------|---------------|---------------|
| **Endpoint** | `/app/api/stripe/webhook/route.ts` | `/backend/src/controllers/stripeController.ts::handleWebhook` |
| **URL** | `http://localhost:3000/api/stripe/webhook` | `http://localhost:3001/api/stripe/webhooks` |
| **Auth** | None (webhook signature) | None (webhook signature) |
| **Raw Body** | Next.js config required | Express middleware configured |

---

## ✅ Deployment Checklist

Before going to production:

- [ ] `STRIPE_SECRET_KEY` set in production backend environment
- [ ] `STRIPE_WEBHOOK_SECRET` set in production backend environment
- [ ] Webhook endpoint added in Stripe Dashboard pointing to production API
- [ ] All required webhook events selected
- [ ] Test webhook delivery from Stripe Dashboard
- [ ] Monitor webhook delivery success rate
- [ ] Set up alerts for failed webhooks

---

## 🔗 Related Files

- **Backend Webhook Handler:** `backend/src/controllers/stripeController.ts::handleWebhook`
- **Webhook Route:** `backend/src/routes/stripe.ts`
- **Stripe Config:** `backend/src/config/stripe.ts`
- **Raw Body Middleware:** `backend/src/index.ts` (lines ~30-35)

---

## 🆘 Support

If webhooks are failing:
1. Check backend logs for error messages
2. Verify webhook secret matches Stripe Dashboard
3. Test with Stripe CLI first before production
4. Check Stripe Dashboard webhook delivery logs
5. Ensure Express server is accessible from Stripe servers (production only)

