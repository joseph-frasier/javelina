# Price ID Security Fix - Client-Side Changes

## Overview
This document summarizes the security improvements made to prevent clients from directly sending Stripe price IDs to the backend. All client-side code now sends plan codes instead, allowing the backend to securely look up the corresponding price IDs.

## Security Issue
**Before**: The client was sending Stripe price IDs directly to the backend, which could allow malicious users to manipulate pricing by sending arbitrary price IDs.

**After**: The client now sends plan codes (e.g., `starter_monthly`, `basic_monthly`, `pro_monthly`). The backend looks up the correct Stripe price ID from the database based on the plan code, ensuring pricing integrity.

## Files Changed

### 1. `/lib/api-client.ts`
**Changes:**
- `stripeApi.createSubscription()` now accepts `plan_code` instead of `price_id`
- `stripeApi.updateSubscription()` now accepts `new_plan_code` instead of `new_price_id`

**Impact:** All API calls to create or update subscriptions now send plan codes.

### 2. `/app/checkout/page.tsx`
**Changes:**
- `CheckoutData` interface: `price_id` → `plan_code`
- Search params: reads `plan_code` instead of `price_id` from URL
- API call: passes `plan_code` to `stripeApi.createSubscription()`

**Impact:** Checkout flow now uses plan codes throughout.

### 3. `/app/pricing/page.tsx`
**Changes:**
- `handleOrgCreated()` now generates plan codes (e.g., `${planConfig.id}_monthly`)
- Navigation to checkout uses `plan_code` query parameter instead of `price_id`

**Impact:** When users select a plan, the app navigates to checkout with a plan code.

### 4. `/app/settings/billing/[org_id]/page.tsx`
**Changes:**
- `handleSelectPlan()` signature: removed `priceId` parameter, now only accepts `planCode`
- API calls: uses `planCode` for both update and new subscription flows
- Navigation to checkout: uses `plan_code` query parameter

**Impact:** Billing page plan changes now use plan codes.

### 5. `/components/billing/PlanComparisonModal.tsx`
**Changes:**
- Removed `priceId` field from `Plan` interface
- Updated `onSelectPlan` callback: now only passes `planCode` (removed `priceId` parameter)
- Removed hardcoded Stripe price IDs from `AVAILABLE_PLANS`
- Added comment noting these are fallback definitions (real pricing comes from database)
- Changed `code: 'free'` to `code: 'starter_monthly'` for consistency

**Impact:** Plan comparison modal no longer exposes or uses price IDs.

### 6. `/types/billing.ts`
**Changes:**
- `CreateCheckoutSessionRequest` interface: `price_id` → `plan_code`

**Impact:** Type safety ensures plan codes are used in checkout requests.

## Plan Code Format
Plan codes follow the format: `{plan_tier}_{billing_interval}`

Examples:
- `starter_monthly`
- `starter_annual`
- `basic_monthly`
- `basic_annual`
- `pro_monthly`
- `pro_annual`
- `enterprise_monthly`

## Backend Expectations
The backend should:
1. Accept `plan_code` in requests (not `price_id`)
2. Look up the corresponding Stripe price ID from the database using the plan code
3. Validate that the plan code exists and is active
4. Use the retrieved price ID for Stripe operations

## Testing Recommendations
1. ✅ Test creating a new organization and selecting a plan
2. ✅ Test upgrading/downgrading an existing subscription
3. ✅ Test the checkout flow with various plan selections
4. ✅ Verify that price IDs are never exposed in network requests
5. ✅ Test error handling when invalid plan codes are sent

## Notes
- Price IDs are still stored in the database and in client-side state for internal use
- The `PlanPrice` interface in `lib/plans-config.ts` still contains `priceId` for database retrieval
- The `lib/subscription-store.ts` still uses `priceId` in internal state (not sent to backend)
- These internal uses are safe - the key is that price IDs are never sent to the backend from the client

## Migration Path
If you need to migrate existing code:
1. Replace all API calls that send `price_id` with `plan_code`
2. Update URL parameters from `price_id` to `plan_code`
3. Update function signatures to accept `planCode` instead of `priceId`
4. Ensure backend is updated to accept `plan_code` before deploying client changes

## Security Benefits
✅ **Prevents price manipulation**: Users cannot send arbitrary price IDs  
✅ **Centralized pricing**: All pricing is controlled server-side  
✅ **Audit trail**: Plan codes are more meaningful in logs than price IDs  
✅ **Flexibility**: Can change price IDs in database without client updates  

