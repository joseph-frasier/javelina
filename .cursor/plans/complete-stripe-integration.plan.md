<!-- ec0bf931-0ddd-4fcb-b1ea-9fea0be562ed 298f4fa6-bca5-4192-9b1a-4f39cd07a4ae -->
# Complete Stripe Integration - Updated for Actual Products

## Architecture: Organization-Based Subscriptions

- **Subscriptions are tied to Organizations** (not users)
- Each organization has ONE active subscription
- All members share the organization's subscription benefits
- Users can belong to multiple organizations with different subscription levels
- Entitlements system allows flexible feature/limit management

## Pricing Structure (from Stripe)

### Free Plan

- **Product ID**: `prod_THefRjwMEakPYm`
- **Price**: $0.00 (no billing)
- **Price ID**: `price_1SL5MCA8kaNOs7rye16c39RS`

### Basic Plan

- **Product ID**: `prod_THeggCI1HVHeQ9`
- **Monthly**: $3.50/month (`price_1SL5NJA8kaNOs7rywCjYzPgH`)
- **Annual**: $42.00/year (`price_1SLSWiA8kaNOs7ryllPfcTHx`) - Save $0 vs monthly

### Pro Plan

- **Product ID**: `prod_TI2cDjhyuRaH7R`
- **Monthly**: $6.70/month (`price_1SLSXKA8kaNOs7ryKJ6hCHd5`)
- **Annual**: $80.40/year (`price_1SLSYMA8kaNOs7ryrJU9oOYL`) - Save $0 vs monthly

### Enterprise Plan

- **Product ID**: `prod_TI2eKuLY9hXIoN`
- **Monthly**: $450.00/month (`price_1SLSZFA8kaNOs7rywWLjhQ8b`)
- **Annual**: Not available (custom pricing/contact sales)

---

## Phase 0: Create Entitlements-Based Billing Schema

**Update existing files** with actual Stripe Product and Price IDs:

### Updated Billing Schema

`supabase/billing-schema-v2.sql` - Update to include:

**Add to organizations table:**

```sql
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS environments_count INTEGER DEFAULT 0;
```

**Add to environments table:**

```sql
ALTER TABLE environments
ADD COLUMN IF NOT EXISTS zones_count INTEGER DEFAULT 0;
```

**Benefits:**

- Cached counts for quick limit checks
- Avoid counting queries on every create operation
- More intuitive data model

### Updated Seed Data

`supabase/seed-billing-data.sql` - Update to include:

**Plans to create:**

1. `free` - Free plan (no Stripe product needed for subscription)
2. `basic_monthly` - Basic Monthly
3. `basic_annual` - Basic Annual
4. `pro_monthly` - Pro Monthly
5. `pro_annual` - Pro Annual
6. `enterprise_monthly` - Enterprise Monthly

**Entitlements per plan:**

| Entitlement | Free | Basic | Pro | Enterprise |

|-------------|------|-------|-----|------------|

| `environments_limit` | 1 | 3 | 10 | Unlimited |

| `zones_limit` | 3 | 10 | 50 | Unlimited |

| `dns_records_limit` | 100 | 500 | 5000 | Unlimited |

| `team_members_limit` | 2 | 5 | 10 | Unlimited |

| `api_access` | ❌ | ✅ | ✅ | ✅ |

| `advanced_analytics` | ❌ | ❌ | ✅ | ✅ |

| `priority_support` | ❌ | ❌ | ✅ | ✅ |

| `audit_logs` | ❌ | ❌ | ✅ | ✅ |

| `custom_roles` | ❌ | ❌ | ❌ | ✅ |

| `sso_enabled` | ❌ | ❌ | ❌ | ✅ |

| `bulk_operations` | ❌ | ✅ | ✅ | ✅ |

| `export_data` | ❌ | ✅ | ✅ | ✅ |

**Files:**

- `supabase/billing-schema-v2.sql` (already created ✅)
- `supabase/seed-billing-data.sql` (update with actual IDs)
- `types/billing.ts` (update plan codes)

---

## Phase 1: Stripe Checkout Session Flow

