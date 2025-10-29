# Subscription Flow Troubleshooting Guide

## The Problem

After the rebase, organizations are showing as "Free" with NULL subscription values, even though they should have paid plans (Basic, Pro, etc.).

## Root Cause

The subscription creation flow relies on Stripe webhooks to create subscription records in the database. When a webhook event comes in, it needs to:

1. Extract the `price_id` from the Stripe subscription
2. Look up the corresponding `plan_id` in the database by matching `price_id` in the `plans.metadata` field
3. Create/update the subscription record with the correct `plan_id`

**If the `price_id` mapping is missing or incorrect, the subscription will be created with `plan_id = NULL`**, causing organizations to show as "Free".

## The Complete Flow

Here's how the subscription flow should work:

```
1. User Creates Organization
   └─> Organization record created in database
   └─> User assigned as SuperAdmin member

2. User Goes to Pricing Page (/pricing)
   └─> Selects a plan (Basic, Pro, etc.)
   └─> Redirected to checkout with org_id and price_id

3. Checkout Page (/checkout)
   └─> Calls /api/stripe/create-subscription-intent
   └─> API creates Stripe subscription with metadata:
       - org_id
       - user_id
       - plan_code
   └─> Returns clientSecret for Stripe Elements

4. User Completes Payment
   └─> Stripe redirects to success page
   └─> Stripe sends webhook events:
       - customer.subscription.created
       - invoice.payment_succeeded (or invoice.paid)

5. Webhook Handler (/api/stripe/webhook)
   └─> Receives subscription.created event
   └─> Extracts org_id from subscription.metadata
   └─> Gets price_id from subscription.items[0].price.id
   └─> Looks up plan_id by matching price_id in plans table
   └─> Creates subscription record with plan_id
   
6. Invoice Payment Succeeded
   └─> Updates subscription status to 'active'
   └─> Updates current_period_end

7. User Views Billing Page (/settings/billing)
   └─> Queries subscriptions table
   └─> Joins with plans table to get plan name
   └─> Displays correct plan information
```

## Fixing the Issue

### Step 1: Verify Database Schema

Run this query to check if your plans have price_id mappings:

```sql
SELECT 
  code,
  name,
  metadata->>'price_id' as price_id
FROM public.plans
WHERE is_active = true;
```

Expected output:
```
code              | name             | price_id
------------------|------------------|---------------------------
free              | Free             | price_1SL5MCA8kaNOs7rye16c39RS
basic_monthly     | Basic (Monthly)  | price_1SL5NJA8kaNOs7rywCjYzPgH
basic_annual      | Basic (Annual)   | price_1SLSWiA8kaNOs7ryllPfcTHx
pro_monthly       | Pro (Monthly)    | price_1SLSXKA8kaNOs7ryKJ6hCHd5
pro_annual        | Pro (Annual)     | price_1SLSYMA8kaNOs7ryrJU9oOYL
enterprise_monthly| Enterprise       | price_1SLSZFA8kaNOs7rywWLjhQ8b
```

### Step 2: Fix Price ID Mappings

If the `price_id` column shows NULL or incorrect values, run:

```bash
# In your Supabase SQL Editor
supabase/verify-and-fix-plan-mappings.sql
```

This script will:
1. Show current state of plans
2. Update all plans with correct price_ids
3. Fix existing subscriptions with NULL plan_id
4. Verify the fixes

### Step 3: Fix Existing Subscriptions

If you have organizations with NULL plan_ids, the script will attempt to fix them based on the `plan_code` stored in `subscription.metadata`.

Alternatively, you can manually fix specific subscriptions:

```sql
-- For "Basic Test" organization
UPDATE public.subscriptions s
SET plan_id = p.id,
    updated_at = now()
FROM public.plans p
WHERE s.org_id = (SELECT id FROM organizations WHERE name = 'Basic Test')
  AND p.code = 'basic_monthly';

-- For "Pro Test" organization
UPDATE public.subscriptions s
SET plan_id = p.id,
    updated_at = now()
FROM public.plans p
WHERE s.org_id = (SELECT id FROM organizations WHERE name = 'Pro Test')
  AND p.code = 'pro_monthly';
```

### Step 4: Test the Complete Flow

1. **Create a new test organization:**
   - Go to dashboard
   - Click "+ Add Organization"
   - Name it "Flow Test"

2. **Select a paid plan:**
   - Go to /pricing
   - Select "Basic" or "Pro"
   - Click "Select Plan"

3. **Go through checkout:**
   - Use Stripe test card: 4242 4242 4242 4242
   - Any future expiry date
   - Any CVC

4. **Verify webhook received:**
   - Check server logs for webhook events
   - Look for "✅ Subscription created" messages
   - Check for "✅ Subscription record synced" messages

5. **Check database:**
   ```sql
   SELECT 
     o.name,
     p.name as plan,
     s.status,
     s.stripe_subscription_id,
     s.plan_id
   FROM organizations o
   JOIN subscriptions s ON s.org_id = o.id
   JOIN plans p ON p.id = s.plan_id
   WHERE o.name = 'Flow Test';
   ```

