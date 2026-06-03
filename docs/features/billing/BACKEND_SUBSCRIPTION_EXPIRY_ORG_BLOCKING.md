# Backend: Subscription Expiry Organization Blocking

Changes needed on the backend (javelina-backend) to properly support distinguishing subscription-expired orgs from admin-disabled orgs, and to fix bugs in the current flow.

---

## Current State (Verified Against Backend Repo)

The backend **already** handles subscription cancellation by disabling the org and re-enabling on renewal. Here is the actual flow:

### Cancellation Flow (Working)

1. User cancels subscription via Stripe Customer Portal
2. Stripe sets `cancel_at_period_end = true` (subscription stays `active` during grace period)
3. At period end, Stripe fires `customer.subscription.deleted`
4. `handleSubscriptionDeleted` in `src/controllers/stripeController.ts`:
   - Calls `cancelSubscriptionRecord()` → sets `subscriptions.status = 'canceled'`
   - Sets `organizations.is_active = false`
5. `checkOrganizationActive` middleware blocks all write operations with 403

### Renewal Flow (Working)

1. User resubscribes (new subscription or reactivation)
2. Stripe fires `invoice.paid`
3. `handleInvoicePaymentSucceeded` in `src/controllers/stripeController.ts`:
   - Sets `subscriptions.status = 'active'`
   - Clears `pending_plan_code` / `pending_price_id`
   - Sets `organizations.is_active = true`
4. Middleware allows requests again

### Middleware (Working)

`src/middleware/checkOrganizationActive.ts` blocks mutations when `is_active = false` or `pending_plan_code` is set. It applies to all org-scoped write endpoints (zones, DNS records, tags, members, org updates).

### The Problem

**The frontend cannot distinguish between an admin-disabled org and a subscription-expired org.** Both result in `is_active = false`, and the middleware returns the same 403 error:

```json
{ "success": false, "error": "Organization is disabled. Contact support for assistance." }
```

The frontend shows a generic "Organization Disabled" banner with "Contact support" messaging, regardless of whether the org was disabled by an admin (where contacting support is the correct action) or by subscription expiry (where renewing the subscription is the correct action).

---

## Bugs Found

### Bug 1: `invoice.paid` unconditionally re-enables org — overrides admin disable

**File:** `src/controllers/stripeController.ts` (lines 1549-1556)

```typescript
// Re-enable org in case it was disabled due to a prior cancellation
const { error: enableError } = await supabaseAdmin
  .from("organizations")
  .update({
    is_active: true,
    updated_at: new Date().toISOString(),
  })
  .eq("id", existingSubscription.org_id);
```

**Problem:** If a superadmin manually disables an org (e.g., for abuse), and that org happens to have a subscription that renews (Stripe fires `invoice.paid`), this handler unconditionally sets `is_active = true`, overriding the admin's decision.

**Fix:** Before re-enabling, check whether the org was disabled by an admin (not by subscription cancellation). See the `disabled_reason` proposal below.

### Bug 2: `charge.refunded` does not disable the org

**File:** `src/controllers/stripeController.ts` (lines 2174-2219)

```typescript
async function handleChargeRefunded(charge: Stripe.Charge) {
  // ... finds lifetime subscription ...
  // Sets subscriptions.status = 'canceled'
  // Does NOT set organizations.is_active = false
}
```

**Problem:** When a lifetime plan charge is refunded, the subscription is marked as `canceled` but the organization is **not** disabled. The user retains full access despite the refund.

**Fix:** Add the same org-disable logic as `handleSubscriptionDeleted`:

```typescript
if (subscription) {
  // ... existing status update ...

  // Disable org after refund
  await supabaseAdmin
    .from("organizations")
    .update({
      is_active: false,
      disabled_reason: "subscription_expired",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.org_id);
}
```

### Bug 3: Profile endpoint missing `pending_plan_code`

**File:** `src/controllers/usersController.ts` (lines 35-58)

The `GET /api/users/profile` endpoint returns each organization with only `id`, `name`, and `role`. It does **not** include `pending_plan_code`. The frontend auth-store maps `org.pending_plan_code` from the profile response, but it is always `null/undefined` because the backend never sends it.

The Sidebar works around this by individually fetching each org via `GET /api/organizations/:id`, which is wasteful.

**Fix:** Include `pending_plan_code` in the organizations join:

```typescript
const { data: memberships } = await supabaseAdmin
  .from("organization_members")
  .select(`
    role,
    organizations (
      id,
      name,
      pending_plan_code
    )
  `)
  .eq("user_id", userId);
```

---

## Required Changes

### 1. Add `disabled_reason` column to organizations

Add a column that tracks **why** an org was disabled. This is the key change that allows the frontend to show the correct banner.

**Migration:**

```sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS disabled_reason TEXT
    CHECK (disabled_reason IN ('admin_disabled', 'subscription_expired'))
    DEFAULT NULL;

COMMENT ON COLUMN public.organizations.disabled_reason
  IS 'Why the org was disabled: admin_disabled (superadmin action) or subscription_expired (Stripe subscription ended). NULL when org is active.';
```

**Semantics:**
- When `is_active = true`: `disabled_reason` should be `NULL`
- When `is_active = false` and disabled by admin: `disabled_reason = 'admin_disabled'`
- When `is_active = false` and disabled by subscription expiry: `disabled_reason = 'subscription_expired'`

---

### 2. Update webhook handler: `handleSubscriptionDeleted`

**File:** `src/controllers/stripeController.ts`

Set `disabled_reason` when disabling:

```typescript
const { error: disableError } = await supabaseAdmin
  .from("organizations")
  .update({
    is_active: false,
    disabled_reason: "subscription_expired",
    updated_at: new Date().toISOString(),
  })
  .eq("id", orgId);
```

---

### 3. Update webhook handler: `handleInvoicePaymentSucceeded`

**File:** `src/controllers/stripeController.ts`

Only re-enable the org if it was disabled due to subscription expiry (not admin action):

```typescript
// Re-enable org ONLY if it was disabled due to subscription expiry
// Do not override admin-disabled orgs
const { error: enableError } = await supabaseAdmin
  .from("organizations")
  .update({
    is_active: true,
    disabled_reason: null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", existingSubscription.org_id)
  .or("disabled_reason.eq.subscription_expired,disabled_reason.is.null");
```

The `.or()` filter ensures we only re-enable orgs that were disabled due to subscription expiry (or were already active / never disabled). Orgs with `disabled_reason = 'admin_disabled'` are left alone.

Apply this change in **both** places where `is_active: true` is set (existing subscription path ~line 1550 and new subscription path ~line 1581).

---

### 4. Update admin disable/enable endpoints

**File:** `src/controllers/adminController.ts`

**Disable endpoint** (`PUT /api/admin/organizations/:orgId/disable`):

```typescript
const { error: updateError } = await supabaseAdmin
  .from("organizations")
  .update({
    is_active: false,
    disabled_reason: "admin_disabled",
    updated_at: new Date().toISOString(),
  })
  .eq("id", orgId);
```

**Enable endpoint** (`PUT /api/admin/organizations/:orgId/enable`):

```typescript
const { error: updateError } = await supabaseAdmin
  .from("organizations")
  .update({
    is_active: true,
    disabled_reason: null,
    updated_at: new Date().toISOString(),
  })
  .eq("id", orgId);
```

---

### 5. Update middleware 403 response to include `reason`

**File:** `src/middleware/checkOrganizationActive.ts`

Update the middleware to fetch `disabled_reason` and include it in the 403 response:

```typescript
const { data: org, error } = await supabaseAdmin
  .from("organizations")
  .select("is_active, pending_plan_code, disabled_reason")
  .eq("id", orgId)
  .single();

if (!org.is_active) {
  if (org.disabled_reason === "subscription_expired") {
    res.status(403).json({
      error: "Subscription expired",
      reason: "subscription_expired",
      message: "Your subscription is no longer active. Renew your subscription to regain access.",
    });
    return;
  }
  throw new ForbiddenError(
    "Organization is disabled. Contact support for assistance."
  );
}
```

Apply the same change to all middleware variants: `checkZoneOrganizationActive`, `checkRecordOrganizationActive`, `checkTagOrganizationActive`. Each already fetches org data via a join — add `disabled_reason` to the select.

---

### 6. Include `disabled_reason` in org API responses

**File:** `src/controllers/organizationsController.ts`

The `GET /api/organizations/:id` endpoint already uses `select("*")`, so `disabled_reason` will be included automatically once the column is added. No code change needed here.

**Verify:** Ensure any response serialization or filtering does not strip out the new column.

---

### 7. Include `pending_plan_code` and `disabled_reason` in profile response

**File:** `src/controllers/usersController.ts`

```typescript
const { data: memberships } = await supabaseAdmin
  .from("organization_members")
  .select(`
    role,
    organizations (
      id,
      name,
      pending_plan_code,
      is_active,
      disabled_reason
    )
  `)
  .eq("user_id", userId);

const organizations = (memberships || []).map((m: any) => ({
  id: m.organizations.id,
  name: m.organizations.name,
  role: m.role,
  pending_plan_code: m.organizations.pending_plan_code || null,
  is_active: m.organizations.is_active,
  disabled_reason: m.organizations.disabled_reason || null,
}));
```

This allows the Sidebar to show visual indicators without individual org fetches.

---

### 8. Fix `handleChargeRefunded` to disable org

**File:** `src/controllers/stripeController.ts`

After canceling the lifetime subscription, also disable the org:

```typescript
if (subscription) {
  // Existing: cancel subscription status
  const { error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("id", subscription.id);

  // NEW: disable the organization
  if (subscription.org_id) {
    await supabaseAdmin
      .from("organizations")
      .update({
        is_active: false,
        disabled_reason: "subscription_expired",
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.org_id);
  }
}
```

---

## Summary of All Changes

| File | Change |
|------|--------|
| **New migration** | Add `disabled_reason` column to `organizations` |
| `src/controllers/stripeController.ts` | Set `disabled_reason = 'subscription_expired'` in `handleSubscriptionDeleted` |
| `src/controllers/stripeController.ts` | Conditionally re-enable in `handleInvoicePaymentSucceeded` (skip admin-disabled) |
| `src/controllers/stripeController.ts` | Disable org in `handleChargeRefunded` |
| `src/controllers/adminController.ts` | Set `disabled_reason = 'admin_disabled'` in disable; clear in enable |
| `src/middleware/checkOrganizationActive.ts` | Fetch `disabled_reason`; return `reason` in 403 response |
| `src/controllers/usersController.ts` | Include `pending_plan_code`, `is_active`, `disabled_reason` in profile orgs |
| `src/controllers/organizationsController.ts` | No change needed (uses `select("*")`) |

---

## Frontend Impact

Once the backend returns `disabled_reason`, the frontend can:

1. Show a **red** "Organization Disabled" banner when `disabled_reason === 'admin_disabled'` with "Contact support" messaging
2. Show an **amber** "Subscription Expired" banner when `disabled_reason === 'subscription_expired'` with a "Renew Subscription" button
3. The Sidebar can show indicators per-org using data from the profile response

The frontend `api-client.ts` should also add handling for the new 403 response:

```typescript
if (response.status === 403 && data?.reason === 'subscription_expired') {
  throw new ApiError(data.message, response.status, data);
}
```

---

## Data Flow After Changes

```
CANCELLATION FLOW:
1. User cancels → Stripe sets cancel_at_period_end = true (grace period)
2. Period ends → Stripe fires customer.subscription.deleted
3. Backend: subscriptions.status = 'canceled'
4. Backend: organizations.is_active = false, disabled_reason = 'subscription_expired'
5. Middleware: blocks writes, returns 403 { reason: 'subscription_expired' }
6. Frontend: sees disabled_reason, shows "Subscription Expired" banner with renew CTA

RENEWAL FLOW:
1. User resubscribes → Stripe fires invoice.paid
2. Backend: subscriptions.status = 'active'
3. Backend: IF disabled_reason = 'subscription_expired' → is_active = true, disabled_reason = null
4. Backend: IF disabled_reason = 'admin_disabled' → NO CHANGE (admin decision preserved)
5. Middleware: allows requests
6. Frontend: no banner, full access

ADMIN DISABLE FLOW:
1. Superadmin disables org → is_active = false, disabled_reason = 'admin_disabled'
2. Middleware: blocks writes, returns 403 { error: 'Organization is disabled' }
3. Frontend: sees disabled_reason, shows "Disabled by Administrator" banner
4. Subscription renewal does NOT override admin disable
```

---

## Backfill Existing Data

Any organizations that are currently disabled (`is_active = false`) need their `disabled_reason` populated. Run this after the migration:

```sql
-- Orgs disabled due to canceled subscriptions
UPDATE organizations o
SET disabled_reason = 'subscription_expired'
WHERE o.is_active = false
  AND o.disabled_reason IS NULL
  AND EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.org_id = o.id AND s.status = 'canceled'
  );

-- Remaining disabled orgs (assume admin-disabled)
UPDATE organizations o
SET disabled_reason = 'admin_disabled'
WHERE o.is_active = false
  AND o.disabled_reason IS NULL;
```

---

## Testing Checklist

- [ ] New `disabled_reason` column exists on `organizations` table
- [ ] `customer.subscription.deleted` → org disabled with `disabled_reason = 'subscription_expired'`
- [ ] `invoice.paid` → org re-enabled ONLY if `disabled_reason = 'subscription_expired'`
- [ ] `invoice.paid` → org stays disabled if `disabled_reason = 'admin_disabled'`
- [ ] Admin disable → `disabled_reason = 'admin_disabled'`
- [ ] Admin enable → `disabled_reason = null`, `is_active = true`
- [ ] `charge.refunded` (lifetime) → org disabled with `disabled_reason = 'subscription_expired'`
- [ ] 403 response includes `reason: 'subscription_expired'` for expired subscriptions
- [ ] 403 response says "Organization is disabled" for admin-disabled orgs
- [ ] `GET /api/organizations/:id` includes `disabled_reason` in response
- [ ] `GET /api/users/profile` includes `pending_plan_code`, `is_active`, and `disabled_reason` per org
- [ ] Backfill script correctly categorizes existing disabled orgs
- [ ] Existing org data (`pending_plan_code`, `is_active`) not broken by changes
