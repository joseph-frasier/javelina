# Backend Implementation Guide: Lifetime Plan Upgrades

This document specifies the backend API endpoints that need to be implemented to support lifetime plan upgrades.

## Overview

The backend Express API needs two new endpoints:
1. `POST /api/stripe/calculate-upgrade` - Calculate upgrade pricing with proration
2. `POST /api/stripe/upgrade-to-lifetime` - Process lifetime upgrade checkout

## Required Endpoints

### 1. Calculate Upgrade Pricing

**Endpoint**: `POST /api/stripe/calculate-upgrade`

**Purpose**: Calculate the final price for upgrading, including prorated credits. Used for ALL upgrade types (subscription-to-lifetime, lifetime-to-lifetime, AND subscription-to-subscription).

**Request Body**:
```typescript
{
  org_id: string;
  target_plan_code: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  original_price: number;      // Target plan price (monthly or lifetime)
  credit: number;              // Prorated credit from current subscription/plan
  final_price: number;         // Amount to charge immediately
  upgrade_type: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | 'subscription-to-subscription';
  current_plan: {
    code: string;
    name: string;
  };
  target_plan: {
    code: string;
    name: string;
  };
}
```

**Implementation Steps**:

```typescript
import { calculateProratedCredit, calculateSubscriptionToLifetimeUpgrade, calculateLifetimeToLifetimeUpgrade, calculateSubscriptionToSubscriptionUpgrade, validateUpgradeRequest } from '../lib/upgrade-helpers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handleCalculateUpgrade(req, res) {
  const { org_id, target_plan_code } = req.body;
  
  // 1. Get current subscription from database
  const subscription = await getOrgSubscription(org_id);
  if (!subscription) {
    return res.status(404).json({ success: false, error: 'No subscription found' });
  }
  
  // 2. Get current and target plans from database
  const currentPlan = await getPlanById(subscription.plan_id);
  const targetPlan = await getPlanByCode(target_plan_code);
  
  if (!currentPlan || !targetPlan) {
    return res.status(404).json({ success: false, error: 'Plan not found' });
  }
  
  // 3. Validate upgrade
  const currentIsLifetime = currentPlan.billing_interval === null;
  const validation = validateUpgradeRequest(currentPlan.code, targetPlan.code, currentIsLifetime);
  
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  
  // 4. Calculate pricing based on upgrade type
  const targetIsLifetime = targetPlan.billing_interval === null;
  let pricing;
  let upgradeType: 'subscription-to-lifetime' | 'lifetime-to-lifetime' | 'subscription-to-subscription';
  
  if (!currentIsLifetime && targetIsLifetime) {
    // Subscription → Lifetime: Calculate prorated credit
    pricing = calculateSubscriptionToLifetimeUpgrade(
      subscription,
      currentPlan.metadata.price,
      targetPlan
    );
    upgradeType = 'subscription-to-lifetime';
  } else if (currentIsLifetime && targetIsLifetime) {
    // Lifetime → Lifetime: Simple price difference
    pricing = calculateLifetimeToLifetimeUpgrade(currentPlan, targetPlan);
    upgradeType = 'lifetime-to-lifetime';
  } else {
    // Subscription → Subscription: Calculate prorated difference using Stripe
    // Use Stripe's upcoming invoice preview to get exact proration amounts
    upgradeType = 'subscription-to-subscription';
    
    try {
      // Get the Stripe subscription to find the subscription item ID
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripe_subscription_id
      );
      const subscriptionItemId = stripeSubscription.items.data[0].id;
      
      // Preview what the invoice would look like with the new price
      const invoicePreview = await stripe.invoices.retrieveUpcoming({
        customer: stripeSubscription.customer as string,
        subscription: subscription.stripe_subscription_id,
        subscription_items: [{
          id: subscriptionItemId,
          price: targetPlan.metadata.price_id,
        }],
        subscription_proration_behavior: 'always_invoice',
      });
      
      // Extract pricing from the preview
      // The invoice will contain proration line items
      const proratedAmount = invoicePreview.amount_due / 100; // Convert from cents
      const targetMonthlyPrice = targetPlan.metadata.price;
      
      // Calculate credit: target price - prorated amount = credit given
      const credit = Math.max(0, targetMonthlyPrice - proratedAmount);
      
      pricing = {
        originalPrice: targetMonthlyPrice,
        credit: credit,
        finalPrice: proratedAmount
      };
    } catch (error) {
      console.error('Error calculating subscription proration:', error);
      // Fallback: Calculate manually
      pricing = calculateSubscriptionToSubscriptionUpgrade(
        subscription,
        currentPlan.metadata.price,
        targetPlan.metadata.price
      );
    }
  }
  
  // 5. Return pricing breakdown
  return res.json({
    success: true,
    original_price: pricing.originalPrice,
    credit: pricing.credit,
    final_price: pricing.finalPrice,
    upgrade_type: upgradeType,
    current_plan: {
      code: currentPlan.code,
      name: currentPlan.name
    },
    target_plan: {
      code: targetPlan.code,
      name: targetPlan.name
    }
  });
}
```