**Create subscription checkout flow using Stripe Checkout Sessions**

### Pricing Page Updates

`app/pricing/page.tsx`:

- Display all 4 tiers: Free, Basic, Pro, Enterprise
- Monthly/Annual toggle for Basic and Pro
- Show actual prices from Stripe
- "Get Started" buttons:
  - **Free**: Create org with free subscription
  - **Basic/Pro**: Redirect to checkout with selected billing interval
  - **Enterprise**: Contact sales (no checkout)

### Subscription Intent API (Embedded Elements)

`app/api/stripe/create-subscription-intent/route.ts`:

- Accept: `org_id`, `price_id` (from Stripe)
- Validate organization exists and user is owner/admin
- Create or retrieve Stripe Customer
- Store `stripe_customer_id` in organization
- Create Subscription with incomplete status:
  - `payment_behavior: 'default_incomplete'` (key for embedded elements)
  - `save_default_payment_method: 'on_subscription'`
  - Expand: `latest_invoice.payment_intent`
  - Metadata: `org_id`, `user_id`, `plan_code`
- Extract PaymentIntent's `client_secret` from subscription
- Return: `subscriptionId` and `clientSecret`

**How it works**: Creates subscription immediately (but incomplete). When user pays via embedded form, webhook activates subscription.

### Checkout Page (Embedded Stripe Elements)

`app/checkout/page.tsx`:

- Accept query params: `org_id`, `price_id`, `plan_name`, `plan_price`, `billing_interval`
- Call `/api/stripe/create-subscription-intent`
- Display embedded Stripe Elements form with client secret
- Show order summary with plan details
- User completes payment **on our site** (no redirect)
- On success: redirect to `/stripe/success`

### Stripe Payment Form Component (Restored)

`components/stripe/StripePaymentForm.tsx`:

- Embedded PaymentElement from Stripe
- "Complete Payment" button with loading state
- Security badge
- Calls `stripe.confirmPayment()` with `return_url`
- Error handling and success callbacks

### Success Page

`app/stripe/success/page.tsx`:

- Get `session_id` from query params
- Show "Processing your subscription..." message
- Poll `/api/subscriptions/status?org_id=X` every 2 seconds
- When subscription is `active` or `trialing`:
  - Show success message
  - Redirect to organization dashboard

### Cancel Page

`app/stripe/cancel/page.tsx`:

- Show "Payment was canceled" message
- Button to return to pricing page
- Keep selected plan in context if possible

**Files:**

- `app/api/stripe/create-checkout-session/route.ts` (new)
- `app/api/subscriptions/status/route.ts` (new - for polling)
- `app/checkout/page.tsx` (simplify)
- `app/stripe/success/page.tsx` (new)
- `app/stripe/cancel/page.tsx` (new)
- `app/pricing/page.tsx` (update with actual plans/prices)
- DELETE: `app/api/stripe/create-payment-intent/route.ts`
- DELETE: `components/stripe/StripePaymentForm.tsx`

---

## Phase 2: Webhook Handlers (CRITICAL)

**Sync Stripe events to Supabase database**

### Webhook Events to Handle

`app/api/stripe/webhook/route.ts`:

#### `checkout.session.completed`

1. Extract metadata: `org_id`, `user_id`, `plan_code`
2. Get Stripe customer ID and subscription ID from session
3. Update organization:

   - Set `stripe_customer_id`

4. Create/update subscription record:

   - Link to organization
   - Set `stripe_subscription_id`
   - Set `plan_id` based on price ID
   - Set initial status (usually `incomplete` or `trialing`)
   - Set `created_by` to user_id

#### `customer.subscription.created`

1. Find organization by `stripe_subscription_id`
2. Update subscription record
3. Create `subscription_items` for each line item
4. Set status based on Stripe subscription status

#### `customer.subscription.updated`

1. Find subscription by `stripe_subscription_id`
2. Update status, periods, cancel info
3. If plan changed: Update `plan_id` and subscription_items

#### `customer.subscription.deleted`

