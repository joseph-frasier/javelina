# Business Setup Wizard — Backend Handoff Plan

**Branch:** `feat/business-plans-on-pricing` (both `javelina` and `javelina-backend`)
**Status:** Proposed — pending team review
**Goal:** Move the business setup wizard off localStorage onto Postgres so it works on dev, persists across devices, and is ready to hand off to the automation agent without further frontend or schema work.

---

## Problem

Users who buy the $99 or $157 plan go through a new setup wizard, then land on the business management dashboard at `/business/[orgId]`. Today:

- All wizard state lives in Zustand + localStorage (`business-intake-store`).
- The "My Business" header button is gated on `Object.keys(intakes).length > 0` from that local store.
- On dev, the button never appears because completion state isn't shared with the backend (the automation agent isn't connected).
- The dashboard is mostly mock data; sidebar links are non-functional.

We need a sustainable solution that survives the eventual automation agent integration without rework.

---

## Key insight: most of the infrastructure already exists

A schema review of the dev Supabase project revealed that the "automation pipeline" is already modeled. We do **not** need new tables.

| Table | Purpose | Existing rows |
|---|---|---|
| `provisioning_status` | Per-(org, service) state machine | 252 |
| `pipeline_events` | Append-only audit of state transitions | 0 |
| `pending_jobs` | Job queue with `status` enum | 0 |
| `webhook_events` | Generic webhook inbox | 0 |
| `organizations.settings` (jsonb) | Free-form per-org config | — |
| `organizations.pending_plan_code` | Plan selection pre-checkout | — |
| `subscriptions` + `plans` | Authoritative plan code post-checkout | 66 / 10 |
| `domains`, `zones`, `domain_mailboxes`, `ssl_certificates` | Real data the dashboard will eventually display | populated |

**Enums already in place:**

- `canonical_state`: `not_started | in_progress | needs_input | failed | live | not_applicable`
- `provisioning_service`: `dns | domain | email | website`
- `pending_job_status`: `pending | succeeded | failed | manual_resolved`

No schema changes are required for this plan.

---

## Where each piece of data lives

| Data | Home | Why |
|---|---|---|
| Org name, billing address, contact | Canonical columns on `organizations` | Mutable; queries should always see current state |
| Plan code | `subscriptions.plan_id → plans.code` (with `pending_plan_code` fallback before checkout completes) | Authoritative through Stripe flow |
| Wizard-only answers (dns_mode, website prefs, started_at, completed_at) | `organizations.settings.business_intake` jsonb (a key inside the existing `settings` column) | No canonical home; need persistence + audit |
| Frozen handoff snapshot for the agent | `pending_jobs.payload` jsonb at completion time | Immutable; agent works from this, not from re-querying live tables |
| Per-service state for dashboard tiles | `provisioning_status` rows (one per service per org) | Existing pattern; agent will own these |
| Activity feed / audit | `pipeline_events` rows | Existing pattern; agent will write these |

`organizations.settings` example after wizard completion:

```json
{
  "business_intake": {
    "dns_mode": "...",
    "website": { "...": "..." },
    "contact": { "...": "..." },
    "started_at": "2026-04-28T12:00:00Z",
    "completed_at": "2026-04-28T12:14:00Z"
  }
}
```

Plan code, org name, and billing fields are deliberately **not** stored here — they live in their canonical columns.

---

## Backend work (`javelina-backend`)

New controller: `businessIntakeController.ts`. All routes authorize by resolving the Auth0 user → `profiles.id` → active row in `organization_members` (matches existing `organizationsController` / `profilesController` pattern).

| Route | Purpose |
|---|---|
| `GET /api/business/me` | Returns the current user's orgs that have `settings.business_intake` set, with `completed_at` and basic org info. **Drives the "My Business" header button.** |
| `POST /api/business/:orgId/intake` | Upsert wizard draft into `organizations.settings.business_intake` (jsonb merge into existing settings). Called per wizard step. |
| `POST /api/business/:orgId/intake/complete` | Atomic transaction (see below). |
| `GET /api/business/:orgId` | Returns everything the dashboard needs in one response: org row, intake jsonb, all `provisioning_status` rows, recent N `pipeline_events`. |

### `intake/complete` transaction

