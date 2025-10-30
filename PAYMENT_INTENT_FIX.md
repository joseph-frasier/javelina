# PaymentIntent Issue - Root Cause and Fix

## The Problem

When creating organizations with paid plans, the checkout flow would get stuck on "Processing Your Subscription" with the error:
```
Failed to retrieve client secret from payment intent
```

Even though:
- Subscriptions were being created successfully
- PaymentIntent webhooks were firing (`payment_intent.created`)
- The Stripe Dashboard showed PaymentIntents existed and were linked to invoices

The API consistently returned invoices with **no `payment_intent` field**.

## Root Cause

The debug logs revealed the issue in the raw invoice JSON:

```json
{
  "auto_advance": false,
  "payment_method_options": null,
  "payment_method_types": null,
  "hosted_invoice_url": "https://invoice.stripe.com/i/..."
}
```

**Key Discovery**: `auto_advance: false`

When you create a subscription with:
- `payment_behavior: 'default_incomplete'`
- `collection_method: 'charge_automatically'`
- **BUT no `payment_method_types` specified**

Stripe defaults to:
1. Creating a **hosted invoice page** (for manual payment)
2. Setting `auto_advance: false`
3. **NOT creating a PaymentIntent for embedded collection**

This is why:
- No `payment_intent` field existed on the invoice
- The Dashboard showed a "payment page" connection instead of a true PaymentIntent
- Stripe Elements had nothing to render

## The Fix

**File: `app/api/stripe/create-subscription-intent/route.ts`**

Added `payment_method_types: ['card']` to `payment_settings`:

```typescript
subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: price_id }],
  payment_behavior: 'default_incomplete',
  collection_method: 'charge_automatically',
  payment_settings: {
    save_default_payment_method: 'on_subscription',
    payment_method_types: ['card'],  // ← THE FIX
  },
  metadata: { /* ... */ },
}, { idempotencyKey });
```

## Why This Works

Specifying `payment_method_types` tells Stripe:
- "I want to collect payment via embedded Stripe Elements"
- This forces Stripe to:
  1. Set `auto_advance: true` on the invoice
  2. Create a PaymentIntent with `client_secret` for the specified payment methods
  3. Attach the PaymentIntent to the invoice immediately
  4. Return the `payment_intent` field when the invoice is retrieved

## What Changed in Stripe's Behavior

### Before (Broken)
- Invoice created with `auto_advance: false`
- No PaymentIntent created for embedded collection
- Customer directed to hosted invoice page
- Stripe Elements can't render (no `client_secret`)

### After (Fixed)
- Invoice created with `auto_advance: true`
- PaymentIntent created immediately with `client_secret`
- PaymentIntent attached to invoice
- Stripe Elements can collect payment via drop-in component

## Testing

To verify the fix:
1. Create a new organization with a paid plan (Basic or Pro)
2. You should now reach the Stripe payment form
3. The debug logs should show:
   ```
   🔍 [RAW INVOICE]: {
     "auto_advance": true,
     "payment_method_types": ["card"],
     "payment_intent": "pi_xxx" // ← Should now exist
   }
   ```
4. The checkout flow should complete successfully

## Cleanup Needed

After confirming the fix works, remove the debugging code:

1. **Remove debug logs** from `app/api/stripe/create-subscription-intent/route.ts`:
   - The `JSON.stringify(subscription, null, 2)` log
   - The `JSON.stringify(invoice, null, 2)` log

2. **Remove debug webhook handler** from `app/api/stripe/webhook/route.ts`:
   - The `payment_intent.created` case
   - The `handlePaymentIntentCreated` function

3. **Remove debug endpoint**:
   - Delete `app/api/stripe/debug-payment-intent/route.ts`

4. **Remove debug docs**:
   - Delete `DEBUGGING_GUIDE.md`
   - Keep this file (`PAYMENT_INTENT_FIX.md`) for future reference

## Lessons Learned

1. **Stripe's Defaults Can Be Misleading**: Just because you set `collection_method: 'charge_automatically'` doesn't mean Stripe will create a PaymentIntent for embedded collection.

2. **Always Specify Payment Method Types**: When using Stripe Elements (drop-in components), you MUST specify `payment_method_types` in `payment_settings`.

3. **`auto_advance` is the Key Indicator**: If an invoice has `auto_advance: false`, it's configured for hosted payment pages, not embedded collection.

4. **Raw API Responses Are Critical for Debugging**: The formatted logs didn't show the problem - only the raw JSON revealed `auto_advance: false` and missing `payment_method_types`.

## Additional Payment Methods (Future)

To support more payment methods beyond cards, expand the array:

```typescript
payment_method_types: ['card', 'us_bank_account', 'link']
```

Stripe Elements will automatically render the appropriate UI for each enabled method.