---

### 2. Upgrade to Lifetime

**Endpoint**: `POST /api/stripe/upgrade-to-lifetime`

**Purpose**: Create Stripe PaymentIntent for lifetime upgrade (used with Stripe Elements on frontend checkout page)

**Request Body**:
```typescript
{
  org_id: string;
  target_plan_code: string;
}
```

**Response**:
```typescript
{
  success: boolean;
  clientSecret: string;  // PaymentIntent client secret for Stripe Elements
  flow: 'payment_intent';
  upgrade_type: 'subscription-to-lifetime' | 'lifetime-to-lifetime';
  final_price: number;
}
```

**Implementation Steps**:

```typescript
import Stripe from 'stripe';
import { validateUpgradeRequest, calculateSubscriptionToLifetimeUpgrade, calculateLifetimeToLifetimeUpgrade } from '../lib/upgrade-helpers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handleUpgradeToLifetime(req, res) {
  const { org_id, target_plan_code } = req.body;
  const user_id = req.user.id; // From auth middleware
  
  // 1. Get current subscription and plans
  const subscription = await getOrgSubscription(org_id);
  const currentPlan = await getPlanById(subscription.plan_id);
  const targetPlan = await getPlanByCode(target_plan_code);
  
  if (!subscription || !currentPlan || !targetPlan) {
    return res.status(404).json({ success: false, error: 'Subscription or plan not found' });
  }
  
  // 2. Validate upgrade
  const currentIsLifetime = currentPlan.billing_interval === null;
  const targetIsLifetime = targetPlan.billing_interval === null;
  const validation = validateUpgradeRequest(currentPlan.code, targetPlan.code, currentIsLifetime);
  
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  
  // 3. Calculate final price and determine upgrade type
  let finalPrice;
  let upgradeType: 'subscription-to-lifetime' | 'lifetime-to-lifetime';
  
  if (!currentIsLifetime && targetIsLifetime) {
    const pricing = calculateSubscriptionToLifetimeUpgrade(subscription, currentPlan.metadata.price, targetPlan);
    finalPrice = pricing.finalPrice;
    upgradeType = 'subscription-to-lifetime';
  } else if (currentIsLifetime && targetIsLifetime) {
    const pricing = calculateLifetimeToLifetimeUpgrade(currentPlan, targetPlan);
    finalPrice = pricing.finalPrice;
    upgradeType = 'lifetime-to-lifetime';
  } else {
    return res.status(400).json({ success: false, error: 'Invalid upgrade type' });
  }
  
  // 4. Get or create Stripe customer
  const organization = await getOrganization(org_id);
  let customerId = organization.stripe_customer_id;
  
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: req.user.email, // From auth middleware
      metadata: {
        org_id: org_id,
        user_id: user_id
      }
    });
    customerId = customer.id;
    await updateOrgStripeCustomer(org_id, customerId);
  }
  
  // 5. Create Stripe PaymentIntent for one-time payment
  // This returns a clientSecret to be used with Stripe Elements on the frontend
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalPrice * 100), // Stripe uses cents
    currency: 'usd',
    customer: customerId,
    description: `Upgrade to ${targetPlan.name}`,
    metadata: {
      org_id: org_id,
      user_id: user_id,
      upgrade_type: 'lifetime_upgrade',
      from_plan_code: currentPlan.code,
      to_plan_code: targetPlan.code,
      original_subscription_id: subscription.stripe_subscription_id || '',
      credit_applied: finalPrice < targetPlan.metadata.price ? 'true' : 'false'
    },
    // Automatic payment methods for better conversion
    automatic_payment_methods: {
      enabled: true,
    },
  });
  
  // 6. Return clientSecret for Stripe Elements
  return res.json({
    success: true,
    clientSecret: paymentIntent.client_secret,
    flow: 'payment_intent',
    upgrade_type: upgradeType,
    final_price: finalPrice
  });
}
```