6. **Verify in UI:**
   - Go to /settings/billing
   - Organization should show correct plan
   - Status should be "active"

## Common Issues & Solutions

### Issue 1: Webhooks Not Reaching Server

**Symptoms:**
- No subscription records created
- No logs in server console about webhooks

**Solution:**
- Check Stripe Dashboard > Developers > Webhooks
- Verify webhook endpoint is configured: `https://your-domain/api/stripe/webhook`
- Check webhook signing secret matches `STRIPE_WEBHOOK_SECRET` in .env
- For local testing, use Stripe CLI:
  ```bash
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  ```

### Issue 2: Plan ID Not Found

**Symptoms:**
- Webhook logs show: `❌ No plan found for price_id: price_xxx`
- Subscription created with `plan_id = NULL`

**Solution:**
- Run the `verify-and-fix-plan-mappings.sql` script
- Verify price IDs in `lib/plans-config.ts` match Stripe Dashboard
- Check plans table has `price_id` in metadata

### Issue 3: Subscription Status Stuck at "incomplete"

**Symptoms:**
- Subscription record exists but status = "incomplete"
- Organization shows as "Free"

**Solution:**
- Check if `invoice.payment_succeeded` webhook was received
- Manually update status:
  ```sql
  UPDATE subscriptions
  SET status = 'active',
      current_period_end = now() + interval '1 month'
  WHERE stripe_subscription_id = 'sub_xxx';
  ```

### Issue 4: RLS Policies Blocking Webhook Writes

**Symptoms:**
- Webhook receives events but fails to create records
- Error: "new row violates row-level security policy"

**Solution:**
- Verify webhook handler uses service role client (bypasses RLS)
- Check `lib/stripe-helpers.ts` uses `getSupabaseServiceClient()`
- Ensure `SUPABASE_SERVICE_ROLE_KEY` is set in environment

### Issue 5: Duplicate Subscriptions

**Symptoms:**
- Organization has multiple active subscriptions
- Billing shows incorrect information

**Solution:**
- Cancel old subscriptions in Stripe Dashboard
- Clean up database:
  ```sql
  -- Find duplicates
  SELECT org_id, COUNT(*) as count
  FROM subscriptions
  WHERE status IN ('active', 'trialing')
  GROUP BY org_id
  HAVING COUNT(*) > 1;
  
  -- Keep only the most recent
  DELETE FROM subscriptions
  WHERE id NOT IN (
    SELECT DISTINCT ON (org_id) id
    FROM subscriptions
    ORDER BY org_id, created_at DESC
  );
  ```

## Verification Checklist

After fixing, verify:

- [ ] All plans have `price_id` in metadata
- [ ] Existing subscriptions have non-NULL `plan_id`
- [ ] Billing page shows correct plans for all organizations
- [ ] New checkout flow creates subscriptions correctly
- [ ] Webhook events are being received and processed
- [ ] Server logs show successful subscription creation
- [ ] No duplicate subscriptions exist

## Monitoring & Debugging

### Enable Webhook Logging

In your webhook handler (`app/api/stripe/webhook/route.ts`), logs are already enabled:

```typescript
console.log('✅ Subscription created:', subscription.id);
console.log('💳 Returning PaymentIntent client_secret');
console.log('🔄 Subscription updated:', subscription.id);
```

### Check Stripe Webhook Logs

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click on your webhook endpoint
3. View event logs to see which events were sent
4. Check for failed events (red X)

### Database Query for Debugging

```sql
-- Complete subscription overview
SELECT 
  o.name as org_name,
  o.stripe_customer_id,
  s.id as sub_id,
  s.stripe_subscription_id as stripe_sub_id,
  s.status,
  s.plan_id,
  p.code as plan_code,
  p.name as plan_name,
  p.metadata->>'price_id' as price_id,
  s.current_period_end,
  s.created_at,
  s.metadata as subscription_metadata
FROM organizations o
LEFT JOIN subscriptions s ON s.org_id = o.id
LEFT JOIN plans p ON p.id = s.plan_id
ORDER BY o.created_at DESC;
```

## Prevention

To prevent this issue in the future:

1. **Always test after rebasing** - Run through complete checkout flow
2. **Keep seed data in sync** - Update `seed-billing-data.sql` when adding new plans
3. **Version control Stripe configuration** - Document price IDs in code comments
4. **Monitor webhook delivery** - Set up alerts for failed webhooks
5. **Use migration scripts** - Never manually edit production database

## Getting Help

If you're still experiencing issues:

1. Check server logs for webhook errors
2. Review Stripe webhook event logs
3. Run the diagnostic queries in this document
4. Check that all environment variables are set correctly
5. Verify Stripe API keys are for the correct environment (test vs. live)

## Related Files

- `/supabase/verify-and-fix-plan-mappings.sql` - Fix price ID mappings
- `/lib/stripe-helpers.ts` - Subscription creation logic
- `/app/api/stripe/webhook/route.ts` - Webhook event handlers
- `/app/api/stripe/create-subscription-intent/route.ts` - Checkout API
- `/lib/plans-config.ts` - Plan definitions and price IDs
- `/app/settings/billing/page.tsx` - Billing UI

