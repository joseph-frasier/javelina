# Backend Changes: Resume Checkout & Subscription Enforcement

**Date:** February 18, 2026  
**Priority:** High — users who abandon checkout are stuck with unusable orgs  
**Type:** Feature + security hardening

## Problem

When a user selects a plan on the pricing page, the flow creates an organization **before** redirecting to checkout. If the user closes the tab or navigates away before completing Stripe payment, they end up with an org that has taken the name but has no subscription. There is no way to resume checkout and no restriction preventing them from using the org without paying.

## Database Migration

A migration has been created in the frontend repo at:

```
supabase/migrations/20260218100000_add_pending_checkout_to_organizations.sql
```

It adds two nullable columns to `organizations`:

| Column | Type | Purpose |
|---|---|---|
| `pending_plan_code` | `TEXT` | Plan code the user intended to purchase (e.g., `starter_lifetime`, `pro`) |
| `pending_price_id` | `TEXT` | Stripe Price ID for the intended plan |

These fields are set during org creation (when a plan is selected) and cleared when a subscription is successfully activated.

---

## Required Backend Changes

### 1. Modified Endpoint: `POST /api/organizations`

**Current behavior:** Creates an org with name, description, and billing fields.

**New behavior:** Accept two additional optional fields in the request body:

```typescript
// Additional fields in request body
{
  // ... existing fields ...
  pending_plan_code?: string;  // e.g., "starter_lifetime", "pro"
  pending_price_id?: string;   // e.g., "price_1SnNMYA8kaNOs7ryC8ZRSDvR"
}
```

**Implementation:** When creating the org row in Supabase, include `pending_plan_code` and `pending_price_id` if provided. No validation against the `plans` table is required (the frontend already validates this), but a basic check that the values are non-empty strings is recommended.

---

### 2. Modified Endpoint: `GET /api/organizations/:id`

**Current behavior:** Returns the org object.

**New behavior:** Include `pending_plan_code` and `pending_price_id` in the response if they are set.

```json
{
  "id": "uuid",
  "name": "XDA Corp",
  "pending_plan_code": "starter_lifetime",
  "pending_price_id": "price_1SnNMrA8kaNOs7rybyIa6Fbx",
  // ... other existing fields ...
}
```

These will be `null` for orgs that have completed checkout or were created without a plan selection.

---

### 3. Modified Endpoint: `GET /api/users/profile`

**Current behavior:** Returns user profile with an `organizations` array containing `{ id, name, role }`.

**New behavior:** Add a `subscription_status` field to each org in the array. This allows the frontend sidebar to show a visual indicator for orgs with incomplete payment.

```json
{
  "id": "user-uuid",
  "name": "John Doe",
  "organizations": [
    {
      "id": "org-uuid-1",
      "name": "Lenwood Park Capital",
      "role": "SuperAdmin",
      "subscription_status": "lifetime"
    },
    {
      "id": "org-uuid-2",
      "name": "XDA Corp",
      "role": "SuperAdmin",
      "subscription_status": null
    }
  ]
}
```

**Implementation:** Join the `subscriptions` table when building the organizations array:

```sql
SELECT
  o.id,
  o.name,
  om.role,
  s.status AS subscription_status
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
LEFT JOIN subscriptions s ON s.org_id = o.id
WHERE om.user_id = $1
  AND om.status = 'active'
  AND o.status = 'active';
```

---

### 4. Modified Webhook Handler: Clear Pending Fields on Subscription Activation

When the Stripe webhook processes a successful subscription activation, clear the pending checkout fields on the organization.

**Affected webhook events:**
- `checkout.session.completed`
- `invoice.payment_succeeded` (for the first invoice of a subscription)
- Any event that transitions the subscription status to `active` or `lifetime`

**Implementation:** After updating the subscription status in the database, also clear the org's pending fields:

```sql
UPDATE organizations
SET
  pending_plan_code = NULL,
  pending_price_id = NULL,
  updated_at = now()
WHERE id = $org_id
  AND pending_plan_code IS NOT NULL;
```

This should run alongside the existing subscription status update logic. It is safe to run even if the fields are already null (the WHERE clause prevents unnecessary writes).

---

### 5. New Middleware: Subscription Enforcement on Org Mutations

All API endpoints that mutate data within an organization should verify the org has an active subscription before allowing the operation. This prevents users from bypassing the frontend disable logic via direct API calls.

**Endpoints to protect (POST, PUT, DELETE only — reads are allowed):**

| Resource | Endpoints |
|---|---|
| Zones | `POST /api/zones`, `PUT /api/zones/:id`, `DELETE /api/zones/:id` |
| Zone Records | `POST /api/zones/:id/records`, `PUT /api/zones/:zoneId/records/:id`, `DELETE /api/zones/:zoneId/records/:id` |
| Tags | `POST /api/tags`, `PUT /api/tags/:id`, `DELETE /api/tags/:id` |
| Zone Tags | `PUT /api/zones/:id/tags` |
| Org Members | `POST /api/organizations/:id/members`, `PUT /api/organizations/:id/members/:userId`, `DELETE /api/organizations/:id/members/:userId` |
| Org Settings | `PUT /api/organizations/:id` (except billing fields — see note below) |

