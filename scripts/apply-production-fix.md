# Production Subscription Fix - Step-by-Step Guide

## ⚠️ IMMEDIATE ACTION REQUIRED

Your production database is missing the subscription auto-creation trigger. Follow these steps to fix it.

---

## Step 1: Verify the Problem

Before applying the fix, let's confirm the issue exists in production.

### 1.1 Run Verification Script

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your **PRODUCTION** project
3. Navigate to: **SQL Editor**
4. Copy the contents of `scripts/verify-subscriptions.sql`
5. Paste and run the query

**Expected Output:**
```
❌ X organizations are missing subscriptions!
⚠️  Auto-creation trigger is missing!
```

If you see this, proceed to Step 2.

---

## Step 2: Apply the Migration to Production

### Option A: Using Supabase CLI (Recommended)

```bash
# 1. Make sure you're logged in to Supabase CLI
supabase login

# 2. Link to your production project (if not already linked)
supabase link --project-ref YOUR_PRODUCTION_PROJECT_REF

# 3. Push the migration to production
supabase db push

# This will apply all migrations that haven't been applied yet
# including 20251124200000_auto_create_default_subscription.sql
```

### Option B: Manual Application via Dashboard

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
2. Open the migration file: `supabase/migrations/20251124200000_auto_create_default_subscription.sql`
3. Copy the **ENTIRE contents** of the file
4. Paste into the SQL Editor
5. Click **RUN**

**⚠️ Important:** Make sure you run the ENTIRE file, not just parts of it.

### 2.1 Watch for Success Messages

After running, you should see output like:
```
NOTICE:  Total organizations: X
NOTICE:  Total subscriptions: Y
NOTICE:  Organizations without subscriptions: 0
NOTICE:  All organizations have subscriptions ✓
```

If you see any warnings, note them and proceed to verification.

---

## Step 3: Verify the Fix

### 3.1 Re-run Verification Script

Run `scripts/verify-subscriptions.sql` again (see Step 1.1).

**Expected Output:**
```
✅ All organizations have subscriptions and trigger is installed!
```

### 3.2 Manual Check

Run this query in Supabase SQL Editor:

```sql
-- Should return 0 rows
SELECT o.id, o.name, o.created_at
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
WHERE s.id IS NULL;
```

### 3.3 Test New Organization Creation

1. Go to your production site
2. Create a new test organization
3. Immediately check if it has a subscription:

```sql
-- Replace 'Test Organization Name' with your test org name
SELECT 
  o.name,
  s.status as subscription_status,
  p.code as plan_code,
  s.metadata->>'created_via' as creation_method
FROM public.organizations o
LEFT JOIN public.subscriptions s ON s.org_id = o.id
LEFT JOIN public.plans p ON p.id = s.plan_id
WHERE o.name = 'Test Organization Name';
```

**Expected:** Should show a subscription with `plan_code = 'free'` and `creation_method = 'auto_trigger'`

---

## Step 4: Verify Webhook Configuration

Now let's make sure paid subscriptions will work properly.

### 4.1 Check Stripe Webhook Endpoint

1. Go to: https://dashboard.stripe.com/webhooks
2. Look for your production webhook endpoint
3. **Should be:** `https://your-production-api-domain.com/api/stripe/webhooks`

**If endpoint doesn't exist:**
- Click **"Add endpoint"**
- Enter your production API URL: `https://your-api-domain.com/api/stripe/webhooks`
- Select these events:
  - ✅ `customer.subscription.created`
  - ✅ `customer.subscription.updated`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_succeeded`
  - ✅ `invoice.paid`
  - ✅ `invoice.payment_failed`
- Click **"Add endpoint"**

### 4.2 Copy Webhook Signing Secret

1. In the webhook endpoint details, find **"Signing secret"**
2. Click **"Reveal"** and copy the secret (starts with `whsec_`)
3. This needs to be in your production backend environment variables

### 4.3 Verify Backend Environment Variables

Check your production backend (wherever it's deployed) has these set:

```bash
# Production Stripe Keys (NOT test keys!)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From Step 4.2

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...  # Service role key (needed for webhook writes)

