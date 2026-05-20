# Admin Pipeline-Detail Page — Redesign Spec

For the frontend dev working in `javelina`. Spec for restructuring `app/admin/pipelines/[leadId]/page.tsx` from a flat agent-card stack into service-grouped accordion sections.

> **Why now:** today the page works for MVP-stage leads with 6 agents. Once JAV-121 ships, the page also has to surface 8 deterministic provisioning workers (Domain Provisioner, Transfer Coordinator, Zone Configurator, Propagation Verifier, Certificate Issuer, OMA / Pax8 / Domain Verification). A flat stack of 14+ cards with no organization is unusable. Tabs hide context. Service-grouped accordions keep everything scannable in one scroll while collapsing what doesn't matter for the current lead state.

---

## 1. Current state

**Route:** `app/admin/pipelines/[leadId]/page.tsx` (client component, fetches via `adminApi.intake.getLead(leadId)` on mount).

**Currently renders (top → bottom):**

1. `AdminPageHeader` — title, email, breadcrumb
2. `LeadStateHeader` — status badge, age, cost, timestamp grid
3. `OperatorActions` — Confirm scope / Reject / Mark failed buttons
4. `ServicesPanel` — flat list of `LeadService[]` rows ("Customer-facing service status"). Currently shows "No service rows yet." for the demo lead because `lead_services` is empty pre-provisioning.
5. **Flat stack of 6 agent cards:** ScribeCard, ScoutCard, MatchmakerCard, StrategistCard, ComposerCard, StylistCard — each wrapped in `CollapsibleCard`.

Subcomponents live in `app/admin/pipelines/_components/`. `AgentCards/GenericAgentCard.tsx` is the reusable jsonb renderer; `ScribeCard.tsx` is the only one with bespoke structured rendering.

## 2. The problem

- **Two different things mixed.** Service state (what the customer sees) lives in `ServicesPanel`. Artifacts (what produced that state) live in the agent cards. They're rendered in separate panels but they're describing the same thing from different angles. Operators have to mentally join them.
- **Empty content is non-recoverable.** When `lead_services` is empty (early lifecycle), the `ServicesPanel` just says "No service rows yet." and gives nothing to look at. The agent cards below are unrelated to services so they don't fill the gap.
- **Scales badly.** 6 agents today; 14+ runners (agents + workers) once JAV-121 lands. With no grouping, the page becomes a wall.
- **Decision-context is flat.** An operator reviewing scope (`agents_complete`) cares only about Foundation agents (1, 2, 3, 5). An operator looking at a stuck `provisioning` lead cares only about which service is stuck. The current layout shows everything with equal emphasis regardless of state.

## 3. Available primitives (no new deps)

Confirmed by surveying `/components/ui/`:

| Primitive | Status | Use for |
|---|---|---|
| `CollapsibleCard` | ✅ exists, GSAP-animated, localStorage-persisted via `storageKey` | each service section |
| `Card` | ✅ | section frames inside the collapsibles |
| `Button` | ✅ | section header expand chevron (already on `CollapsibleCard`) |
| `AdminStatusBadge` | ✅ (already used in `ServicesPanel`) | service-state badge in section header |
| `Tooltip` | ✅ | timestamps, "not yet built" markers |
| `lucide-react` | ✅ | icons (Globe, Server, Mail, Link2 for services) |

**Tailwind 3.4** with semantic tokens (`success`, `warning`, `danger`, `info`, brand orange). Dark theme is default.

**No Accordion or Tabs primitive** — `CollapsibleCard` is the closest; treat it as the building block.

## 4. Proposed layout

Replace `ServicesPanel` + the flat agent stack with **5 service-grouped accordion sections**, each a `CollapsibleCard`. Each section's header *is* the customer-dashboard tile (state badge + progress label + last-updated). Inside, the agents/workers that contributed to that service.

