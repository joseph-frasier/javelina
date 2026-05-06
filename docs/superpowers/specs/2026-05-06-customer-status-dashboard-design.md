# Customer Status Dashboard — Service Tiles

**Status:** Design — pending user approval
**Date:** 2026-05-06
**Author:** Seth (with Claude)
**Branch:** `javelina` → `feat/intake-setup-frontend`
**Supersedes:** 5-milestone progress-card portion of `2026-05-04-customer-build-progress-design.md`. The cross-repo emissions contract from that doc is unchanged and still authoritative on the intake side.

---

## Goal

Replace the mocked `BuildProgressCard` on the customer's per-business dashboard with a live, data-driven **4-service tile dashboard** that renders provisioning state from `GET /api/business/:orgId`. The customer sees one tile per service (`website`, `dns`, `email`, `domain`); each tile narrates itself via `state` + `progress_label` + `metadata.phase`.

This change brings the frontend in line with the per-service model documented in `javelina-intake/docs/customer-dashboard-status-guide.md`, which is now the authoritative integration guide.

## Non-goals (v1)

- Live previews of generated content/colors.
- Customer-triggered retry on failure (operator queue handles it).
- Realtime push (Supabase Realtime / SSE / websockets). Polling only.
- Per-tile activity feed / event log expansion.
- Elapsed-time per tile in v1 (revisit if customers ask; the data is in `events[]` if needed).
- Any change to backend or intake repos. Both have already shipped the integration surface this consumes.

## Source of truth

`GET /api/business/:orgId` on `javelina-backend`. Already wired in `javelina/lib/api/business.ts` as `getBusiness(orgId)`, returning `BusinessDetail` with the existing typed shape:

```ts
provisioning: Array<{
  service: string;          // 'website' | 'dns' | 'email' | 'domain'
  state: string;            // see §State model
  progress_label: string | null;
  metadata: Record<string, unknown>;  // { phase?: string, ... }
  updated_at: string;
  internal_state: string | null;
}>
events: Array<{ ... }>      // last 50 transitions; not consumed by tiles in v1
```

No backend or API-client changes required.

## State model

Six canonical states, per the integration guide §3:

| `state`          | Visual                          | Meaning                                                   |
|------------------|---------------------------------|-----------------------------------------------------------|
| `not_started`    | Greyed placeholder              | No emit yet for this service                              |
| `in_progress`    | Pulsing / spinner               | Active work; `progress_label` narrates                    |
| `needs_input`    | Amber, "we'll let you know"     | Stalled on customer or staff (e.g., Pax8)                 |
| `failed`         | Red, "our team is investigating" | Hard failure                                              |
| `live`           | Green checkmark                 | Done and serving traffic                                  |
| `not_applicable` | Hidden or muted                 | Service skipped for this package                          |

`needs_input` is **not** a failure. Copy must distinguish staff-driven (`pax8_pending`: "our team is on it") from customer-driven (rare today; future).

## The four tiles

Each tile is the same component shape. Headline = service title + state-driven visual; sub-line = `progress_label` rendered verbatim when present; optional phase indicator from `metadata.phase` for icon/step hint.

| Service   | Tile title              | Sub-line source                                           |
|-----------|-------------------------|-----------------------------------------------------------|
| `website` | "Your site"             | `progress_label` (Agents 1/10/12/all-complete narrate today; `securing` lands with JAV-121) |
| `dns`     | "DNS"                   | `progress_label` once JAV-121 ships; placeholder until then |
| `email`   | "Email"                 | `progress_label` once JAV-121 ships; placeholder until then |
| `domain`  | "Domain"                | `progress_label` once JAV-121 ships; placeholder until then |

**Empty-state policy:** render a tile for every service even if it's missing from `provisioning[]`. Treat absence as `state: 'not_started'`. This prevents layout shift as services begin emitting.

**Today's reality (per guide §5):** only `website` narrates phases in production; the others jump `not_started → live` once their workers finish. The dashboard renders that honestly — three quiet tiles is correct, not a bug. Build against the simulator to exercise the target UX.