# Other
FRONTEND_URL=https://your-production-frontend.com
```

**⚠️ Critical:** Make sure you're using **LIVE** Stripe keys (`sk_live_...`), not test keys!

### 4.4 Test Webhook Delivery

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select `customer.subscription.created`
4. Click **"Send test webhook"**

**Check the response:**
- ✅ **200 OK** = Webhook is working
- ❌ **404/502** = Backend endpoint unreachable (check URL, check backend is running)
- ❌ **400** = Signature verification failed (check `STRIPE_WEBHOOK_SECRET`)
- ❌ **500** = Backend error (check backend logs)

### 4.5 Check Recent Webhook Deliveries

1. In the webhook endpoint details, scroll to **"Recent deliveries"**
2. Look for any failed deliveries (red indicators)
3. Click on failed deliveries to see error details
4. Fix any issues found

---

## Step 5: Test Full Checkout Flow (End-to-End)

### 5.1 Test Paid Plan Checkout

1. Go to your production site
2. Create a new organization (or use existing one)
3. Go to **Pricing** page
4. Select a **paid plan** (e.g., Pro plan)
5. Go through checkout with test card: `4242 4242 4242 4242`
6. Complete payment

### 5.2 Verify Subscription Was Created/Updated

```sql
-- Check the subscription for your test organization
SELECT 
  o.name as org_name,
  p.code as plan_code,
  s.status,
  s.stripe_subscription_id,
  s.metadata->>'created_via' as created_via,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
JOIN public.organizations o ON o.id = s.org_id
JOIN public.plans p ON p.id = s.plan_id
WHERE o.name = 'Your Test Org Name'
ORDER BY s.updated_at DESC;
```

**Expected:** 
- `plan_code` should be 'pro' (or whatever plan you selected)
- `status` should be 'active'
- `stripe_subscription_id` should be populated
- Recently updated timestamp

### 5.3 Monitor for Issues

Watch for these over the next 24-48 hours:
- New organizations getting subscriptions
- Checkout flows completing successfully
- Webhook delivery success rate in Stripe Dashboard
- No user reports of "subscription not found" errors

---

## Step 6: Commit and Document

### 6.1 Commit the Migration

The migration file is currently untracked. Let's commit it:

```bash
git add supabase/migrations/20251124200000_auto_create_default_subscription.sql
git commit -m "feat: Add auto-subscription trigger for organizations

- Automatically creates free plan subscription when org is created
- Includes backfill for existing organizations
- Fixes production issue where subscriptions weren't being created"
git push origin feat/stripe-subscriptions
```

### 6.2 Update Documentation

If needed, update your deployment docs to mention:
- This migration must be applied to all environments
- Webhook configuration is required for production
- Environment variable requirements

---

## Troubleshooting

### Issue: "Free plan not found" warning

**Cause:** No plan with `code = 'free'` exists in database

**Fix:**
```sql
-- Check if free plan exists
SELECT id, code, name, is_active FROM public.plans WHERE code = 'free';

-- If missing, you need to seed plans data
-- See: supabase/seed-billing-data.sql
```

### Issue: Organizations still missing subscriptions after migration

**Possible causes:**
1. Migration didn't run completely (check for SQL errors)
2. Free plan doesn't exist
3. RLS policies blocking writes

**Fix:**
```sql
-- Manually create missing subscriptions
-- Run the backfill query from the migration again
-- See: supabase/migrations/20251124200000_auto_create_default_subscription.sql lines 90-122
```

### Issue: Webhooks returning 400 (signature verification failed)

**Cause:** Webhook secret doesn't match

**Fix:**
1. Get the correct signing secret from Stripe Dashboard → Webhooks → Your endpoint
2. Update backend environment variable: `STRIPE_WEBHOOK_SECRET=whsec_...`
3. Restart backend service
4. Test webhook again

### Issue: Webhooks returning 500 (server error)

**Cause:** Backend error processing webhook

**Fix:**
1. Check backend logs for error details
2. Common issues:
   - Missing `SUPABASE_SERVICE_ROLE_KEY` (can't write to database)
   - Plan lookup failing (price_id not found in plans table)
   - Database connection issues
3. Fix the specific error and retry webhook

---

## Success Criteria

✅ **All checks passed:**

- [ ] Verification script shows: "All organizations have subscriptions ✓"
- [ ] Trigger exists in production database
- [ ] New organizations automatically get subscriptions
- [ ] Stripe webhook endpoint configured and responding 200 OK
- [ ] Backend environment variables set correctly
- [ ] Test checkout flow completes successfully
- [ ] Subscription created/updated after payment
- [ ] Migration committed to git
- [ ] No user-facing errors reported

---

## Need Help?

If you encounter issues:

1. **Check backend logs** for specific error messages
2. **Check Stripe webhook delivery logs** for webhook failures
3. **Run verification script** to identify specific issues
4. **Check Supabase logs** for database errors
5. **Review environment variables** to ensure all are set correctly

## Files Referenced

- Migration: `supabase/migrations/20251124200000_auto_create_default_subscription.sql`
- Verification: `scripts/verify-subscriptions.sql`
- Webhook Setup: `STRIPE_WEBHOOK_SETUP.md`
- Diagnosis: `PRODUCTION_SUBSCRIPTION_FIX.md`

