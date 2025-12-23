# Backend Checkout Validation: Starter-Only Launch

This document specifies the backend validation requirements to enforce **Starter subscription** and **Starter Lifetime** as the only purchaseable plans during the initial product launch.

## Overview

While the frontend uses LaunchDarkly feature flags to hide Pro and Business plans from the UI, the backend **must** validate all checkout and upgrade requests to ensure users can only purchase:

- **`starter`** – Monthly subscription plan
- **`starter_lifetime`** – One-time lifetime plan

All other plan codes (`pro`, `business`, `enterprise`, `pro_lifetime`, `premium_lifetime`, `enterprise_lifetime`) should be **rejected** during the starter-only launch period, even if they remain in the database and Stripe.

---

## Allowed Plan Codes

### Purchaseable Plans (Launch Period)

| Plan Code | Type | Price | Status |
|-----------|------|-------|--------|
| `starter` | Monthly subscription | $9.95/month | ✅ Allowed |
| `starter_lifetime` | One-time lifetime | $238.80 | ✅ Allowed |

### Blocked Plans (Not Purchaseable During Launch)

| Plan Code | Type | Status |
|-----------|------|--------|
| `pro` | Monthly subscription | ❌ Blocked |
| `business` | Monthly subscription | ❌ Blocked |
| `enterprise` | Contact sales | ❌ Blocked |
| `pro_lifetime` | One-time lifetime | ❌ Blocked |
| `premium_lifetime` | One-time lifetime (Business Lifetime) | ❌ Blocked |
| `enterprise_lifetime` | Contact sales | ❌ Blocked |

---

## Validation Requirements

### 1. Create Subscription (`stripeApi.createSubscription`)

**Endpoint**: Handles new subscription creation during checkout

**Location**: Express backend API (e.g., `/api/stripe/create-subscription` or similar)

**Function Signature**:
```typescript
createSubscription(
  orgId: string,
  planCode: string,
  priceId?: string,
  promoCode?: string
): Promise<SubscriptionIntent>
```

**Required Validation**:

1. **Plan Code Allowlist Check**:
   ```typescript
   const ALLOWED_PURCHASE_PLANS = ['starter', 'starter_lifetime'];
   
   if (!ALLOWED_PURCHASE_PLANS.includes(planCode)) {
     throw new Error('PLAN_NOT_AVAILABLE_FOR_PURCHASE');
     // Return HTTP 422 Unprocessable Entity
   }
   ```

2. **Price ID Cross-Check (Optional but Recommended)**:
   - Fetch the plan from database by `planCode`
   - Verify `priceId` matches `plan.metadata.price_id`
   - This prevents price_id tampering

3. **Response on Validation Failure**:
   ```json
   {
     "error": "PLAN_NOT_AVAILABLE_FOR_PURCHASE",
     "message": "This plan is not currently available. Please choose from our available plans.",
     "code": 422
   }
   ```

**Validation Order**:
1. Validate `orgId` exists and user has access
2. **Validate `planCode` is in allowed list** ← NEW
3. Validate `priceId` if provided
4. Create Stripe subscription/payment intent
5. Store in database

---

### 2. Upgrade to Lifetime (`stripeApi.upgradeToLifetime`)

**Endpoint**: Handles subscription-to-lifetime and lifetime-to-lifetime upgrades

**Location**: Express backend API (e.g., `/api/stripe/upgrade-lifetime`)

**Function Signature**:
```typescript
upgradeToLifetime(
  orgId: string,
  targetPlanCode: string
): Promise<PaymentIntent>
```

**Required Validation**:

1. **Target Plan Allowlist Check**:
   ```typescript
   const ALLOWED_LIFETIME_UPGRADES = ['starter_lifetime'];
   
   if (!ALLOWED_LIFETIME_UPGRADES.includes(targetPlanCode)) {
     throw new Error('UPGRADE_NOT_AVAILABLE');
     // Return HTTP 422 Unprocessable Entity
   }
   ```