```
┌─ Foundation                                     ✓ 4/4 complete  · 5d ago ─┐ [expanded by default if status=agents_complete]
│  ▸ Scribe        (Agent 1 · lead_record)              ✓ done            │
│  ▸ Scout         (Agent 2 · research_report)          ✓ done            │
│  ▸ Matchmaker    (Agent 3 · similarity_report)        ✓ done            │
│  ▸ Strategist    (Agent 5 · upsell_risk_report)       ✓ done            │
└────────────────────────────────────────────────────────────────────────────┘

┌─ Website         ⏳ in progress · "Generated page-by-page copy"  · 2m ago ─┐ [expanded if state=in_progress|failed|needs_input]
│  ▸ Composer      (Agent 10 · copy_prep — copy + structure) ✓ done        │
│  ▸ Stylist       (Agent 12 · design_prep)                  ✓ done        │
│  ▸ Site Builder  (Agent · JAV-126 — assembles site files)  — not yet built │
│  ▸ Deploy        (Worker · JAV-127 — GitHub + Vercel)      — not yet built │
│  ▸ Certificate Issuer (Worker · JAV-121 §3.5)              — not yet built │
└────────────────────────────────────────────────────────────────────────────┘

┌─ DNS             ⚪ not_started                                            ─┐ [collapsed]
│  ▸ Zone Configurator       (Worker · JAV-121 §3.3)                        │
│  ▸ Propagation Verifier    (Worker · JAV-121 §3.4)                        │
└────────────────────────────────────────────────────────────────────────────┘

┌─ Email           ⚪ not_started                                            ─┐ [collapsed]
│  ▸ OMA Provisioner         (Starter · Worker · JAV-121 §3.6)              │
│  ▸ Pax8 Escalator          (Pro · Worker · JAV-121 §3.7)                  │
│  ▸ Domain Verification     (Worker · JAV-121 §3.8)                        │
└────────────────────────────────────────────────────────────────────────────┘

┌─ Domain          ⚪ not_started                                            ─┐ [collapsed]
│  ▸ Domain Provisioner      (Worker · JAV-121 §3.1)                        │
│  ▸ Transfer Coordinator    (Worker · JAV-121 §3.2)                        │
└────────────────────────────────────────────────────────────────────────────┘
```

### 4a. Section header — what to show

Each accordion header is a row with three regions:

| Left | Center | Right |
|---|---|---|
| Service icon + name (Globe/Server/Mail/Link2 from lucide; "Foundation" gets a Sparkles or Layers icon) | `progress_label` if `state === "in_progress"`, otherwise a static summary like "4/4 agents complete" or "—" if not started | `AdminStatusBadge` (state-driven variant) + relative timestamp from `updated_at` |

State → badge variant mapping:

| `state` | Badge variant | Icon hint |
|---|---|---|
| `not_started` | `neutral` (grey) | dot |
| `in_progress` | `info` (blue) | spinner |
| `needs_input` | `warning` (amber) | alert-circle |
| `failed` | `danger` (red) | x-circle |
| `live` | `success` (green) | check-circle |
| `not_applicable` | `neutral` muted | minus |