---

## 3. Webhook Handler Updates

The existing Stripe webhook handler needs to be updated to handle upgrade PaymentIntents.

**Webhook Events to Handle**:
- `payment_intent.succeeded` - When upgrade payment succeeds (using Stripe Elements)

**Implementation**:

```typescript
async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata;
  
  // Check if this is a lifetime upgrade payment
  if (metadata?.upgrade_type === 'lifetime_upgrade') {
    const orgId = metadata.org_id;
    const toPlanCode = metadata.to_plan_code;
    const fromPlanCode = metadata.from_plan_code;
    const originalSubscriptionId = metadata.original_subscription_id;
    
    console.log('🔄 Processing lifetime upgrade:', {
      org_id: orgId,
      from: fromPlanCode,
      to: toPlanCode,
      payment_intent: paymentIntent.id
    });
    
    // 1. Get target plan from database
    const targetPlan = await getPlanByCode(toPlanCode);
    if (!targetPlan) {
      console.error('❌ Target plan not found:', toPlanCode);
      return;
    }
    
    // 2. Cancel old Stripe subscription if upgrading from monthly
    if (originalSubscriptionId && originalSubscriptionId !== '') {
      try {
        await stripe.subscriptions.cancel(originalSubscriptionId);
        console.log('✅ Canceled old subscription:', originalSubscriptionId);
      } catch (error: any) {
        // Subscription might already be canceled
        if (error.code !== 'resource_missing') {
          console.error('⚠️ Error canceling old subscription:', error);
        }
      }
    }
    
    // 3. Update subscription record in database
    const supabase = getSupabaseServiceClient();
    
    // Get current subscription record
    const { data: currentSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .single();
    
    if (fetchError || !currentSub) {
      console.error('❌ Failed to fetch subscription for org:', orgId, fetchError);
      return;
    }
    
    // Update to lifetime plan
    const { error: updateError } = await supabase
      .from('subscriptions')
      .update({
        plan_id: targetPlan.id,
        status: 'lifetime',
        stripe_subscription_id: null, // No longer a recurring subscription
        current_period_start: null,
        current_period_end: null,
        cancel_at: null,
        cancel_at_period_end: false,
        metadata: {
          ...currentSub.metadata,
          upgrade_history: [
            ...(currentSub.metadata?.upgrade_history || []),
            {
              from_plan: fromPlanCode,
              to_plan: toPlanCode,
              date: new Date().toISOString(),
              payment_intent_id: paymentIntent.id,
              amount_paid: paymentIntent.amount / 100
            }
          ],
          last_payment_intent: paymentIntent.id
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', currentSub.id);
    
    if (updateError) {
      console.error('❌ Failed to update subscription:', updateError);
      return;
    }
    
    console.log('✅ Successfully upgraded to lifetime:', {
      org_id: orgId,
      from: fromPlanCode,
      to: toPlanCode,
      amount: paymentIntent.amount / 100
    });
    
  } else {
    // Handle normal payment intent (existing logic for new subscriptions)
    // ... existing code ...
  }
}

// In your webhook router, add this handler:
// case 'payment_intent.succeeded':
//   await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
//   break;
```

