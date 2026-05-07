# Admin Pipelines Queue — Design

**Linear:** [JAV-119](https://linear.app/javelina-irongrove/issue/JAV-119) (sub-tasks 1.4 and 1.5)
**Date:** 2026-05-06
**Repo:** `javelina` (admin frontend)
**Status:** Approved — ready for implementation plan

## Goal

Build the operator-facing queue and per-lead detail view that consumes the Auth0-gated `/api/admin/intake/leads*` forwarders shipped in JAV-119 sub-task 1.3. Two pages:

- **1.4** — `app/admin/pipelines/page.tsx` — paginated, filterable list of leads
- **1.5** — `app/admin/pipelines/[leadId]/page.tsx` — per-lead detail with six agent-output cards and three operator action buttons

Sub-task 1.6 (Pax8 manual queue lane) is deferred to a follow-up PR.

## Context

- API contract: `documentation/admin-queue-api-guide.md` (in this repo). Backend forwarders are pure passthrough — frontend sees intake's exact response shapes.
- Agent name → jsonb field mapping is canonical in `javelina-intake/docs/operator-queue-mvp.md` §"Operator review cards".
- Schemas for the six agent outputs live in `javelina-intake/src/lib/schemas/<Name>/v1.ts` and will be **copied** into this repo (the two repos do not share code).
- Existing admin UX uses a hardcoded sidebar in `components/admin/AdminLayout.tsx` and a strong component library: `AdminPageHeader`, `AdminDataTable`, `AdminStatusBadge`, `AdminStatCard`, `Pagination`, `Card`, `Button`, `ConfirmationModal`, `Tooltip`. We reuse all of it.

## Decisions

1. **URL param is `[leadId]`, not `[orgId]`.** The list endpoint is keyed on lead id and has no `org_id` filter. The Teams deep-link convention from sub-task 1.7 (`${JAVELINA_APP_URL}/admin/pipelines/[orgId]`) is updated to `[leadId]` as a follow-up cleanup.
2. **Six agent cards, six jsonb fields** — `lead_record` (Scribe), `research_report` (Scout), `similarity_report` (Matchmaker), `upsell_risk_report` (Strategist), `copy_prep` (Composer), `design_prep` (Stylist). `structure_prep` is internal (Agent 11) and not surfaced.
3. **Hybrid card rendering.** Custom layouts for Scribe, Composer, Stylist (highest decision-relevance / visual benefit). Generic key-value renderer for Scout, Matchmaker, Strategist.
4. **Filters** = status + package + "needs human action" toggle + "stuck > 24h" toggle + sort (oldest/newest). All URL-synced.
5. **No polling** in this phase. Operator refreshes manually.
6. **No bulk actions** in this phase. No row checkboxes.

## Architecture & file layout

```
app/admin/pipelines/
  page.tsx                      # 1.4 — queue list
  [leadId]/page.tsx             # 1.5 — lead detail
  _components/
    PipelineFilters.tsx
    LeadStateHeader.tsx
    OperatorActions.tsx
    ServicesPanel.tsx
    AgentCards/
      ScribeCard.tsx            # custom
      ComposerCard.tsx          # custom
      StylistCard.tsx           # custom (color swatches + font previews)
      ScoutCard.tsx             # generic wrapper
      MatchmakerCard.tsx        # generic wrapper
      StrategistCard.tsx        # generic wrapper
      GenericAgentCard.tsx      # shared key-value renderer
  _lib/
    blocked-on.ts               # status → blocked-on label
    age.ts                      # iso → "3h", "2d 4h"
    status-variant.ts           # status → AdminStatusBadge variant

lib/schemas/intake/             # copied verbatim from javelina-intake
  LeadRecord/v1.ts
  ResearchReport/v1.ts
  SimilarityReport/v1.ts
  UpsellRiskReport/v1.ts
  ContentPlanReport/v1.ts
  DesignDirectionReport/v1.ts
  index.ts                      # re-export

lib/api-client.ts               # extend adminApi with intake.* methods + types

components/admin/AdminLayout.tsx    # add "Pipelines" nav entry
```

Single new top-level concept: `adminApi.intake` namespace.

## Nav addition

Insert one item into `navigationItems` in `components/admin/AdminLayout.tsx`, directly under "Dashboard":

```ts
{
  href: '/admin/pipelines',
  label: 'Pipelines',
  icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {/* funnel/pipeline icon, stroke conventions match existing items */}
  </svg>,
}
```

Active-state highlighting is automatic (existing `pathname.startsWith(item.href + '/')` check covers `/admin/pipelines/[leadId]`). `AdminProtectedRoute` already gates by superadmin role.

## API client extension

Added to `adminApi` in `lib/api-client.ts`. Types live in the same file alongside the methods, matching existing convention.

```ts
export type LeadStatus =
  | 'created' | 'form_submitted' | 'agents_complete'
  | 'scope_confirmed' | 'provisioning' | 'live'
  | 'routed_to_custom' | 'abandoned' | 'failed';

export interface LeadSummary {
  id: string;
  firm_id: string;
  org_id: string;
  package: 'business_starter' | 'business_pro';
  contact_email: string;
  contact_name: string;
  status: LeadStatus;
  version: number;
  total_cost_cents: number;
  created_at: string;
  form_submitted_at: string | null;
  agents_completed_at: string | null;
  scope_confirmed_at: string | null;
  scope_rejected_at: string | null;
  scope_rejection_reason: string | null;
  updated_at: string;
}

export interface ListLeadsResponse {
  leads: LeadSummary[];
  pagination: { limit: number; offset: number; total: number | null };
}

export interface LeadDetail extends LeadSummary {
  lead_record: LeadRecord | null;
  research_report: ResearchReport | null;
  similarity_report: SimilarityReport | null;
  upsell_risk_report: UpsellRiskReport | null;
  copy_prep: ContentPlanReport | null;
  structure_prep: unknown | null;
  design_prep: DesignDirectionReport | null;
}

export interface LeadService {
  lead_id: string;
  service: 'website' | 'dns' | 'email' | 'domain';
  state: string;
  internal_state: string;
  progress_label: string;
  metadata: Record<string, unknown>;
  updated_at: string;
}

export interface LeadDetailResponse {
  lead: LeadDetail;
  services: LeadService[];
}

export type ActionResponse =
  | { result: 'applied' | 'already_applied'; status: LeadStatus; [k: string]: unknown }
  | { error: string; from?: LeadStatus; to?: LeadStatus };

// adminApi additions:
intake: {
  listLeads: (params?: {
    status?: LeadStatus;
    package?: 'business_starter' | 'business_pro';
    age_min_hours?: number;
    limit?: number;
    offset?: number;
    order?: 'oldest' | 'newest';
  }) => Promise<ListLeadsResponse>;

  getLead: (leadId: string) => Promise<LeadDetailResponse>;

  confirmScope: (leadId: string) => Promise<ActionResponse>;
  reject: (leadId: string, reason: string) => Promise<ActionResponse>;
  markFailed: (leadId: string, reason: string) => Promise<ActionResponse>;
  // mark-pax8-done: deferred to 1.6
}
```

Errors thrown by `apiClient` follow the existing pattern. Pages catch and surface via `useToastStore`. The 409 `{ error, from, to }` body is parsed from the thrown error so the UI can show "lead is already in state X" without a separate code path.

## Queue list page (1.4)

Client component, mirrors `app/admin/users/page.tsx` structure.

```
AdminProtectedRoute > AdminLayout
  AdminPageHeader  title="Pipelines"  subtitle="Operator queue — stuck leads"
  PipelineFilters
  AdminDataTable
  Pagination       (mobile fallback only)
```

### `PipelineFilters`

All filter state is URL-synced via search params (matching `app/admin/users/page.tsx`).

| Control | Type | Effect |
|---|---|---|
| **Status** | single-select dropdown | `?status=…`. Options: All, Awaiting review (`agents_complete`), Provisioning, Failed, Routed to custom, Live, Abandoned. Default = All. |
| **Package** | single-select | `?package=business_starter\|business_pro`. Default = All. |
| **Needs human action** | toggle | When on: forces `?status=agents_complete` and disables the Status dropdown (with tooltip). |
| **Stuck > 24h** | toggle | `?age_min_hours=24`. |
| **Sort** | segmented control | `?order=oldest\|newest`. Default = oldest. |

### Table columns

`AdminDataTable` with `AdminDataTableColumn[]`. Whole row is clickable → `router.push('/admin/pipelines/' + lead.id)`.

| # | Column | Source | Notes |
|---|---|---|---|
| 1 | Org / Contact | `contact_name` + `contact_email` | Two-line cell |
| 2 | Package | `package` | `AdminStatusBadge variant="info"` — "Starter" / "Pro" |
| 3 | Status | `status` | `AdminStatusBadge` via `_lib/status-variant.ts` |
| 4 | Age | `now - created_at` | Human relative; tooltip = absolute ISO |
| 5 | Blocked on | derived from `status` via `_lib/blocked-on.ts` | For `routed_to_custom`/`failed`: append truncated `scope_rejection_reason` with full-text tooltip |
| 6 | Last activity | `updated_at` | Same relative + tooltip pattern as Age |

### Loading / empty / error

- Loading: spinner pattern from `app/admin/page.tsx`.
- Empty filtered result: "No leads match these filters."
- Fetch error: `addToast({ variant: 'error', ... })` and inline retry button in place of the table.

### Data fetching

Single `useEffect` keyed on URL params, calls `adminApi.intake.listLeads(...)`. No polling.

## Lead detail page (1.5)

Client component. Fetches detail on mount and after each action.

```
AdminProtectedRoute > AdminLayout
  AdminPageHeader   title="{contact_name} — {package label}"   subtitle="{contact_email}"   backLink="/admin/pipelines"
  LeadStateHeader
  OperatorActions
  ServicesPanel
  Agent cards (single-column on mobile, 2-col on lg+):
    ScribeCard | ScoutCard | MatchmakerCard | StrategistCard | ComposerCard | StylistCard
```

### `LeadStateHeader`

A `Card` with two rows:

- Row 1: `AdminStatusBadge` (status), age "3d 4h" with tooltip, blocked-on label, total cost (`$12.34` from `total_cost_cents`).
- Row 2: timestamp grid — `created_at`, `form_submitted_at`, `agents_completed_at`, `scope_confirmed_at` or `scope_rejected_at`. Each via `formatDateWithRelative` + tooltip.
- If `scope_rejection_reason` is set: an inline alert beneath, "Rejected reason: …".

### `OperatorActions`

Three buttons inline. Visibility:

| Button | Shown when |
|---|---|
| **Confirm scope** (primary) | `status === 'agents_complete'` |
| **Reject** (outline) | `status === 'agents_complete'` |
| **Mark failed** (outline, danger) | status is non-terminal (not `live`, `routed_to_custom`, `abandoned`, `failed`) |

When no action is allowed: "No operator actions available in this state."

**Confirm scope** → `ConfirmationModal` ("Confirm scope and start provisioning? Idempotent."), then `adminApi.intake.confirmScope(leadId)`.

**Reject** / **Mark failed** → modal with required reason textarea (trimmed, min 1 char). Submit disabled until non-empty. The API returns 400 if empty; we gate client-side too.

After any action: success toast → refetch detail (don't navigate). On 409 `{ error, from, to }`: non-destructive toast, refetch.

### `ServicesPanel`

Card titled "Customer-facing service status". Four rows (one per service in the response). Each row: service icon + name, `progress_label`, `state` as `AdminStatusBadge`, `updated_at` relative. Read-only.

### Agent cards

All six wrapped in `Card`. Header: agent name + jsonb field name (small text-muted). When the field is `null`, body shows "Not yet generated" rather than hiding the card.

**Custom (3):**

- **ScribeCard** — flat brand-profile summary: business name, services, brand voice, SEO terms. Pulled by name from `LeadRecord`.
- **ComposerCard** — pages list (vertical) with hero copy excerpts. **Missing assets** as a callout banner at the top of the card if non-empty.
- **StylistCard** — palette as actual color swatches with hex labels, font pairings as `font-family`-applied previews, layout sections as a tag list.

**Generic (3):** ScoutCard, MatchmakerCard, StrategistCard pass their data to `GenericAgentCard`, which walks the JSON, rendering nested objects/arrays as collapsible sections (default-open at depth 1) and formatting strings/numbers/dates inline. Plus a "View raw JSON" disclosure.

## Helpers

### `_lib/blocked-on.ts`

Direct port of the table from `documentation/admin-queue-api-guide.md` §2:

```ts
export const blockedOnLabel: Record<LeadStatus, string | null> = {
  created: 'Awaiting form submission',
  form_submitted: 'Agents running',
  agents_complete: 'Awaiting operator scope review',
  scope_confirmed: 'Provisioning starting',
  provisioning: 'Provisioning in flight',
  live: null,
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned by customer',
  failed: 'Failed',
};
```

### `_lib/age.ts`

`formatAge(iso: string): string` returning `"3h"`, `"2d 4h"`, `"45m"`. Use existing `formatDateWithRelative` from `lib/utils/time` if it exposes this; otherwise add a small helper.

### `_lib/status-variant.ts`

```ts
export const STATUS_VARIANT: Record<LeadStatus,
  'success'|'warning'|'danger'|'info'|'neutral'|'accent'> = {
  created: 'neutral',
  form_submitted: 'info',
  agents_complete: 'warning',
  scope_confirmed: 'accent',
  provisioning: 'accent',
  live: 'success',
  routed_to_custom: 'neutral',
  abandoned: 'neutral',
  failed: 'danger',
};
```

## Schema copy

Copy verbatim from `javelina-intake/src/lib/schemas/`:

- `LeadRecord/v1.ts`
- `ResearchReport/v1.ts`
- `SimilarityReport/v1.ts`
- `UpsellRiskReport/v1.ts`
- `ContentPlanReport/v1.ts`
- `DesignDirectionReport/v1.ts`
- `_envelope.ts` if any of the above import from it

Add `lib/schemas/intake/index.ts` re-exporting types as `LeadRecord`, `ResearchReport`, etc. (no version suffix at the top level).

If a schema brings in a dependency this repo doesn't have (e.g. `zod`), add it during implementation — don't re-derive types by hand.

## Out of scope (this PR)

- Sub-task 1.6 — Pax8 manual queue lane (separate phase).
- Sub-task 1.7 follow-up — updating `javelina-intake/src/lib/inngest/on-form-submitted.ts` to use `[leadId]` in the Teams deep link. Lives in a different repo; tracked as a follow-up commit.
- Polling / realtime updates.
- Bulk actions / row selection.
- An `operator_actions` history view (no read endpoint exists yet).

## Testing

1. **Unit tests** for `blocked-on.ts`, `age.ts`, `status-variant.ts` (pure functions).
2. **Component tests** for `OperatorActions` (button visibility per status, reason-required modal validation) and `GenericAgentCard` (nested object rendering, raw-JSON toggle).
3. **Manual QA**: dev server, walk a real lead `agents_complete` → confirm-scope; another `agents_complete` → reject (with reason). Replay confirm-scope to verify the 409 path renders cleanly.

No Playwright/e2e in this phase.
