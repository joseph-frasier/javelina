# Business Plans on /pricing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot `business_starter` and `business_pro` from the standalone `/storefront` page to first-class plans on `/pricing`, and tear down all storefront scaffolding.

**Architecture:** Add two rows to the `plans` table with a new `metadata.product_line = "business"` marker. Frontend filters `/pricing` sections by `productLine`. Backend plan-tier resolution is fixed so both codes explicit-map to the `starter` LaunchDarkly tier (not `business` via substring match). Storefront page, tables, controller, routes, webhook branches, and LD flag reads are all deleted in the same change.

**Tech Stack:** Next.js (App Router) / TypeScript / Tailwind / Express / Supabase Postgres / Stripe / LaunchDarkly

**Spec:** `javelina/docs/superpowers/specs/2026-04-22-business-plans-on-pricing-design.md`

**Branches (already created, no upstream):**
- `javelina` → `feat/business-plans-on-pricing`
- `javelina-backend` → `feat/business-plans-on-pricing`

---

## ⚠️ Migration Application Policy

**Every task that produces a migration file MUST stop after writing it.** Do NOT:
- Call `mcp__plugin_supabase_supabase__apply_migration`
- Run `supabase db push`, `supabase migration up`, or any equivalent
- Execute DDL via `mcp__plugin_supabase_supabase__execute_sql`
- Dispatch a subagent whose prompt instructs it to apply migrations

If validation appears to require running a migration, stop and hand the task back to Seth.

---

## File Structure

**New files:**
- `javelina/supabase/migrations/20260422000000_add_business_plans.sql`
- `javelina/supabase/migrations/20260422000001_drop_storefront_tables.sql`

**Modified files (frontend — `javelina`):**
- `lib/hooks/usePlanLimits.ts` — fix `getPlanTier()` explicit match for new codes
- `lib/plans-config.ts` — add `productLine` to `Plan`, `BUSINESS_PLAN_FEATURES` map, use it in `buildFeaturesList()`
- `app/pricing/PricingContent.tsx` — add "Business Services" section; filter existing sections by `productLine`
- `components/layout/Header.tsx` — remove Storefront nav link (and `showBusinessProducts` import)
- `app/settings/page.tsx` — remove "Business Services" card and storefront subscription state/handlers
- `lib/hooks/useFeatureFlags.ts` — remove `showBusinessProducts`, `showBusinessStarter`, `showBusinessPro` fields and their flag key constants
- `lib/api-client.ts` — delete `storefrontApi`
- `components/layout/ConditionalLayout.tsx` — remove `/storefront` from `isPricingOrCheckout`
- `__tests__/lib/hooks/usePlanLimits.test.ts` (or similar existing path) — new tests for tier mapping

**Deleted files (frontend):**
- `app/storefront/page.tsx` and the `app/storefront` directory

**Modified files (backend — `javelina-backend`):**
- `src/utils/plan-limits.ts` — fix `getPlanTier()` explicit match
- `src/controllers/stripeController.ts` — add codes to `ALLOWED_PURCHASE_PLANS`; remove storefront branches from webhook handlers and storefront imports
- `src/routes/index.ts` — remove `storefrontRoutes` import and mount
- `src/__tests__/utils/plan-limits.test.ts` (or similar existing path) — new tests for tier mapping

**Deleted files (backend):**
- `src/controllers/storefrontController.ts`
- `src/routes/storefront.ts`

---

## Phase 1 — Create migrations (DO NOT APPLY)

### Task 1: Create migration to add business plans

**Files:**
- Create: `javelina/supabase/migrations/20260422000000_add_business_plans.sql`

- [ ] **Step 1: Write the migration file**

File contents:

```sql
-- Add business_starter and business_pro plans to the plans table.
-- Both plans grant starter-tier LaunchDarkly org limits; tier mapping is
-- enforced in code (javelina/lib/hooks/usePlanLimits.ts and
-- javelina-backend/src/utils/plan-limits.ts).
-- Stripe product and price IDs reuse IDs created for the prior storefront setup.
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

- [ ] **Step 2: DO NOT apply the migration**

Do not call any apply/push/exec tool. Seth applies migrations manually. Move on.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add supabase/migrations/20260422000000_add_business_plans.sql
git commit -m "feat(plans): add business_starter and business_pro migration (not applied)"
```

---

### Task 2: Create migration to drop storefront tables

**Files:**
- Create: `javelina/supabase/migrations/20260422000001_drop_storefront_tables.sql`

- [ ] **Step 1: Write the migration file**

File contents:

