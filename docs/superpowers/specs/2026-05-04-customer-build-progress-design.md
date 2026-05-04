# Customer Build Progress on Intake Dashboard

**Status:** Design — pending user approval
**Date:** 2026-05-04
**Author:** Seth (with Claude)
**Branches:** `javelina` → `feat/intake-setup-frontend`; `javelina-backend` → `feat/intake-setup`

---

## Goal

After a customer completes the setup wizard, their dashboard should show live progress as their site is being built. The feature serves three goals (in priority order):

1. **Trust / transparency** — keep customers confident during the build wait so they don't churn.
2. **Reduce support load** — preempt "is anything happening?" tickets.
3. **Demo / wow factor** — visible signal that AI is doing real work on their behalf.

This is **read-only and informational**. No customer-actionable steps in v1.

## Non-goals (v1)

- Live previews of generated content/colors (future).
- Customer-triggered retry on failure (operator queue handles failures).
- Per-agent expand-detail toggle in the customer dashboard.
- Realtime push (Supabase Realtime). Polling is good enough.
- Any change to the integration contract between `javelina` and `javelina-intake`.

## Pipeline contract alignment

This design is constrained by `PIPELINE_CONTRACT.md` (cross-repo authoritative integration spec). Key invariants honored:

- **§3 — exactly four integration surfaces.** No new endpoints between repos.
- **§2 + §12 — `agent_runs` is internal to the intake app.** Not surfaced to customers.
- **§1 + §6 — the customer dashboard reads from `provisioning_status` (Javelina-side).** Single data source.
- **§6 — `progress_label`, `message`, `metadata` are the customer-safe narrative slots.** This design uses them.

The contract designed the seam exactly for this use case. The feature drops into the existing plumbing without expanding the integration surface.

## Approach

Use the existing sync surface. The intake app will call `syncToJavelina()` more frequently from inside agent runners, with rich `progress_label` text and a `metadata.phase` discriminator on the `website` service. The Javelina backend already persists those fields. The Javelina frontend reads them via the existing `getBusiness` endpoint and renders a milestone view.

### Data flow (no new endpoints)

```
javelina-intake agent runner (e.g., Agent 10)
   │  on start:
   │    syncToJavelina({
   │      org_id, service: "website",
   │      state: "in_progress",
   │      progress_label: "Writing your content",
   │      metadata: { phase: "content" },
   │      event_id: `${lead_id}:website:phase:content:start`,
   │    })
   ↓
javelina-backend  POST /internal/provisioning-status   (existing, contract §6)
   - inserts pipeline_events row (idempotent on event_id)
   - upserts provisioning_status (org_id, service: 'website')
        with new progress_label + metadata
   ↓
customer browser  polls GET /api/business/:orgId   (existing)
   - returns provisioning[] including the website row
   ↓
BuildProgressCard re-renders the milestone bar
```

### Customer-facing milestone view (lean, 5 milestones)

Milestones are derived in the frontend from `provisioning.website.metadata.phase` plus the canonical states of the `dns` and `domain` services.

| # | Milestone label                  | Driven by                                                          | Customer-safe progress copy                              |
|---|----------------------------------|--------------------------------------------------------------------|----------------------------------------------------------|
| 1 | Understanding your business       | `website.metadata.phase` reaches `understanding` or later          | "Researching your industry, audience, and competitors"   |
| 2 | Writing your content              | `website.metadata.phase` reaches `content` or later                | "Generating page-by-page copy for your site"             |
| 3 | Designing your look & feel        | `website.metadata.phase` reaches `design` or later                 | "Picking a palette and typography from your brand"       |
| 4 | Building your site                | `website.metadata.phase` reaches `building` or `website.state=live` | "Assembling your pages from copy and design"             |
| 5 | Connecting your domain            | `dns.state` and `domain.state` (existing worker pipeline)          | (driven by `progress_label` already emitted by workers)  |

**Data the frontend uses:**
- `provisioning.website` — current state, `progress_label`, `metadata.phase` (the most recent phase).
- `events[]` filtered to `service === 'website'` — the full historical sequence of phase emits. Each phase emit produces a `pipeline_events` row carrying `metadata.phase`. The set of phases ever seen for this org is `seenPhases = new Set(events.filter(e => e.service==='website' && e.metadata?.phase).map(e => e.metadata.phase))`.