1. Find subscription by `stripe_subscription_id`
2. Set status to `canceled`
3. Set `canceled_at` timestamp
4. Keep record for history

#### `invoice.payment_succeeded`

1. Find subscription by Stripe subscription ID
2. Update status to `active`
3. Update `current_period_end`

#### `invoice.payment_failed`

1. Find subscription by Stripe subscription ID
2. Update status to `past_due`
3. Optionally: Send notification email

### Helper Functions

`lib/stripe-helpers.ts`:

- `getOrgByStripeCustomer(customerId)` - Find org by Stripe customer ID
- `getOrgByStripeSubscription(subscriptionId)` - Find org by subscription ID
- `getPlanIdFromPriceId(priceId)` - Map Stripe Price ID to plan record
- `syncSubscriptionFromStripe(subscriptionId)` - Fetch from Stripe and update DB
- `createSubscriptionRecord(orgId, stripeData)` - Create subscription in DB

**Files:**

- `app/api/stripe/webhook/route.ts` (implement all TODOs)
- `lib/stripe-helpers.ts` (new)

---

## Phase 3: Organization Creation with Free Plan

**Handle free plan selection and organization creation**

### Organization Creation API

`app/api/organizations/create/route.ts`:

- Accept: `name`, `plan_code` (default: 'free')
- Validate user is authenticated
- Create organization in Supabase
- Add user as organization member (Admin role)
- If plan is 'free':
  - Create Stripe customer (for future upgrades)
  - Store `stripe_customer_id`
  - Create subscription record with status='active', plan='free'
- Return: `org_id`

### Update Pricing Page

`app/pricing/page.tsx`:

- "Start Free" button:
  - Call `/api/organizations/create` with `plan_code='free'`
  - Show success toast
  - Redirect to new organization dashboard

**Files:**

- `app/api/organizations/create/route.ts` (new)
- `app/pricing/page.tsx` (update free plan handler)

---

## Phase 4: Subscription Query APIs

**APIs to fetch subscription and entitlement data**

### Get Current Subscription

`app/api/subscriptions/current/route.ts`:

- Accept: `org_id` (from query params or JWT)
- Verify user has access to organization
- Call `get_org_subscription(org_id)` database function
- Join with plans table
- Return: Subscription details + plan info

### Check Entitlement

`app/api/entitlements/check/route.ts`:

- Accept: `org_id`, `entitlement_key`
- Verify user access
- Call `check_entitlement(org_id, key)` function
- Parse value based on type
- Return: `{ value, parsed_value, value_type }`

### Can Create Resource

`app/api/subscriptions/can-create/route.ts`:

- Accept: `org_id`, `resource_type` (environment|zone|member)
- Verify user access
- Call `can_create_resource(org_id, type)` function
- Get current count and limit
- Return: `{ can_create, current_count, limit, reason }`

### Get Subscription Status (for polling)

`app/api/subscriptions/status/route.ts`:

- Accept: `org_id`
- Quick query for subscription status only
- Return: `{ status, is_active }`

**Files:**

- `app/api/subscriptions/current/route.ts` (new)
- `app/api/subscriptions/status/route.ts` (new)
- `app/api/entitlements/check/route.ts` (new)
- `app/api/subscriptions/can-create/route.ts` (new)

---

## Phase 5: Subscription Management UI

**User interface for managing subscriptions**

### Billing Settings Page

`app/settings/billing/page.tsx`:

**Display:**

- Current plan card (Free/Basic/Pro/Enterprise)
- Billing interval (Monthly/Annual)
- Subscription status badge
- Next billing date
- Current usage vs limits (with progress bars)
- Payment method (from Stripe)

**Actions:**

- "Change Plan" → Opens plan selection modal or redirects to pricing
- "Manage Billing" → Opens Stripe Customer Portal
- "Cancel Subscription" → Confirmation modal → API call
- "View Invoices" → Opens Stripe Customer Portal

### Subscription Manager Component

`components/billing/SubscriptionManager.tsx`:

- Fetches subscription data via API
- Displays plan details
- Shows feature list with checkmarks
- Usage meters for limits