2. **Response on Validation Failure**:
   ```json
   {
     "error": "UPGRADE_NOT_AVAILABLE",
     "message": "This upgrade is not currently available. Please choose from our available plans.",
     "code": 422
   }
   ```

**Validation Order**:
1. Fetch current subscription for org
2. **Validate `targetPlanCode` is in allowed upgrade list** ← NEW
3. Validate upgrade is valid (isValidUpgrade logic)
4. Calculate pricing/credit
5. Create Stripe PaymentIntent
6. Process upgrade

---

### 3. Update Subscription (`stripeApi.updateSubscription`)

**Endpoint**: Handles monthly subscription plan changes

**Location**: Express backend API (e.g., `/api/stripe/update-subscription`)

**Function Signature**:
```typescript
updateSubscription(
  orgId: string,
  targetPlanCode: string
): Promise<SubscriptionUpdateResponse>
```

**Required Validation**:

1. **Target Plan Allowlist Check**:
   ```typescript
   const ALLOWED_SUBSCRIPTION_CHANGES = ['starter'];
   
   if (!ALLOWED_SUBSCRIPTION_CHANGES.includes(targetPlanCode)) {
     throw new Error('PLAN_CHANGE_NOT_AVAILABLE');
     // Return HTTP 422 Unprocessable Entity
   }
   ```

2. **Special Case – Starter to Starter (No-op)**:
   - If current plan is already `starter` and target is `starter`, return success without calling Stripe
   - Or return a friendly message that user is already on this plan

3. **Response on Validation Failure**:
   ```json
   {
     "error": "PLAN_CHANGE_NOT_AVAILABLE",
     "message": "This plan change is not currently available. Please choose from our available plans.",
     "code": 422
   }
   ```

**Validation Order**:
1. Fetch current subscription
2. **Validate `targetPlanCode` is in allowed list** ← NEW
3. Validate subscription is active
4. Calculate proration
5. Update Stripe subscription
6. Update database

---

## Webhook Considerations

### Webhook Event Handling

Webhook handlers (`customer.subscription.created`, `customer.subscription.updated`, `invoice.payment_succeeded`, etc.) should:

1. **Continue mapping Stripe price IDs to plan IDs** via `getPlanIdFromPriceId()` (from `lib/stripe-helpers.ts`)
2. **Assume frontend + Express validation** already prevents creating subscriptions for disallowed plans
3. **Process all webhook events normally**, regardless of plan code (to support existing subscriptions created before launch)

### Defense-in-Depth Check (Optional)

Add a **non-blocking log/alert** if a webhook event resolves to a disallowed plan during the launch period:

```typescript
// In webhook handler, after mapping price_id to plan_code
const LAUNCH_ALLOWED_PLANS = ['starter', 'starter_lifetime'];

if (!LAUNCH_ALLOWED_PLANS.includes(planCode)) {
  console.warn(`⚠️ Webhook received for non-starter plan: ${planCode}`, {
    event_type: event.type,
    subscription_id: subscriptionId,
    price_id: priceId,
  });
  
  // Don't block the webhook; still process it
  // This catches any potential bypass or legacy subscription
}
```

**Why non-blocking?**:
- Existing subscriptions created before launch should still sync correctly
- Webhooks for plan changes triggered by Stripe billing cycles should process
- We're trusting the API-level validation to prevent *new* purchases

---

## Database & Stripe Considerations

### Database Plan Records

- All plans (`starter`, `pro`, `business`, etc.) remain in the `plans` table with `is_active = true`
- The validation is **application-level**, not database-level
- This allows for easy rollout of higher tiers without database migrations

### Stripe Products & Prices

- All Stripe Products and Prices remain active in Stripe Dashboard
- The validation prevents *creating new subscriptions* with disallowed price IDs
- Existing subscriptions continue to function normally (billing, renewals, etc.)