**State-derivation rules (frontend, applied in order):**

- If `website.state === 'live'` → all 4 build milestones `done`.
- Else if `website.state === 'failed'` → milestones whose phase is NOT in `seenPhases` AND comes at-or-after the failure point show "hit a snag" copy; milestones whose phase IS in `seenPhases` remain `done`.
- Else (in-progress build):
  - Milestone 1 (Understanding) — `done` if `seenPhases` contains any of `understanding | content | design | building` (i.e., agents have started); else `pending`.
  - Milestone 2 (Writing your content) — `done` if `seenPhases.has('content')` or any later phase; `running` if `seenPhases.has('understanding')` and not done; else `pending`.
  - Milestone 3 (Designing your look & feel) — `done` if `seenPhases.has('design')` or `building`; `running` if `seenPhases.has('understanding')` and not done; else `pending`.
  - Milestone 4 (Building your site) — `done` only when `website.state === 'live'`; `running` if `seenPhases.has('building')`; else `pending`.
- Milestone 5 (Connecting your domain) is independent of phases: `done` when both `dns.state` and `domain.state` are `live`; `running` when either is `in_progress`; `failed` when either is `failed`; else `pending`.

This gives accurate per-agent granularity (agent 10 and agent 12 can complete in any order; their respective milestones flip independently) while only requiring the intake side to emit one `phase` value per sync call.

## What needs to change

### A. `javelina-intake` (one ask of the intake repo owner)

> **Self-contained spec for the intake repo owner:** [`2026-05-04-intake-progress-emissions-spec.md`](./2026-05-04-intake-progress-emissions-spec.md). The summary below mirrors that doc.

Instrument the agent runners (and the deterministic worker pipeline as it ships) to emit `syncToJavelina()` calls at phase boundaries on the `website` service. The existing helper handles retries and the local `lead_services` mirror.

**Required new sync calls.** Triggered by existing Inngest events (per contract §8) so the intake-side change is purely additive instrumentation, not new orchestration:

| Trigger (Inngest event)        | service   | state         | progress_label                          | metadata                     | event_id pattern                                  |
|--------------------------------|-----------|---------------|-----------------------------------------|------------------------------|---------------------------------------------------|
| `intake/form.submitted`        | `website` | `in_progress` | "Researching your industry…"            | `{ phase: "understanding" }` | `${lead_id}:website:phase:understanding`          |
| `agent/10.completed`           | `website` | `in_progress` | "Generating page-by-page copy…"         | `{ phase: "content" }`       | `${lead_id}:website:phase:content`                |
| `agent/12.completed`           | `website` | `in_progress` | "Picking a palette and typography…"     | `{ phase: "design" }`        | `${lead_id}:website:phase:design`                 |
| `intake/agents.all-complete`   | `website` | `in_progress` | "Assembling your pages…"                | `{ phase: "building" }`      | `${lead_id}:website:phase:building`               |
| Worker pipeline (existing)     | `dns`/`domain` | per worker | per worker                            | per worker                   | per worker (no change)                            |

Why these triggers:
- `intake/form.submitted` is the natural boundary for "understanding" — agents 2/3/5/10/12 fan out from there in parallel.
- Tying "content" and "design" to `.completed` events (not `.run`) means the milestone flips to *done* when the work finishes. Until that fires, milestone 1 is `done`, 2 and 3 both render as `running` simultaneously (which is honest — both agents are working in parallel).
- `intake/agents.all-complete` is the documented post-agent join in §8.
- Agents 3 and 5 don't have customer-facing phases — their work is folded under "understanding" since they run in parallel with Agent 2.

Notes:
- The `state` field stays `in_progress` for all four phase transitions. Only the worker pipeline (already present) flips to `live` on completion.
- Event ids are deterministic per `(lead_id, phase)` so retries are idempotent — meets contract §9 Pattern A.
- **Phase ordering is monotonic on the read side** — the frontend treats `understanding < content < design < building` and never rewinds. Even if events arrive out of order (e.g., `agent/12.completed` before `agent/10.completed` due to retry timing), the frontend keeps the highest-seen phase as authoritative.
- Phase emission is best-effort. If a sync call fails it enqueues to `pending_jobs` per the contract; the dashboard will catch up on next successful sync.

This is **strictly additive** within the contract — no new endpoints, no schema changes, no event-name changes. Per contract §6 caller invariants: the intake app uses the existing helper, generates deterministic event ids, and stays inside the canonical-state enum.

