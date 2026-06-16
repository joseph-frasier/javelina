# Resume Checkout — Backend Implementation Guide

Required backend changes to support the "resume checkout" feature. When a user creates an organization during the plan selection flow but abandons checkout before completing payment, these changes allow the frontend to show a "Complete Payment" banner and reconstruct the checkout so the user can resume.

## Overview

Two new columns were added to the `organizations` table via migration `20260218100000_add_pending_checkout_to_organizations.sql`:

| Column | Type | Description |
|--------|------|-------------|
| `pending_plan_code` | TEXT (nullable) | Plan code the user intended to purchase (e.g., `starter_lifetime`, `pro`). NULL when no checkout is pending. |
| `pending_price_id` | TEXT (nullable) | Stripe Price ID for the intended plan (e.g., `price_1Abc...`). NULL when no checkout is pending. |

These fields are set during organization creation and cleared when the subscription is successfully activated via Stripe webhook.

---

## Required Changes

### 1. Accept pending fields on org creation

**Endpoint:** `POST /api/organizations`

**File:** Organizations controller (e.g., `src/controllers/organizationsController.ts`)

Accept `pending_plan_code` and `pending_price_id` in the request body and persist them to the `organizations` table.

**Option A — Update RPC function:**

If `create_organization_with_audit()` is used, add the two fields as parameters:

```sql
ALTER FUNCTION create_organization_with_audit(...)
  -- add parameters:
  p_pending_plan_code TEXT DEFAULT NULL,
  p_pending_price_id TEXT DEFAULT NULL
```

And include them in the INSERT statement.

**Option B — Follow-up UPDATE (simpler, no RPC change):**

After the existing `create_organization_with_audit()` call succeeds, do a follow-up update:

```typescript
if (pending_plan_code || pending_price_id) {
  await supabaseAdmin
    .from('organizations')
    .update({
      pending_plan_code,
      pending_price_id,
    })
    .eq('id', newOrg.id);
}
```

**Validation:**

- `pending_plan_code`, if provided, should be validated against known plan codes in the `plans` table
- `pending_price_id`, if provided, should match the Stripe price ID format (`price_*`)
- Both fields are optional — omitting them is valid (e.g., creating an org without selecting a plan)

**Request body addition:**

```typescript
interface CreateOrganizationRequest {
  // ... existing fields ...
  pending_plan_code?: string;
  pending_price_id?: string;
}
```

---

### 2. Return pending fields in org response

**Endpoint:** `GET /api/organizations/:id`

**File:** Organizations controller

Include `pending_plan_code` and `pending_price_id` in the response payload. These are already columns on the `organizations` table, so the controller just needs to not strip them from the Supabase query result.

If the controller uses an explicit column select, add the two fields:

```typescript
const { data } = await supabase
  .from('organizations')
  .select('*, pending_plan_code, pending_price_id')  // ensure these are included
  .eq('id', orgId)
  .single();
```

If it uses `select('*')`, no query change is needed — just ensure the serialization/response mapping doesn't filter them out.

**Response shape:**

```json
{
  "id": "uuid",
  "name": "My Org",
  "pending_plan_code": "starter_lifetime",
  "pending_price_id": "price_1Abc...",
  ...
}
```

When no checkout is pending, both fields are `null`.

---

### 3. Clear pending fields on subscription activation

**File:** Stripe webhook handler (e.g., `src/controllers/stripeWebhookController.ts` or `src/routes/stripe.ts`)

When a subscription is successfully activated, clear the pending checkout fields on the associated organization. This should happen in the same handler that creates/updates the subscription record.

**Relevant Stripe events:**

- `invoice.paid` (for recurring subscriptions)
- `customer.subscription.updated` with `status: 'active'` or `status: 'trialing'`
- Payment intent success for lifetime plans (one-time payments)

**Implementation:**

In the existing webhook handler, after the subscription/payment is recorded, add:

```typescript
// Clear pending checkout fields now that payment succeeded
await supabaseAdmin
  .from('organizations')
  .update({
    pending_plan_code: null,
    pending_price_id: null,
  })
  .eq('id', orgId);
```

This should be done in the `createSubscriptionRecord()` helper in `stripe-helpers` or directly in the webhook handler, wherever the org ID is available after successful payment.

**Important:** This must run for both recurring subscription activations AND one-time lifetime plan payments.

---

### 4. Enforce pending checkout on org-scoped mutations

**File:** New middleware or addition to existing org authorization middleware (e.g., `src/middleware/auth.ts` or a new `src/middleware/pendingCheckout.ts`)

