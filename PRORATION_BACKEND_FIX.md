# Proration Backend Fix

This document outlines the required backend changes to fix the subscription upgrade proration payment flow.

## Current Problem

When a user attempts to upgrade their subscription plan:
1. The subscription is updated first
2. The proration payment is attempted second
3. If payment fails, the subscription is still upgraded (user gets the plan without paying)

Additionally, the error "missing a payment method" indicates the PaymentIntent is being created without attaching the customer's saved payment method.

---

## Root Causes

### 1. Wrong Order of Operations

The backend updates the subscription before confirming payment succeeds. This should be reversed.

### 2. Payment Method Not Attached

When creating the off-session PaymentIntent, the customer's default payment method is not being retrieved and attached.

### 3. Payment Method May Not Be Saved

During initial subscription creation, the payment method may not be saved for future use (`setup_future_usage: 'off_session'`).

---

## Required Changes

### Fix 1: Initial Subscription Creation

Ensure payment methods are saved during initial checkout so they can be reused for upgrades.

**In the subscription creation endpoint:**

```typescript
// When creating a subscription with a new payment method,
// ensure it's set as the default for future invoices
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: {
    payment_method_types: ['card'],
    save_default_payment_method: 'on_subscription',  // <-- Add this
  },
  expand: ['latest_invoice.payment_intent'],
});
```

**Or when creating a PaymentIntent directly:**

```typescript
const paymentIntent = await stripe.paymentIntents.create({
  amount: amount,
  currency: 'usd',
  customer: customerId,
  setup_future_usage: 'off_session',  // <-- Saves payment method for future use
});
```

---

### Fix 2: Update Subscription Endpoint

Rewrite the `/api/stripe/update-subscription` (or equivalent) endpoint to:
1. Calculate proration
2. Attempt payment FIRST
3. Only update subscription if payment succeeds

**Corrected Flow:**

```typescript
async function handleUpdateSubscription(req, res) {
  const { org_id, new_plan_code } = req.body;

  try {
    // 1. Get organization and current subscription
    const org = await getOrganization(org_id);
    const subscription = await stripe.subscriptions.retrieve(org.stripe_subscription_id);
    const customerId = org.stripe_customer_id;

    // 2. Get current and target plan details
    const currentPlan = await getPlanByCode(subscription.plan_code);
    const targetPlan = await getPlanByCode(new_plan_code);

    // 3. Calculate proration using day-level granularity
    const proration = calculateDayLevelProration(
      subscription.current_period_start,
      subscription.current_period_end,
      currentPlan.price,
      targetPlan.price
    );

    // 4. If proration amount due > 0, charge the customer FIRST
    let paymentResult = null;
    
    if (proration.amount_due > 0) {
      // 4a. Get customer's default payment method
      const customer = await stripe.customers.retrieve(customerId, {
        expand: ['invoice_settings.default_payment_method']
      });

      const defaultPaymentMethod = customer.invoice_settings?.default_payment_method;

      // 4b. If no payment method, return error - DO NOT proceed with upgrade
      if (!defaultPaymentMethod) {
        return res.status(400).json({
          success: false,
          error: 'No payment method on file. Please add a payment method to upgrade.',
          code: 'MISSING_PAYMENT_METHOD'
        });
      }

      // 4c. Create and confirm PaymentIntent with saved payment method
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(proration.amount_due * 100), // Convert to cents
          currency: 'usd',
          customer: customerId,
          payment_method: defaultPaymentMethod.id,
          off_session: true,
          confirm: true,
          description: `Plan upgrade: ${currentPlan.name} → ${targetPlan.name}`,
          metadata: {
            org_id: org_id,
            upgrade_type: 'subscription-to-subscription',
            from_plan: currentPlan.code,
            to_plan: targetPlan.code,
          }
        });

        // 4d. Check payment status
        if (paymentIntent.status !== 'succeeded') {
          // Payment failed or requires action - DO NOT upgrade
          return res.status(402).json({
            success: false,
            error: 'Payment failed. Please update your payment method and try again.',
            code: 'PAYMENT_FAILED',
            payment_intent_status: paymentIntent.status
          });
        }

        paymentResult = {
          payment_intent_id: paymentIntent.id,
          amount: proration.amount_due,
          status: 'succeeded'
        };

      } catch (paymentError: any) {
        // Payment failed - DO NOT upgrade
        return res.status(402).json({
          success: false,
          error: paymentError.message || 'Payment failed',
          code: 'PAYMENT_FAILED'
        });
      }
    }

    // 5. Payment succeeded (or no payment needed) - NOW update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      {
        items: [{
          id: subscription.items.data[0].id,
          price: targetPlan.stripe_price_id,
        }],
        proration_behavior: 'none', // We handle proration ourselves
      }
    );

    // 6. Update database
    await updateSubscriptionInDatabase(org_id, updatedSubscription, targetPlan);

    // 7. Return success response
    return res.json({
      success: true,
      data: {
        success: true,
        subscription_id: updatedSubscription.id,
        proration: {
          current_plan_credit: proration.current_plan_credit,
          new_plan_charge: proration.new_plan_charge,
          amount_due: proration.amount_due,
          payment: paymentResult
        }
      },
      message: paymentResult 
        ? 'Subscription updated and proration charged successfully'
        : 'Subscription updated successfully'
    });

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update subscription'
    });
  }
}
```

