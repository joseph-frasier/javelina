# Price IDs Migration Guide

## Problem
Previously, Stripe price IDs were hardcoded in `lib/plans-config.ts`. This meant:
- ❌ Every price change required a code deployment
- ❌ No separation between dev/staging/production prices
- ❌ Risk of using archived prices (which caused your current error)

## Solution
Price IDs are now stored in the database and fetched dynamically via API.

---

## Step 1: Update the Migration File with Your New Price IDs

Open `supabase/migrations/20251110000000_update_stripe_price_ids.sql` and replace the placeholder values with your actual new Stripe price IDs:

```sql
-- Replace these placeholders:
'YOUR_NEW_STARTER_PRICE_ID'  (formerly FREE)
'YOUR_NEW_BASIC_MONTHLY_PRICE_ID'
'YOUR_NEW_BASIC_ANNUAL_PRICE_ID'
'YOUR_NEW_PRO_MONTHLY_PRICE_ID'
'YOUR_NEW_PRO_ANNUAL_PRICE_ID'
'YOUR_NEW_ENTERPRISE_PRICE_ID'
```

**Example:**
```sql
UPDATE public.plans
SET 
  name = 'Starter',
  metadata = jsonb_set(
    jsonb_set(
      metadata,
      '{price_id}',
      '"price_1ABC123xyz"'  -- Your actual price ID here
    ),
    '{description}',
    '"Perfect for getting started with DNS management"'
  ),
  updated_at = now()
WHERE code = 'free';
```

**Note:** The database code remains `'free'` for backwards compatibility, but the display name is now "Starter".

---

## Step 2: Run the Migration

### If using Supabase CLI:
```bash
cd /Users/sethchesky/Documents/GitHub/javelina
supabase db push
```

### If using Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of `supabase/migrations/20251110000000_update_stripe_price_ids.sql`
4. Paste and run it

---

## Step 3: Verify the Update

Run this query in your Supabase SQL editor:

```sql
SELECT 
  code,
  name,
  metadata->>'price_id' as stripe_price_id,
  metadata->>'price' as price,
  billing_interval
FROM public.plans
WHERE is_active = true
ORDER BY code;
```

You should see your new active price IDs!

---

## How It Works Now

### Backend API
- **GET /api/plans** - Returns all active plans with their price IDs from the database
- **GET /api/plans/:code** - Returns a specific plan by code

### Frontend
- `lib/plans-config.ts` now has a `fetchPlans()` function that calls the API
- Plans are cached client-side for 5 minutes to reduce API calls
- All components that need pricing data should call `fetchPlans()` instead of using hardcoded `PLANS_CONFIG`

### Example Usage in Components:

```typescript
import { fetchPlans } from '@/lib/plans-config';

export default async function PricingPage() {
  const plans = await fetchPlans();
  
  return (
    <div>
      {plans.map(plan => (
        <PricingCard key={plan.id} plan={plan} />
      ))}
    </div>
  );
}
```

---

## Future Price Updates

When you need to update prices in the future:

1. **Update Stripe** (create new prices or reactivate archived ones)
2. **Update Database** (run a simple SQL update):
   ```sql
   UPDATE public.plans
   SET 
     metadata = jsonb_set(metadata, '{price_id}', '"new_price_id"'),
     updated_at = now()
   WHERE code = 'plan_code';
   ```
3. **Done!** No code deployment needed. Changes are instant.

---

## Benefits of New Architecture

✅ **Database as Source of Truth** - Price IDs live in the database where they belong  
✅ **No Code Deploys for Price Changes** - Update via SQL, not code  
✅ **Environment Separation** - Different price IDs per environment (dev/staging/prod)  
✅ **A/B Testing Ready** - Easy to test different pricing strategies  
✅ **Audit Trail** - Database tracks when prices were updated  
✅ **Zero Downtime** - Price changes propagate instantly without restarting the app  

---

## Rollback Plan

If you need to rollback:

1. The old hardcoded values are still in git history
2. You can always update the database back to old price IDs if needed
3. The API will continue to work as long as the database has valid price IDs

---

## Questions?

If you encounter any issues:
1. Check that the migration ran successfully
2. Verify the price IDs in the database match your active Stripe prices
3. Check the backend logs for any API errors
4. Clear the client-side cache by refreshing the page

---

## Files Modified

### Backend
- ✅ `backend/src/controllers/plansController.ts` (new)
- ✅ `backend/src/routes/plans.ts` (new)
- ✅ `backend/src/routes/index.ts` (updated)

### Frontend
- ✅ `lib/api-client.ts` (added plansApi)
- ✅ `lib/plans-config.ts` (refactored to fetch from API)

### Database
- ✅ `supabase/migrations/20251110000000_update_stripe_price_ids.sql` (new)

