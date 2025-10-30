# Billing Schema Reference

## Phase 0: Complete ✅

This document provides a quick reference for the billing schema implementation.

---

## Stripe Products & Pricing

### Free Plan
- **Product ID**: `prod_THefRjwMEakPYm`
- **Price**: $0.00/month
- **Price ID**: `price_1SL5MCA8kaNOs7rye16c39RS`

### Basic Plan
- **Product ID**: `prod_THeggCI1HVHeQ9`
- **Monthly**: $3.50/month (`price_1SL5NJA8kaNOs7rywCjYzPgH`)
- **Annual**: $42.00/year (`price_1SLSWiA8kaNOs7ryllPfcTHx`)

### Pro Plan
- **Product ID**: `prod_TI2cDjhyuRaH7R`
- **Monthly**: $6.70/month (`price_1SLSXKA8kaNOs7ryKJ6hCHd5`)
- **Annual**: $80.40/year (`price_1SLSYMA8kaNOs7ryrJU9oOYL`)

### Enterprise Plan
- **Product ID**: `prod_TI2eKuLY9hXIoN`
- **Monthly**: $450.00/month (`price_1SLSZFA8kaNOs7rywWLjhQ8b`)

---

## Plan Codes (for database)

- `free` - Free plan
- `basic_monthly` - Basic (Monthly)
- `basic_annual` - Basic (Annual)
- `pro_monthly` - Pro (Monthly)
- `pro_annual` - Pro (Annual)
- `enterprise_monthly` - Enterprise (Monthly)

---

## Plan Entitlements

| Entitlement | Free | Basic | Pro | Enterprise |
|-------------|------|-------|-----|------------|
| **Environments** | 1 | 3 | 10 | Unlimited |
| **DNS Zones** | 3 | 10 | 50 | Unlimited |
| **DNS Records/Zone** | 100 | 500 | 5,000 | Unlimited |
| **Team Members** | 2 | 5 | 10 | Unlimited |
| **API Access** | ❌ | ✅ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ | ✅ |
| **Audit Logs** | ❌ | ❌ | ✅ | ✅ |
| **Custom Roles** | ❌ | ❌ | ❌ | ✅ |
| **SSO** | ❌ | ❌ | ❌ | ✅ |
| **Bulk Operations** | ❌ | ✅ | ✅ | ✅ |
| **Export Data** | ❌ | ✅ | ✅ | ✅ |

---

## Database Schema Changes

### New Tables Created

1. **plans** - Subscription plans
2. **entitlements** - Available features and limits
3. **plan_entitlements** - Maps entitlements to plans
4. **subscriptions** - Org subscriptions linked to Stripe
5. **subscription_items** - Line items for each subscription
6. **org_entitlement_overrides** - Custom deals per organization

### Modified Existing Tables

#### organizations
- Added `stripe_customer_id TEXT UNIQUE`
- Added `environments_count INTEGER DEFAULT 0`

#### environments
- Added `zones_count INTEGER DEFAULT 0`

---

## Helper Functions Available

### Get Organization Subscription
```sql
SELECT * FROM public.get_org_subscription('org-uuid-here');
```

### Get All Entitlements for Organization
```sql
SELECT * FROM public.get_org_entitlements('org-uuid-here');
```

### Check Specific Entitlement
```sql
SELECT public.check_entitlement('org-uuid-here', 'api_access');
SELECT public.check_entitlement('org-uuid-here', 'environments_limit');
```

### Check if Organization Can Create Resource
```sql
SELECT public.can_create_resource('org-uuid-here', 'environment');
SELECT public.can_create_resource('org-uuid-here', 'zone');
SELECT public.can_create_resource('org-uuid-here', 'member');
```

---

## How to Apply Schema

### Step 1: Run Billing Schema
In Supabase SQL Editor:
```sql
-- Copy and paste contents of supabase/billing-schema-v2.sql
-- Execute
```

### Step 2: Run Seed Data
In Supabase SQL Editor:
```sql
-- Copy and paste contents of supabase/seed-billing-data.sql
-- Execute
```

### Step 3: Verify
```sql
-- Check plans were created
SELECT code, name, billing_interval FROM public.plans;

-- Check entitlements were created
SELECT key FROM public.entitlements ORDER BY key;

-- Check plan entitlements mapping
SELECT 
  e.key as entitlement_key,
  MAX(CASE WHEN p.code = 'free' THEN pe.value END) as free,
  MAX(CASE WHEN p.code = 'basic_monthly' THEN pe.value END) as basic,
  MAX(CASE WHEN p.code = 'pro_monthly' THEN pe.value END) as pro,
  MAX(CASE WHEN p.code = 'enterprise_monthly' THEN pe.value END) as enterprise
FROM public.entitlements e
LEFT JOIN public.plan_entitlements pe ON pe.entitlement_id = e.id
LEFT JOIN public.plans p ON p.id = pe.plan_id
WHERE p.code IN ('free', 'basic_monthly', 'pro_monthly', 'enterprise_monthly')
   OR p.code IS NULL
GROUP BY e.key
ORDER BY e.key;
```

---

## TypeScript Types

All types are available in `types/billing.ts`:

```typescript
import { Plan, Entitlement, Subscription, PlanCode } from '@/types/billing';
```

Key types:
- `Plan` - Plan with metadata
- `PlanCode` - Union of valid plan codes
- `Entitlement` - Entitlement definition
- `Subscription` - Organization subscription
- `OrgSubscriptionDetails` - Result from get_org_subscription()
- `OrgEntitlement` - Result from get_org_entitlements()

---

## Next Steps

**Phase 1**: Implement Stripe Checkout Session flow
- Create checkout session API
- Update pricing page
- Add success/cancel pages
- Test with Stripe test mode

---

## Notes

- All plans use **Stripe test mode** IDs
- Schema is **idempotent** - safe to run multiple times
- RLS policies are configured for security
- All foreign keys and indexes are in place
- Cached counts (`environments_count`, `zones_count`) ready for use