### Usage Meter Component

`components/billing/UsageMeter.tsx`:

- Props: `current`, `limit`, `label`, `resourceType`
- Shows progress bar
- Displays "X of Y used" or "Unlimited"
- Warning state when near limit
- Upgrade prompt when at limit

### Plan Comparison Modal

`components/billing/PlanComparisonModal.tsx`:

- Side-by-side comparison of all plans
- Highlight current plan
- Show upgrade/downgrade options
- Link to checkout with selected plan

**Files:**

- `app/settings/billing/page.tsx` (new)
- `components/billing/SubscriptionManager.tsx` (new)
- `components/billing/UsageMeter.tsx` (new)
- `components/billing/PlanComparisonModal.tsx` (new)
- `app/settings/page.tsx` (add "Billing" nav item)

---

## Phase 6: Stripe Customer Portal

**Self-service billing management**

### Customer Portal API

`app/api/stripe/create-portal-session/route.ts`:

- Accept: `org_id`
- Verify user is org admin/owner
- Get `stripe_customer_id` from organization
- Create Stripe billing portal session
- Return URL: `/settings/billing`
- Return: `{ url }`

### Integration

Portal allows users to:

- View and download invoices
- Update payment method
- View payment history
- Cancel subscription
- Update billing email

**Files:**

- `app/api/stripe/create-portal-session/route.ts` (new)

---

## Phase 7: Entitlement Enforcement

**Implement limits throughout the application**

### Server-Side Enforcement

Update `lib/actions/`:

**`environments.ts`:**

- Before creating environment:
  - Call `can_create_resource(org_id, 'environment')`
  - If false, throw error with upgrade message

**`zones.ts`:**

- Before creating zone:
  - Call `can_create_resource(org_id, 'zone')`
  - If false, throw error with upgrade message

**Organization members:**

- Before adding member:
  - Call `can_create_resource(org_id, 'member')`
  - If false, throw error

### Client-Side Checks

**Create entitlement hook:**

`hooks/useEntitlements.ts`:

- Fetch organization entitlements
- Cache in React Query
- Provide helpers:
  - `hasFeature(key)` - Check boolean entitlements
  - `getLimit(key)` - Get numeric limits
  - `canCreate(resource)` - Check if can create resource

**Usage in components:**

- Disable "Create Environment" button when limit reached
- Show upgrade prompt instead
- Display usage indicators
- Feature-gate advanced features

### Helper Functions

`lib/entitlements.ts`:

- `checkFeatureAccess(orgId, feature)` - Server-side check
- `getOrgUsage(orgId)` - Get current resource counts
- `formatEntitlementValue(value, type)` - Parse and format

**Files:**

- `lib/actions/environments.ts` (add checks)
- `lib/actions/zones.ts` (add checks)
- `lib/actions/organizations.ts` (add member checks)
- `hooks/useEntitlements.ts` (new)
- `lib/entitlements.ts` (new)

---

## Phase 8: Update Client-Side Plan Data

**Replace mock subscription store with real data**

### Update Subscription Store

`lib/subscription-store.ts`:

- Keep for temporary state (selected plan during checkout)
- Remove mock subscription data
- Fetch real subscription from API
- Update plan data to match Stripe products

### Create Plans Configuration

`lib/plans-config.ts`:

- Export plan definitions matching Stripe
- Include price IDs for each plan/interval
- Used by pricing page and checkout

**Example:**

```typescript
export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    priceId: 'price_1SL5MCA8kaNOs7rye16c39RS',
    features: ['1 environment', '3 zones', ...]
  },
  basic: {
    name: 'Basic',
    monthly: {
      price: 3.50,
      priceId: 'price_1SL5NJA8kaNOs7rywCjYzPgH'
    },
    annual: {
      price: 42.00,
      priceId: 'price_1SLSWiA8kaNOs7ryllPfcTHx'
    },
    features: [...]
  },
  // ... etc
}
```

**Files:**

- `lib/plans-config.ts` (new)
- `lib/subscription-store.ts` (update)

---

## Phase 9: Environment Configuration