```sql
-- Drop the standalone storefront tables.
-- business_starter and business_pro have been migrated to the plans table
-- via 20260422000000_add_business_plans.sql.
-- NOTE for Seth: apply this migration on dev and qa branches only. The main
-- branch never received the storefront tables, so applying there will no-op
-- (the IF EXISTS guards make it safe either way).
DROP TABLE IF EXISTS public.storefront_subscriptions;
DROP TABLE IF EXISTS public.storefront_products;
```

- [ ] **Step 2: DO NOT apply the migration**

Do not call any apply/push/exec tool. Seth applies migrations manually.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add supabase/migrations/20260422000001_drop_storefront_tables.sql
git commit -m "chore(storefront): drop storefront tables migration (not applied)"
```

---

## Phase 2 — Fix plan-tier mapping (correctness blocker)

Both frontend and backend have a `getPlanTier()` that uses substring matching. `business_starter` and `business_pro` both contain `"business"` (and `business_pro` also contains `"pro"`), so without an explicit override they resolve to the wrong LaunchDarkly tier flag and orgs would get the wrong limits. This phase fixes both before anything else uses the new codes.

### Task 3: Add frontend tier-mapping tests

**Files:**
- Create or modify: `javelina/__tests__/lib/hooks/usePlanLimits.test.ts`

If an existing test file for `usePlanLimits.ts` exists under `javelina/__tests__/` or adjacent to the source file, add the new tests to it. Otherwise create a new file at `javelina/__tests__/lib/hooks/usePlanLimits.test.ts`.

- [ ] **Step 1: Confirm the test location and framework**

```bash
cd javelina
find . -type f -name "*.test.*" -not -path "./node_modules/*" | head
grep -l "usePlanLimits" $(find . -type f -name "*.test.*" -not -path "./node_modules/*") 2>/dev/null
cat package.json | grep -E "jest|vitest|\"test\""
```

Use whichever runner the project already uses. If no test file exists for `usePlanLimits`, create one.

- [ ] **Step 2: Write the failing tests**

Add to the appropriate test file (only the new cases shown — do not remove existing tests):

```ts
import { getPlanTier } from '@/lib/hooks/usePlanLimits';