**Foundation has no `provisioning_status` row** (it's not a customer-facing service). Compute its header state synthetically:
- All Foundation agents have `agent_runs.status === "succeeded"` → `success` badge
- Any Foundation agent has `status === "failed"` → `danger`, expand by default
- Any still running / pending → `in_progress`
- All `pending` → `not_started`

### 4b. Section body — what to show

Inside each accordion, render one collapsible row per **runner** (agent OR worker). Each runner row has:

- **Identifier:** `Agent N` or `Worker · JAV-121 §X.Y`
- **Display name:** Scribe / Scout / Site Builder / Zone Configurator / etc.
- **Output column ref:** `(lead_record)`, `(copy_prep)`, etc. — only if the runner produces a stored artifact
- **Status:** ✓ done / ⏳ running / ✗ failed / — not yet built (from `agent_runs` for agents; from a future workers table for workers)
- **Expandable detail:** for completed agents, the existing `GenericAgentCard` jsonb renderer for the runner's output column. For workers, a placeholder for now.

**"Not yet built" rows** are deliberate — they show the customer the planned full pipeline, and they let the operator see at a glance "this lead is waiting on X that doesn't exist yet." Mark them visually distinct (italics, muted) but don't hide them.

### 4c. Auto-expand rules

The point of the redesign is to put the right thing in front of the operator without making them click. Default expansion based on lead status:

| Lead `status` | Foundation | Service sections |
|---|---|---|
| `created` / `form_submitted` | expanded | all collapsed |
| `agents_complete` (awaiting review) | **expanded** | all collapsed |
| `scope_confirmed` / `provisioning` | collapsed | expand any with `state in ("in_progress", "needs_input", "failed")` |
| `live` | collapsed | all collapsed |
| `routed_to_custom` / `abandoned` | expanded | all collapsed |
| `failed` | collapsed | force-expand any with `state === "failed"` |

**Override:** any service section with `state === "failed"` or `"needs_input"` force-expands regardless of lead status. Operators must see those.

`CollapsibleCard` already persists open/close state in localStorage via its `storageKey` prop. The auto-expand rules are *defaults* — operator overrides should stick. Suggest keying storage as `pipeline:${leadId}:section:${service}` so each lead's manual overrides are isolated.

## 4d. Operator override controls (JAV-128)

Each service section header gets an overflow menu (`⋯`) — a small icon-button to the right of the state badge. Clicking it opens a dropdown with override actions. This is the UI surface for the JAV-128 endpoint (`POST /api/admin/intake/leads/:leadId/services/:service/override`).

### Menu items (per ticket, v1 ships only the first two)

- **Mark live** — operator handled provisioning manually outside the system
- **Mark not applicable** — service skipped for this customer
- **Mark failed** *(defer to v1.1 unless scope allows)* — surface a hard failure
- **Mark needs input** *(defer to v1.1 unless scope allows)* — flag back to customer

`not_started` and `in_progress` are **not** offered as menu items — those should only come from worker activity. Don't expose them in the UI.

### Where the menu lives

```
┌─ Email           ⏳ in progress · "Verifying domain"   · 2m ago  [⋯] ─┐
│  ▸ OMA Provisioner   …                                                │
│  …                                                                    │
└────────────────────────────────────────────────────────────────────────┘
                                                              ▲
                                                   click opens dropdown:
                                                   • Mark live
                                                   • Mark not applicable
                                                   ────
                                                   • Mark failed *(v1.1)*
                                                   • Mark needs input *(v1.1)*
```

Same overflow menu shape on every service tile (Foundation **excluded** — Foundation is internal, not customer-facing, no override).

### Confirmation modal

Each menu item opens a modal — never fires the override directly. Modal contents vary by target state:

#### `Mark live` and `Mark not applicable`

```
┌──────────────────────────────────────────────────────────────┐
│ Mark email as live                                       [X] │
│                                                              │
│ The customer's dashboard will immediately show this          │
│ service as live. This is logged in the audit trail and       │
│ tagged "admin" in the activity feed.                         │
│                                                              │
│ Customer will see:                                           │
│   ┌────────────────────────────────────────────────────┐     │
│   │ ✓ Email                                       Live │     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│ Reason (required, internal — not shown to customer):         │
│   ┌────────────────────────────────────────────────────┐     │
│   │ manually provisioned mailbox via M365 admin console│     │
│   └────────────────────────────────────────────────────┘     │
│                                                              │
│   ⚠️  When automation for this service ships, future runs    │
│      may overwrite this state.                               │
│                                                              │
│                              [Cancel]  [Mark live]           │
└──────────────────────────────────────────────────────────────┘
```

Single field: `reason`. The customer-facing label is locked to `"Live"` (or `"—"` for `not_applicable`) — operator can't customize it. Show that locked preview prominently so they know exactly what the customer will see. Submit button matches the action verb ("Mark live" / "Mark not applicable").

#### `Mark failed` and `Mark needs input` (when v1.1 ships)

Two fields instead of one:

- **`Customer message`** — required. The exact text the customer will see on the tile (becomes `progress_label`).
- **`Reason (internal)`** — required. The audit-log entry for staff reference.

Modal preview reflects whatever the operator types in `customer_message` so they can see the customer-facing copy live as they type.

### Submit behavior

1. Disable the confirm button + show inline spinner
2. Call the backend forwarder: `POST /api/admin/intake/leads/:leadId/services/:service/override` with the body:
   ```jsonc
   { "state": "live", "reason": "...", "progress_label": "..." /* only for failed/needs_input */ }
   ```
3. **On 200:** optimistically update the tile (state badge + progress label flip immediately) + refetch lead detail in the background to pull the new `pipeline_events` row into the activity feed. Close modal.
4. **On 400 (validation):** show inline error in the modal next to the bad field, leave modal open. Should be rare since the UI prevents most invalid combinations, but defensive UX is cheap.
5. **On 502 (sync failed but local mirror updated):** close modal, show a non-blocking toast: *"Override applied locally — Javelina sync failed and will retry. Customer dashboard may not reflect this yet."* The customer dashboard reads from Javelina, so this is honest about the divergence. The retry happens via the existing `pending_jobs` machinery on the intake side; operator doesn't need to do anything.
6. **On 5xx (full failure):** close modal, show error toast: *"Override failed. Try again, or contact engineering if this persists."* Don't optimistically update the tile.

### Visual treatment

- Menu trigger: small `MoreHorizontal` lucide icon button, ghost variant. Only visible on hover/focus of the section header (don't clutter the default render).
- Modal: existing `Modal` / `ConfirmationModal` primitive in `components/ui/`. The reason input is a single-line `Input`. The customer-message field (when shown) is a multi-line `Textarea`.
- Confirm button color: orange for `live` (positive action), red for `failed`, neutral for `not_applicable` and `needs_input`.

### Don't show overrides in the admin UI as "different"

The admin UI should render an override-driven state the same way it renders an automated one (same badge, same color). The distinction shows up only in:
- The **activity feed** (`pipeline_events.actor_type === "admin"` rows can be tagged with a small "Manual" pill)
- The **operator_actions audit log** (separate query, not on the main tile view)

Operators don't need a constant reminder that they overrode a tile — they just need it to look correct. The audit trail is for retrospective review.

### Don't surface this on the customer dashboard

The customer dashboard reads `provisioning_status` from `javelina-backend`. After an override, those rows are identical to ones a worker would have written. The customer never sees "operator manually marked this live" — they just see "Live." That's intentional; the override is a stand-in for automation, not a separate concept.

## 5. Component breakdown

Suggested file structure inside `app/admin/pipelines/_components/`:

```
PipelineDetail/
├── ServiceSection.tsx          ← new wrapper: CollapsibleCard + header layout
├── RunnerRow.tsx               ← new: one row per agent/worker inside a section
├── ServiceSectionHeader.tsx    ← new: icon + name + progress label + badge + timestamp
├── FoundationSection.tsx       ← new: composes ServiceSection with agents 1/2/3/5
├── WebsiteSection.tsx          ← new: composes with agents 10/12 + site builder + deploy + SSL
├── DnsSection.tsx              ← new: composes with JAV-121 §3.3/§3.4 workers
├── EmailSection.tsx            ← new
├── DomainSection.tsx           ← new
└── AgentCards/                 ← KEEP — these are the per-agent jsonb detail components,
                                   reused inside RunnerRow when a runner has output to render
```

`ServicesPanel.tsx` becomes vestigial — its content is absorbed into the section headers. Delete after migration.

`LeadStateHeader` and `OperatorActions` stay as-is at the top of the page; they're not part of this redesign.

### Section composition pattern

`ServiceSection` is the dumb wrapper:

```tsx
<ServiceSection
  service="website"            // or "foundation"
  state={websiteState}          // from provisioning_status row, or synthesized for Foundation
  progressLabel={...}
  updatedAt={...}
  defaultExpanded={shouldExpand("website", leadStatus, websiteState)}
>
  <RunnerRow runner={agent10} ... />
  <RunnerRow runner={agent12} ... />
  <RunnerRow runner={siteBuilderWorker} ... />
  <RunnerRow runner={certificateIssuerWorker} ... />
</ServiceSection>
```

Concrete `WebsiteSection.tsx` etc. wire up the specific runner list per service. This keeps the "which runners belong to which service" decision in one place.

## 6. Data shape — current + planned

The current `getLead(leadId)` response (`{ lead, services }`) is enough to ship the redesign immediately. Two known gaps, both with explicit follow-up plans:

### 6.1 Per-agent status — synthesize now, JAV-125 will replace

**Ship today** using a synthesized `deriveAgentStatus(lead, agentId)` helper that maps the lead's jsonb output columns + `lead.status` to a runner status:

```ts
// app/admin/pipelines/_lib/agent-status.ts
const AGENT_TO_COLUMN: Record<AgentId, keyof LeadDetail> = {
  "1":  "lead_record",
  "2":  "research_report",
  "3":  "similarity_report",
  "5":  "upsell_risk_report",
  "10": "copy_prep",
  "12": "design_prep",
};

export function deriveAgentStatus(lead: LeadDetail, agentId: AgentId): RunnerStatus {
  if (lead[AGENT_TO_COLUMN[agentId]] != null) return "done";
  if (lead.status === "created")          return "queued";
  if (lead.status === "form_submitted")    return "running";
  if (lead.status === "failed" ||
      lead.status === "routed_to_custom") return "skipped";
  return "failed"; // shouldn't reach here in practice
}
```

**Foundation header timestamp:**

```ts
const allFoundationDone =
  lead.lead_record && lead.research_report &&
  lead.similarity_report && lead.upsell_risk_report;

const headerTimestamp = allFoundationDone && lead.agents_completed_at
  ? { label: "Completed", value: lead.agents_completed_at }
  : lead.form_submitted_at
    ? { label: "Last activity", value: lead.updated_at }
    : { label: "Created", value: lead.created_at };
```

**Known limitation of synthesis:** when an agent fails, the page shows *that* it failed but not *why*. The reason + message exist in `agent_runs.error_reason` / `error_message` (populated by `finishAgentRunFailed` in the Inngest factory) but aren't reachable from the UI without DB access — operator has to ask an engineer or pop the Supabase console.

**Resolution: JAV-125** ([Phase 1.5b — Expose agent_runs[] on lead detail endpoint](https://linear.app/javelina-irongrove/issue/JAV-125)). Filed under JAV-119. ~30 min intake-side change to co-fetch `agent_runs` and surface error reason + message. Backend forwarder is passthrough — no change. Frontend swaps `deriveAgentStatus` to read the explicit field plus adds an error display in `RunnerRow`. Single-component change on the frontend when it lands.

**Don't block the redesign on JAV-125.** Ship synthesized status now; swap when the field arrives. Leave a `// TODO(JAV-125): replace with explicit agent_runs[] when intake exposes it` comment on the helper so the swap site is greppable.

### 6.2 Worker status — placeholders now, follow-up when JAV-121 lands

JAV-121 workers don't exist yet, and there's no `worker_runs` table planned. For the redesign, render worker rows as static "— not yet built" placeholders with a tooltip linking to the JAV-121 sub-issue. When the workers ship, we'll spec a `worker_runs[]` follow-up similar to JAV-125 to feed live status into the same `RunnerRow` component.

Both gaps are additive to the existing endpoint — no breaking shape changes. The redesign's component structure is forward-compatible: `RunnerRow` takes a `status` prop and a runner descriptor; where that status comes from is an internal detail.

## 7. Empty / loading / error states

| State | UI |
|---|---|
| Initial load (no data yet) | Skeleton: 5 collapsed section frames with shimmer headers |
| `getLead` 404 | Replace whole content area with "Lead not found" (existing pattern probably) |
| `getLead` 500 | "Couldn't load lead — retry" with the existing error-display pattern |
| Foundation has 0 completed agents | Section header reads "—" instead of "0/4 complete"; body renders 4 pending rows |
| Service section has all rows in "not yet built" state | Section still renders, badge `not_started`, body explains "Workers not yet implemented (JAV-121)" |

Don't hide sections just because they're empty — operators need to see the *whole* pipeline shape so a missing runner is visible.

## 8. Visual polish notes

- **Foundation gets a subtle distinction** — different icon, slightly muted background, since it's not a customer-facing service. Easy way: use a different border color or a tag like "Internal" on the header.
- **Failed/needs_input headers should pop.** Border-left accent in the badge variant color (4px), full-card glow on `danger`.
- **Per-runner status icons** should use the same lucide set as the badges for consistency.
- **Don't animate everything.** `CollapsibleCard` already animates the open/close. Section headers expanding/collapsing is enough motion; don't add stagger or hover-lifts.

## 9. Migration plan

The redesign can ship in one PR — there's no contract change, just a presentational refactor.

Order I'd recommend:
1. Build `ServiceSection`, `ServiceSectionHeader`, `RunnerRow` as standalone components with hardcoded fixture data.
2. Build the 5 concrete sections (Foundation, Website, DNS, Email, Domain) wiring them to existing `lead` + `services` props.
3. Replace `ServicesPanel` + the flat agent-card stack in `page.tsx` with the new sections.
4. Delete `ServicesPanel.tsx` and any dead imports.
5. Smoke-test against the simulator scenarios (`scripts/simulate-pipeline.sh` in `javelina-intake` — `happy_path` / `transfer_pending` / `agent_failure` exercise the failed/in-progress/needs_input paths).

Existing `GenericAgentCard` and the bespoke `ScribeCard` rendering stay intact; they just get composed inside `RunnerRow` instead of being page-level.

## 10. Open questions for the dev

- **Is `getLead` a server component fetch or client-side?** (Survey said client-side via `useEffect`.) If you'd like to make it server-rendered for first paint, that's a bigger refactor — flag if you want me to scope it. For now, assume client-side.
- **Foundation expand-by-default for `agents_complete`** — if your operators tell you they want everything collapsed by default to scan headers first, easy tweak. Pick whichever matches your team's actual workflow.
- **Worker placeholder copy.** Suggested "— not yet built" with a tooltip linking to the JAV-121 sub-issue. If you want richer empty states (e.g. a roadmap link), happy to add.

---

## Reference

- `docs/customer-dashboard-status-guide.md` — the canonical state/phase contract; section headers should render the same `progress_label` / `state` / `updated_at` the customer sees
- `docs/admin-queue-api-guide.md` — list/detail API shapes the page consumes
- `src/lib/inngest/simulate-pipeline.ts` (in `javelina-intake`) — drives every state combination so the redesign can be visually QA'd without burning real LLM calls
- **JAV-119** — parent ticket; §1.5 is this redesign
- **JAV-125** — follow-up to expose `agent_runs[]` on the detail endpoint so the page can show *why* an agent failed (currently you only see *that* it failed). Non-blocking; redesign ships first with synthesized status
- **JAV-121** — the workers that fill the currently-empty service sections (DNS / email / domain); their rows are placeholders until that lands
- **JAV-126** — Site Builder agent (Website section's HTML-generation runner)
- **JAV-127** — Deploy worker (Website section's GitHub + Vercel runner; blocked by JAV-126)