### Environment Variables

Create/update `.env.local`:

```bash
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Stripe Dashboard Configuration

1. ✅ Products already created (from screenshot)
2. **Configure Webhook Endpoint:**

   - URL: `https://your-domain.com/api/stripe/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

3. Copy webhook signing secret to env vars

---

## Phase 10: Testing

### Local Development Testing

1. **Start Stripe CLI:**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

2. **Test Free Plan:**

   - Sign up → Pricing → Select Free
   - Verify organization created
   - Verify subscription record created with status='active'
   - Test creating resources up to limits

3. **Test Paid Plan (Basic):**

   - Pricing → Select Basic Monthly
   - Use test card: `4242 4242 4242 4242`
   - Complete checkout
   - Verify webhook fires
   - Verify subscription created
   - Check Stripe dashboard for subscription

4. **Test Subscription Lifecycle:**

   - Upgrade: Basic → Pro
   - Downgrade: Pro → Basic
   - Cancel subscription
   - View in Customer Portal

5. **Test Limits:**

   - Create resources up to limit
   - Verify blocked when limit reached
   - Upgrade plan
   - Verify can create more resources

### Stripe Test Cards

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires authentication**: `4000 0025 0000 3155`

---

## Implementation Summary

### New Files (20)

1. `supabase/billing-schema-v2.sql` ✅
2. `supabase/seed-billing-data.sql` (update needed)
3. `types/billing.ts` ✅
4. `lib/stripe-helpers.ts`
5. `lib/entitlements.ts`
6. `lib/plans-config.ts`
7. `hooks/useEntitlements.ts`
8. `app/api/stripe/create-checkout-session/route.ts`
9. `app/api/stripe/create-portal-session/route.ts`
10. `app/api/organizations/create/route.ts`
11. `app/api/subscriptions/current/route.ts`
12. `app/api/subscriptions/status/route.ts`
13. `app/api/subscriptions/can-create/route.ts`
14. `app/api/entitlements/check/route.ts`
15. `app/stripe/success/page.tsx`
16. `app/stripe/cancel/page.tsx`
17. `app/settings/billing/page.tsx`
18. `components/billing/SubscriptionManager.tsx`
19. `components/billing/UsageMeter.tsx`
20. `components/billing/PlanComparisonModal.tsx`

### Files to Modify (7)

1. `app/api/stripe/webhook/route.ts`
2. `app/checkout/page.tsx`
3. `app/pricing/page.tsx`
4. `lib/actions/environments.ts`
5. `lib/actions/zones.ts`
6. `lib/actions/organizations.ts`
7. `lib/subscription-store.ts`

### Files to Delete (3)

1. `supabase/billing-schema.sql` (old)
2. `app/api/stripe/create-payment-intent/route.ts`
3. `components/stripe/StripePaymentForm.tsx`

---

## Estimated Timeline

- **Phase 0**: Schema (✅ Complete, needs ID update)
- **Phase 1**: Checkout flow - 2-3 hours
- **Phase 2**: Webhooks - 2-3 hours
- **Phase 3**: Org creation - 1 hour
- **Phase 4**: Query APIs - 1-2 hours
- **Phase 5**: Subscription UI - 2-3 hours
- **Phase 6**: Customer Portal - 1 hour
- **Phase 7**: Enforcement - 2-3 hours
- **Phase 8**: Client updates - 1-2 hours
- **Phase 9**: Configuration - 30 min
- **Phase 10**: Testing - 2-3 hours

**Total: 15-22 hours**

### To-dos

- [ ] Replace Payment Intent flow with Stripe Checkout Sessions for recurring subscriptions
- [ ] Complete webhook handlers to sync Stripe events with Supabase database
- [ ] Link Stripe customers to Supabase organizations and create helper endpoints
- [ ] Build subscription management UI in settings page
- [ ] Integrate Stripe Customer Portal for self-service billing
- [ ] Implement and enforce subscription limits throughout the app
- [ ] Configure Stripe environment variables and price IDs
- [ ] Test complete subscription lifecycle with Stripe test mode