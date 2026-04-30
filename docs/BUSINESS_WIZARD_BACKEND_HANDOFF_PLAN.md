# Business Setup Wizard — Backend Handoff Plan

**Branch:** `feat/business-plans-on-pricing` (both `javelina` and `javelina-backend`)
**Status:** Revised after teammate review — pending implementation
**Goal:** Move the business setup wizard off localStorage onto Postgres so it works on dev, persists across devices, and forwards a clean payload to the Intake App at submit time.

---

## Problem

Users who buy the $99 or $157 plan go through a new setup wizard, then land on the business management dashboard at `/business/[orgId]`. Today:

- All wizard state lives in Zustand + localStorage (`business-intake-store`).
- The "My Business" header button is gated on `Object.keys(intakes).length > 0` from that local store.
- On dev, the button never appears because completion state isn't shared with the backend.
- The dashboard is mostly mock data; sidebar links are non-functional.

We need the wizard to persist server-side, fix the header visibility, and forward the submitted form data to the Intake App so the automation pipeline can pick it up.

---

## What changed in this revision

The original plan was reviewed by the team member who owns the Intake App. That review surfaced significant overlap with infrastructure that already exists, and shifted the architecture:

- **`provisioning_status` rows are already created at Stripe checkout** by the Intake App via a sync endpoint. Javelina does NOT need to insert these at wizard completion.
- **The Intake App owns the canonical form data** in `leads.lead_record` (jsonb in the Intake App's own Supabase project, not Javelina's).
- **The Intake App exposes `POST /api/internal/intake-submission`** expecting Javelina to forward form data after wizard submission.
- **The Intake App has its own `pending_jobs`** for retry-safe service-to-service calls. Javelina does not need to enqueue any work.

We adopted **Option A** of the three architectures considered: drafts persist on Javelina during the wizard, and on submit the assembled payload is forwarded to the Intake App. The Intake App becomes the canonical owner of the submitted record.

---

## Architecture (Option A)

```
[Stripe checkout]
     │
     ▼
[Intake App] ── creates lead row ──┐
     │                              │
     │ sync endpoint                │
     ▼                              │
[Javelina DB] provisioning_status   │
              rows inserted         │
                                    │
[Wizard step 1..N]                  │
     │                              │
     │ POST /api/business/:orgId/intake (per step)
     ▼                              │
[Javelina DB] organizations.settings.business_intake (drafts)
                                    │
[Wizard final submit]               │
     │                              │
     │ POST /api/business/:orgId/intake/complete
     ▼                              │
[Javelina backend] ─── POST /api/internal/intake-submission ──▶ [Intake App]
     │                                                              │
     │                                                              ▼
     │                                                       leads.lead_record (jsonb)
     │                                                              │
     │ on 2xx: settings.business_intake.completed_at = now()        │
     │                                                              ▼
     │                                                  Intake App's pending_jobs
     │                                                  picks up downstream automation
     ▼
[Javelina dashboard reads]
  - organizations row
  - settings.business_intake (what user told us)
  - provisioning_status rows (per-service tiles)
  - pipeline_events (activity feed)
```

Javelina's role is now scoped to: persist drafts, render the dashboard from server state, and forward the submission. The Intake App is the canonical owner from the moment of submission.

---

## What's already in the schema (we use this; we don't add to it)

| Table / column | Purpose | Owned by |
|---|---|---|
| `provisioning_status` | Per-(org, service) state machine | **Inserted by Intake App** at Stripe checkout; Javelina reads only |
| `pipeline_events` | Append-only audit of state transitions | Written by automation pipeline; Javelina reads only |
| `organizations.settings` (jsonb) | Free-form per-org config | Javelina writes wizard drafts under `business_intake` key |
| `organizations.pending_plan_code` / `pending_price_id` | Plan tracking pre-checkout | Existing infrastructure |
| `subscriptions` + `plans` | Authoritative plan code post-checkout | Existing infrastructure |

**No new tables, columns, or enums in Javelina's database.**

The `pending_jobs` and `webhook_events` tables in Javelina's schema exist but are not used by this plan — the equivalent infrastructure on the Intake App side handles automation queueing.

---

## Where each piece of data lives

