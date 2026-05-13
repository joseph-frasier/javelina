# Intake App Kickoff Integration — Design

**Branch:** `feat/intake-app-kickoff` (to be created off `main` after merging the image-uploads branch)
**Status:** Spec — pending approval
**Owner (Javelina):** Seth
**Stakeholder (Intake App):** [coworker]

---

## Background

The Intake App's wizard-submission endpoint (`POST /api/internal/intake-submission`) requires an existing **lead row** keyed by `org_id` before it accepts a submission. It returns `404 — no active lead for this org` otherwise.

Lead rows are created via a separate Intake App endpoint, `POST /api/internal/kickoff`. That endpoint already exists in `javelina-intake` (dev branch) and is fully implemented — it just isn't being called from anywhere yet.

This integration gap was discovered during E2E smoke testing of the recently-shipped image-uploads + wizard-handoff features. Auth, payload schema, and submission code paths all work correctly end-to-end; the only missing piece is lead creation.

## Goal

When a user completes Stripe checkout for a `business_starter` or `business_pro` subscription on Javelina, automatically create a lead row in the Intake App's database via `/api/internal/kickoff`. This unblocks the existing wizard-handoff flow.

## Non-goals

- Any change to `javelina-intake` — the Intake App's `/api/internal/kickoff` endpoint is already implemented and is the integration contract we're consuming.
- Subscription downgrades, plan changes, or cancellations — out of scope here. (Lead lifecycle past creation is handled by the Intake App via subsequent `intake-submission` calls.)
- Backfill of leads for orgs that paid before this lands — covered in §Backfill below as a separate, opt-in script.

---

## The contract (from `javelina-intake/src/app/api/internal/kickoff/route.ts`)

**Endpoint:** `POST {INTAKE_APP_URL}/api/internal/kickoff`

**Auth:** `X-API-Key: {JAVELINA_TO_INTAKE_API_KEY}`

**Request body (Zod-validated on her side):**
```jsonc
{
  "org_id": "<uuid>",
  "package": "business_starter" | "business_pro",
  "contact_email": "<email>",
  "contact_name": "<full name or null>",
  "stripe_subscription_id": "<sub_xxx>",
  "event_id": "<idempotency key>"
}
```

**Behavior:**
- Inserts a `leads` row with `status='created'`, `firm_id=JAVELINA_FIRM_ID`, plus the fields above.
- Idempotent on `event_id` via the `kickoff_events` table — repeat calls return `{ status: "already_applied", lead_id }`.
- Race-safe: simultaneous calls clean up duplicate leads automatically.

**Response:**
- `200 { status: "ok", lead_id }` on first call.
- `200 { status: "already_applied", lead_id }` on retry (same `event_id`).
- `400` invalid payload, `401` bad API key, `500` insert failure.

---

## Where the integration slots in

`javelina-backend/src/controllers/stripeController.ts → handleSubscriptionCreated()` (around line 1774). This handler:

1. Already runs on `customer.subscription.created` webhook events.
2. Already pulls `org_id` from `subscription.metadata.org_id`.
3. Already has `plan_code` available via `subscription.metadata.plan_code` (set when Javelina creates the subscription at line 413).
4. Already calls `createSubscriptionRecord(...)` to persist the local row.

Adding a kickoff call right after `createSubscriptionRecord` is the natural insertion point — by that moment, the local subscription record is durable and we know we have a real, paid business plan.

### Why not `checkout.session.completed`?

Checkout sessions complete before the subscription transitions to `active`/`trialing`. Firing kickoff there would create lead rows for incomplete or failed payments. `customer.subscription.created` is the cleaner signal.

### Why not `invoice.paid`?

`invoice.paid` fires for every renewal, not just the first one. We'd either need extra dedup logic or risk treating renewals as new leads.

---

## Design decisions

### 1. Plan code derivation — read from `subscription.metadata.plan_code`

Already set when Javelina creates the subscription (`stripeController.ts:413`). No need to walk `subscription.items.data[].price.id` and reverse-map to a plan code. If the metadata is somehow missing (legacy subs, manually-created subs), we skip kickoff and log — those are out-of-flow cases that belong to backfill, not this hot path.

