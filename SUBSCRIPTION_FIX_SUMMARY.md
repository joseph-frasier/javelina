# Subscription Creation Fix Summary

## Problem

After accidentally running entitlement removal/restoration migrations on the production database, subscription creation broke. Users could create organizations and checkout, but:
- Subscriptions were not being created properly
- Plans defaulted to "free" in the UI
- The checkout flow appeared to complete but didn't persist the subscription

## Root Causes Identified

### 1. Missing RLS Policies on Subscriptions Table

**Production (BEFORE fix):** Only 2 policies
- `"Service role can manage subscriptions"` (FOR ALL)
- `"Users can view their org subscriptions"` (FOR SELECT)

**Dev/Expected:** 4 policies
- `"Users can view their org subscriptions"` (FOR SELECT)  
- `"Users can create subscriptions for their orgs"` (FOR INSERT) ❌ **MISSING**
- `"Users can update their org subscriptions"` (FOR UPDATE) ❌ **MISSING**
- `"Service role can manage subscriptions"` (FOR ALL)

**Impact:** While the service role bypasses RLS (used for webhooks), any user-initiated subscription operations would fail silently.

### 2. Entitlement System State

The entitlement tables and functions were:
1. Accidentally dropped (migration 20251124200000)
2. Restored (migration 20251124200001)
3. Cleaned up to match dev (migration 20251124200002)

The final state:
- ✅ Tables exist: `entitlements`, `plan_entitlements`, `org_entitlement_overrides`
- ✅ Functions exist: `get_org_entitlements`, `check_entitlement`, `can_create_resource`
- ✅ `plan_entitlements` table is **intentionally empty** (matches dev)
- ⚠️ Application should handle subscriptions without requiring entitlement mappings

## Migrations Applied

### Migration 20251124200003_fix_subscription_rls_policies.sql

**What it does:**
- Drops and recreates all 4 subscription RLS policies
- Ensures production matches dev schema
- Includes verification checks

**Status:** ✅ Ready to apply

### Migration 20251124200004_verify_subscription_setup.sql

**What it does:**
- Diagnostic queries to verify database state
- Checks plans, entitlements, subscriptions, and policies
- Identifies any remaining issues

**Status:** ✅ Ready to run (diagnostic only)

## Application Flow

### Subscription Creation Process

1. **User initiates checkout** → `app/checkout/page.tsx`
2. **Frontend calls API** → `lib/api-client.ts::stripeApi.createSubscription()`
3. **API creates Stripe subscription** → Backend API
4. **Stripe webhook fires** → `customer.subscription.created`
5. **Webhook handler calls** → `lib/stripe-helpers.ts::createSubscriptionRecord()`
6. **Uses service role client** → Bypasses RLS, writes to database
7. **Looks up plan_id** → `getPlanIdFromPriceId()` matches `price_id` from plan metadata

### Critical Dependencies

1. **Plans must have `price_id` in metadata:**
   ```json
   {
     "price_id": "price_1SL5MCA8kaNOs7rye16c39RS",
     "price": 0,
     "description": "...",
     ...
   }
   ```

2. **Service role client must be configured:**
   - `SUPABASE_SERVICE_ROLE_KEY` environment variable

3. **Stripe webhook must be configured:**
   - Endpoint: `/api/stripe/webhooks`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, etc.

## Verification Steps

### 1. After applying fix migration, run verification:

```bash
# On production database
psql -f supabase/migrations/20251124200004_verify_subscription_setup.sql
```

### 2. Check for issues:

**Plans should have price_ids:**
```sql
SELECT code, metadata->>'price_id' FROM plans WHERE is_active = true;
```

**All 4 policies should exist:**
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'subscriptions';
```

**Entitlement functions should exist:**
```sql
SELECT proname FROM pg_proc WHERE proname IN ('get_org_entitlements', 'check_entitlement', 'can_create_resource');
```

### 3. Test subscription creation:

1. Create a new organization
2. Go through checkout flow
3. Complete payment
4. Verify subscription appears in database:
   ```sql
   SELECT s.*, p.code as plan_code 
   FROM subscriptions s 
   LEFT JOIN plans p ON p.id = s.plan_id 
   ORDER BY s.created_at DESC LIMIT 5;
   ```

## Migration Order

Apply in this exact order:

1. ✅ `20251124200000_remove_entitlements_system.sql` (Already applied)
2. ✅ `20251124200001_rollback_restore_entitlements.sql` (Already applied)
3. ✅ `20251124200002_fix_entitlements_match_dev.sql` (Already applied)
4. **➡️ `20251124200003_fix_subscription_rls_policies.sql`** (Apply this now)
5. **📊 `20251124200004_verify_subscription_setup.sql`** (Run for diagnostics)

## Expected Outcomes

### After Fix

✅ Organizations can be created successfully  
✅ Checkout flow completes without errors  
✅ Subscriptions are created with correct `plan_id`  
✅ UI displays correct plan name (not "free")  
✅ Stripe webhooks successfully update subscription status  
✅ RLS policies allow user operations where appropriate  
✅ Service role operations work for webhooks  

### Monitoring

Watch for these log messages:
- `✅ Found plan {code} ({id}) for price {price_id}` - Plan lookup successful
- `Error creating/updating subscription record:` - Database write failed
- `❌ No plan found for price_id:` - Missing price_id in plan metadata

## Rollback Plan

If issues persist after applying the fix:

### Rollback RLS policies:

```sql
-- Remove all subscription policies
DROP POLICY IF EXISTS "Users can view their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create subscriptions for their orgs" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their org subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Restore minimal policies (service role only)
CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Users can view their org subscriptions"
  ON public.subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
    )
  );
```

## Additional Notes

### Entitlements vs. Subscriptions

The application currently uses BOTH systems:
- **Subscriptions:** Link orgs to Stripe plans for billing
- **Entitlements:** Define feature limits and permissions

The `plan_entitlements` table being empty is acceptable if:
- The app has fallback logic for missing entitlements
- Or the app is transitioning to LaunchDarkly for feature flags

### Future Improvements

1. **Consolidate entitlement logic** - Decide between database entitlements vs. LaunchDarkly
2. **Add default subscription trigger** - Auto-create free plan subscription for new orgs
3. **Improve error handling** - Better logging for subscription creation failures
4. **Add admin tools** - UI to manually fix subscriptions if webhooks fail

## Contact

If issues persist after applying these fixes:
1. Run the verification script
2. Check application logs for errors
3. Verify Stripe webhook configuration
4. Check that `SUPABASE_SERVICE_ROLE_KEY` is set correctly