describe('getPlanTier — business-line plans resolve to starter', () => {
  it('maps business_starter to starter tier', () => {
    expect(getPlanTier('business_starter')).toBe('starter');
  });

  it('maps business_pro to starter tier', () => {
    expect(getPlanTier('business_pro')).toBe('starter');
  });

  it('still maps business to business tier', () => {
    expect(getPlanTier('business')).toBe('business');
  });

  it('still maps premium_lifetime to business tier', () => {
    expect(getPlanTier('premium_lifetime')).toBe('business');
  });

  it('still maps pro to pro tier', () => {
    expect(getPlanTier('pro')).toBe('pro');
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

Run the project's test command filtered to this file, e.g.:

```bash
cd javelina
npx jest __tests__/lib/hooks/usePlanLimits.test.ts
# or: npx vitest run __tests__/lib/hooks/usePlanLimits.test.ts
```

Expected: the two new `business_starter` / `business_pro` cases FAIL (both currently map to `"business"`).

- [ ] **Step 4: Commit**

```bash
cd javelina
git add __tests__/
git commit -m "test(plans): expect business_starter/pro to map to starter tier"
```

---

### Task 4: Fix `getPlanTier()` in frontend `usePlanLimits.ts`

**Files:**
- Modify: `javelina/lib/hooks/usePlanLimits.ts:48-68`

- [ ] **Step 1: Replace the `getPlanTier` function body**

Find the existing `getPlanTier` export and replace it with:

```ts
export function getPlanTier(planCode: string | null | undefined): string {
  if (!planCode) return 'starter';
  const lowerCode = planCode.toLowerCase();

  // Business-line plans grant starter-tier org limits.
  // Must be checked BEFORE the "business" substring branch below.
  if (lowerCode === 'business_starter' || lowerCode === 'business_pro') {
    return 'starter';
  }

  // Handle enterprise plans
  if (lowerCode.includes('enterprise')) {
    return 'enterprise';
  }

  // Handle business/premium lifetime (premium_lifetime maps to business)
  if (lowerCode.includes('business') || lowerCode.includes('premium')) {
    return 'business';
  }

  // Handle pro plans
  if (lowerCode.includes('pro')) {
    return 'pro';
  }

  // Default to starter
  return 'starter';
}
```

Note the change: the existing code first-checks `!planCode`, then `enterprise`, then `business/premium`, then `pro`, then `starter`. The only insertion is the new explicit-match block between the null check and the `enterprise` check. Also convert the existing code path to use a single `lowerCode = planCode.toLowerCase()` up front to match (the original uses `planCode.includes(...)` without case-folding, which happens to work for current inputs but is inconsistent — tighten while we're here).

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
cd javelina
npx jest __tests__/lib/hooks/usePlanLimits.test.ts
# or the equivalent vitest command
```

Expected: all new cases PASS. Existing cases still PASS.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add lib/hooks/usePlanLimits.ts
git commit -m "fix(plans): map business_starter/pro to starter tier"
```

---

### Task 5: Add backend tier-mapping tests

**Files:**
- Create or modify: `javelina-backend/src/__tests__/utils/plan-limits.test.ts`

- [ ] **Step 1: Confirm the test location and framework**

```bash
cd javelina-backend
find . -type f -name "*.test.*" -not -path "./node_modules/*" -not -path "./dist/*" | head
grep -l "plan-limits\|getPlanTier" $(find . -type f -name "*.test.*" -not -path "./node_modules/*" -not -path "./dist/*") 2>/dev/null
cat package.json | grep -E "jest|vitest|\"test\""
```

- [ ] **Step 2: Write the failing tests**

Add to the appropriate file (or create a new one at `src/__tests__/utils/plan-limits.test.ts`):

```ts
import { getPlanTier } from '../../utils/plan-limits';

describe('getPlanTier — business-line plans resolve to starter', () => {
  it('maps business_starter to starter tier', () => {
    expect(getPlanTier('business_starter')).toBe('starter');
  });

  it('maps business_pro to starter tier', () => {
    expect(getPlanTier('business_pro')).toBe('starter');
  });

  it('still maps business to business tier', () => {
    expect(getPlanTier('business')).toBe('business');
  });

  it('still maps premium_lifetime to business tier', () => {
    expect(getPlanTier('premium_lifetime')).toBe('business');
  });

  it('still maps pro to pro tier', () => {
    expect(getPlanTier('pro')).toBe('pro');
  });
});
```

- [ ] **Step 3: Run the tests and confirm they fail**

```bash
cd javelina-backend
npx jest src/__tests__/utils/plan-limits.test.ts
```

Expected: new `business_starter` / `business_pro` cases FAIL.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/__tests__/
git commit -m "test(plans): expect business_starter/pro to map to starter tier"
```

---

### Task 6: Fix `getPlanTier()` in backend `plan-limits.ts`

**Files:**
- Modify: `javelina-backend/src/utils/plan-limits.ts:27-40`

- [ ] **Step 1: Replace the `getPlanTier` function body**

Replace the existing `getPlanTier` export with:

```ts
export function getPlanTier(planCode: string | null | undefined): string {
  if (!planCode) return "starter";

  const lowerCode = planCode.toLowerCase();

  // Business-line plans grant starter-tier org limits.
  // Must be checked BEFORE the "business" substring branch below.
  if (lowerCode === "business_starter" || lowerCode === "business_pro") {
    return "starter";
  }

  if (lowerCode.includes("business") || lowerCode.includes("premium")) {
    return "business";
  }
  if (lowerCode.includes("pro")) {
    return "pro";
  }

  return "starter";
}
```

- [ ] **Step 2: Run the tests and confirm they pass**

```bash
cd javelina-backend
npx jest src/__tests__/utils/plan-limits.test.ts
```

Expected: all cases PASS.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/utils/plan-limits.ts
git commit -m "fix(plans): map business_starter/pro to starter tier"
```

---

## Phase 3 — Backend plan allowlist

### Task 7: Add business plans to `ALLOWED_PURCHASE_PLANS`

**Files:**
- Modify: `javelina-backend/src/controllers/stripeController.ts:51`

- [ ] **Step 1: Update the allowlist constant**

Find (line 51):

```ts
const ALLOWED_PURCHASE_PLANS = ['starter', 'starter_lifetime', 'pro', 'pro_lifetime', 'business', 'premium_lifetime'];
```

Replace with:

```ts
const ALLOWED_PURCHASE_PLANS = [
  'starter',
  'starter_lifetime',
  'pro',
  'pro_lifetime',
  'business',
  'premium_lifetime',
  'business_starter',
  'business_pro',
];
```

Leave `ALLOWED_SUBSCRIPTION_CHANGES` on line 53 **unchanged** — cross-product-line subscription changes remain blocked for MVP.

- [ ] **Step 2: Verify no other changes are needed in this file (yet)**

Storefront branches will be removed in Phase 5. For now, leave them alone so the controller still compiles.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/controllers/stripeController.ts
git commit -m "feat(plans): allow business_starter and business_pro for org purchase"
```

---

## Phase 4 — Add business plans to `/pricing`

### Task 8: Extend `Plan` interface with `productLine`

**Files:**
- Modify: `javelina/lib/plans-config.ts:25-49` (interface) and `:74-153` (`convertDbPlanToPlan`)

- [ ] **Step 1: Add `productLine` to the `Plan` interface**

Find the `Plan` interface and add the field after `description`:

```ts
export interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  productLine: 'dns' | 'business';
  popular?: boolean;
  monthly?: PlanPrice;
  annual?: PlanPrice;
  features: PlanFeature[];
  limits: {
    zones: number;
    dnsRecords: number;
    teamMembers: number;
  };
  booleanFeatures: {
    apiAccess: boolean;
    advancedAnalytics: boolean;
    prioritySupport: boolean;
    auditLogs: boolean;
    customRoles: boolean;
    sso: boolean;
    bulkOperations: boolean;
    exportData: boolean;
  };
}
```

- [ ] **Step 2: Extend `DbPlan['metadata']` type to include `product_line`**

Find the `DbPlan` interface and update `metadata`:

```ts
interface DbPlan {
  id: string;
  code: string;
  name: string;
  billing_interval: 'month' | 'year' | null;
  metadata: {
    price: number;
    price_id: string;
    description?: string;
    contact_sales?: boolean;
    product_line?: 'dns' | 'business';
  };
  entitlements?: Array<{
    key: string;
    value: string;
    value_type: 'boolean' | 'numeric' | 'text';
  }>;
}
```

- [ ] **Step 3: Populate `productLine` in `convertDbPlanToPlan`**

Inside the `plans.map(dbPlan => { ... })` in `convertDbPlanToPlan`, add `productLine` to the `Plan` object assembly:

```ts
const plan: Plan = {
  id: baseCode,
  code: dbPlan.code,
  name: dbPlan.name,
  description: dbPlan.metadata?.description || '',
  productLine: dbPlan.metadata?.product_line ?? 'dns',
  popular: baseCode === 'pro_lifetime' || baseCode === 'pro',
  // ... rest unchanged
};
```

- [ ] **Step 4: Add `productLine: 'dns'` to every entry in `FALLBACK_PLANS`**

In `FALLBACK_PLANS` (the `starter_lifetime`, `pro_lifetime`, `premium_lifetime`, `enterprise_lifetime` entries starting around line 308), add `productLine: 'dns',` on each entry, placed after `description`. Example for the first entry:

```ts
{
  id: 'starter_lifetime',
  code: 'starter_lifetime',
  name: 'Starter Lifetime',
  description: 'Perfect for small projects and testing',
  productLine: 'dns',
  popular: false,
  // ...
},
```

Do this for all four fallback entries.

- [ ] **Step 5: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no new errors. If existing (unrelated) errors predate this change, note them but do not fix — scope.

- [ ] **Step 6: Commit**

```bash
cd javelina
git add lib/plans-config.ts
git commit -m "feat(plans): add productLine to Plan interface and fallback data"
```

---

### Task 9: Add marketing feature map and use it in `buildFeaturesList`

**Files:**
- Modify: `javelina/lib/plans-config.ts` (insert new constant and update `buildFeaturesList` around line 230)

- [ ] **Step 1: Add the `BUSINESS_PLAN_FEATURES` constant**

Insert this constant above `buildFeaturesList` (just below `HARDCODED_PLAN_LIMITS`):

```ts
/**
 * Marketing feature bullets for business-line plans.
 * These plans are sold as service bundles, so the card shows branded features
 * rather than the auto-generated "1 Organization / 2 Zones / 200 records" lines
 * derived from HARDCODED_PLAN_LIMITS. LaunchDarkly still enforces starter-tier
 * limits at runtime (see getPlanTier in lib/hooks/usePlanLimits.ts).
 */
const BUSINESS_PLAN_FEATURES: Record<string, string[]> = {
  business_starter: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Website Hosting (1–3 page site)',
    'Business Email',
    'Fully Managed Business Website',
  ],
  business_pro: [
    'Domain Registration',
    'SSL Certificates',
    'Javelina DNS',
    'Microsoft 365 Email',
    'Business Website (1–5 pages)',
    'Custom AI Agent',
  ],
};
```

- [ ] **Step 2: Short-circuit `buildFeaturesList` for business plans**

Find the `buildFeaturesList` function. Add an early return at the top, before the `const limits = HARDCODED_PLAN_LIMITS[planId];` line:

```ts
function buildFeaturesList(planId: string, entitlements: Map<string, string>): PlanFeature[] {
  // Business-line plans use a curated marketing feature list instead of
  // auto-generating from HARDCODED_PLAN_LIMITS.
  if (BUSINESS_PLAN_FEATURES[planId]) {
    return BUSINESS_PLAN_FEATURES[planId].map((name) => ({ name, included: true }));
  }

  const features: PlanFeature[] = [];
  const limits = HARDCODED_PLAN_LIMITS[planId];

  if (!limits) {
    return features;
  }

  // ...rest of the existing function unchanged
```

Keep the rest of `buildFeaturesList` unchanged.

- [ ] **Step 3: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd javelina
git add lib/plans-config.ts
git commit -m "feat(plans): add marketing features for business_starter/pro"
```

---

### Task 10: Add "Business Services" section to `/pricing`

**Files:**
- Modify: `javelina/app/pricing/PricingContent.tsx` (insert new section around line 179, before "Monthly Subscription Plans Section")

- [ ] **Step 1: Add Business Services section JSX**

In `PricingContent.tsx`, immediately **before** the existing `{/* Monthly Subscription Plans Section */}` block (around line 179), insert:

```tsx
        {/* Business Services Section */}
        <section className="mb-12" aria-labelledby="business-services-heading">
          <div className="text-center mb-6">
            <h2 id="business-services-heading" className="text-2xl font-bold text-orange-dark mb-2">
              Business Services
            </h2>
            <p className="text-sm text-gray-slate font-light">
              Complete managed service bundles: DNS, domain, email, website, and more.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {PLANS_CONFIG.filter((plan) => plan.productLine === 'business').map((plan) => {
              const planForCard = {
                id: plan.id,
                name: plan.name,
                price: plan.monthly?.amount || 0,
                priceId: plan.monthly?.priceId || '',
                interval: 'month' as const,
                features: plan.features.filter((f) => f.included).map((f) => f.name),
                description: plan.description,
                popular: plan.popular,
              };
              return (
                <PricingCard
                  key={plan.id}
                  plan={planForCard}
                  highlighted={false}
                  onSelect={handleSelectPlan}
                  hidePrice={false}
                  comingSoon={false}
                />
              );
            })}
          </div>
        </section>
```

- [ ] **Step 2: Filter the Monthly Subscriptions section to exclude business-line plans**

Inside the existing Monthly Subscriptions section (the block starting around line 189 with the grid of three cards), find the filter:

```tsx
{PLANS_CONFIG.filter(plan => {
  // Filter out enterprise
  if (plan.id === 'enterprise') return false;
  // Only include monthly subscription plans (not lifetime) - always show all 3: starter, pro, business
  if (plan.code.includes('_lifetime')) return false;
  return true;
}).map((plan) => {
```

Add a business-line exclusion:

```tsx
{PLANS_CONFIG.filter(plan => {
  // Filter out enterprise
  if (plan.id === 'enterprise') return false;
  // Exclude business-line plans (shown in the Business Services section above)
  if (plan.productLine === 'business') return false;
  // Only include monthly subscription plans (not lifetime) - always show all 3: starter, pro, business
  if (plan.code.includes('_lifetime')) return false;
  return true;
}).map((plan) => {
```

No other sections need filter changes — Lifetime Plans already filters `!plan.code.includes('_lifetime')` out, and business plans are monthly so the existing filter excludes them there anyway.

- [ ] **Step 3: Manual verification**

```bash
cd javelina
npm run dev
```

Open `http://localhost:3000/pricing` in a browser. Expected:
- New "Business Services" section appears **above** "Monthly Subscriptions"
- Two cards render: Javelina Business Starter ($99.88) and Javelina Business Pro ($157.77) with their marketing feature bullets
- Monthly Subscriptions still shows exactly three cards: Starter, Pro, Business (DNS)
- Lifetime Plans section unchanged

Note: the cards will only render after Seth applies Migration 1 to dev, because the plans come from the database. Until then the section will show an empty grid. That's expected — do not block on it.

- [ ] **Step 4: Commit**

```bash
cd javelina
git add app/pricing/PricingContent.tsx
git commit -m "feat(pricing): add Business Services section for bundled plans"
```

---

## Phase 5 — Storefront teardown

Order matters: remove *consumers* of storefront code before removing the code itself, so the build never breaks.

### Task 11: Remove Storefront link from header

**Files:**
- Modify: `javelina/components/layout/Header.tsx:25` and `:190-198` (or wherever the link block lives)

- [ ] **Step 1: Remove `showBusinessProducts` from the destructure on line 25**

Find:

```tsx
const { showDomainsIntegration, showOpenSrsStorefront, showBusinessProducts } = useFeatureFlags();
```

Replace with:

```tsx
const { showDomainsIntegration, showOpenSrsStorefront } = useFeatureFlags();
```

- [ ] **Step 2: Delete the Storefront `<Link>` block**

Find the block starting around line 190 that renders the Storefront nav link, guarded by `{showBusinessProducts && ( ... <Link href="/storefront"> ... )}`. Delete the entire block, including its surrounding parens/curlies.

- [ ] **Step 3: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no errors introduced by this change.

- [ ] **Step 4: Commit**

```bash
cd javelina
git add components/layout/Header.tsx
git commit -m "chore(storefront): remove Storefront link from header"
```

---

### Task 12: Remove "Business Services" card from settings page

**Files:**
- Modify: `javelina/app/settings/page.tsx:12` (import), `:66-80` (state), `:155-180` (handlers), `:636-720` (JSX card)

- [ ] **Step 1: Remove `storefrontApi` from the import**

Find line 12:

```tsx
import { subscriptionsApi, storefrontApi } from '@/lib/api-client';
```

Replace with:

```tsx
import { subscriptionsApi } from '@/lib/api-client';
```

- [ ] **Step 2: Remove storefront state hooks**

Delete these blocks (around lines 66–80):

```tsx
// Storefront subscription states
const [storefrontSubs, setStorefrontSubs] = useState<Array<{
  id: string;
  status: string;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  created_at: string;
  storefront_products: {
    code: string;
    name: string;
    price: number;
    billing_interval: string;
  };
}>>([]);
const [storefrontLoading, setStorefrontLoading] = useState(false);
const [storefrontPortalLoading, setStorefrontPortalLoading] = useState<string | null>(null);
```

- [ ] **Step 3: Remove storefront handlers**

Delete the `fetchStorefrontSubscriptions` and `handleStorefrontPortal` functions (around lines 155–180). If either is referenced elsewhere in the file (e.g., a `useEffect` that calls `fetchStorefrontSubscriptions`), remove those callsites too. Use:

```bash
cd javelina
grep -n "fetchStorefrontSubscriptions\|handleStorefrontPortal" app/settings/page.tsx
```

to find all callsites and delete them.

- [ ] **Step 4: Remove the "Business Services" Card block**

Delete the entire `<Card>` block whose heading is "Business Services" (around lines 636–720, ending at the `</Card>` that precedes the "Organization Subscriptions" card). The next card ("Billing & Subscription" organization subscriptions) remains.

- [ ] **Step 5: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
cd javelina
git add app/settings/page.tsx
git commit -m "chore(storefront): remove Business Services card from settings"
```

---

### Task 13: Remove `/storefront` from ConditionalLayout

**Files:**
- Modify: `javelina/components/layout/ConditionalLayout.tsx:41`

- [ ] **Step 1: Remove the `/storefront` path from the condition**

Find:

```tsx
const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout' || pathname === '/storefront';
```

Replace with:

```tsx
const isPricingOrCheckout = pathname === '/pricing' || pathname === '/checkout';
```

- [ ] **Step 2: Commit**

```bash
cd javelina
git add components/layout/ConditionalLayout.tsx
git commit -m "chore(storefront): drop /storefront from pricing-layout guard"
```

---

### Task 14: Delete `/app/storefront` page

**Files:**
- Delete: `javelina/app/storefront/` (entire directory)

- [ ] **Step 1: Delete the directory**

```bash
cd javelina
rm -rf app/storefront
```

- [ ] **Step 2: Verify no remaining references**

```bash
cd javelina
grep -rn "app/storefront\|from '\.\./storefront'" app components lib 2>/dev/null
```

Expected: no matches.

- [ ] **Step 3: Typecheck and build**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd javelina
git add -A app/storefront
git commit -m "chore(storefront): delete /storefront page"
```

---

### Task 15: Remove storefront flags from `useFeatureFlags`

**Files:**
- Modify: `javelina/lib/hooks/useFeatureFlags.ts:27-31, 47-49, 65-67, 103-105, 152-154` (all storefront flag references)

- [ ] **Step 1: Remove the three interface fields**

Around lines 27–31, find and delete:

```ts
showBusinessProducts: boolean;
// ...
showBusinessStarter: boolean;
// ...
showBusinessPro: boolean;
```

- [ ] **Step 2: Remove the three `DEFAULT_FLAGS` entries**

Around lines 47–49, delete:

```ts
showBusinessProducts: false,
showBusinessStarter: false,
showBusinessPro: false,
```

- [ ] **Step 3: Remove the three `LD_FLAG_KEYS` constants**

Around lines 65–67, delete:

```ts
SHOW_BUSINESS_PRODUCTS: 'store-show-business-products',
SHOW_BUSINESS_STARTER: 'store-show-business-starter',
SHOW_BUSINESS_PRO: 'store-show-business-pro',
```

- [ ] **Step 4: Remove the two places flags are read into the hook return**

Around lines 103–105 (async effect branch) and 152–154 (sync return), delete:

```ts
showBusinessProducts: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRODUCTS] ?? DEFAULT_FLAGS.showBusinessProducts,
showBusinessStarter: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_STARTER] ?? DEFAULT_FLAGS.showBusinessStarter,
showBusinessPro: allFlags[LD_FLAG_KEYS.SHOW_BUSINESS_PRO] ?? DEFAULT_FLAGS.showBusinessPro,
```

in both the `allFlags` branch and the `ldFlags` branch.

- [ ] **Step 5: Verify no remaining consumers**

```bash
cd javelina
grep -rn "showBusinessProducts\|showBusinessStarter\|showBusinessPro\|SHOW_BUSINESS_PRODUCTS\|SHOW_BUSINESS_STARTER\|SHOW_BUSINESS_PRO" app components lib 2>/dev/null
```

Expected: no matches. (All consumers were removed in Tasks 11, 12, 14.)

- [ ] **Step 6: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd javelina
git add lib/hooks/useFeatureFlags.ts
git commit -m "chore(storefront): remove storefront LD flag reads"
```

---

### Task 16: Delete `storefrontApi` from frontend api-client

**Files:**
- Modify: `javelina/lib/api-client.ts:285-316` (or wherever the `storefrontApi` export block lives)

- [ ] **Step 1: Delete the `storefrontApi` export**

Find `export const storefrontApi = { ... };` (starting around line 285) and delete the entire export block through its closing `};`. Do not leave any "// removed" comments or stubs.

- [ ] **Step 2: Verify no remaining imports**

```bash
cd javelina
grep -rn "storefrontApi" app components lib 2>/dev/null
```

Expected: no matches.

- [ ] **Step 3: Typecheck**

```bash
cd javelina
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd javelina
git add lib/api-client.ts
git commit -m "chore(storefront): remove storefrontApi client"
```

---

### Task 17: Remove storefront branches from Stripe webhook handlers

**Files:**
- Modify: `javelina-backend/src/controllers/stripeController.ts:26-30` (imports), `:1778-1782, 1864-1868, 1919-1923, 2343-2347` (branches)

- [ ] **Step 1: Remove storefront imports**

Around lines 26–29, delete these imports:

```ts
processStorefrontCheckout,
processStorefrontSubscriptionUpdate,
processStorefrontSubscriptionDeleted,
isStorefrontSubscription,
```

Also delete the import line:

```ts
} from "./storefrontController";
```

(if `storefrontController` is the only module on that import line). If other names are imported from the same module, verify there aren't any — the storefrontController is slated for deletion in Task 18, so all its named exports must be unreferenced by end of this task.

- [ ] **Step 2: Remove storefront branch in `handleSubscriptionCreated`**

Find (around line 1778):

```ts
// Check if this is a storefront subscription
if (subscription.metadata?.type === "storefront") {
  console.log("ℹ️ Storefront subscription created - handled via checkout.session.completed");
  return;
}
```

Delete the entire `if` block.

- [ ] **Step 3: Remove storefront branch in `handleSubscriptionUpdated`**

Find (around line 1864):

```ts
// Check if this is a storefront subscription
const isStorefront = await isStorefrontSubscription(subscription.id);
if (isStorefront) {
  await processStorefrontSubscriptionUpdate(subscription);
  return;
}
```

Delete the entire block.

- [ ] **Step 4: Remove storefront branch in `handleSubscriptionDeleted`**

Find (around line 1919):

```ts
// Check if this is a storefront subscription
const isStorefront = await isStorefrontSubscription(subscription.id);
if (isStorefront) {
  await processStorefrontSubscriptionDeleted(subscription);
  return;
}
```

Delete the entire block.

- [ ] **Step 5: Remove storefront branch in `checkout.session.completed` handler**

Find (around line 2343):

```ts
// Handle storefront product checkout sessions
if (metadata?.type === "storefront") {
  await processStorefrontCheckout(session);
  return;
}
```

Delete the entire `if` block.

- [ ] **Step 6: Verify no remaining references**

```bash
cd javelina-backend
grep -n "storefront\|isStorefrontSubscription\|processStorefront" src/controllers/stripeController.ts
```

Expected: no matches.

- [ ] **Step 7: Typecheck and test**

```bash
cd javelina-backend
npx tsc --noEmit
npx jest
```

Expected: typecheck clean. Existing tests still pass (the webhook handler changes are pure deletions of already-dead codepaths once storefront tables are gone).

- [ ] **Step 8: Commit**

```bash
cd javelina-backend
git add src/controllers/stripeController.ts
git commit -m "chore(storefront): remove storefront branches from Stripe webhook"
```

---

### Task 18: Delete backend storefront controller and routes

**Files:**
- Delete: `javelina-backend/src/controllers/storefrontController.ts`
- Delete: `javelina-backend/src/routes/storefront.ts`
- Modify: `javelina-backend/src/routes/index.ts:21, 45`

- [ ] **Step 1: Remove storefront import and mount from `routes/index.ts`**

In `src/routes/index.ts`, delete line 21:

```ts
import storefrontRoutes from "./storefront";
```

And delete line 45:

```ts
router.use("/storefront", storefrontRoutes);
```

- [ ] **Step 2: Delete the route file**

```bash
cd javelina-backend
rm src/routes/storefront.ts
```

- [ ] **Step 3: Delete the controller file**

```bash
cd javelina-backend
rm src/controllers/storefrontController.ts
```

- [ ] **Step 4: Verify no remaining references**

```bash
cd javelina-backend
grep -rn "storefrontController\|storefront.ts\|./storefront\"" src 2>/dev/null
```

Expected: no matches.

- [ ] **Step 5: Typecheck and test**

```bash
cd javelina-backend
npx tsc --noEmit
npx jest
```

Expected: typecheck clean, tests pass.

- [ ] **Step 6: Commit**

```bash
cd javelina-backend
git add -A src
git commit -m "chore(storefront): delete storefrontController and routes"
```

---

## Phase 6 — Final verification

### Task 19: Full typecheck and build on both repos

- [ ] **Step 1: Frontend typecheck + build**

```bash
cd javelina
npx tsc --noEmit
npm run build
```

Expected: both succeed. Any errors in unchanged files (preexisting) should be noted but not fixed — out of scope. Errors in files this plan touched are regressions to fix before proceeding.

- [ ] **Step 2: Backend typecheck + test**

```bash
cd javelina-backend
npx tsc --noEmit
npx jest
```

Expected: both succeed.

- [ ] **Step 3: No commit needed unless fixes were required**

If fixes were needed, commit them with a focused message (e.g., `fix(plans): resolve typecheck error introduced by business_pro allowlist`).

---

### Task 20: Confirm migration application policy was respected

- [ ] **Step 1: Confirm both migration files exist on disk**

```bash
cd javelina
ls supabase/migrations/ | grep -E "20260422000000_add_business_plans|20260422000001_drop_storefront_tables"
```

Expected: both files listed.

- [ ] **Step 2: Confirm no migration was applied by this session**

Review the session: no `mcp__plugin_supabase_supabase__apply_migration`, no `mcp__plugin_supabase_supabase__execute_sql` with DDL, no `supabase db push`. If any such call was made, stop and tell Seth immediately.

- [ ] **Step 3: Summary for Seth**

At the end of execution, report to Seth:
- Branch `feat/business-plans-on-pricing` on both repos contains the full pivot
- Migrations `20260422000000_add_business_plans.sql` and `20260422000001_drop_storefront_tables.sql` are in `javelina/supabase/migrations/` awaiting manual application
- Application order: (1) migration 1 to dev → test → migration 2 to dev → promote to qa (both) → promote to main (migration 1 only)
- Branch is not pushed; Seth publishes manually

---

## Summary of commits (expected)

1. `feat(plans): add business_starter and business_pro migration (not applied)`
2. `chore(storefront): drop storefront tables migration (not applied)`
3. `test(plans): expect business_starter/pro to map to starter tier` (frontend)
4. `fix(plans): map business_starter/pro to starter tier` (frontend)
5. `test(plans): expect business_starter/pro to map to starter tier` (backend)
6. `fix(plans): map business_starter/pro to starter tier` (backend)
7. `feat(plans): allow business_starter and business_pro for org purchase`
8. `feat(plans): add productLine to Plan interface and fallback data`
9. `feat(plans): add marketing features for business_starter/pro`
10. `feat(pricing): add Business Services section for bundled plans`
11. `chore(storefront): remove Storefront link from header`
12. `chore(storefront): remove Business Services card from settings`
13. `chore(storefront): drop /storefront from pricing-layout guard`
14. `chore(storefront): delete /storefront page`
15. `chore(storefront): remove storefront LD flag reads`
16. `chore(storefront): remove storefrontApi client`
17. `chore(storefront): remove storefront branches from Stripe webhook`
18. `chore(storefront): delete storefrontController and routes`