## Architecture

### Data flow

```
app/business/[orgId]/page.tsx
   │ initial server-side getBusiness()
   ↓
BusinessPlaceholderDashboard (client)
   │ useBusinessPolling(orgId, initialData)
   │   - 5s interval while any tile is in_progress or not_started (with website still pending kickoff)
   │   - stops when no tiles are in_progress and at least one is live/failed/needs_input
   ↓
ServiceStatusGrid (NEW)
   │ derives 4 tiles from provisioning[]
   ↓
ServiceStatusTile × 4 (NEW)
```

### Component boundaries

- **`ServiceStatusGrid`** — pure: takes `provisioning: BusinessDetail['provisioning']`, returns 4 tiles in canonical order (`website`, `dns`, `email`, `domain`). Owns the empty-state defaulting (`not_started` for missing services). Single responsibility: ordering + completeness.
- **`ServiceStatusTile`** — pure: takes a normalized `ServiceTileData`, renders headline + state glyph + sub-line. Owns visual presentation only. Reuses the `Card`, `StateGlyph` style, and typography tokens from the existing `BuildProgressCard.tsx`.
- **`useBusinessPolling`** (hook) — wraps `getBusiness` with `setInterval`. Polls 5s while `shouldPoll(detail)` is true; pauses when tab hidden (`document.visibilityState`); stops when all tiles terminal. Returns `{ data, error, isPolling }`.
- **`lib/business/service-status.ts`** — pure helpers:
  - `normalizeProvisioning(rows)` — maps API rows to `ServiceTileData` for all 4 services, filling missing ones.
  - `shouldPoll(detail)` — boolean, used by the hook.
  - `tileTitle(service)`, `fallbackProgressLabel(service, phase)` — string tables (defensive; guide says render `progress_label` when present).

Each piece is independently testable.

### File changes

```
components/business/dashboard/BuildProgressCard.tsx          DELETE
components/business/dashboard/ServiceStatusGrid.tsx          NEW
components/business/dashboard/ServiceStatusTile.tsx          NEW
components/business/dashboard/useBusinessPolling.ts          NEW
lib/business/build-progress-mock.ts                          DELETE
lib/business/service-status.ts                               NEW
lib/business/service-status.test.ts                          NEW
components/business/dashboard/BusinessPlaceholderDashboard.tsx   EDIT (drop MOCK_MILESTONES, accept initial detail, mount Grid)
app/business/[orgId]/page.tsx                                EDIT (pass server-fetched detail down as initial state)
```

The visual primitives (`StateGlyph`, spinner keyframe, typography, `Card` chrome) move from `BuildProgressCard.tsx` into `ServiceStatusTile.tsx` largely intact. The 6-state expansion adds `needs_input` (amber) and `not_applicable` (muted) glyphs.

## Polling

- **Interval:** 5 seconds. Guide §1 says 5–10s is fine; pick the lower bound for snappy demos.
- **Start condition:** any tile in `in_progress` OR (any tile in `not_started` AND `website.state` is `not_started`/missing — covers the brief post-kickoff window before agents emit).
- **Stop condition:** no tiles `in_progress`, and at least one tile reached a terminal state (`live`/`failed`/`needs_input`). Don't poll forever on a failed lead.
- **Tab visibility:** pause when `document.visibilityState !== 'visible'`; resume on visibility change.
- **Errors:** transient fetch errors are silent; the next interval retries. Persistent error (>3 in a row) surfaces a small "couldn't refresh — last updated Xs ago" line at the bottom of the grid.

## Headline summary

The current card has a single headline ("Your site is live", "We hit a snag", etc.). New equivalent lives above the grid:

- All 4 tiles `live` → "Your business is live."
- Any tile `failed` → "We hit a snag — our team is on it."
- `website.state === 'live'` and others still working → "Your site is live. Finishing up the rest."
- Else → "Setting up your business…"

Keep this dumb and string-table driven; no per-service narrative in the headline.

