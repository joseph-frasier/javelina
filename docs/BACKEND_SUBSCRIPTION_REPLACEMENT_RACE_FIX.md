# Backend: Subscription Replacement Race Condition Fix

Fixes a correctness bug in `handleSubscriptionDeleted` where an org is incorrectly disabled after a subscription replacement (plan change or re-subscribe), even though it has a perfectly active new subscription.

---

## Problem

When a QA user (or any admin) creates a new subscription for an org that already has an active one — for example, when testing plan changes or re-subscribing — the following webhook sequence occurs:

1. **`customer.subscription.created`** (new sub) → backend creates a new subscription record (upsert on `org_id` overwrites the old `stripe_subscription_id`), then cancels the old subscription in Stripe
2. **`invoice.paid`** (new sub) → sets `organizations.is_active = true` ✅
3. **`customer.subscription.deleted`** (old sub, triggered by step 1's cancellation) → sets `organizations.is_active = false` ❌

If step 3 arrives after step 2 — which is the common case since Stripe fires the deletion asynchronously — the org ends up disabled despite having a perfectly active new subscription.

---

## Root Cause

`handleSubscriptionDeleted` in `src/controllers/stripeController.ts` finds the org using the Stripe **customer ID** (via `getOrgByStripeCustomer`), which is stable and doesn't change when subscriptions are replaced. It then unconditionally sets `organizations.is_active = false` without checking whether the subscription being deleted is still the org's current subscription.

By the time `customer.subscription.deleted` arrives for the old subscription, `createSubscriptionRecord` has already upserted the subscriptions row with the new `stripe_subscription_id`. The old subscription ID no longer exists in the DB — but the org was found via customer ID, so the disable still executes.

```
cancelSubscriptionRecord(old_sub_id)  →  finds no rows (silently no-ops)
organizations.is_active = false        →  executes regardless ← the bug
```

---

## Event Timeline

```
customer.subscription.created (new_sub_id)
  └─ DB: upsert subscriptions ON CONFLICT org_id
         stripe_subscription_id = new_sub_id  (old_sub_id is gone from DB)
  └─ Stripe API: cancel old_sub_id

invoice.paid (new_sub_id)
  └─ DB: subscriptions.status = 'active'
  └─ DB: organizations.is_active = true  ✅

customer.subscription.deleted (old_sub_id)  ← arrives AFTER invoice.paid
  └─ getOrgByStripeCustomer(customer_id)  → finds org (customer ID is stable)
  └─ cancelSubscriptionRecord(old_sub_id) → no-op (row already replaced)
  └─ DB: organizations.is_active = false  ❌  ← race condition
```

---

## The Fix

**File:** `src/controllers/stripeController.ts` (javelina-backend)

In `handleSubscriptionDeleted`, add a guard check immediately after finding the org and before any state mutation. Query the org's current subscription row and bail out if the deleted subscription ID does not match.

```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  const org = await getOrgByStripeCustomer(customerId);
  if (!org) {
    console.log(
      `[handleSubscriptionDeleted] No org found for customer ${customerId}`
    );
    return;
  }

  // Guard: skip if the deleted subscription is no longer the org's current one.
  // This happens when a new subscription was created to replace this one
  // (e.g. plan change or re-subscribe). The new sub's invoice.paid handler
  // already re-enabled the org — disabling here would be incorrect.
  const { data: currentSub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_subscription_id, status")
    .eq("org_id", org.id)
    .single();

  if (currentSub && currentSub.stripe_subscription_id !== subscription.id) {
    console.log(
      `[handleSubscriptionDeleted] Skipping org disable for org ${org.id}: ` +
        `deleted sub ${subscription.id} is not the current sub ` +
        `${currentSub.stripe_subscription_id}. ` +
        `Org already has a replacement subscription.`
    );
    return;
  }

  // Current subscription matches — proceed with normal cancellation
  await cancelSubscriptionRecord(subscription.id);

  const { error: disableError } = await supabaseAdmin
    .from("organizations")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id);

  if (disableError) {
    console.error(
      `[handleSubscriptionDeleted] Failed to disable org ${org.id}:`,
      disableError
    );
  }
}
```

> **Note:** If the `disabled_reason` column has been added per [`BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md`](./BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md), include it in the update:
> ```typescript
> .update({
>   is_active: false,
>   disabled_reason: "subscription_expired",
>   updated_at: new Date().toISOString(),
> })
> ```

---

## No Migration Required

This fix is a pure logic change in the backend controller. The existing schema already provides everything needed:

| Column | Table | Used for |
|--------|-------|---------|
| `stripe_subscription_id` | `subscriptions` | Compare deleted sub ID vs current sub ID |
| `org_id` | `subscriptions` | Unique constraint — one row per org, always reflects current sub |
| `stripe_customer_id` | `organizations` | Stable org lookup (unchanged across sub replacements) |

The `disabled_reason` migration documented in [`BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md`](./BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md) is a separate enhancement task and is not required for this fix.

---

## Edge Cases

| Scenario | Behavior after fix |
|----------|--------------------|
| Normal cancellation (user cancels, grace period ends) | `customer.subscription.deleted` fires for the current sub → guard passes → org is disabled ✅ |
| Plan change / re-subscribe | `customer.subscription.deleted` fires for the replaced sub → guard skips → org stays enabled ✅ |
| Immediate cancellation (no `invoice.paid` yet) | `currentSub.stripe_subscription_id` may still be the old sub ID if `customer.subscription.created` hasn't been processed yet — guard passes → org is disabled (correct, payment never succeeded) ✅ |
| No subscription row in DB | `currentSub` is `null` → guard is skipped → proceeds to disable org (safe default) ✅ |
| Deleted sub ID matches current sub ID | Guard passes → normal disable flow ✅ |

---

## Relationship to `disabled_reason` Work

[`BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md`](./BACKEND_SUBSCRIPTION_EXPIRY_ORG_BLOCKING.md) documents a separate planned enhancement to add a `disabled_reason` column to distinguish admin-disabled vs subscription-expired orgs. The two changes are independent:

- **This fix** addresses a **correctness problem**: orgs being disabled when they have an active replacement subscription.
- **`disabled_reason`** addresses a **UX problem**: the frontend cannot tell why an org was disabled.

This fix should be deployed first as it prevents incorrect data. The `disabled_reason` work can follow as a separate PR.

---

## Files Changed

| File | Repo | Change |
|------|------|--------|
| `src/controllers/stripeController.ts` | javelina-backend | Add guard check in `handleSubscriptionDeleted` before org disable |

---

## Testing Checklist

- [ ] **Normal cancellation**: user cancels → grace period ends → `customer.subscription.deleted` for current sub → org is disabled (`is_active = false`)
- [ ] **Re-subscribe race**: `customer.subscription.created` then `invoice.paid` then `customer.subscription.deleted` for old sub → org remains enabled (`is_active = true`)
- [ ] **Plan change race**: same as re-subscribe — new sub replaces old → org stays enabled after old sub deletion event
- [ ] **Immediate cancel (no payment)**: `customer.subscription.created` → `customer.subscription.deleted` before `invoice.paid` → org is disabled
- [ ] **No subscription row**: org with no subscriptions record → deletion event → org is disabled (safe default, no crash)
- [ ] **Log output**: skipped deletions produce a `[handleSubscriptionDeleted] Skipping org disable` log entry with both sub IDs
- [ ] No regression on `invoice.paid` re-enabling legitimately disabled orgs
- [ ] No regression on existing `cancelSubscriptionRecord` behavior
