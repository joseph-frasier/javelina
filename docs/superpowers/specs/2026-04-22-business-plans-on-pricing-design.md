# Business Plans on /pricing — Design Spec

**Date:** 2026-04-22
**Supersedes:** `2026-04-15-business-products-storefront-design.md`
**Frontend repo:** `javelina` (branch: `dev`)
**Backend repo:** `javelina-backend` (branch: `dev`)
**Supabase project:** `javelina` (id: `uhkwiqupiekatbtxxaky`)
**Supabase branches affected:** `dev` (`ipfsrbxjgewhdcvonrbo`), `qa` (`grcfrhmmlyhpjhkcsmnv`), `main` (`uhkwiqupiekatbtxxaky`)

---

## ⚠️ Migration Application Policy

**DO NOT APPLY MIGRATIONS.** This applies to every implementer, subagent, and automation step.

Migration files must be created on disk **only**. Seth applies them manually to the correct Supabase branches when ready. No step in the implementation plan may:

- Call `mcp__plugin_supabase_supabase__apply_migration`
- Run `supabase db push`, `supabase migration up`, or equivalent
- Execute DDL via `mcp__plugin_supabase_supabase__execute_sql`
- Instruct any subagent to perform any of the above

If an executing agent believes a migration needs to run to validate its work, it should stop and ask Seth.

---

## Overview

Pivot the two products built for `/storefront` (`business_starter`, `business_pro`) into first-class entries on the existing `/pricing` page. Purchasing either plan will create a Javelina org bound to **starter-tier** LaunchDarkly limits. The standalone `/storefront` page, its dedicated tables, its backend controller, and its LD flag reads are removed in the same change.

This is a minimum-scope pivot. Features promised in the product descriptions (managed website, M365 email, custom AI agent, domain registration) remain out of scope and will be fulfilled manually by Irongrove ops out-of-band; no in-app onboarding flow is added.

## Scope

**In scope:**
- Add `business_starter` and `business_pro` rows to the `plans` table
- Render both plans in a new "Business Services" section on `/pricing` above existing DNS plans
- Allow org creation via these plans through the standard `/pricing` → `AddOrganizationModal` → `/checkout` flow
- Enforce **starter-tier** org limits for orgs created with either plan
- Fix `getPlanTier()` in both frontend and backend so `business_starter` / `business_pro` map to `starter` (not `business`)
- Tear down the `/storefront` page, `storefront_products` / `storefront_subscriptions` tables, storefront backend controller + routes, storefront webhook branching, and storefront LD flag reads

**Out of scope:**
- Cross-product-line upgrade/downgrade (e.g., `business_starter` → `pro`). Blocked in `ALLOWED_SUBSCRIPTION_CHANGES`; to be designed later.
- In-app delivery of "managed website," "M365 email," "AI agent," "domain registration" bundle features. Fulfilled manually by ops.
- Any dedicated post-checkout onboarding page for bundle features.
- Deletion or deprecation of the existing `starter`, `pro`, `business` DNS plans or their lifetime variants. All remain active and visible.

## Product Line Model

Plans on `/pricing` are categorized by a new `metadata.product_line` field:

| `product_line` | Plans | What it is |
|---|---|---|
| `"dns"` (or absent) | `starter`, `pro`, `business`, `starter_lifetime`, `pro_lifetime`, `premium_lifetime`, `enterprise_lifetime` | Javelina DNS plans |
| `"business"` | `business_starter`, `business_pro` | Managed business service bundles (DNS + website + email + more) |

`business_starter` and `business_pro` resolve to the **starter LD tier** for limit enforcement. `product_line` is a display/categorization concern, independent of tier.

## Database

### Live schema (verified via Supabase MCP against dev branch `ipfsrbxjgewhdcvonrbo`)

`public.plans` columns:
- `id uuid PK default gen_random_uuid()`
- `code text UNIQUE NOT NULL`
- `name text NOT NULL`
- `stripe_product_id text`
- `billing_interval text` (nullable; `null` = lifetime)
- `metadata jsonb default '{}'::jsonb` (holds `price`, `price_id`, `description`, `contact_sales?`)
- `is_active boolean default true`
- `created_at`, `updated_at timestamptz default now()`

Note: there is **no** `stripe_price_id` column on `plans`; price IDs live in `metadata.price_id`. There is no `plan_entitlements` table; LaunchDarkly is the sole source of truth for limits.

