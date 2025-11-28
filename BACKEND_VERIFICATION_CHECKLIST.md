# Backend API Verification Checklist for Recurring Subscriptions

This document outlines the verification steps to ensure the backend API properly handles recurring subscription plans alongside lifetime plans.

## Overview
The backend Express API needs to handle both:
- **Lifetime Plans**: One-time PaymentIntents (`billing_interval = null`)
- **Subscription Plans**: Recurring Stripe Subscriptions (`billing_interval = 'month'`)

## API Endpoints to Verify

### 1. POST `/api/stripe/subscriptions`
**Purpose**: Create subscription intent for checkout

**Request Body**:
```json
{
  "org_id": "uuid",
  "plan_code": "starter" | "pro" | "business" | "starter_lifetime" | "pro_lifetime" | "premium_lifetime",
  "price_id": "price_xxx" (optional)
}
```

**Expected Behavior**:
- For **subscription plans** (`starter`, `pro`, `business`):
  - Create Stripe Subscription with `payment_behavior='default_incomplete'`
  - Return `{ clientSecret, flow: 'payment_intent' }`
  
- For **lifetime plans** (`starter_lifetime`, `pro_lifetime`, `premium_lifetime`):
  - Create Stripe PaymentIntent for one-time payment
  - Return `{ clientSecret, flow: 'payment_intent' }`

**Verification**:
```bash
curl -X POST http://localhost:3001/api/stripe/subscriptions \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"test-org-id","plan_code":"starter"}'
```

✅ **Expected**: Returns clientSecret for subscription
✅ **Expected**: Subscription status starts as 'incomplete'

---

### 2. POST `/api/stripe/subscriptions/update`
**Purpose**: Upgrade/downgrade subscription plans

**Request Body**:
```json
{
  "org_id": "uuid",
  "new_plan_code": "pro" | "business" | "starter"
}
```

**Expected Behavior**:
- Retrieve current subscription from database
- Update Stripe subscription with new price ID
- **Charge prorated difference IMMEDIATELY** (not on next invoice)
- Return updated subscription details

**IMPORTANT: Proration Behavior**:
The backend MUST use `proration_behavior: 'always_invoice'` to charge the prorated difference immediately:

```typescript
const updatedSubscription = await stripe.subscriptions.update(
  subscriptionId,
  {
    items: [{
      id: subscriptionItemId,
      price: newPriceId,
    }],
    // Charge prorated difference immediately
    proration_behavior: 'always_invoice',
    // Expand to see the invoice details
    expand: ['latest_invoice.payment_intent'],
  }
);
```

**Proration Options** (for reference):
- `create_prorations` (default) - Prorations added to next invoice ❌
- `always_invoice` - Charge immediately ✅ (USE THIS)
- `none` - No proration

**Restrictions**:
- ❌ Should NOT allow switching from lifetime to subscription
- ❌ Should NOT allow switching from subscription to lifetime
- ✅ Should allow upgrade/downgrade within subscription plans only

**Verification**:
```bash
curl -X POST http://localhost:3001/api/stripe/subscriptions/update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"test-org-id","new_plan_code":"pro"}'
```

---

### 3. GET `/api/subscriptions/current`
**Purpose**: Get current subscription for organization

**Query Parameters**:
- `org_id`: Organization UUID

**Expected Response**:
```json
{
  "subscription": {
    "subscription_id": "uuid",
    "stripe_subscription_id": "sub_xxx" | "pi_xxx",
    "plan_code": "starter" | "starter_lifetime",
    "status": "active" | "lifetime",
    "current_period_start": "ISO8601",
    "current_period_end": "ISO8601" | null,
    "cancel_at_period_end": boolean
  },
  "plan": {
    "code": "starter",
    "name": "Starter",
    "billing_interval": "month" | null,
    "metadata": {
      "price": 9.95,
      "price_id": "price_xxx"
    }
  }
}
```

---

## Webhook Handlers to Verify

### 1. `customer.subscription.created`
**Expected Behavior**:
- Extract `price_id` from subscription items
- Look up plan from `plans` table using `metadata->>'price_id'`
- Create subscription record with `status = 'incomplete'` or `'active'`
- Set `billing_interval` based on plan

**Verification in Database**:
```sql
-- After successful subscription creation
SELECT 
  s.stripe_subscription_id,
  s.status,
  p.code,
  p.billing_interval,
  p.metadata->>'price_id' as price_id
FROM subscriptions s
JOIN plans p ON s.plan_id = p.id
WHERE s.org_id = 'test-org-id';
```

✅ **Expected**: `status = 'active'` for recurring subscriptions
✅ **Expected**: `billing_interval = 'month'` for subscription plans

---

### 2. `customer.subscription.updated`
**Expected Behavior**:
- Update subscription record in database
- Handle plan changes (upgrade/downgrade)
- Update `current_period_end`
- Update `status` if changed