### Plan Metadata

Ensure all plans have `metadata.price_id` correctly set in the database:

```sql
-- Verify plan metadata
SELECT 
  code, 
  name, 
  billing_interval,
  metadata->>'price_id' as stripe_price_id
FROM plans
WHERE is_active = true
ORDER BY 
  CASE 
    WHEN code LIKE '%_lifetime' THEN 1 
    ELSE 2 
  END,
  code;
```

---

## Implementation Checklist

### Required Changes

- [ ] **Create Subscription Endpoint**
  - [ ] Add `ALLOWED_PURCHASE_PLANS` constant: `['starter', 'starter_lifetime']`
  - [ ] Add plan code validation before Stripe API calls
  - [ ] Return 422 error with `PLAN_NOT_AVAILABLE_FOR_PURCHASE` code
  - [ ] Add tests for blocked plan codes

- [ ] **Upgrade to Lifetime Endpoint**
  - [ ] Add `ALLOWED_LIFETIME_UPGRADES` constant: `['starter_lifetime']`
  - [ ] Add target plan validation before calculating pricing
  - [ ] Return 422 error with `UPGRADE_NOT_AVAILABLE` code
  - [ ] Add tests for blocked upgrades

- [ ] **Update Subscription Endpoint**
  - [ ] Add `ALLOWED_SUBSCRIPTION_CHANGES` constant: `['starter']`
  - [ ] Add target plan validation before Stripe update
  - [ ] Handle starter-to-starter no-op gracefully
  - [ ] Return 422 error with `PLAN_CHANGE_NOT_AVAILABLE` code
  - [ ] Add tests for blocked plan changes

- [ ] **Webhook Handlers**
  - [ ] Add optional defense-in-depth logging for non-starter plans
  - [ ] Ensure all existing webhook flows continue to work

### Testing Requirements

#### Unit Tests

1. **createSubscription**:
   - ✅ Allows `starter` plan code
   - ✅ Allows `starter_lifetime` plan code
   - ❌ Rejects `pro` plan code → HTTP 422
   - ❌ Rejects `business` plan code → HTTP 422
   - ❌ Rejects `pro_lifetime` plan code → HTTP 422
   - ❌ Rejects `premium_lifetime` plan code → HTTP 422

2. **upgradeToLifetime**:
   - ✅ Allows upgrade to `starter_lifetime`
   - ❌ Rejects upgrade to `pro_lifetime` → HTTP 422
   - ❌ Rejects upgrade to `premium_lifetime` → HTTP 422

3. **updateSubscription**:
   - ✅ Allows change to `starter`
   - ✅ Handles starter-to-starter gracefully
   - ❌ Rejects change to `pro` → HTTP 422
   - ❌ Rejects change to `business` → HTTP 422

#### Integration Tests

1. **End-to-End Checkout**:
   - ✅ User can purchase `starter` subscription
   - ✅ User can purchase `starter_lifetime`
   - ❌ Direct API call with `pro` plan code is rejected
   - ❌ Direct API call with `business` plan code is rejected

2. **Webhook Processing**:
   - ✅ Webhook for existing `pro` subscription still processes (legacy support)
   - ✅ New subscription webhooks for `starter` plans sync correctly

3. **Regression Tests**:
   - ✅ Existing starter subscriptions continue to work
   - ✅ Existing starter lifetime purchases continue to work
   - ✅ Billing renewals for starter subscriptions work

---

## Error Response Format

All validation errors should return consistent JSON:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "code": 422,
  "details": {
    "plan_code": "pro",
    "reason": "not_available_for_purchase"
  }
}
```

**HTTP Status Codes**:
- `422 Unprocessable Entity` – Plan validation failed
- `400 Bad Request` – Invalid parameters (missing fields, invalid format)
- `403 Forbidden` – User lacks permission
- `404 Not Found` – Organization or plan not found

---

## Configuration Management

### Environment-Based Allowlists (Future Enhancement)

For easier rollout of new tiers, consider making the allowlists configurable:

```typescript
// config/plans.ts
export const ALLOWED_PURCHASE_PLANS = 
  process.env.ALLOWED_PLAN_CODES?.split(',') || 
  ['starter', 'starter_lifetime'];
