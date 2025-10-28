# Stripe Subscription Duplicate Key Error Fix

## Problem Statement

Users were getting stuck on the "Processing Your Subscription" page after completing payment. Terminal logs showed repeated duplicate key errors:

```
Error creating subscription record: {
  code: '23505',
  details: 'Key (org_id)=(4493057e-e976-49b3-8677-90e1e863f2ba) already exists.',
  message: 'duplicate key value violates unique constraint "subscriptions_org_id_key"'
}
```

## Root Cause Analysis

The issue was caused by **multiple concurrent Stripe webhook events** attempting to create subscription records for the same organization:

1. `customer.subscription.created` webhook fires → creates subscription
2. `invoice.payment_succeeded` webhook fires → tries to create subscription again
3. `customer.subscription.updated` webhook fires → tries to create subscription again

The database has a UNIQUE constraint on `org_id` in the `subscriptions` table:
```sql
org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL UNIQUE
```

This constraint ensures only ONE subscription per organization. When multiple webhooks tried to create records, the 2nd+ attempts failed with error code 23505 (duplicate key violation).

## Solution Implemented

### 1. **Upsert Pattern in `lib/stripe-helpers.ts`**

Changed `createSubscriptionRecord()` from using `.insert()` to `.upsert()` with the `onConflict: 'org_id'` option:

```typescript
// BEFORE: Pure insert (fails on duplicates)
const { data, error } = await supabase
  .from('subscriptions')
  .insert(subscriptionData)
  .select()
  .single();

// AFTER: Upsert (atomically inserts or updates)
const { data, error } = await supabase
  .from('subscriptions')
  .upsert(subscriptionData, { onConflict: 'org_id' })
  .select()
  .single();
```

**Benefits:**
- Atomic operation: no race conditions between concurrent webhooks
- Automatically updates existing records instead of failing
- Simpler error handling

### 2. **Simplified Webhook Handlers in `app/api/stripe/webhook/route.ts`**

#### `handleSubscriptionCreated()` - Removed redundant checks
**Before:** Checked if subscription exists, then created or updated
**After:** Directly calls `createSubscriptionRecord()` which uses upsert

```typescript
// Simplified - upsert handles everything
await createSubscriptionRecord(orgId, subscription);
```

#### `handleSubscriptionUpdated()` - Removed duplicate key error handling
**Before:** Had try/catch to handle 23505 errors with fallback logic
**After:** Relies on upsert pattern, removed 13 lines of error handling code

```typescript
// Removed complex error handling:
// - try/catch for createError
// - check for code === '23505'
// - fallback to updateSubscriptionRecord
```

## Files Modified

1. **`lib/stripe-helpers.ts`** (Lines 125-177)
   - Updated `createSubscriptionRecord()` to use `.upsert()`
   - Added `updated_at` timestamp field for consistency

2. **`app/api/stripe/webhook/route.ts`** (Lines 153-213)
   - Simplified `handleSubscriptionCreated()` - removed 8 lines
   - Simplified `handleSubscriptionUpdated()` - removed 13 lines

## Testing

To verify the fix works:

1. Navigate to `/pricing` and select a plan
2. Complete the "Create Organization" modal
3. Proceed through Stripe checkout with test card
4. Verify the "Processing Your Subscription" page completes and redirects to the organization dashboard

**Expected behavior:**
- No duplicate key errors in terminal
- Subscription created successfully on first attempt
- Redirect completes within 3-5 seconds
- Organization dashboard loads properly

## Technical Details

### Upsert Behavior
- **Primary Key:** `org_id` (UNIQUE constraint)
- **Conflict Resolution:** `onConflict: 'org_id'` means "if org_id already exists, update it"
- **Atomicity:** Database guarantees this is a single atomic transaction

### Why This Works
- Multiple webhooks may arrive out of order or simultaneously
- Upsert ensures the final state is correct regardless of order
- Later webhook data overwrites earlier data (intentional and desired)
- No application-level race condition handling needed

## Impact
- ✅ Eliminates duplicate key errors during subscription creation
- ✅ Fixes the stuck "Processing" page issue
- ✅ Simplifies webhook handler logic (~20 lines of code removed)
- ✅ More resilient to webhook timing edge cases
- ✅ Better aligns with Stripe's async webhook delivery model