---

### 3. `invoice.payment_succeeded`
**Expected Behavior**:
- For recurring subscriptions: Update status to `'active'`
- For lifetime plans: Update status to `'lifetime'`
- Set `current_period_start` and `current_period_end`

---

### 4. `invoice.payment_failed`
**Expected Behavior**:
- Update subscription status to `'past_due'`
- ⚠️ NOTE: Limit enforcement deferred to LaunchDarkly integration

---

## Database Schema Verification

### Plans Table
```sql
SELECT code, name, billing_interval, stripe_product_id, 
       metadata->>'price_id' as price_id,
       metadata->>'price' as price
FROM plans 
WHERE is_active = true
ORDER BY code;
```

**Expected Results**:
- `starter`: billing_interval='month', price=9.95, price_id='price_1SVxEyA8kaNOs7ryzQmtRyFv'
- `pro`: billing_interval='month', price=49.95, price_id='price_1SVxFvA8kaNOs7ry16tQZRok'
- `business`: billing_interval='month', price=199.95, price_id='price_1SVxJgA8kaNOs7ryV8rFJ6oo'
- `starter_lifetime`: billing_interval=null, price=238.80
- `pro_lifetime`: billing_interval=null, price=1198.80
- `premium_lifetime`: billing_interval=null, price=4776.00

---

## Integration Tests

### Test Case 1: Subscribe to Monthly Plan
1. Create organization
2. Select "Starter" monthly plan ($9.95/month)
3. Complete checkout
4. Verify subscription in database has:
   - `status = 'active'`
   - `stripe_subscription_id` starts with 'sub_'
   - `plan_id` points to 'starter' plan
   - `current_period_end` is ~30 days from now

### Test Case 2: Upgrade Subscription
1. Start with "Starter" monthly plan
2. Upgrade to "Pro" monthly plan
3. Verify:
   - Subscription updated in Stripe
   - Database record updated with new `plan_id`
   - Prorated charge created
   - No new subscription created

### Test Case 3: Downgrade Subscription
1. Start with "Business" monthly plan
2. Downgrade to "Pro" monthly plan
3. Verify:
   - Subscription updated immediately
   - Prorated credit applied
   - `current_period_end` remains the same

### Test Case 4: Purchase Lifetime Plan (Regression Test)
1. Create organization
2. Select "Starter Lifetime" plan ($238.80)
3. Complete checkout
4. Verify subscription in database has:
   - `status = 'lifetime'`
   - `stripe_subscription_id` starts with 'pi_' (PaymentIntent)
   - `plan_id` points to 'starter_lifetime' plan
   - `current_period_end = null`

### Test Case 5: Cannot Switch Between Plan Types
1. Purchase "Starter Lifetime" plan
2. Attempt to change to "Pro" monthly plan
3. Verify: UI shows "Contact sales" message, no API call made

---

## Environment Variables Required

Backend API must have:
- `STRIPE_SECRET_KEY`: Stripe API secret key
- `STRIPE_WEBHOOK_SECRET`: Webhook signing secret
- `SUPABASE_SERVICE_ROLE_KEY`: For webhook write operations
- `SUPABASE_URL`: Database URL

---

## Status Check Commands

### Check Plans in Database (Dev Branch)
```bash
psql -h db.ipfsrbxjgewhdcvonrbo.supabase.co -U postgres -d postgres \
  -c "SELECT code, billing_interval, metadata->>'price' FROM plans WHERE is_active = true;"
```

### Check Recent Subscriptions
```bash
psql -h db.ipfsrbxjgewhdcvonrbo.supabase.co -U postgres -d postgres \
  -c "SELECT s.stripe_subscription_id, s.status, p.code, p.billing_interval 
      FROM subscriptions s 
      JOIN plans p ON s.plan_id = p.id 
      ORDER BY s.created_at DESC LIMIT 5;"
```

---

## Completion Checklist

- [x] Database migration applied to dev branch
- [x] Plans table has monthly subscription plans
- [x] Frontend updated to display both plan types
- [ ] Backend API tested with monthly subscription checkout
- [ ] Webhook handlers tested with Stripe CLI
- [ ] Upgrade/downgrade flow tested end-to-end
- [ ] Lifetime plan checkout still works (regression test)
- [ ] Stripe Dashboard shows correct subscription metadata

---

## Notes

1. **No Plan Type Switching**: Users cannot switch between lifetime and subscription plans through the UI. This business rule must be enforced in the backend.

2. **Enterprise Plans**: Both `enterprise` and `enterprise_lifetime` are contact-sales only. No checkout flow.

3. **Limit Enforcement**: NOT implemented yet. Will be handled by LaunchDarkly integration.

4. **Payment Failure Handling**: NOT implemented yet. Will be handled by LaunchDarkly integration.

5. **Proration**: Stripe automatically handles proration for subscription upgrades/downgrades.

