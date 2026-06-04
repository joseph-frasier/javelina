# Admin Queue — Lead API Guide

For the frontend dev building the **Sales & Onboarding queue** (the staff-facing "stuck leads" view, not the customer dashboard). Tells you which routes to hit, exact response shapes, and how to wire the four operator action buttons.

> **Source of truth:** `leads` table in this repo (`javelina-intake`), exposed via `X-API-Key`-gated `/api/internal/leads*` endpoints. The frontend never hits intake directly — it goes through `javelina-backend`'s `/api/admin/intake/*` forwarders, which add Auth0 + superadmin gating and write the `operator_actions` audit row before forwarding.
>
> **Backend = pure passthrough.** The forwarder (`javelina-backend/src/controllers/operatorActionsController.ts`) does not reshape responses. Whatever intake returns is byte-identical to what the frontend sees.

---

## 1. Auth

All routes below are gated by:

1. Auth0 bearer token (standard logged-in user session)
2. `requireSystemSuperAdmin()` — the user's Auth0 sub must have superadmin role

**Do NOT send `X-API-Key`** — that's the server-to-server header used by the backend to call intake. From the browser, just use the normal Auth0 session.

If the token is missing/invalid: `401`. If the user isn't a superadmin: `403`.

---

## 2. List leads (queue view)

```
GET /api/admin/intake/leads
```

### Query params (all optional)

| Param | Default | Notes |
|---|---|---|
| `status` | none | Filter by lead status (single value — see §4) |
| `package` | none | `business_starter` or `business_pro` |
| `age_min_hours` | none | Only leads older than N hours by `created_at` (numeric, decimals OK) |
| `limit` | 50 | Page size, max 200 |
| `offset` | 0 | Pagination offset |
| `order` | `oldest` | `oldest` (stuck-first) or `newest` |

Default ordering is **`oldest` — deliberate**, because the queue's primary job is surfacing stuck leads.

### Response

```jsonc
{
  "leads": [
    {
      "id": "uuid",                      // lead id — use this for action routes
      "firm_id": "uuid",
      "org_id": "uuid",                  // links to javelina-side org
      "package": "business_starter" | "business_pro",
      "contact_email": "...",
      "contact_name": "...",
      "status": "agents_complete",       // see §4 for full enum
      "version": 1,
      "total_cost_cents": 1234,          // cumulative agent run cost
      "created_at": "2026-05-06T...",
      "form_submitted_at": "..." | null,
      "agents_completed_at": "..." | null,
      "scope_confirmed_at": "..." | null,
      "scope_rejected_at": "..." | null,
      "scope_rejection_reason": "..." | null,
      "updated_at": "..."
    }
    // …up to `limit` rows
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 137                         // null if Supabase couldn't count
  }
}
```

**Heavy columns are deliberately omitted** (research_report, copy_prep, design_prep, etc.) to keep the list cheap. Fetch those via the detail endpoint when you actually open a lead.

### Computed columns (frontend-side)

The ticket lists `age`, `last_activity`, and `blocked_on` as table columns. None are stored — derive them:

| Column | How |
|---|---|
| `age` | `now - created_at` |
| `last_activity` | `updated_at` (closest proxy) |
| `blocked_on` | Map from `status` — see table below |

**Suggested `blocked_on` mapping:**

| `status` | Suggested label |
|---|---|
| `created` | "Awaiting form submission" |
| `form_submitted` | "Agents running" |
| `agents_complete` | **"Awaiting operator scope review"** ← the queue's main target |
| `scope_confirmed` | "Provisioning starting" |
| `provisioning` | "Provisioning in flight" |
| `live` | — (not in queue) |
| `routed_to_custom` | "Routed to custom" + show `scope_rejection_reason` |
| `abandoned` | "Abandoned by customer" |
| `failed` | "Failed" — show `scope_rejection_reason` if present |

---

## 3. Lead detail (drilldown)