1. Set `settings.business_intake.completed_at = now()`.
2. Insert `provisioning_status` rows for each applicable service (`dns`, `domain`, `email`, `website`) with `state = 'not_started'`. Skip / mark `not_applicable` based on intake answers.
3. Insert one `pipeline_events` row per service: `previous_state = null`, `new_state = not_started`, `actor_type = user`, `message = 'Wizard completed'`.
4. Insert one `pending_jobs` row:
   ```jsonc
   {
     "target": "automation_agent.business_setup",
     "payload": {
       "org_id": "...",
       "org_name": "...",        // snapshot of organizations.name
       "plan_code": "99",        // snapshot of plans.code
       "billing": { ... },       // snapshot of organizations.billing_*
       "contact": { ... },
       "dns_mode": "...",
       "website": { ... }
     }
   }
   ```

The job sits in `pending_jobs` with `status = 'pending'`. We are **not building the consumer**; the automation agent owner picks it up later.

---

## Frontend work (`javelina`)

1. **Wizard step persistence.** In `BusinessWizardShell.tsx` and the per-step handlers in `lib/business-intake-store.ts`, debounce-write each step's draft to `POST /api/business/:orgId/intake`. Keep Zustand for in-flight UI state (current step, form values) — it's no longer the source of truth.

2. **Wizard completion.** When `complete(orgId)` fires, call `POST /api/business/:orgId/intake/complete`. On success, invalidate the header's intake query so "My Business" appears.

3. **Header visibility swap.** `components/layout/Header.tsx`, lines 27–29 currently read:
   ```ts
   const hasBusinessIntakes = useBusinessIntakeStore(
     (s) => Object.keys(s.intakes).length > 0,
   );
   ```
   Replace with a React Query call to `GET /api/business/me`. Render the button when the response array is non-empty. **This is the fix for the dev visibility problem.**

4. **Dashboard swap.** `app/business/[orgId]/page.tsx` currently reads from Zustand. Replace with a fetch to `GET /api/business/:orgId` and pass into `BusinessPlaceholderDashboard`. Map:
   - `intake` jsonb → "what you told us" sections
   - `provisioning_status` rows → status tiles per service (DNS, email, website, domain)
   - `pipeline_events` → activity feed
   - Sidebar links progressively wired to real queries on `domains`, `zones`, `domain_mailboxes`, `ssl_certificates` filtered by `org_id` (each is its own follow-up task)

5. **Remove `persist()` for completion data.** Keep `persist()` only if you want resume-after-refresh *during* the wizard itself; once each step server-syncs, drop it entirely.

---

## Rollout sequence

Each step is independently shippable and reversible.

1. Backend endpoints + read-only `GET /api/business/me`. Verify with curl. No UI change yet.
2. Wizard dual-writes — Zustand still works, but each step also POSTs to backend. Safe rollback (server data is an extra copy).
3. Header swap — header reads from server. **This unblocks dev.**
4. Dashboard swap — dashboard reads from server. Mock sections stay mock for now.
5. Drop Zustand `persist()` for completion data.
6. Wire sidebar pages incrementally, one per existing table (`domains`, `zones`, etc.).

When the automation agent ships:

- It consumes `pending_jobs` rows with `target = 'automation_agent.business_setup'`.
- It transitions `provisioning_status` rows through `in_progress` → `live` (or `needs_input` / `failed`).
- It writes `pipeline_events`.
- It calls back via `webhook_events` if needed.

**Zero frontend or schema changes required at agent integration time.**

---

## Explicitly out of scope

- Building the automation agent or its `pending_jobs` consumer.
- Any new tables, columns, or enums.
- Replacing every mocked dashboard section with real queries (incremental per step 6 above).
- Stripe webhook changes — plan code already flows through existing infrastructure.

---

## Open questions for review

1. **`settings` jsonb vs. dedicated column.** We're proposing `organizations.settings.business_intake` (no migration). If we expect to query/index the intake data heavily, a dedicated `organizations.business_intake jsonb` column is a tiny reversible migration and slightly more discoverable. Either works.
2. **Service applicability rules.** Which `provisioning_service` rows get inserted at wizard completion is driven by intake answers (e.g., "I already have a website" → `website = not_applicable`). The mapping needs to be defined before implementation.
3. **Agent payload contract.** The shape of `pending_jobs.payload` should be agreed with whoever builds the agent before we ship `intake/complete`. The frontend persists everything; the snapshot we build into `payload` is whatever the agent contract requires.