### B. `javelina-backend` (small read-side change)

**Zero changes to integration code.** The existing `internalController.syncProvisioningStatus` already persists `progress_label` and `metadata` to `provisioning_status` and `pipeline_events`. No write-path changes.

**One read-side change in `getBusiness` (`businessIntakeController.ts`):**
- Extend the `pipeline_events` SELECT to include `metadata` (currently selects `id, service, previous_state, new_state, message, actor_type, created_at`). The frontend needs `metadata.phase` from historical events to derive the milestone state — adding the column to the SELECT is the entire change.
- Extend the `getBusiness` response TypeScript types so `events[].metadata` and `provisioning[].metadata` are typed.

That's the only required change in `javelina-backend`. Two-line diff plus types.

### C. `javelina` frontend (the actual feature work)

New component and supporting wiring on `feat/intake-setup-frontend`:

```
components/business/dashboard/BuildProgressCard.tsx     # NEW
lib/business/build-progress.ts                          # NEW — derives milestones from provisioning
lib/business/build-progress.test.ts                     # NEW — unit tests for the derivation
app/business/[orgId]/page.tsx                           # mount BuildProgressCard
lib/api/business.ts                                     # extend Provisioning type with metadata.phase
```

**Component behavior:**
- Reads provisioning data from the existing `getBusiness` query.
- Derives 5 milestones via `lib/business/build-progress.ts` per the rules above.
- Renders each milestone with: label, current state (pending / running / done / failed), descriptive `progress_label` line (option B from brainstorming), elapsed-time hint when running.
- Polls `getBusiness` every 5s while any milestone is `pending` or `running`. Stops polling when all 5 are `done` or the user navigates away.
- On `failed`, shows a neutral "Hit a snag — our team is on it" line on the affected milestone; downstream milestones continue rendering as pending. No retry button.
- Already-complete builds (all 5 `done`) load static and don't poll.

**Failure UX** — operational-first:
- Failure copy is generic and non-blocking. The operator queue handles real recovery; the customer sees calm reassurance.

## Testing

- **Backend** — no integration changes, but verify with one fixture-driven test that `getBusiness` round-trips `metadata.phase` and `progress_label` through the JSON response (probably already covered by existing tests; check before adding).
- **Frontend (unit)** — `lib/business/build-progress.ts` derivation matrix: every (state, phase) combination across 4 services produces the expected milestone shape. Snapshot tests for `BuildProgressCard` for each terminal state.
- **Frontend (manual E2E)** — submit wizard end-to-end on dev, manually call the existing sync endpoint with each phase value, watch the dashboard transition. Acceptance: each phase change shows up within one polling interval (5s).

## Migration / rollout

- **No DB migrations.**
- **Feature flag:** none required for v1; the dashboard simply shows the existing static rendering until phase data starts arriving.
- **Order of merge:** frontend can ship first — it gracefully renders the existing pre-phase state. Intake-side instrumentation can land independently and the dashboard lights up as new sync events flow in.

## Open items

1. **Phase value vocabulary** — the design uses `understanding | content | design | building`. Confirm with intake repo owner that these names are acceptable in the cross-repo `metadata` shape (per contract §10 the `metadata` field is open; no version bump needed).
2. **Domain modes branching milestone 5 copy** — the contract §11 distinguishes `register` / `transfer` / `connect`. v1 can show a single generic "Connecting your domain" line; richer copy per mode is a follow-up.
3. **Empty/initial state** — what does the dashboard show in the brief window between Stripe checkout and the kickoff sync? Probably "Getting started…" with all milestones pending. Confirm copy.

## Appendix: contract clauses honored

- §1.1 — Customer-facing surfaces remain on Javelina; intake app remains UI-less.
- §2 — Customer dashboard reads `provisioning_status` (Javelina), no cross-project DB reads.
- §3 — No new integration surface; uses existing surface #4 (Intake → Javelina sync).
- §6 — Caller uses `syncToJavelina()` helper, not direct POST; deterministic `event_id`; canonical-state enum unchanged.
- §9 Pattern A — Idempotency via deterministic event_ids per `(lead_id, phase)`.
- §10 — No agent-output schema changes; `metadata` field is contract-allowed open shape.
- §12 — `agent_runs` stays internal; not consumed by Javelina.