```

**Environment Variables**:
```bash
# .env.production (launch period)
ALLOWED_PLAN_CODES=starter,starter_lifetime

# .env.production (after Pro launch)
ALLOWED_PLAN_CODES=starter,starter_lifetime,pro,pro_lifetime
```

### Deployment Strategy

1. **Deploy backend validation** with allowlists (all plans initially blocked except Starter)
2. **Deploy frontend** with LaunchDarkly flags (flags initially OFF in production)
3. **Test in staging** with flags toggled ON
4. **Launch**: Toggle LD flags ON in production (backend validation already in place)
5. **Future rollout**: Update allowlists (code deploy) or toggle LD flags OFF

---

## Rollout Timeline

### Phase 1: Starter-Only Launch (Current)

**Backend**:
- `ALLOWED_PURCHASE_PLANS = ['starter', 'starter_lifetime']`
- `ALLOWED_LIFETIME_UPGRADES = ['starter_lifetime']`
- `ALLOWED_SUBSCRIPTION_CHANGES = ['starter']`

**Frontend**:
- LD flags ON: Hide Pro/Business from UI

### Phase 2: Pro Tier Launch (Future)

**Backend**:
- Update: `ALLOWED_PURCHASE_PLANS = ['starter', 'starter_lifetime', 'pro', 'pro_lifetime']`
- Update: `ALLOWED_LIFETIME_UPGRADES = ['starter_lifetime', 'pro_lifetime']`
- Update: `ALLOWED_SUBSCRIPTION_CHANGES = ['starter', 'pro']`

**Frontend**:
- Toggle `pricing-hide-pro-plans` OFF in LaunchDarkly

### Phase 3: Business Tier Launch (Future)

**Backend**:
- Update allowlists to include `business` and `premium_lifetime`

**Frontend**:
- Toggle `pricing-hide-business-plans` OFF in LaunchDarkly

---

## Support & Troubleshooting

### Customer Support Scenarios

**Scenario**: User wants to purchase Pro plan but sees only Starter

**Response**: "We're currently in a phased launch. Pro and Business plans will be available soon. You can start with Starter and upgrade later without losing any data."

**Scenario**: User tries to directly call API with Pro plan code

**Response**: Backend returns 422 error. Frontend displays: "This plan is not currently available. Please choose from our available plans."

### Monitoring & Alerts

Set up monitoring for:
- HTTP 422 errors from checkout endpoints (spike might indicate tampering attempts)
- Webhook events for non-starter plans during launch period
- Failed checkout attempts

---

## Related Documentation

- `LAUNCHDARKLY_FLAGS_STARTER_LAUNCH.md` – Frontend feature flag configuration
- `lib/plans-config.ts` – Plan configuration and limits
- `lib/stripe-helpers.ts` – Stripe helper functions and price ID mapping
- `lib/api-client.ts` – Frontend API client (stripeApi)
- `SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md` – Overall subscription architecture

---

## Questions & Clarifications

For questions about this implementation:

1. **Backend API routes**: Where exactly are the Stripe API endpoints? (Express routes, Next.js API routes, etc.)
2. **Error handling**: Are there any existing error codes/constants we should reuse?
3. **Deployment timeline**: When is the backend deployment scheduled vs. LD flag toggle?
4. **Monitoring**: What monitoring/logging framework should be used?

---

## Summary

This document ensures that even if the frontend LD flags fail or users attempt direct API calls, the backend will **enforce the starter-only launch policy** by rejecting all checkout/upgrade requests for non-starter plans with clear 422 validation errors.

