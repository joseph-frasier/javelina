<!-- eed38943-aa5f-472a-8a18-95fbe35c354f 30b46dfd-2d8c-4ea1-aeb6-4ac5e288ad5d -->
# Add Monthly Recurring Subscription Plans

## Overview

Implement monthly recurring subscription plans (Starter, Pro, Business) that work alongside existing lifetime plans. The architecture already supports subscriptions through Stripe integration; we need to add the new plan variants and update the checkout flow to handle recurring payments.

## Current Architecture Analysis

### Existing Lifetime Plans

- **Database**: `plans` table with `billing_interval = null` for lifetime plans
- **Status**: Subscriptions use status `'lifetime'` for one-time payments
- **Payment Flow**: Uses Stripe PaymentIntents for one-time charges
- **Plan Codes**: `starter_lifetime`, `pro_lifetime`, `premium_lifetime`, `enterprise_lifetime`
- **Limits**: Hardcoded in `lib/plans-config.ts` (not enforced, ready for LaunchDarkly)

### Key Files

- `lib/plans-config.ts` - Plan configuration with hardcoded limits
- `lib/stripe-helpers.ts` - Stripe webhook handlers and sync functions
- `app/pricing/page.tsx` - Pricing display
- `app/checkout/page.tsx` - Checkout flow
- `components/billing/SubscriptionManager.tsx` - Subscription management UI

## Implementation Steps

### 1. Database Migration (Dev Branch)

Create migration to add monthly subscription plans:

**Add new plan records:**

```sql
-- Starter Monthly ($X/month)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata)
VALUES (
  'starter',
  'Starter',
  'month',
  'prod_THefRjwMEakPYm',
  '{"price": [AMOUNT], "price_id": "price_1SVxEyA8kaNOs7ryzQmtRyFv", "description": "..."}'
);

-- Pro Monthly ($X/month)  
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata)
VALUES (
  'pro',
  'Pro',
  'month',
  'prod_THeggCI1HVHeQ9',
  '{"price": [AMOUNT], "price_id": "price_1SVxFvA8kaNOs7ry16tQZRok", "description": "..."}'
);

-- Business Monthly ($X/month)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata)
VALUES (
  'business',
  'Business',  
  'month',
  'prod_TI2cDjhyuRaH7R',
  '{"price": [AMOUNT], "price_id": "price_1SVxJgA8kaNOs7ryV8rFJ6oo", "description": "..."}'
);

-- Enterprise (contact sales only)
INSERT INTO plans (code, name, billing_interval, stripe_product_id, metadata)
VALUES (
  'enterprise',
  'Enterprise',
  null,
  'prod_TI2eKuLY9hXIoN',
  '{"description": "Custom pricing", "contact_sales": true}'
);
```

### 2. Update Hardcoded Limits (`lib/plans-config.ts`)

Add subscription plan variants with same limits as lifetime counterparts:

```typescript
const HARDCODED_PLAN_LIMITS = {
  // Existing lifetime plans...
  'starter_lifetime': { ... },
  
  // New subscription plans (same limits as lifetime)
  'starter': {
    organizations: 1,
    users: 1,
    environments: 2,
    zones: 2,
    records: 200,
    queries: '5m',
  },
  'pro': {
    organizations: 1,
    users: 5,
    environments: 20,
    zones: 20,
    records: 2000,
    queries: '50m',
  },
  'business': {
    organizations: 1,
    users: 20,
    environments: 50,
    zones: 50,
    records: 5000,
    queries: '500m',
  },
  'enterprise': {
    organizations: -1,
    users: -1,
    environments: -1,
    zones: -1,
    records: -1,
    queries: 'Custom',
  },
};
```

### 3. Update Plan Conversion Logic (`lib/plans-config.ts`)

Modify `convertDbPlanToPlan()` to handle both lifetime and recurring plans:

- Keep existing lifetime plan logic
- Add recurring plan handling with monthly pricing
- Update boolean features based on plan tier (not just lifetime suffix)

### 4. Update Pricing Page (`app/pricing/page.tsx`)

Restructure to show plans in separate sections:

**Layout:**

```
Lifetime Plans (One-Time Payment)
├── Starter Lifetime - $238.80
├── Pro Lifetime - $1,198.80
└── Premium Lifetime - $4,776.00

Monthly Subscriptions
├── Starter - $X/month
├── Pro - $X/month
└── Business - $X/month

Enterprise (Full Width)
└── Contact Sales
```

**Implementation:**

- Filter plans by `billing_interval` (null = lifetime, 'month' = subscription)
- Display separate grid sections with headers
- Update billing interval display logic

### 5. Update Checkout Flow

No major changes needed - backend API already supports:

- Creating Stripe Subscriptions for recurring plans
- Creating PaymentIntents for one-time plans

**Verification:**

- Checkout already passes `plan_code` to backend
- Backend determines payment type from plan's `billing_interval`
- Webhooks already handle `subscription.created` events

### 6. Update Subscription Manager (`components/billing/SubscriptionManager.tsx`)

Add upgrade/downgrade functionality:

**For subscription plans only:**

- Show "Change Plan" button
- Modal to select new subscription tier
- Call `stripeApi.updateSubscription(org_id, new_plan_code)`
- Backend uses Stripe's subscription update API

**For lifetime plans:**

- Hide "Change Plan" button
- Show message: "Contact sales to modify lifetime plan"

### 7. Backend API Verification

External backend API should already handle:

- ✅ Creating Stripe Subscriptions for recurring plans
- ✅ Processing `subscription.created` webhook
- ✅ Processing `subscription.updated` webhook  
- ✅ Processing `invoice.payment_succeeded` webhook

**Verify webhook sets correct status:**

- Recurring subscriptions → status = 'active' (not 'lifetime')
- Lifetime purchases → status = 'lifetime'

### 8. Update Subscription Types (`types/billing.ts`)

Ensure types support both plan types - already supports this via nullable `billing_interval`.

## Testing Checklist

1. ✅ Plans appear in database (dev branch)
2. ✅ Pricing page shows lifetime and subscription sections
3. ✅ Can checkout with subscription plan
4. ✅ Subscription appears in database with status='active'
5. ✅ Can checkout with lifetime plan (regression test)
6. ✅ Can upgrade from Starter → Pro (subscription)
7. ✅ Can downgrade from Business → Pro (subscription)
8. ✅ Cannot change lifetime plans via UI

## Notes

- Enterprise plan is contact-sales only (no checkout flow)
- Premium/Business naming: Database uses "premium_lifetime", but display as "Business Lifetime" for consistency
- Limit enforcement deferred to LaunchDarkly integration
- Payment failure handling deferred to LaunchDarkly integration
- No switching between lifetime ↔ subscription types

### To-dos

- [ ] Create database migration to add monthly subscription plans
- [ ] Add subscription plan limits to HARDCODED_PLAN_LIMITS
- [ ] Update convertDbPlanToPlan() to handle subscription plans
- [ ] Restructure pricing page with separate lifetime/subscription sections
- [ ] Add upgrade/downgrade UI to SubscriptionManager
- [ ] Verify backend API handles recurring subscriptions correctly
- [ ] Test complete flows for both lifetime and subscription plans