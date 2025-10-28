# PaymentIntent Debugging Guide

## What Has Been Added

### 1. Enhanced Logging in Subscription Creation
**File: `app/api/stripe/create-subscription-intent/route.ts`**

Added comprehensive logging:
- `🔍 [RAW SUBSCRIPTION]`: Full JSON dump of the subscription object immediately after creation
- `🔍 [RAW INVOICE]`: Full JSON dump of the invoice object when retrieved during polling

These logs will show us exactly what Stripe is returning, including all fields and nested objects.

### 2. PaymentIntent Webhook Handler
**File: `app/api/stripe/webhook/route.ts`**

Added handler for `payment_intent.created` events that logs:
- PaymentIntent ID
- Status
- Amount
- Invoice association
- Customer
- Whether `client_secret` exists
- Full raw PaymentIntent object as JSON

This captures the PaymentIntent at the moment it's created by Stripe.

### 3. Debug Test Endpoint
**File: `app/api/stripe/debug-payment-intent/route.ts`**

New endpoint: `POST /api/stripe/debug-payment-intent`

Usage:
```bash
# Test with subscription ID
curl -X POST http://localhost:3000/api/stripe/debug-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"subscription_id": "sub_1SNHfEA8kaNOs7rygAmJJB8p"}'

# Or test with customer ID
curl -X POST http://localhost:3000/api/stripe/debug-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"customer_id": "cus_TJv2iU1RaIvFw7"}'
```

This endpoint:
- Lists all PaymentIntents for a customer
- Attempts to match PaymentIntents to subscriptions
- Shows which PaymentIntents have `client_secret`
- Bypasses the normal invoice retrieval flow to test direct access

## How to Debug

### Step 1: Test the Org Creation Flow
Run through the org creation flow with a paid plan and watch the terminal output for:

1. **Subscription Creation**:
   ```
   🔍 [RAW SUBSCRIPTION]: { ... full object ... }
   ```
   Look for:
   - `latest_invoice` field - is it a string ID or expanded object?
   - If expanded, does it have a `payment_intent` field?

2. **PaymentIntent Creation Webhook**:
   ```
   💳 [DEBUG] PaymentIntent created: pi_xxx
   💳 [DEBUG] Has client_secret: true/false
   💳 [RAW PAYMENT_INTENT]: { ... full object ... }
   ```
   Look for:
   - Does the webhook PaymentIntent have `client_secret`?
   - What is the `invoice` field value?
   - Is the `invoice` field set to the correct invoice ID?

3. **Invoice Polling**:
   ```
   🔍 [RAW INVOICE]: { ... full object ... }
   ```
   Look for:
   - Does the invoice object have a `payment_intent` field at all?
   - If yes, is it a string ID or expanded object?
   - If missing, what other fields are present?

### Step 2: Use the Debug Endpoint
After a failed creation attempt, note the subscription ID from the logs, then:

```bash
curl -X POST http://localhost:3000/api/stripe/debug-payment-intent \
  -H "Content-Type: application/json" \
  -d '{"subscription_id": "sub_ACTUAL_ID_FROM_LOGS"}'
```

This will show:
- All PaymentIntents for that customer
- Which one matches the subscription (if any)
- Whether those PaymentIntents have `client_secret`

### Step 3: Compare Stripe Dashboard vs API
Open the Stripe Dashboard and find:
1. The subscription
2. The invoice
3. The PaymentIntent

Compare what you see in the Dashboard to what the API logs show. Look for discrepancies.

## What to Look For

### Scenario A: PaymentIntent has no client_secret
If webhook shows `Has client_secret: false`, this is a Stripe configuration issue. The PaymentIntent is being created in a mode that doesn't generate client_secrets.

### Scenario B: Invoice has no payment_intent field
If the raw invoice JSON has no `payment_intent` field at all (not even `null`), this suggests:
- Wrong invoice is being retrieved
- API version incompatibility
- Stripe account-level setting preventing the link

### Scenario C: payment_intent is a string but expansion fails
If `payment_intent` is a string ID but retrieving it fails, this suggests:
- The PaymentIntent exists but belongs to a different mode/account
- Permissions issue with the API key

### Scenario D: Everything exists but timing issue
If the debug endpoint finds the PaymentIntent but the polling doesn't, this is a race condition we can fix.

## Next Steps Based on Findings

After collecting the debug logs, analyze them to determine:
1. **Is the PaymentIntent being created with a client_secret?**
2. **Is the PaymentIntent linked to the correct invoice?**
3. **Is the invoice retrievable and does it show the payment_intent field?**
4. **Are there API version or expansion issues?**

Share the raw JSON logs (especially `[RAW SUBSCRIPTION]`, `[RAW INVOICE]`, and `[RAW PAYMENT_INTENT]`) to get targeted help on the root cause.

## Cleanup

After debugging, remove:
- The debug endpoint: `app/api/stripe/debug-payment-intent/route.ts`
- The extra JSON logging (keep the basic logs, remove the `JSON.stringify` lines)
- The `payment_intent.created` webhook handler (or convert it to production logging)