### Migration 1 — add business plans

**File:** `YYYYMMDD_add_business_plans.sql` (use the date the migration is authored)

**Status:** safe on dev, qa, main.

**DO NOT APPLY.**

```sql
INSERT INTO public.plans (code, name, stripe_product_id, billing_interval, metadata, is_active) VALUES
  (
    'business_starter',
    'Javelina Business Starter',
    'prod_ULafV9yW6WDGiX',
    'month',
    jsonb_build_object(
      'price', 99.88,
      'price_id', 'price_1TMtU8A8kaNOs7ry5ullsdvX',
      'description', 'Everything you need to get your business online with a fully managed website.',
      'product_line', 'business'
    ),
    true
  ),
  (
    'business_pro',
    'Javelina Business Pro',
    'prod_ULafe1twEgo78B',
    'month',
    jsonb_build_object(
      'price', 157.77,
      'price_id', 'price_1TMtUWA8kaNOs7rywKdXi6AA',
      'description', 'Premium business package with Microsoft 365 email and a custom AI agent.',
      'product_line', 'business'
    ),
    true
  )
ON CONFLICT (code) DO NOTHING;
```

Stripe IDs were previously created for the storefront and are reused as-is (sourced from `20260416000000_add_stripe_ids_to_storefront_products.sql`).

### Migration 2 — drop storefront tables

**File:** `YYYYMMDD_drop_storefront_tables.sql`

**Status:** dev and qa only. Main has no storefront tables.

**DO NOT APPLY.**

```sql
DROP TABLE IF EXISTS public.storefront_subscriptions;
DROP TABLE IF EXISTS public.storefront_products;
```

### Application reference (for Seth, informational)

- Migration 1: dev, qa, main
- Migration 2: dev, qa only

## Frontend (`javelina`)

### `/pricing` layout

Top-to-bottom on `app/pricing/PricingContent.tsx`:

1. Existing hero
2. **NEW** "Business Services" section (2-column grid):
   - Heading: "Business Services"
   - Subheading: "Complete managed service bundles: DNS, domain, email, website, and more."
   - Cards: `business_starter`, `business_pro`
   - Uses existing `PricingCard` component unchanged
3. Existing "Monthly Subscriptions" section (filters to `product_line === 'dns'` or missing, excluding lifetime)
4. Existing "Lifetime Plans" section (unchanged filter)
5. Existing FAQ

### `lib/plans-config.ts` changes

- Extend `Plan` interface with `productLine: 'dns' | 'business'`. In `convertDbPlanToPlan()`, populate from `dbPlan.metadata.product_line`, defaulting to `'dns'` when absent.
- **Do NOT add** `business_starter` / `business_pro` to `HARDCODED_PLAN_LIMITS`. That map is display-only and unused for enforcement. The Business Services cards use a marketing feature list instead (see below).
- Add a small static map `BUSINESS_PLAN_FEATURES: Record<'business_starter' | 'business_pro', string[]>` with the marketing bullets:
  - `business_starter`: `["Domain Registration", "SSL Certificates", "Javelina DNS", "Website Hosting (1–3 page site)", "Business Email", "Fully Managed Business Website"]`
  - `business_pro`: `["Domain Registration", "SSL Certificates", "Javelina DNS", "Microsoft 365 Email", "Business Website (1–5 pages)", "Custom AI Agent"]`
- In `buildFeaturesList()` (or a sibling), when `planId` is one of the two business plans, return the `BUSINESS_PLAN_FEATURES` entries as `PlanFeature[]` with `included: true` and skip the auto-generated "1 Organization / 2 Zones" bullets.

### `lib/hooks/usePlanLimits.ts` — `getPlanTier()` fix

Before any substring matching, explicit-match the two new codes so they do **not** fall through to the "business" branch:

```ts
export function getPlanTier(planCode: string | null | undefined): string {
  if (!planCode) return 'starter';
  const lowerCode = planCode.toLowerCase();
  // Business-line plans grant starter-tier org limits
  if (lowerCode === 'business_starter' || lowerCode === 'business_pro') return 'starter';
  if (lowerCode.includes('enterprise')) return 'enterprise';
  if (lowerCode.includes('business') || lowerCode.includes('premium')) return 'business';
  if (lowerCode.includes('pro')) return 'pro';
  return 'starter';
}
```

### `PricingContent.tsx` changes