```
GET /api/admin/intake/leads/:leadId
```

### Response

```jsonc
{
  "lead": {
    // …all fields from the list response, PLUS the heavy jsonb columns:
    "lead_record": { /* Agent 1 (Scribe) — extracted business profile */ },
    "research_report": { /* Agent 2 (Scout) */ },
    "similarity_report": { /* Agent 3 (Matchmaker) */ },
    "upsell_risk_report": { /* Agent 5 (Strategist) */ },
    "copy_prep": { /* Agent 10 (Composer) — copy + page structure */ },
    "design_prep": { /* Agent 12 (Stylist) */ }
    // structure_prep column exists in the schema but is unused — Agent 11
    // (Structurer) was folded into Agent 10. Always null; safe to ignore.
    // …plus all the *_at timestamps and other lead columns
  },
  "services": [
    // lead_services rows — per-service mirror state (intake-side copy
    // of provisioning_status). Useful for showing the operator what
    // the customer is currently seeing.
    {
      "lead_id": "uuid",
      "service": "website" | "dns" | "email" | "domain",
      "state": "...",
      "internal_state": "...",
      "progress_label": "...",
      "metadata": { ... },
      "updated_at": "..."
    }
  ]
}
```

`404` if no lead with that id. `400` if `:leadId` is missing/malformed.

---

## 4. Lead status enum

Used in both the list filter (`?status=`) and the response `status` field.

| `status` | Meaning |
|---|---|
| `created` | Row exists, form not yet submitted |
| `form_submitted` | Form in, agents kicked off |
| `agents_complete` | All agents finished — **awaiting operator scope review** |
| `scope_confirmed` | Operator clicked confirm; provisioning workers starting |
| `provisioning` | Provisioning workers in flight |
| `live` | All services live |
| `routed_to_custom` | Operator rejected; lead routed to custom-build flow |
| `abandoned` | Customer abandoned (no recent activity) |
| `failed` | Hard failure (operator-marked or worker-emitted) |

The queue typically filters to `agents_complete` (the main operator-action target) plus `provisioning` (in-flight check) plus `failed` (triage).

---

## 5. Operator actions

All four actions are **idempotent** — replaying the same action returns `{ result: "already_applied" }` instead of erroring. The backend forwarder writes a row to `operator_actions` (audit log) **before** forwarding to intake; on non-2xx from intake, it rolls back the audit row so local state stays consistent.

### `POST /api/admin/intake/leads/:leadId/confirm-scope`

Transitions: `agents_complete → scope_confirmed`. Emits `intake/scope.confirmed` (kicks off Phase 2 orchestrator).

**Body:** none (`{}` is fine).

**Response:** `200` with intake's payload (typically `{ result: "applied" | "already_applied", status: "scope_confirmed" }`).

### `POST /api/admin/intake/leads/:leadId/reject`

Transitions: `agents_complete → routed_to_custom`. Stamps `scope_rejected_at` + `scope_rejection_reason`.

**Body (required):**
```json
{ "reason": "scope mismatch — they want a Shopify store" }
```
Reason must be a non-empty string. Returns `400 reason_required` otherwise.

### `POST /api/admin/intake/leads/:leadId/mark-failed`

Transitions: any non-terminal status → `failed`. Used for "this lead is hosed, take it out of the queue."

**Body (required):**
```json
{ "reason": "OpenSRS registration failed after 3 retries" }
```

### `POST /api/admin/intake/leads/:leadId/mark-pax8-done`

For Pro leads stuck on Pax8 mailbox setup. Emits `intake/pax8.completed` (Phase 3.8 verification handler picks it up). Gated to `package = business_pro` and `status = provisioning`; intake will return `409` if those aren't true.

**Body:** none.

### `POST /api/admin/intake/leads/:leadId/services/:service/override` (JAV-128)

Manually flips a service tile's state. Used when the operator handled provisioning manually (pre-automation) or when a worker is stuck and the operator wants to mark the service complete / not-applicable / failed.