### 2. Contact info source — `profiles` row of the user who initiated checkout

`subscription.metadata.user_id` is already set at creation. We look up the matching `profiles` row and pull:

- `contact_email` ← `profiles.email`
- `contact_name` ← `profiles.display_name` ?? `profiles.name` ?? `null`

Profile is preferred over `subscription.customer.email` because Javelina's profile is the canonical user identity; the Stripe customer is just a billing handle.

### 3. Gate on plan code

Only call kickoff when `plan_code ∈ {business_starter, business_pro}`. Domain-only, mailbox-only, and other subscriptions don't have intake flows, so no lead is needed.

### 4. Idempotency — `event_id = subscription.id`

Stripe webhook deliveries can retry. The Intake App's kickoff endpoint dedupes on `event_id`. Using `subscription.id` (which is unique and stable per subscription) means safe retries by construction. We never need to track delivery state ourselves.

### 5. Failure semantics — log + alert, do **not** throw

If kickoff returns 5xx or the Intake App is unreachable:

- The local subscription record is already persisted (we call kickoff *after* `createSubscriptionRecord`).
- We log the failure with full context (`org_id`, `subscription_id`, `plan_code`, status, response body).
- We do **not** throw, so Stripe will not retry the entire webhook (which would re-process the subscription, potentially racing with our local state).
- A pipeline event row gets written to `pipeline_events` for the org so the dashboard surfaces the issue.
- Manual replay path: a small admin endpoint (`POST /api/admin/intake/kickoff/:orgId`) for ops to trigger kickoff after fixing the underlying Intake-App issue. (Separate ticket if not bundled.)

If kickoff returns 4xx (e.g., bad payload), that's a code bug on our side — log loudly with the response body, but still don't throw, for the same reasons.

This trades guaranteed-delivery for stability: we'd rather have a known-broken org we can manually fix than have Stripe webhook retry storms when the Intake App is briefly down. The Intake App is a dependency, not a blocker for the local subscription record.

**Alternative considered:** throw and let Stripe retry. Rejected because Stripe retries the *entire* webhook, including our local subscription work, which is already idempotent but adds noise.

### 6. Auth header convention — `X-API-Key`

Confirmed via smoke testing (Bearer returns 401, X-API-Key passes). Already in place from the recent image-uploads work — `services/intakeApp.ts` uses `X-API-Key`. No env-var changes needed; reuse `JAVELINA_TO_INTAKE_API_KEY` and `INTAKE_APP_URL`.

### 7. Network timeout — 10 seconds

Aligned with the existing `forwardSubmission()` timeout pattern. Long enough to ride out brief transient slowdowns on the Intake App; short enough to fail fast if the dependency is genuinely down.

---

## File changes

### `javelina-backend/src/services/intakeApp.ts`

Add a sibling function to the existing `forwardSubmission()`:

```ts
export interface KickoffPayload {
  org_id: string;
  package: "business_starter" | "business_pro";
  contact_email: string;
  contact_name: string | null;
  stripe_subscription_id: string;
  event_id: string;
}

export async function kickoffLead(payload: KickoffPayload): Promise<{
  status: "ok" | "already_applied";
  lead_id: string;
}> {
  if (!intakeAppConfig.isConfigured) {
    throw new IntakeAppError("Intake App not configured", 500);
  }
  const url = `${intakeAppConfig.internalUrl}/api/internal/kickoff`;
  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": intakeAppConfig.internalToken,
    },
    timeout: 10000,
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new IntakeAppError(
      `Intake App kickoff returned ${response.status}`,
      response.status,
      response.data
    );
  }
  return response.data;
}
```

### `javelina-backend/src/controllers/stripeController.ts`

In `handleSubscriptionCreated()`, after `createSubscriptionRecord(orgId, fullSubscription)`:

