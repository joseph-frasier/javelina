# Payment Incomplete Banner — Frontend Logic & Backend Alignment

## Purpose

This document describes exactly how the frontend decides whether to show the
"Payment Incomplete" banner, so the backend team can verify the
`/api/subscriptions/current` endpoint returns the correct shape and values.

---

## 1. Data Fetch (Server Components)

Both `app/organization/[orgId]/page.tsx` and `app/zone/[id]/page.tsx` call the
same endpoint at render time:

```
GET /api/subscriptions/current?org_id={orgId}
Cookie: javelina_session={sessionCookie}
```

The frontend extracts the subscription status like this:

```ts
const subResult = await subResponse.json();
subscriptionStatus = subResult?.subscription?.status ?? null;
```

**Expected response shape:**

```json
{
  "subscription": {
    "status": "active" | "trialing" | "lifetime" | ...
  }
}
```

If the response is missing the `subscription` key, or `subscription.status` is
absent, `subscriptionStatus` falls back to `null`.

---

## 2. Client-Side Condition

Both `OrganizationClient.tsx` and `ZoneDetailClient.tsx` evaluate the same
logic:

```ts
const ACTIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'lifetime'];

const hasActiveSubscription =
  subscriptionStatus != null &&
  ACTIVE_SUBSCRIPTION_STATUSES.includes(subscriptionStatus);

const isPaymentIncomplete = !hasActiveSubscription;
```

### When the banner shows

`isPaymentIncomplete` is **true** (banner visible) when **any** of these are
true:

| Scenario | `subscriptionStatus` value | Banner? |
|---|---|---|
| No subscription row exists for the org | `null` | Yes |
| API returned 4xx / 5xx | `null` (fetch failed) | Yes |
| Stripe checkout started but not completed | `"incomplete"` | Yes |
| Payment failed / past due | `"past_due"` | Yes |
| Subscription canceled | `"canceled"` | Yes |
| Any other non-allowlisted string | e.g. `"unpaid"` | Yes |
| Subscription is active | `"active"` | **No** |
| Subscription is in trial | `"trialing"` | **No** |
| Lifetime purchase | `"lifetime"` | **No** |

### Additional rendering guard

- **Organization page** (`OrganizationClient.tsx`): banner renders only when
  `isPaymentIncomplete && org.is_active` — so admin-disabled orgs won't also
  show the payment banner.
- **Zone detail page** (`ZoneDetailClient.tsx`): banner renders when
  `isPaymentIncomplete && organization` (org object is non-null).

---

## 3. Resume Checkout Flow

When the banner is shown, the "Complete Payment" button reads two additional
fields from the organization record:

- `org.pending_plan_code` (mapped to `pendingPlanCode`)
- `org.pending_price_id` (mapped to `pendingPriceId`)

If both are present, the user is redirected to:

```
/checkout?org_id={orgId}&plan_code={pendingPlanCode}&price_id={pendingPriceId}&...
```

If either is missing, the user is sent to `/pricing` instead.

---

## 4. What to Verify on the Backend

1. **After a successful Stripe webhook (`checkout.session.completed` or
   `invoice.paid`):** Does `/api/subscriptions/current?org_id=X` return
   `{ "subscription": { "status": "active" } }`? If the status is anything
   other than `active`, `trialing`, or `lifetime`, the banner will appear.

2. **Response shape:** The frontend reads `subResult.subscription.status`. If
   the backend returns the status at a different path (e.g.
   `subResult.status` or `subResult.data.subscription.status`), the frontend
   will see `null` and show the banner incorrectly.

3. **Race condition:** If the Stripe webhook hasn't been processed yet when the
   user is redirected back to the app after payment, the subscription row may
   still have status `incomplete`. The frontend has no retry/polling — it reads
   whatever the server returns at page load.

4. **`pending_plan_code` and `pending_price_id` cleanup:** After successful
   payment, are these fields cleared on the organization record? If not, the
   resume-checkout button will keep appearing with stale data if the banner ever
   re-renders.

---

## 5. File References

| File | Role |
|---|---|
| `app/organization/[orgId]/page.tsx` (lines 122–157) | Server-side fetch + org data assembly |
| `app/organization/[orgId]/OrganizationClient.tsx` (lines 78–83, 288–296) | Client condition + banner render |
| `app/zone/[id]/page.tsx` (lines 78–110) | Server-side fetch for zone page |
| `app/zone/[id]/ZoneDetailClient.tsx` (lines 90–92, 345–353) | Client condition + banner render |
| `components/ui/IncompletePaymentBanner.tsx` | Banner component + resume checkout redirect |