Add enforcement that rejects mutating API calls for organizations that have a pending checkout.

**Logic:**

```typescript
async function enforcePendingCheckout(req, res, next) {
  const orgId = req.params.orgId || req.body.org_id || req.query.org_id;
  if (!orgId) return next();

  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('pending_plan_code')
    .eq('id', orgId)
    .single();

  if (org?.pending_plan_code) {
    return res.status(403).json({
      error: 'Payment required',
      reason: 'pending_checkout',
      message: 'Organization has a pending checkout. Complete payment before performing this action.',
    });
  }

  next();
}
```

**Apply to these endpoints (mutating, org-scoped):**

- `POST /api/zones` — create zone
- `PUT /api/zones/:id` — update zone
- `DELETE /api/zones/:id` — delete zone
- `POST /api/dns-records` — create DNS record
- `PUT /api/dns-records/:id` — update DNS record
- `DELETE /api/dns-records/:id` — delete DNS record
- `POST /api/organizations/:id/members` — add member
- `PUT /api/organizations/:id/members/:userId/role` — update member role
- `DELETE /api/organizations/:id/members/:userId` — remove member
- `PUT /api/organizations/:id` — update organization
- `POST /api/tags` — create tag
- `PUT /api/tags/:id` — update tag
- `DELETE /api/tags/:id` — delete tag

**Exempt from enforcement (must remain accessible):**

- `GET /api/organizations/:id` — needed to load the org page and detect pending state
- `GET /api/subscriptions/*` — needed for subscription status checks
- `POST /api/stripe/subscriptions` — needed to actually complete the checkout
- `POST /api/stripe/upgrade-to-lifetime` — needed for lifetime plan checkout
- `GET /api/plans/*` — needed to fetch plan details for checkout reconstruction
- `POST /api/discounts/validate` — needed for discount code entry during checkout
- `GET /api/zones/organization/:orgId` — needed to render the org page (read-only)

**Performance note:** To avoid an extra DB query on every request, consider caching the pending checkout status in the session/JWT, or piggybacking on an existing org fetch that already happens in the auth middleware.

---

## Frontend Changes (Already Implemented)

For reference, the frontend changes in the Javelina app repo include:

1. **`lib/api-client.ts`** — `organizationsApi.create()` now sends `pending_plan_code` and `pending_price_id`
2. **`components/modals/AddOrganizationModal.tsx`** — Passes `selectedPlan.code` and `selectedPlan.monthly.priceId` during org creation
3. **`components/ui/PendingCheckoutBanner.tsx`** — Amber warning banner with "Complete Payment" button that fetches plan details and redirects to `/checkout`
4. **`app/organization/[orgId]/page.tsx`** — Passes `pending_plan_code` and `pending_price_id` to the client component
5. **`app/organization/[orgId]/OrganizationClient.tsx`** — Shows the banner and disables all org-scoped action buttons when checkout is pending

The frontend handles the `403 pending_checkout` response gracefully — the UI already blocks actions client-side, and the backend enforcement acts as a security safety net.

---

## Deployment Order

1. Deploy backend changes (accept fields, return fields, webhook clearing, middleware)
2. Frontend changes are already deployed / ready to deploy independently
3. The migration is already applied — no database changes needed

Backend can be deployed first. The frontend will simply not send the new fields until it's deployed, and the backend will return `null` for both fields on existing orgs (which the frontend interprets as "no pending checkout").

---

## Testing Checklist

After deploying, verify:

- [ ] `POST /api/organizations` with `pending_plan_code` and `pending_price_id` persists both fields
- [ ] `POST /api/organizations` without pending fields still works (backward compatible)
- [ ] `GET /api/organizations/:id` returns `pending_plan_code` and `pending_price_id` (or `null`)
- [ ] After successful Stripe webhook (subscription activated), both pending fields are cleared to `null`
- [ ] After successful lifetime payment webhook, both pending fields are cleared to `null`
- [ ] `POST /api/zones` for an org with `pending_plan_code` returns `403 { reason: 'pending_checkout' }`
- [ ] `POST /api/stripe/subscriptions` for an org with `pending_plan_code` succeeds (not blocked)
- [ ] `GET /api/organizations/:id` for an org with `pending_plan_code` succeeds (not blocked)
- [ ] `POST /api/discounts/validate` succeeds for an org with pending checkout (not blocked)
- [ ] Invalid `pending_plan_code` values are rejected with a validation error