| Data | Home | Notes |
|---|---|---|
| Org name, billing address, contact | `organizations` canonical columns | Mutable; live state |
| Plan code | `subscriptions.plan_id → plans.code` | Authoritative through Stripe flow |
| Wizard draft answers (dns_mode, website prefs, started_at, completed_at) | `organizations.settings.business_intake` jsonb | Server-side persistence; survives reload, devices |
| Submitted form record (canonical) | Intake App's `leads.lead_record` | Forwarded on wizard completion |
| Per-service provisioning state | `provisioning_status` rows | Created by Intake App at Stripe checkout |
| Activity feed | `pipeline_events` rows | Written by automation pipeline |

`organizations.settings` example after wizard completion:

```json
{
  "business_intake": {
    "dns_mode": "...",
    "website": { "...": "..." },
    "contact": { "...": "..." },
    "started_at": "2026-04-29T12:00:00Z",
    "completed_at": "2026-04-29T12:14:00Z"
  }
}
```

Plan code, org name, and billing fields are deliberately **not** stored here — they live in their canonical columns. Image-asset metadata (logo, photos) is added under `business_intake.website.{logo, photos}` per the separate image-uploads spec.

---

## Backend work (`javelina-backend`)

New controller: `businessIntakeController.ts`. All routes authorize by resolving the Auth0 user → `profiles.id` → active row in `organization_members` (matches existing `organizationsController` / `profilesController` pattern).

| Route | Purpose |
|---|---|
| `GET /api/business/me` | Returns the current user's orgs that have `provisioning_status` rows. **Drives the "My Business" header button** — visibility gates on the user having paid (which is when provisioning_status rows are created), not on wizard completion. |
| `POST /api/business/:orgId/intake` | Upsert wizard draft into `organizations.settings.business_intake` (jsonb merge into existing settings). Called per wizard step. |
| `POST /api/business/:orgId/intake/complete` | Idempotency check + forward to Intake App (see below). |
| `GET /api/business/:orgId` | Returns everything the dashboard needs: org row, intake jsonb, all `provisioning_status` rows for the org, and the most recent N `pipeline_events`. |

### `intake/complete` flow

1. Verify `settings.business_intake.completed_at` is null (idempotency); if not null, return success without re-forwarding.
2. Validate required fields are present in the draft.
3. Build the submission payload (see Intake App handoff below).
4. POST to `${INTAKE_APP_INTERNAL_URL}/api/internal/intake-submission` with service-to-service auth.
5. On 2xx: set `settings.business_intake.completed_at = now()`. Return 200 to the wizard.
6. On non-2xx or network error: leave `completed_at` null. Return 502 with a retryable error to the wizard. Drafts and uploaded assets remain intact.

### Intake App handoff

```jsonc
POST ${INTAKE_APP_INTERNAL_URL}/api/internal/intake-submission
Headers: Authorization: <service-to-service convention TBD with teammate>

{
  "org_id": "...",
  "submission_id": "<uuid>",        // for idempotency on Intake App side
  "lead_record": {
    "website": {
      "bizName": "...",
      "logo": { "storage_path": "...", "signed_url": "<7-day>", "...": "..." },
      "photos": [{ "...": "..." }],
      "...": "rest of website fields"
    },
    "contact": { "...": "..." },
    "dns": { "...": "..." },
    "domain": { "...": "..." }
  }
}
```

Image asset URLs are 7-day signed URLs; details in the image-uploads spec. The submission payload is built from `organizations.settings.business_intake` plus on-the-fly signed URL generation for images.

### Header visibility (Option A choice)

The `GET /api/business/me` endpoint returns orgs the user belongs to that have any `provisioning_status` row. This means the button appears the moment the customer pays — the wizard becomes the natural next step when they click into the dashboard, and customers who abandon mid-wizard can still find their way back.

```sql
SELECT DISTINCT o.id, o.name,
       (o.settings->'business_intake'->>'completed_at') AS intake_completed_at
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
JOIN provisioning_status ps ON ps.org_id = o.id
WHERE om.user_id = $auth_user
  AND om.status = 'active';
```

---

## Frontend work (`javelina`)