**Path params:**
- `service` — one of `website` | `dns` | `email` | `domain`

**Body:**
```jsonc
{
  "state": "live" | "not_applicable" | "failed" | "needs_input",
  "reason": "...",                  // required for all states (audit log)
  "progress_label": "..."           // required for failed/needs_input; ignored for live/not_applicable
}
```

| State | What customer sees | `progress_label` |
|---|---|---|
| `live` | Tile flips green, label `"Live"` | locked — input ignored |
| `not_applicable` | Tile greys out, label `"—"` | locked — input ignored |
| `failed` | Red tile, your label | required |
| `needs_input` | Amber tile, your label | required |

`not_started` and `in_progress` cannot be set via override — those come from worker activity only.

**Behavior:**
- Each call is a discrete event with its own UUID — clicking twice produces two `pipeline_events` rows. Idempotency on Javelina's side prevents *the same call* double-applying, but repeated operator clicks are not deduped.
- Future automation will overwrite an override (the worker is the source of truth once it exists). UX-flag this in the operator confirmation modal.
- Returns `{ status: "applied", lead_id, service, state, progress_label, override_id }`.

**Errors:**
- `400 invalid_service` — bad `:service` path param
- `400 invalid_state` — state not in the allowed enum
- `400 reason_required` — missing or empty `reason`
- `400 progress_label_required` — missing on `failed`/`needs_input`
- `404 not found` — lead doesn't exist
- `502 sync failed` — Javelina-side sync failed (retried via `pending_jobs`; the local `lead_services` mirror still updated)

---

## 6. Recommended UI affordances

- **Default view:** `?status=agents_complete&order=oldest` — the stuck-on-review queue. This is the queue's *primary* job.
- **Stuck filter:** `?age_min_hours=24` — leads older than a day. Useful for triage.
- **Failed bin:** `?status=failed` — separate tab.
- **Pro-only Pax8 view:** `?package=business_pro&status=provisioning` — the leads where the `mark-pax8-done` button matters.
- **Reject and mark-failed both require a reason** — gate the button click behind a reason-input modal; the API will 400 otherwise.
- **Idempotency:** safe to retry on network failure — the backend handles dedup.

---

## 7. Out-of-scope (don't query these from the admin frontend)

| Table / endpoint | Why not |
|---|---|
| `provisioning_status` directly | That's the customer dashboard's source. For staff drilldown use the lead detail's `services[]` instead. |
| `operator_actions` | Audit log written by the backend on each action — there's no read endpoint, and it's intentionally not on the customer surface. If you need an action history view for staff, ask backend to expose a read route. |
| `agent_runs` (intake-side) | Internal/observability table. Not a customer or operator surface. |
| Intake's `/api/internal/leads/*` directly | Server-to-server only. From the browser, always go through `/api/admin/intake/*`. |

---

## 8. Quick reference

| Need | Route |
|---|---|
| List queue (filter + paginate) | `GET /api/admin/intake/leads` |
| Open a single lead | `GET /api/admin/intake/leads/:leadId` |
| Approve scope (the green button) | `POST /api/admin/intake/leads/:leadId/confirm-scope` |
| Reject (route to custom) | `POST /api/admin/intake/leads/:leadId/reject` (body: `{ reason }`) |
| Mark failed | `POST /api/admin/intake/leads/:leadId/mark-failed` (body: `{ reason }`) |
| Mark Pax8 done (Pro only) | `POST /api/admin/intake/leads/:leadId/mark-pax8-done` |
| Override a service tile's state | `POST /api/admin/intake/leads/:leadId/services/:service/override` (body: `{ state, reason, progress_label? }`) |

Open admin deep-link from a Teams notification: `${JAVELINA_APP_URL}/admin/pipelines/[orgId]` (Phase 1.7 convention — keep this URL shape consistent if you change the route structure).