**Note:** `PUT /api/organizations/:id` should still allow updating billing contact fields even without an active subscription, since users may need to update billing info before completing checkout.

**Implementation — Middleware function:**

```typescript
async function requireActiveSubscription(req, res, next) {
  // Extract org_id from the request
  // Could be req.params.id (org endpoints), req.body.organization_id (zone creation),
  // or derived from the zone being modified
  const orgId = getOrgIdFromRequest(req);

  if (!orgId) {
    return next(); // Can't determine org — let route handler deal with it
  }

  // Check subscription status
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('org_id', orgId)
    .single();

  const activeStatuses = ['active', 'trialing', 'lifetime'];

  if (!subscription || !activeStatuses.includes(subscription.status)) {
    return res.status(402).json({
      error: 'Payment required',
      message: 'This organization does not have an active subscription. Please complete payment before making changes.',
      code: 'SUBSCRIPTION_REQUIRED'
    });
  }

  next();
}
```

**HTTP 402 response:** Using status code 402 (Payment Required) makes the error semantically clear. The frontend can detect this code and show an appropriate message or redirect to checkout.

**Helper to extract org_id:**

For zone/record endpoints, you'll need to look up the zone's `organization_id`:

```typescript
async function getOrgIdFromRequest(req) {
  // Direct org endpoints
  if (req.params.id && req.baseUrl.includes('/organizations')) {
    return req.params.id;
  }

  // Zone creation — org_id in body
  if (req.body?.organization_id) {
    return req.body.organization_id;
  }

  // Zone mutation — look up zone's org
  const zoneId = req.params.id || req.params.zoneId;
  if (zoneId) {
    const { data: zone } = await supabase
      .from('zones')
      .select('organization_id')
      .eq('id', zoneId)
      .single();
    return zone?.organization_id;
  }

  return null;
}
```

---

### 6. Optional: `GET /api/organizations/:id/checkout-info`

A convenience endpoint that returns the checkout URL parameters for an org with pending checkout. The frontend currently reconstructs this from plan config, but this endpoint could serve as a single source of truth.

**Response:**

```json
{
  "has_pending_checkout": true,
  "checkout_url_params": {
    "org_id": "uuid",
    "plan_code": "starter_lifetime",
    "price_id": "price_1SnNMrA8kaNOs7rybyIa6Fbx",
    "plan_name": "Starter Lifetime",
    "plan_price": 238.80,
    "billing_interval": "lifetime"
  }
}
```

Or if no pending checkout:

```json
{
  "has_pending_checkout": false,
  "checkout_url_params": null
}
```

**Implementation:** Look up the org's `pending_plan_code`, join with the `plans` table to get the name and price, and return the assembled parameters.

This endpoint is optional — the frontend can reconstruct the checkout URL from `pending_plan_code` and `pending_price_id` using its local `PLANS_CONFIG`. But this endpoint removes the dependency on the frontend having an accurate plan config and is useful if plan prices change.

---

## Testing Checklist

- [ ] Creating an org with `pending_plan_code` and `pending_price_id` stores them in the database
- [ ] `GET /api/organizations/:id` returns `pending_plan_code` and `pending_price_id`
- [ ] `GET /api/users/profile` includes `subscription_status` per org in the organizations array
- [ ] Completing checkout (Stripe webhook fires) clears `pending_plan_code` and `pending_price_id`
- [ ] Zone creation returns 402 when org has no active subscription
- [ ] Zone record creation/update/delete returns 402 when org has no active subscription
- [ ] Tag creation/update/delete returns 402 when org has no active subscription
- [ ] Member invite/update/remove returns 402 when org has no active subscription
- [ ] Org update returns 402 for non-billing fields when no active subscription
- [ ] Org update still allows billing field updates without active subscription
- [ ] Read operations (GET) still work without active subscription
- [ ] Orgs with `active`, `trialing`, or `lifetime` subscription status pass all mutation checks
- [ ] Orgs with `past_due`, `canceled`, `incomplete`, `unpaid`, or null subscription are blocked

---

## Security Notes

1. **Frontend disable is UX only.** The backend enforcement (section 5) is the security boundary. Frontend disabling of buttons prevents confusion; backend 402 responses prevent abuse.

2. **Read access is preserved.** Users can always view their org, zones, and records even without a subscription. This prevents data loss anxiety and allows them to see what they've configured.

3. **Billing field exception.** The org update endpoint must still allow billing contact field updates so users can correct billing info before completing checkout.

4. **402 error code.** Using HTTP 402 (Payment Required) is semantically correct and allows the frontend to programmatically detect subscription issues vs. other authorization failures (401/403).