## Failure & needs_input UX

Per guide §7.4 and §3:

- **`failed`** — red glyph, sub-line: "Our team is investigating." No retry button. The downstream tiles continue rendering as their data dictates (failure on website doesn't poison dns).
- **`needs_input` (`pax8_pending`)** — amber glyph, sub-line: "Pax8 setup in progress — our team is on it." Customer takes no action.
- **`needs_input` (customer-driven, future)** — same amber glyph, but sub-line and CTA come from `progress_label` + a future field. Out of scope for v1; just make sure we render `progress_label` directly so future copy lights up automatically.

## Testing

### Unit (vitest)
- `lib/business/service-status.test.ts` — exhaustive normalization matrix:
  - missing service → `not_started`
  - all 6 states pass through correctly
  - unknown phase → `progress_label` rendered as-is, no fallback applied
  - `not_applicable` filtered/styled correctly
- `shouldPoll` — table-driven: confirms start/stop conditions across realistic `provisioning[]` snapshots.

### Component (vitest + RTL)
- `ServiceStatusTile` — snapshot per state (6 states × visual treatments).
- `ServiceStatusGrid` — given a sparse `provisioning[]`, renders 4 tiles in canonical order.

### Manual E2E
Per guide §6, drive with the simulator (no LLM cost):

```bash
cd javelina-intake
scripts/simulate-pipeline.sh <real_org_id> happy_path 4000
```

Acceptance:
1. **`happy_path`** — all 4 tiles transition `not_started → in_progress → live` over the simulator's run; phase labels narrate as they arrive; polling stops when everything's `live`.
2. **`pro_pending`** — email tile parks at `needs_input` ("Pax8 setup…"); other tiles reach `live`; polling stops because no tile is `in_progress`.
3. **`agent_failure`** — website tile flips to `failed`; other tiles still progress; headline shows snag copy.
4. **`transfer_pending`** — domain sits in `transfer_polling` for an extended interval; spinner doesn't time out (per guide §7.3).

The `<real_org_id>` must be an org Seth has created end-to-end via the wizard so `/business/[orgId]` resolves. The smoke test in `javelina-intake/docs/smoke-test-pipeline.md` uses random `uuidgen` org_ids and is **not** suitable for UI testing without seeding a matching `businesses` row first.

## Migration / rollout

- **No DB or API changes.**
- **No feature flag.** The new card replaces the mock card immediately on this branch. Pre-emit window simply shows 4 `not_started` tiles, which is the desired behavior.
- **Order of merge:** standalone PR on `feat/intake-setup-frontend`. Independent of intake/backend work.

## Open items

1. **Tile order on small viewports.** Canonical order is `website, dns, email, domain` (most-to-least customer-narrative-rich today). At mobile width, do tiles stack in that order or reflow? Default: stack in canonical order.
2. **`not_applicable` rendering.** Some packages may not include email; spec says muted/hidden. Confirm whether to hide entirely vs. render with "Not included in your plan." Default: render muted with that copy — discoverability beats concealment.
3. **Headline copy when website is `live` but others lag.** Current proposal: "Your site is live. Finishing up the rest." Open to wordsmithing.
4. **Polling pause on failure.** Currently stops when any tile is terminal. Should we keep polling if `failed` tiles might transition out of failure (e.g., operator retries)? Default: no — stop on terminal; user can refresh manually.

## Appendix: contract clauses honored

- Integration guide §1 — uses `GET /api/business/:orgId` with session auth (no `X-API-Key`).
- Guide §2 — renders one tile per service.
- Guide §3 — visual treatment keys off `state`, not `progress_label`.
- Guide §4 — renders `progress_label` directly; uses `metadata.phase` only as a stable token.
- Guide §5 — built against the simulator (target UX), tolerant of today's website-only narration.
- Guide §7.1 — trusts whatever the row currently says; no client-side phase ordering tricks.
- Guide §7.2 — defaults missing services to `not_started`.
- Guide §7.5 — never reads `agent_runs`, `operator_actions`, or `leads`.