1. **Wizard step persistence.** In `BusinessWizardShell.tsx` and the per-step handlers in `lib/business-intake-store.ts`, debounce-write each step's draft to `POST /api/business/:orgId/intake`. Keep Zustand for in-flight UI state — it's no longer the source of truth.

2. **Wizard completion.** When `complete(orgId)` fires, call `POST /api/business/:orgId/intake/complete`. On success: invalidate the header's intake query and the dashboard query. On failure: surface the error and let the user retry.

3. **Header visibility swap.** `components/layout/Header.tsx`, lines 27–29 currently read:
   ```ts
   const hasBusinessIntakes = useBusinessIntakeStore(
     (s) => Object.keys(s.intakes).length > 0,
   );
   ```
   Replace with a React Query call to `GET /api/business/me`. Render the button when the response array is non-empty. **This is the fix for the dev visibility problem.**

4. **Dashboard swap.** `app/business/[orgId]/page.tsx` currently reads from Zustand. Replace with a fetch to `GET /api/business/:orgId`. Pass into `BusinessPlaceholderDashboard`. Map:
   - `intake` jsonb → "what you told us" sections (with empty-state for unfinished intake)
   - `provisioning_status` rows → status tiles per service (DNS, email, website, domain)
   - `pipeline_events` → activity feed
   - Sidebar links progressively wired to real queries on `domains`, `zones`, `domain_mailboxes`, `ssl_certificates` filtered by `org_id`

5. **Empty-state UX for unfinished intake.** Because the dashboard is now reachable immediately after Stripe checkout (Option A header visibility), the dashboard needs an "intake not yet completed" state that points the user back to the wizard. The provisioning tiles can render in their `not_started` state from the existing `provisioning_status` rows.

6. **Remove `persist()` for wizard data.** Once each step server-syncs and the dashboard reads from the server, drop the localStorage persistence entirely. Optionally keep a thin in-memory cache for resume-after-refresh during a single session.

---

## Rollout sequence

Each step is independently shippable and reversible.

1. Backend endpoints (read-only): `GET /api/business/me` and `GET /api/business/:orgId`. Verify with curl. No UI change yet.
2. Backend write endpoints: `POST /api/business/:orgId/intake` (draft upsert) and `POST /api/business/:orgId/intake/complete` (forward to Intake App).
3. Wizard dual-writes — Zustand still works, but each step also POSTs to backend. Safe rollback (server data is an extra copy).
4. Header swap — header reads from server. **This unblocks dev.**
5. Dashboard swap — dashboard reads from server. Empty-state for unfinished intake; existing mock sections stay as scaffolding for incremental wiring.
6. Drop Zustand `persist()` for wizard data.
7. Wire dashboard sidebar pages incrementally, one per existing table (`domains`, `zones`, `domain_mailboxes`, `ssl_certificates`, `pipeline_events`).

When the automation pipeline (owned by the teammate's Intake App) progresses, it transitions `provisioning_status` rows and writes `pipeline_events`. Javelina's dashboard already renders both. **Zero frontend or schema changes needed at agent-progress time.**

---

## Out of scope

- Any new tables, columns, or enums in Javelina's database.
- The Intake App side of `/api/internal/intake-submission` — owned by the teammate.
- The automation pipeline itself.
- Retry / queueing on Javelina's side for the Intake App call (single synchronous attempt; user retries by clicking submit again; Intake App's own `pending_jobs` handles downstream retries).
- Stripe webhook changes — plan code and provisioning_status creation already flow through existing infrastructure.

---

## Open questions

1. **Service-to-service auth convention.** What header / token does `/api/internal/intake-submission` expect? Match the existing pattern set up by the teammate. Resolve at implementation time.
2. **Intake App URL.** Add an env var `INTAKE_APP_INTERNAL_URL` to `javelina-backend` config. Confirm value with teammate.
3. **Submission idempotency.** This plan generates a `submission_id` (UUID) per `intake/complete` call. Confirm the Intake App's `/api/internal/intake-submission` accepts and de-duplicates on this field.
4. **Required-field validation contract.** Which fields does the Intake App require to be present in `lead_record`? Define a schema with the teammate so Javelina can validate before forwarding.
