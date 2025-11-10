# Starter Plan Update (Formerly "Free")

## What Changed

The "Free" plan has been renamed to "**Starter**" plan for better branding.

## Implementation Details

### Database
- **Code remains `'free'`** for backwards compatibility with existing subscriptions
- **Display name is now `'Starter'`** 
- The migration updates both the name and description in the database

### Frontend
- The conversion logic in `lib/plans-config.ts` normalizes the database code `'free'` to `'starter'`
- Plan ID in the frontend: `'starter'`
- Database code: `'free'` (unchanged)

### Files Updated

1. **Migration File**: `supabase/migrations/20251110000000_update_stripe_price_ids.sql`
   - Updates plan name from "Free" to "Starter"
   - Updates description to be more relevant

2. **Plans Config**: `lib/plans-config.ts`
   - Maps database code `'free'` → frontend ID `'starter'`
   - Handles both codes for backwards compatibility
   - Updated sorting order to include 'starter'

3. **Billing Settings**: `app/settings/billing/[org_id]/page.tsx`
   - Checks for both `'free'` and `'starter'` codes
   - Updated messaging to say "Starter plan" instead of "free"

4. **Plan Comparison Modal**: `components/billing/PlanComparisonModal.tsx`
   - Shows $0.00 for both `'free'` and `'starter'` codes

## Migration Process

When you run the migration:

```sql
UPDATE public.plans
SET 
  name = 'Starter',
  metadata = jsonb_set(
    jsonb_set(
      metadata,
      '{price_id}',
      '"YOUR_NEW_STARTER_PRICE_ID"'
    ),
    '{description}',
    '"Perfect for getting started with DNS management"'
  ),
  updated_at = now()
WHERE code = 'free';
```

This will:
- ✅ Update the display name to "Starter"
- ✅ Update the description
- ✅ Update the Stripe price ID to your new active price
- ✅ Keep the code as 'free' for database consistency

## Backwards Compatibility

The system handles both codes seamlessly:
- Existing subscriptions with `plan_code = 'free'` continue to work
- Frontend normalizes `'free'` → `'starter'` for display
- All comparisons check for both `'free'` and `'starter'`

## User-Facing Changes

Users will now see:
- **Plan Name**: "Starter" (instead of "Free")
- **Description**: "Perfect for getting started with DNS management"
- **Same features and limits** as before

## Testing Checklist

After migration:
- [ ] Pricing page shows "Starter" plan
- [ ] Existing free-tier users still have access
- [ ] New users can sign up for Starter plan
- [ ] Billing page shows correct plan name
- [ ] Downgrade to Starter works correctly
- [ ] Plan comparison modal shows Starter at $0.00