**Alternative: Using checkout.session.completed**

If you prefer to use Checkout Sessions (for hosted checkout page), the webhook handler would instead listen for `checkout.session.completed`. However, since we're using Stripe Elements on a custom checkout page, `payment_intent.succeeded` is the correct event to handle.

---

## Helper Functions Required

The backend will need access to these helper functions from `lib/upgrade-helpers.ts`:

- `calculateProratedCredit()`
- `calculateSubscriptionToLifetimeUpgrade()`
- `calculateLifetimeToLifetimeUpgrade()`
- `validateUpgradeRequest()`

These can be imported from the frontend lib folder or copied to the backend codebase.

---

## Database Schema

No changes needed. The existing schema already supports:
- `subscriptions.status` includes `'lifetime'`
- `subscriptions.metadata` JSONB for storing upgrade history
- `plans.billing_interval` can be NULL for lifetime plans

---

## Testing

Test cases for the backend:

1. **Calculate Upgrade - Monthly to Lifetime**:
```bash
curl -X POST http://localhost:3001/api/stripe/calculate-upgrade \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"test-org","target_plan_code":"pro_lifetime"}'
```

Expected Response:
```json
{
  "success": true,
  "original_price": 1198.80,
  "credit": 25.50,
  "final_price": 1173.30,
  "upgrade_type": "subscription-to-lifetime"
}
```

2. **Calculate Upgrade - Lifetime to Lifetime**:
```bash
curl -X POST http://localhost:3001/api/stripe/calculate-upgrade \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"test-org","target_plan_code":"premium_lifetime"}'
```

Expected Response:
```json
{
  "success": true,
  "original_price": 4776.00,
  "credit": 1198.80,
  "final_price": 3577.20,
  "upgrade_type": "lifetime-to-lifetime"
}
```

3. **Process Upgrade** (returns clientSecret for Stripe Elements):
```bash
curl -X POST http://localhost:3001/api/stripe/upgrade-to-lifetime \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"org_id":"test-org","target_plan_code":"pro_lifetime"}'
```

Expected Response:
```json
{
  "success": true,
  "clientSecret": "pi_xxx_secret_xxx",
  "flow": "payment_intent",
  "upgrade_type": "subscription-to-lifetime",
  "final_price": 1173.30
}
```

4. **Test Webhook** (using Stripe CLI):
```bash
# Forward webhooks to your local backend
stripe listen --forward-to http://localhost:3001/api/stripe/webhooks

# In another terminal, trigger a payment_intent.succeeded event
stripe trigger payment_intent.succeeded
```

5. **Full End-to-End Test**:
   1. Navigate to Settings > Billing in the frontend
   2. Click "Change Plan" or "Upgrade Plan"
   3. Select a lifetime plan
   4. Verify pricing breakdown
   5. Click "Confirm Upgrade"
   6. Verify redirect to /checkout page
   7. Complete payment with test card: 4242 4242 4242 4242
   8. Verify redirect to success page
   9. Check database for updated subscription status

---

## Security Considerations

1. **Validate user permissions**: Ensure user is admin of the organization
2. **Verify plan codes**: Validate target plan exists and is active
3. **Check upgrade validity**: Use `validateUpgradeRequest()` to prevent invalid upgrades
4. **Verify amounts**: Don't trust frontend calculations, recalculate on backend
5. **Idempotency**: Handle duplicate webhook events gracefully

---

## Error Handling

Common errors to handle:
- Organization not found
- No active subscription
- Invalid plan code
- Downgrade attempt (not allowed for lifetime)
- Stripe API errors
- Webhook verification failures

---

## Next Steps

1. Implement the two new endpoints in the backend Express API
2. Update the webhook handler to process upgrade payments
3. Test with Stripe test cards
4. Deploy backend changes
5. Test full upgrade flow end-to-end