- Use `plan.productLine` to partition plans into the three sections
- `handleSelectPlan` / `handleOrgCreated` unchanged — both new plans are monthly subscriptions with a `priceId`, so they flow through the existing `/checkout?org_id=...&plan_code=...&price_id=...&...` URL

### Storefront teardown (frontend)

- Delete `app/storefront/page.tsx` and the `app/storefront` directory
- Remove the "Storefront" link from the main header
- Remove `showBusinessProducts`, `showBusinessStarter`, `showBusinessPro` reads from `lib/hooks/useFeatureFlags.ts` and any components that consumed them
- Delete storefront-related API client methods
- The LD flags themselves (`store-show-business-products` etc.) are left in LaunchDarkly — only the code references are removed

### Optional LD flag

- `hide-business-section` (boolean, default `false`) — if needed to hide the Business Services section on `/pricing`, following the existing `hideProPlans` / `hideBusinessPlans` pattern. Only wire this up if needed; don't add unused plumbing.

## Backend (`javelina-backend`)

### `src/utils/plan-limits.ts` — `getPlanTier()` fix

Same explicit-match fix as frontend, applied first so substring checks don't mis-classify:

```ts
export function getPlanTier(planCode: string | null | undefined): string {
  if (!planCode) return 'starter';
  const lowerCode = planCode.toLowerCase();
  if (lowerCode === 'business_starter' || lowerCode === 'business_pro') return 'starter';
  if (lowerCode.includes('business') || lowerCode.includes('premium')) return 'business';
  if (lowerCode.includes('pro')) return 'pro';
  return 'starter';
}
```

This makes `plan-limits-starter` the LD flag consulted for these orgs — no new LD flag needed.

### `src/controllers/stripeController.ts` changes

- `ALLOWED_PURCHASE_PLANS` += `'business_starter'`, `'business_pro'`
- `ALLOWED_SUBSCRIPTION_CHANGES` **unchanged** (remains `['starter', 'pro', 'business']`). Cross-product-line changes are out of scope for MVP.
- No other changes. `getPlanBillingType()` correctly detects `month` interval → `subscription` billing type; existing checkout session creation, webhook handling, and subscription row creation paths all work unchanged.

### Storefront teardown (backend)

- Delete `src/controllers/storefrontController.ts`
- Delete `src/routes/storefront.ts`
- Remove the storefront route mount from `src/routes/index.ts`
- In the Stripe webhook handler, remove the branch that routes events to `storefront_subscriptions`. Subscription-event routing reverts to its pre-storefront behavior (one target: `subscriptions`).
- Delete any storefront-specific types/helpers that are no longer referenced

## Testing

Manual end-to-end on dev after Seth applies Migration 1:

1. `/pricing` renders Business Services section above Monthly Subscriptions, with two cards.
2. Click "Subscribe" on `business_starter` while authenticated → `AddOrganizationModal` opens → create org → redirected to `/checkout` with correct `plan_code=business_starter`, `price_id=price_1TMtU8A8kaNOs7ry5ullsdvX`.
3. Complete Stripe test checkout → webhook creates `subscriptions` row bound to the new org with `plan_code=business_starter`, status `active`.
4. Log into the new org and confirm UI enforces starter limits (2 zones, 200 records, 1 user) — the org attempts that would exceed those limits should be blocked.
5. Repeat steps 2–4 with `business_pro`.
6. After Seth applies Migration 2: visiting `/storefront` returns 404; the "Storefront" header link is gone; the backend `/api/storefront/*` routes return 404.

Unit check (recommended): add a test asserting `getPlanTier('business_starter') === 'starter'` and `getPlanTier('business_pro') === 'starter'` in both the frontend and backend test suites.

## Rollout

1. Seth applies **Migration 1** to the `dev` Supabase branch.
2. Seth validates `/pricing`, checkout, and starter-limit enforcement on dev.
3. Seth applies **Migration 2** to `dev` (storefront teardown).
4. Promote to `qa` → Seth applies Migrations 1 + 2 to qa.
5. Promote to `main` → Seth applies **Migration 1 only** to main (no storefront tables exist there).

## Notes

- The four LD flags created for storefront visibility (`store-show-business-products`, `store-show-business-starter`, `store-show-business-pro`) can be archived in LaunchDarkly after code references are removed. Not required by this spec.
- The previous storefront design doc (`2026-04-15-business-products-storefront-design.md`) is superseded but retained for historical context.
