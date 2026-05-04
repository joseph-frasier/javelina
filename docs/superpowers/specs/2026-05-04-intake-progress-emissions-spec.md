# Intake App: Build Progress Emissions

**For:** `javelina-intake` repo owner
**Status:** Spec — pending implementation
**Date:** 2026-05-04
**Contract reference:** `PIPELINE_CONTRACT.md` §3 (integration surface), §6 (sync endpoint), §8 (Inngest events), §9 (idempotency)

---

## What this is

A small, additive instrumentation change in `javelina-intake` so the customer's dashboard on Javelina can show live build progress as agents complete their work.

**This change adds zero new endpoints, zero new schemas, zero new dependencies.** It only adds calls to the existing `syncToJavelina()` helper at additional points in the existing pipeline.

## Why it's needed

Today, `syncToJavelina()` is only called from two places:

- `kickoff/route.ts` — initial "Waiting on intake form" on all 4 services
- `intake-submission/route.ts` — "Intake received, review pending" on all 4 services

After form submission, the customer dashboard sits at "Intake received, review pending" until the worker pipeline starts moving DNS/domain. There's a multi-minute window where agents are running but the customer sees no progress. The contract's `progress_label` + `metadata` fields on the sync payload are the designed-for slot for this narrative — they just aren't being driven.

## What to add

Four new `syncToJavelina()` calls hooked to existing Inngest events. All targeting the `website` service.

| # | Inngest event (existing)        | Where to call from                                                                 | Sync payload                                                                                                                                                                                                                  |
|---|---------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1 | `intake/form.submitted`         | The handler that already exists on this event (e.g., `on-form-submitted` or wherever fan-out starts) | `{ org_id, service: "website", state: "in_progress", progress_label: "Researching your industry, audience, and competitors", metadata: { phase: "understanding" }, event_id: "${lead_id}:website:phase:understanding" }`     |
| 2 | `agent/10.completed`            | Either `agent-10-run` on success, or a small dedicated handler that listens for this event | `{ org_id, service: "website", state: "in_progress", progress_label: "Generated page-by-page copy for your site", metadata: { phase: "content" }, event_id: "${lead_id}:website:phase:content" }`                          |
| 3 | `agent/12.completed`            | Same pattern as #2                                                                 | `{ org_id, service: "website", state: "in_progress", progress_label: "Picked your palette and typography", metadata: { phase: "design" }, event_id: "${lead_id}:website:phase:design" }`                                    |
| 4 | `intake/agents.all-complete`    | The handler that already exists on this event (`on-form-submitted` resume per §8)  | `{ org_id, service: "website", state: "in_progress", progress_label: "Assembling your pages from copy and design", metadata: { phase: "building" }, event_id: "${lead_id}:website:phase:building" }`                       |

**Notes:**

- `org_id` for each call comes from the `leads` row associated with `lead_id`.
- `state` stays `in_progress` for all four. The existing worker pipeline is the only thing that flips `website` to `live` later.
- `event_id` is deterministic per `(lead_id, phase)` — meets contract §9 Pattern A. Replays/retries are no-ops on the Javelina side.
- Always go through `syncToJavelina()` per contract §6 caller invariants. Don't POST directly.
- All four calls are best-effort. If one fails it enqueues to `pending_jobs` per existing helper behavior.

## Exact copy reference

The customer-facing strings are designed to read calmly and be content-free of internal terminology. Please use these strings verbatim — the dashboard derives milestone labels from them:

| Phase           | progress_label                                            |
|-----------------|-----------------------------------------------------------|
| `understanding` | `Researching your industry, audience, and competitors`    |
| `content`       | `Generated page-by-page copy for your site`               |
| `design`        | `Picked your palette and typography`                      |
| `building`      | `Assembling your pages from copy and design`              |

Feel free to wordsmith — but if you change them, ping me so the dashboard can adjust matching/copy fallbacks.

## Why agents 2, 3, 5 don't get their own phase

Per the contract §8, agents 2/3/10/12 fan out in parallel after form submission, with agent 5 gated on agent 2. Agents 2, 3, and 5 are research/sales artifacts that aren't customer-build-relevant; their work is folded under the "understanding" phase from the customer's perspective. Agents 10 (Composer / copy) and 12 (Stylist / design) are the customer-visible build agents and each get a phase.

If a future agent runs in this window and *is* customer-relevant, add a new phase value and let me know — the frontend treats unknown phases gracefully and we can wire the milestone copy at that point.

## Idempotency contract

Per `PIPELINE_CONTRACT.md` §9 Pattern A:

- `event_id` is `${lead_id}:website:phase:${phase}` — stable across retries.
- A repeat call with the same `event_id` is a no-op on the Javelina side (insert into `pipeline_events.external_event_id` returns `already_applied`).
- Inngest step retries can fire any of these emits more than once; that's fine.

## Failure mode

- A failed sync call enqueues to `pending_jobs` (existing `syncToJavelina` behavior). The dashboard will catch up on the next successful sync.
- The customer-visible phase is allowed to lag actual agent state by one retry cycle — acceptable for v1.
- Failures inside the agents themselves (`agent/{N}.failed`) are out of scope for this spec; the existing `intake/agents.partial-complete` handler that transitions the lead to `failed` will surface to the operator queue, and the operator queue handles recovery. The customer dashboard will still show "in_progress" until the operator resolves; richer customer-facing failure UX is a follow-up.

## Out of scope

- No new endpoints, routes, schemas, or migrations.
- No changes to existing agents' internal logic — only instrumentation around them.
- No `agent_runs` exposure to Javelina — `agent_runs` stays internal per contract §12.
- No customer-facing failure copy changes (covered separately on the Javelina side if/when needed).

## Testing

Two manual test cases on the dev environment, after the change is deployed:

1. **Happy path:** submit a wizard end-to-end. Watch `provisioning_status` for `org_id` on the Javelina side (or the customer dashboard once it's wired) — expect to see `metadata.phase` advance through `understanding → content → design → building` over the course of agent execution.
2. **Replay safety:** call `syncToJavelina()` with the same `event_id` twice in a row. Expected response from Javelina: `{ status: "already_applied" }`. Confirms the idempotency gate.

No new automated tests strictly required — `syncToJavelina()` itself is already tested, and these calls are configuration-shaped instrumentation.

## Footprint summary

- **0 new files**
- **0 schema changes**
- **0 changes** to existing endpoints, helpers, env, or middleware
- **0 new dependencies**
- **4 new `syncToJavelina()` call sites** in existing handlers
