# Proration Guide

This document explains how proration is calculated on the backend for plan upgrades and subscription changes.

## Overview

All proration calculations use **day-level granularity** with rounding to the nearest whole day. This provides predictable and consistent billing behavior across all upgrade scenarios.

## How Proration is Calculated

### Formula

```
Credit = (Remaining Days / Total Days) × Monthly Price
```

Where:
- **Remaining Days** = Days from now until period end (rounded to nearest whole day)
- **Total Days** = Days in the billing period (rounded to nearest whole day)
- **Monthly Price** = The plan's monthly price

### Rounding Behavior

All day calculations are rounded to the **nearest whole day**:
- 5.4 days → 5 days
- 5.5 days → 6 days
- 5.6 days → 6 days

### Example Calculation

**Scenario:** User on $30/month plan switches to $50/month plan with 15 days remaining in a 30-day billing period.

1. **Current plan credit:**
   - Remaining: 15 days
   - Total: 30 days
   - Credit = (15 / 30) × $30 = **$15.00**

2. **New plan charge:**
   - Remaining: 15 days
   - Total: 30 days
   - Charge = (15 / 30) × $50 = **$25.00**

3. **Amount due:**
   - $25.00 - $15.00 = **$10.00**

---

## Upgrade Scenarios

### 1. Subscription → Subscription

When a user changes between monthly subscription plans.

**Backend Behavior:**
- Stripe's automatic proration is **disabled** (`proration_behavior: "none"`)
- Proration is calculated using our day-level logic
- If amount due > 0, the customer's saved payment method is charged immediately

**API Endpoint:** `POST /api/stripe/update-subscription`

**Response Format (successful payment):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "subscription_id": "sub_xxx",
    "proration": {
      "current_plan_credit": 15.00,
      "new_plan_charge": 25.00,
      "amount_due": 10.00,
      "payment": {
        "payment_intent_id": "pi_xxx",
        "amount": 10.00,
        "status": "succeeded"
      }
    }
  },
  "message": "Subscription updated and proration charged successfully"
}
```

**Response Format (payment failed):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "subscription_id": "sub_xxx",
    "proration": {
      "current_plan_credit": 15.00,
      "new_plan_charge": 25.00,
      "amount_due": 10.00,
      "payment": {
        "error": "Your card was declined.",
        "amount": 10.00,
        "status": "failed"
      }
    }
  },
  "message": "Subscription updated but proration payment failed"
}
```

**Frontend Implementation:**
1. Call the update endpoint
2. Check `proration.payment.status`:
   - `"succeeded"`: Show success message with amount charged
   - `"failed"`: Show error and prompt user to update payment method
   - `null`: No proration charge was needed

### 2. Subscription → Lifetime

When a user upgrades from a monthly subscription to a lifetime plan.

**Backend Behavior:**
- Calculates credit for unused subscription time using day-level proration
- Creates a PaymentIntent for: `Lifetime Price - Unused Credit`
- After payment succeeds, cancels the old subscription

**API Endpoint:** `POST /api/stripe/calculate-upgrade` (to preview pricing)
**API Endpoint:** `POST /api/stripe/upgrade-to-lifetime` (to create payment)

**Calculate Upgrade Response:**
```json
{
  "success": true,
  "data": {
    "original_price": 299.00,
    "credit": 15.00,
    "final_price": 284.00,
    "upgrade_type": "subscription-to-lifetime",
    "current_plan": {
      "code": "pro_monthly",
      "name": "Pro Monthly"
    },
    "target_plan": {
      "code": "pro_lifetime",
      "name": "Pro Lifetime"
    }
  }
}
```

### 3. Lifetime → Lifetime

When a user upgrades from one lifetime plan to another.

**Backend Behavior:**
- No time-based proration (lifetime has no expiration)
- Credit = Full price paid for current lifetime plan
- Amount due = New lifetime price - Current lifetime price

**Response Format:**
```json
{
  "success": true,
  "data": {
    "original_price": 499.00,
    "credit": 299.00,
    "final_price": 200.00,
    "upgrade_type": "lifetime-to-lifetime"
  }
}
```

---

## Frontend Implementation Guide

### Displaying Proration to Users

When showing upgrade pricing, display:

```
Original Price:     $50.00/month
Your Credit:       -$15.00  (15 days remaining on current plan)
─────────────────────────────
Amount Due Today:   $10.00
```

### Handling Proration Payments

For subscription-to-subscription changes, the proration is charged automatically using the customer's saved payment method. The frontend just needs to handle the response:

```typescript
const handlePlanUpgrade = async (newPlanCode: string) => {
  const response = await updateSubscription(orgId, newPlanCode);
  
  const { proration } = response.data;
  
  if (proration.payment?.status === 'succeeded') {
    // Payment was successful
    toast.success(`Plan updated! Charged $${proration.amount_due} for the upgrade.`);
  } else if (proration.payment?.status === 'failed') {
    // Payment failed - prompt user to update payment method
    toast.error(`Plan updated but payment failed: ${proration.payment.error}`);
    // Redirect to payment method update page
  } else {
    // No proration charge needed
    toast.success('Plan updated successfully!');
  }
};
```

### Edge Cases

1. **No payment needed:** If `proration.amount_due` is 0 or negative (downgrade scenario), no payment is required and `proration.payment` will be `null`.

2. **Downgrade not allowed:** The API will return an error for downgrades. Only upgrades are supported.

3. **Same plan:** Attempting to "upgrade" to the current plan returns an error: "You are already on this plan".

---

## Technical Details

### Day Calculation

The backend calculates days using:
```typescript
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const remainingDays = Math.round(remainingMs / MS_PER_DAY);
const totalDays = Math.round(totalPeriodMs / MS_PER_DAY);
```

### Why Day-Level Proration?

1. **Predictability:** Users can easily understand "15 days remaining" vs millisecond precision
2. **Consistency:** Same calculation method across all upgrade types
3. **Simplicity:** Easier to display and explain to customers
4. **Fairness:** Rounding to nearest day is neutral (not biased toward user or business)

### Stripe Integration

- Stripe's built-in proration is **disabled** for subscription updates
- We use `proration_behavior: "none"` to prevent Stripe from generating automatic proration invoices
- Proration charges use `off_session: true` and `confirm: true` to charge the customer's saved payment method immediately
- No frontend payment collection is needed for subscription-to-subscription upgrades