---

### Fix 3: Day-Level Proration Calculation

Ensure the proration calculation uses `Math.round` for day-level granularity:

```typescript
function calculateDayLevelProration(
  periodStart: number,  // Unix timestamp
  periodEnd: number,    // Unix timestamp
  currentPlanPrice: number,
  targetPlanPrice: number
): {
  current_plan_credit: number;
  new_plan_charge: number;
  amount_due: number;
} {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  const now = Date.now();

  // Calculate days using Math.round for day-level granularity
  const totalPeriodMs = (periodEnd * 1000) - (periodStart * 1000);
  const remainingMs = (periodEnd * 1000) - now;

  const totalDays = Math.round(totalPeriodMs / MS_PER_DAY);
  const remainingDays = Math.max(0, Math.round(remainingMs / MS_PER_DAY));

  // Calculate credit and charge
  const dailyRateCurrent = currentPlanPrice / totalDays;
  const dailyRateTarget = targetPlanPrice / totalDays;

  const currentPlanCredit = Math.round(dailyRateCurrent * remainingDays * 100) / 100;
  const newPlanCharge = Math.round(dailyRateTarget * remainingDays * 100) / 100;
  const amountDue = Math.round((newPlanCharge - currentPlanCredit) * 100) / 100;

  return {
    current_plan_credit: currentPlanCredit,
    new_plan_charge: newPlanCharge,
    amount_due: Math.max(0, amountDue)  // Never negative
  };
}
```

---

## Error Handling Summary

| Scenario | Response Code | Action |
|----------|---------------|--------|
| No payment method on file | 400 | Return error, do NOT upgrade |
| Payment failed | 402 | Return error, do NOT upgrade |
| Payment requires action | 402 | Return error, do NOT upgrade |
| Payment succeeded | 200 | Proceed with upgrade |
| No payment needed (amount_due ≤ 0) | 200 | Proceed with upgrade |

---

## Frontend Handling

The frontend (already updated) handles the response appropriately:

```typescript
// In ChangePlanModal.tsx
const response = await stripeApi.updateSubscription(orgId, selectedPlanCode);
const { proration } = response;

if (proration?.payment?.status === 'succeeded') {
  addToast('success', `Plan updated! Charged $${proration.amount_due.toFixed(2)} for the upgrade.`);
} else if (proration?.payment?.status === 'failed') {
  addToast('error', `Plan updated but payment failed: ${proration.payment.error}`);
} else {
  addToast('success', 'Subscription plan updated successfully!');
}
```

**Note:** With the backend fix, the `payment.status === 'failed'` case should never occur because the backend will return an error response (not success) when payment fails.

---

## Testing Checklist

- [ ] User with saved payment method can upgrade (payment charged automatically)
- [ ] User without saved payment method gets clear error message
- [ ] Failed payment does NOT result in plan upgrade
- [ ] Successful payment results in plan upgrade
- [ ] Proration amounts match day-level calculation
- [ ] Database is updated only after successful payment