```ts
// If this is a business plan, register the lead with the Intake App so
// the wizard's eventual submission has a row to attach to. Failures are
// logged but never thrown — the local subscription is already durable.
const planCode = subscription.metadata?.plan_code;
const userId = subscription.metadata?.user_id;
if (planCode === "business_starter" || planCode === "business_pro") {
  try {
    await registerBusinessLead({
      orgId,
      planCode,
      userId,
      stripeSubscriptionId: subscription.id,
    });
  } catch (err) {
    console.error("[Stripe] Intake App kickoff failed (non-fatal)", {
      orgId,
      subscriptionId: subscription.id,
      planCode,
      error: err instanceof Error ? err.message : err,
    });
    // Surface to dashboard via pipeline_events so ops can see it.
    await recordPipelineEvent(orgId, "intake_kickoff_failed", {
      subscription_id: subscription.id,
      detail: err instanceof Error ? err.message : "unknown",
    });
  }
}
```

`registerBusinessLead` is a small private helper in this same controller (or in `services/intakeApp.ts`) that:

1. Looks up the profile via `userId` for `contact_email` + `contact_name`.
2. Falls back to Stripe customer email if no profile (defensive — shouldn't happen).
3. Calls `kickoffLead({...})`.

### `javelina-backend/src/services/intakeApp.ts` (small) — exports `kickoffLead`

Already covered above.

### `pipeline_events` rows

A new event type `intake_kickoff_failed` written to the existing `pipeline_events` table. No schema change — uses existing columns. Reuses the dashboard surfacing already wired up by the wizard-handoff plan.

---

## Backfill

Orgs that paid before this lands have no lead row in the Intake App. They'll discover this when they try to submit the wizard.

**Recommendation:** ship a one-time admin script `scripts/backfill-intake-leads.ts` that:

1. Queries `subscriptions` for active business-plan rows.
2. For each, builds the kickoff payload and calls `kickoffLead()` with `event_id = subscription.id`.
3. The Intake App's idempotency guard means re-running is safe.
4. Reports per-org outcomes (created / already_applied / failed).

Out of scope for the primary ticket; bundled as Task 8 in the plan.

---

## Rollout sequence

1. Land kickoff service helper + integration in `handleSubscriptionCreated`.
2. Manual smoke: pay through Stripe checkout in dev, watch for kickoff log, verify lead row in Intake DB.
3. Deploy to dev.
4. Run backfill script in dev for any pre-existing test orgs.
5. Watch `pipeline_events` for `intake_kickoff_failed` over a few days.
6. If clean, promote to prod.

---

## Open questions for the Intake App stakeholder

1. **Are there any business-plan codes beyond `business_starter` and `business_pro` you plan to add soon?** If yes, we'll either need to widen the gate or pull the list from the Intake App at runtime.

2. **Is `display_name` or `name` the better source for `contact_name`?** Specifically: do you use this name anywhere user-facing (emails, agent prompts, etc.)? If so, we should pick the field that's more likely to be a real human-readable name. Default plan is `display_name ?? name ?? null`.

3. **Manual replay path** — would you prefer Javelina expose an admin endpoint that re-fires kickoff for a specific orgId, or would you rather expose a "force-create lead" admin endpoint on your side that takes the same payload? Either works; the former keeps secrets on Javelina, the latter centralizes lead-creation logic.

4. **Webhook subscription on your side** — we considered, and rejected, having `javelina-intake` subscribe to the same Stripe webhook directly. Reasons: (a) doubles up on Stripe webhook secrets and customer metadata trust boundaries; (b) the kickoff endpoint as it exists today is the cleaner contract. Confirming you agree and don't want to flip to a Stripe-side subscription model.

---

## Estimated effort

- Implementation: ~2 hours focused work
- Backfill script: +30 min
- Testing (Stripe trigger replay + dev pay-through): ~30 min
- Total: half-day with reviews

## Acceptance

- [ ] New `kickoffLead()` exported from `services/intakeApp.ts`, mirrors `forwardSubmission()` patterns
- [ ] `handleSubscriptionCreated` calls kickoff after `createSubscriptionRecord` for business plans
- [ ] Failure path logs + writes a `pipeline_events` row, never throws
- [ ] Backfill script runs against dev cleanly for at least one existing test org
- [ ] E2E smoke: Stripe test checkout → wizard fill → wizard submit → 200 from Intake App with `lead_id`, `business_intake.completed_at` set on Javelina side
- [ ] Code review (two-stage: spec compliance + quality, per existing convention)
