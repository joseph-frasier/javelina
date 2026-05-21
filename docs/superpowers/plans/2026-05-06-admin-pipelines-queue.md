# Admin Pipelines Queue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the operator-facing Pipelines queue (list + detail) for JAV-119 1.4 and 1.5 — admin staff can triage stuck intake leads and run confirm/reject/mark-failed actions against the backend forwarders.

**Architecture:** Two new pages under `app/admin/pipelines/` consume `adminApi.intake.*` (added to `lib/api-client.ts`) which calls the Auth0 + superadmin-gated `/api/admin/intake/leads*` forwarders. Six agent outputs render via three custom cards (Scribe / Composer / Stylist) and one shared generic JSON renderer for the rest. All filter state is URL-synced. Schemas are copied verbatim from `javelina-intake/src/lib/schemas/`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind, vitest + @testing-library/react, zod (newly added), Auth0 (existing session via `apiClient`).

**Spec:** `docs/superpowers/specs/2026-05-06-admin-pipelines-queue-design.md`
**API contract:** `documentation/admin-queue-api-guide.md`

---

## File Structure

**Created:**
- `lib/schemas/intake/_envelope.ts` — copied verbatim from javelina-intake
- `lib/schemas/intake/LeadRecord/v1.ts` — copied verbatim
- `lib/schemas/intake/ResearchReport/v1.ts` — copied verbatim
- `lib/schemas/intake/SimilarityReport/v1.ts` — copied verbatim
- `lib/schemas/intake/UpsellRiskReport/v1.ts` — copied verbatim
- `lib/schemas/intake/ContentPlanReport/v1.ts` — copied verbatim
- `lib/schemas/intake/DesignDirectionReport/v1.ts` — copied verbatim
- `lib/schemas/intake/index.ts` — re-export named types
- `app/admin/pipelines/page.tsx` — queue list (1.4)
- `app/admin/pipelines/[leadId]/page.tsx` — lead detail (1.5)
- `app/admin/pipelines/_lib/blocked-on.ts`
- `app/admin/pipelines/_lib/age.ts`
- `app/admin/pipelines/_lib/status-variant.ts`
- `app/admin/pipelines/_components/PipelineFilters.tsx`
- `app/admin/pipelines/_components/LeadStateHeader.tsx`
- `app/admin/pipelines/_components/OperatorActions.tsx`
- `app/admin/pipelines/_components/ServicesPanel.tsx`
- `app/admin/pipelines/_components/AgentCards/GenericAgentCard.tsx`
- `app/admin/pipelines/_components/AgentCards/ScribeCard.tsx`
- `app/admin/pipelines/_components/AgentCards/ScoutCard.tsx`
- `app/admin/pipelines/_components/AgentCards/MatchmakerCard.tsx`
- `app/admin/pipelines/_components/AgentCards/StrategistCard.tsx`
- `app/admin/pipelines/_components/AgentCards/ComposerCard.tsx`
- `app/admin/pipelines/_components/AgentCards/StylistCard.tsx`
- `tests/admin/pipelines/blocked-on.test.ts`
- `tests/admin/pipelines/age.test.ts`
- `tests/admin/pipelines/status-variant.test.ts`
- `tests/admin/pipelines/OperatorActions.test.tsx`
- `tests/admin/pipelines/GenericAgentCard.test.tsx`

**Modified:**
- `package.json` — add `zod`
- `lib/api-client.ts` — add intake types + `adminApi.intake` namespace
- `components/admin/AdminLayout.tsx` — add Pipelines nav entry

---

## Task 1: Install zod and copy intake schemas

**Files:**
- Modify: `package.json`
- Create: `lib/schemas/intake/_envelope.ts`, `lib/schemas/intake/<Name>/v1.ts` (six files), `lib/schemas/intake/index.ts`

- [ ] **Step 1: Install zod**

Run from repo root:

```bash
npm install zod
```

Expected: `zod` appears in `dependencies` in `package.json`.

- [ ] **Step 2: Copy `_envelope.ts` verbatim**

```bash
cp /Users/jayerasmussen/Documents/GitHub/javelina-intake/src/lib/schemas/_envelope.ts \
   /Users/jayerasmussen/Documents/GitHub/javelina/lib/schemas/intake/_envelope.ts
```

(Use `mkdir -p lib/schemas/intake` first if the directory doesn't exist.)

- [ ] **Step 3: Copy each of the six schema files verbatim**

```bash
for s in LeadRecord ResearchReport SimilarityReport UpsellRiskReport ContentPlanReport DesignDirectionReport; do
  mkdir -p "lib/schemas/intake/$s"
  cp "/Users/jayerasmussen/Documents/GitHub/javelina-intake/src/lib/schemas/$s/v1.ts" \
     "lib/schemas/intake/$s/v1.ts"
done
```

Do **not** modify the file contents. They use `import { z } from "zod"` which now resolves.

- [ ] **Step 4: Create `lib/schemas/intake/index.ts`**

```ts
import { z } from 'zod';
import { LeadRecordSchema } from './LeadRecord/v1';
import { ResearchReportSchema } from './ResearchReport/v1';
import { SimilarityReportSchema } from './SimilarityReport/v1';
import { UpsellRiskReportSchema } from './UpsellRiskReport/v1';
import { ContentPlanReportSchema } from './ContentPlanReport/v1';
import { DesignDirectionReportSchema } from './DesignDirectionReport/v1';

export type LeadRecord = z.infer<typeof LeadRecordSchema>;
export type ResearchReport = z.infer<typeof ResearchReportSchema>;
export type SimilarityReport = z.infer<typeof SimilarityReportSchema>;
export type UpsellRiskReport = z.infer<typeof UpsellRiskReportSchema>;
export type ContentPlanReport = z.infer<typeof ContentPlanReportSchema>;
export type DesignDirectionReport = z.infer<typeof DesignDirectionReportSchema>;

export {
  LeadRecordSchema,
  ResearchReportSchema,
  SimilarityReportSchema,
  UpsellRiskReportSchema,
  ContentPlanReportSchema,
  DesignDirectionReportSchema,
};
```

> If a Schema export uses a different identifier than the `<Name>Schema` convention, open the source file and use whatever name is exported there. The intake repo uses `<Name>Schema` consistently.

- [ ] **Step 5: Verify TypeScript compiles**

Run:

```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/schemas/intake/**`. (Pre-existing errors elsewhere are fine.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json lib/schemas/intake
git commit -m "feat(intake): copy agent output schemas + add zod (JAV-119)"
```

---

## Task 2: Pipelines helper modules + unit tests

**Files:**
- Create: `app/admin/pipelines/_lib/blocked-on.ts`
- Create: `app/admin/pipelines/_lib/age.ts`
- Create: `app/admin/pipelines/_lib/status-variant.ts`
- Create: `tests/admin/pipelines/blocked-on.test.ts`
- Create: `tests/admin/pipelines/age.test.ts`
- Create: `tests/admin/pipelines/status-variant.test.ts`

> Note: `LeadStatus` is defined in Task 3 (`lib/api-client.ts`). For this task, define a local mirror type in each helper. Task 3 will make them import from api-client.

- [ ] **Step 1: Write the failing test for `blocked-on.ts`**

Create `tests/admin/pipelines/blocked-on.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { blockedOnLabel } from '@/app/admin/pipelines/_lib/blocked-on';

describe('blockedOnLabel', () => {
  it('maps agents_complete to "Awaiting operator scope review"', () => {
    expect(blockedOnLabel.agents_complete).toBe('Awaiting operator scope review');
  });

  it('returns null for live (not in queue)', () => {
    expect(blockedOnLabel.live).toBeNull();
  });

  it('has an entry for every status', () => {
    const expected = [
      'created', 'form_submitted', 'agents_complete', 'scope_confirmed',
      'provisioning', 'live', 'routed_to_custom', 'abandoned', 'failed',
    ];
    for (const s of expected) {
      expect(blockedOnLabel).toHaveProperty(s);
    }
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:run -- tests/admin/pipelines/blocked-on.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `blocked-on.ts`**

Create `app/admin/pipelines/_lib/blocked-on.ts`:

```ts
export type LeadStatus =
  | 'created' | 'form_submitted' | 'agents_complete'
  | 'scope_confirmed' | 'provisioning' | 'live'
  | 'routed_to_custom' | 'abandoned' | 'failed';

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

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test:run -- tests/admin/pipelines/blocked-on.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write the failing test for `age.ts`**

Create `tests/admin/pipelines/age.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatAge } from '@/app/admin/pipelines/_lib/age';

describe('formatAge', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-06T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns minutes when under 1 hour', () => {
    expect(formatAge('2026-05-06T11:15:00Z')).toBe('45m');
  });

  it('returns hours-only when under 1 day', () => {
    expect(formatAge('2026-05-06T09:00:00Z')).toBe('3h');
  });

  it('returns days + hours when over 1 day', () => {
    expect(formatAge('2026-05-04T08:00:00Z')).toBe('2d 4h');
  });

  it('returns "0m" for future or now', () => {
    expect(formatAge('2026-05-06T12:00:00Z')).toBe('0m');
    expect(formatAge('2026-05-07T00:00:00Z')).toBe('0m');
  });
});
```

- [ ] **Step 6: Run test, verify it fails**

```bash
npm run test:run -- tests/admin/pipelines/age.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement `age.ts`**

Create `app/admin/pipelines/_lib/age.ts`:

```ts
export function formatAge(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  if (diffMs <= 0) return '0m';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;

  const days = Math.floor(hours / 24);
  const remHours = hours - days * 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
}
```

- [ ] **Step 8: Run test, verify it passes**

```bash
npm run test:run -- tests/admin/pipelines/age.test.ts
```

Expected: PASS.

- [ ] **Step 9: Write the failing test for `status-variant.ts`**

Create `tests/admin/pipelines/status-variant.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { STATUS_VARIANT } from '@/app/admin/pipelines/_lib/status-variant';

describe('STATUS_VARIANT', () => {
  it('uses "warning" for agents_complete (operator action needed)', () => {
    expect(STATUS_VARIANT.agents_complete).toBe('warning');
  });

  it('uses "danger" for failed', () => {
    expect(STATUS_VARIANT.failed).toBe('danger');
  });

  it('uses "success" for live', () => {
    expect(STATUS_VARIANT.live).toBe('success');
  });

  it('has an entry for every status', () => {
    const statuses = [
      'created', 'form_submitted', 'agents_complete', 'scope_confirmed',
      'provisioning', 'live', 'routed_to_custom', 'abandoned', 'failed',
    ];
    for (const s of statuses) expect(STATUS_VARIANT).toHaveProperty(s);
  });
});
```

- [ ] **Step 10: Run test, verify it fails**

```bash
npm run test:run -- tests/admin/pipelines/status-variant.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 11: Implement `status-variant.ts`**

Create `app/admin/pipelines/_lib/status-variant.ts`:

```ts
import type { AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import type { LeadStatus } from './blocked-on';

export const STATUS_VARIANT: Record<LeadStatus, AdminStatusBadgeVariant> = {
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

> If `AdminStatusBadgeVariant` doesn't include all of `'neutral' | 'info' | 'warning' | 'accent' | 'success' | 'danger'`, open `components/admin/AdminStatusBadge.tsx`, find the variant type, and adjust the mapping to use the closest available variant.

- [ ] **Step 12: Run all three helper tests, verify they pass**

```bash
npm run test:run -- tests/admin/pipelines/
```

Expected: 3 files, all PASS.

- [ ] **Step 13: Commit**

```bash
git add app/admin/pipelines/_lib tests/admin/pipelines
git commit -m "feat(pipelines): blocked-on, age, status-variant helpers + tests"
```

---

## Task 3: Extend `adminApi` with intake namespace

**Files:**
- Modify: `lib/api-client.ts` (append types + `intake` block to `adminApi`)
- Modify: `app/admin/pipelines/_lib/blocked-on.ts` (re-export `LeadStatus` from api-client)
- Modify: `app/admin/pipelines/_lib/status-variant.ts` (import `LeadStatus` from api-client)

- [ ] **Step 1: Add types and methods to `lib/api-client.ts`**

Append at the bottom of the file (after the existing `adminApi` export — close it by adding the `intake` namespace and the type exports just above the closing `}` of `adminApi`):

```ts
// ===== Intake (admin pipelines queue) =====
// Backend forwarder is a pure passthrough — responses are byte-identical to
// what javelina-intake's /api/internal/leads* returns. See
// documentation/admin-queue-api-guide.md.

import type {
  LeadRecord,
  ResearchReport,
  SimilarityReport,
  UpsellRiskReport,
  ContentPlanReport,
  DesignDirectionReport,
} from '@/lib/schemas/intake';

export type LeadStatus =
  | 'created' | 'form_submitted' | 'agents_complete'
  | 'scope_confirmed' | 'provisioning' | 'live'
  | 'routed_to_custom' | 'abandoned' | 'failed';

export type LeadPackage = 'business_starter' | 'business_pro';

export interface LeadSummary {
  id: string;
  firm_id: string;
  org_id: string;
  package: LeadPackage;
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

export interface ListLeadsParams {
  status?: LeadStatus;
  package?: LeadPackage;
  age_min_hours?: number;
  limit?: number;
  offset?: number;
  order?: 'oldest' | 'newest';
}

function buildIntakeQueryString(params?: ListLeadsParams): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  if (params.status) qs.set('status', params.status);
  if (params.package) qs.set('package', params.package);
  if (typeof params.age_min_hours === 'number') {
    qs.set('age_min_hours', String(params.age_min_hours));
  }
  if (typeof params.limit === 'number') qs.set('limit', String(params.limit));
  if (typeof params.offset === 'number') qs.set('offset', String(params.offset));
  if (params.order) qs.set('order', params.order);
  return qs.toString();
}
```

> The `import type` line and the type/function declarations go at the **top** of the file (with other imports/exports). The `intake` block below goes inside the existing `adminApi = { ... }` object.

Inside `adminApi = { ... }`, add a new key (next to the other namespaces):

```ts
intake: {
  listLeads: (params?: ListLeadsParams) => {
    const qs = buildIntakeQueryString(params);
    return apiClient.get<ListLeadsResponse>(
      `/admin/intake/leads${qs ? `?${qs}` : ''}`
    );
  },

  getLead: (leadId: string) =>
    apiClient.get<LeadDetailResponse>(`/admin/intake/leads/${leadId}`),

  confirmScope: (leadId: string) =>
    apiClient.post<ActionResponse>(
      `/admin/intake/leads/${leadId}/confirm-scope`,
      {}
    ),

  reject: (leadId: string, reason: string) =>
    apiClient.post<ActionResponse>(
      `/admin/intake/leads/${leadId}/reject`,
      { reason }
    ),

  markFailed: (leadId: string, reason: string) =>
    apiClient.post<ActionResponse>(
      `/admin/intake/leads/${leadId}/mark-failed`,
      { reason }
    ),
  // mark-pax8-done deferred to JAV-119 1.6
},
```

- [ ] **Step 2: Update `_lib/blocked-on.ts` to import `LeadStatus` from api-client**

Replace `app/admin/pipelines/_lib/blocked-on.ts` with:

```ts
import type { LeadStatus } from '@/lib/api-client';

export type { LeadStatus };

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

(`status-variant.ts` already imports from `./blocked-on`; no change needed since the re-export keeps the same name.)

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no new errors in `lib/api-client.ts` or `app/admin/pipelines/**`.

- [ ] **Step 4: Re-run helper tests**

```bash
npm run test:run -- tests/admin/pipelines/
```

Expected: still PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/api-client.ts app/admin/pipelines/_lib/blocked-on.ts
git commit -m "feat(api-client): adminApi.intake — list/get/confirm/reject/markFailed"
```

---

## Task 4: Add Pipelines nav item

**Files:**
- Modify: `components/admin/AdminLayout.tsx`

- [ ] **Step 1: Insert the Pipelines entry**

In `components/admin/AdminLayout.tsx`, in the `navigationItems` array, insert this entry **between** the Dashboard entry (`/admin`) and the Users entry (`/admin/users`):

```ts
{
  href: '/admin/pipelines',
  label: 'Pipelines',
  icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L15 12.414V19a1 1 0 01-.553.894l-4 2A1 1 0 019 21v-8.586L3.293 6.707A1 1 0 013 6V4z" />
    </svg>
  )
},
```

- [ ] **Step 2: Verify in dev server**

```bash
npm run dev
```

Open `http://localhost:3000/admin` (logged in as superadmin), confirm "Pipelines" appears in the sidebar between Dashboard and Users. Active state highlights when on `/admin/pipelines` (the page 404s right now — that's expected, we build it next).

Stop the dev server.

- [ ] **Step 3: Commit**

```bash
git add components/admin/AdminLayout.tsx
git commit -m "feat(admin): add Pipelines nav entry"
```

---

## Task 5: Queue list page — minimal table (no filters)

Goal of this task: render the table with all leads and a clickable row that navigates to detail. Filters land in Task 6.

**Files:**
- Create: `app/admin/pipelines/page.tsx`

- [ ] **Step 1: Create the page with a hardcoded fetch (no filters)**

Create `app/admin/pipelines/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { adminApi, type LeadSummary } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatAge } from './_lib/age';
import { blockedOnLabel } from './_lib/blocked-on';
import { STATUS_VARIANT } from './_lib/status-variant';

const PACKAGE_LABEL: Record<LeadSummary['package'], string> = {
  business_starter: 'Starter',
  business_pro: 'Pro',
};

const STATUS_LABEL: Record<LeadSummary['status'], string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Failed',
};

function blockedOnCell(lead: LeadSummary): string {
  const base = blockedOnLabel[lead.status] ?? '—';
  if (
    (lead.status === 'routed_to_custom' || lead.status === 'failed') &&
    lead.scope_rejection_reason
  ) {
    return `${base} · ${lead.scope_rejection_reason}`;
  }
  return base;
}

export default function AdminPipelinesPage() {
  const router = useRouter();
  const { addToast } = useToastStore();
  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.intake.listLeads({ order: 'oldest', limit: 50 });
      setLeads(res.leads);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load leads';
      setError(msg);
      addToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: AdminDataTableColumn<LeadSummary>[] = [
    {
      key: 'contact',
      header: 'Org / Contact',
      render: (lead) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{lead.contact_name}</span>
          <span className="text-xs text-text-muted">{lead.contact_email}</span>
        </div>
      ),
    },
    {
      key: 'package',
      header: 'Package',
      render: (lead) => (
        <AdminStatusBadge variant="info" label={PACKAGE_LABEL[lead.package]} dot={false} />
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (lead) => (
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status]}
          label={STATUS_LABEL[lead.status]}
        />
      ),
    },
    {
      key: 'age',
      header: 'Age',
      render: (lead) => (
        <Tooltip content={lead.created_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.created_at)}</span>
        </Tooltip>
      ),
    },
    {
      key: 'blocked_on',
      header: 'Blocked on',
      render: (lead) => {
        const label = blockedOnCell(lead);
        const truncated = label.length > 60 ? `${label.slice(0, 60)}…` : label;
        return label.length > 60 ? (
          <Tooltip content={label}>
            <span className="cursor-help">{truncated}</span>
          </Tooltip>
        ) : (
          <span>{label}</span>
        );
      },
    },
    {
      key: 'last_activity',
      header: 'Last activity',
      render: (lead) => (
        <Tooltip content={lead.updated_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.updated_at)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Pipelines"
          subtitle="Operator queue — stuck leads"
        />

        {error ? (
          <div className="p-6 border border-border rounded-lg flex items-center justify-between">
            <span className="text-text-muted">{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        ) : (
          <AdminDataTable
            data={leads}
            columns={columns}
            loading={loading}
            getRowKey={(lead) => lead.id}
            onRowClick={(lead) => router.push(`/admin/pipelines/${lead.id}`)}
            emptyMessage="No leads match these filters."
          />
        )}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
```

> If `AdminDataTable` exposes different prop names (e.g. `rows` instead of `data`, or `keyField` instead of `getRowKey`), open `components/admin/AdminDataTable.tsx` and adjust to match. Do not invent props that don't exist; use what's there.
>
> Same caveat for `useToastStore`'s shape — open `lib/toast-store.ts` and use the call shape that file actually exports (`addToast({...})` vs `error(msg)` etc.). The intent is "show error toast on fetch failure."

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Fix any type mismatches against `AdminDataTable` / `AdminStatusBadge` / `useToastStore` props. Re-run until clean.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

Open `http://localhost:3000/admin/pipelines`. Expected: page loads, table renders (rows or empty state). Click a row — navigates to `/admin/pipelines/<id>` (which 404s; that's expected).

Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add app/admin/pipelines/page.tsx
git commit -m "feat(pipelines): queue list page (no filters yet)"
```

---

## Task 6: Queue list filters with URL sync

**Files:**
- Create: `app/admin/pipelines/_components/PipelineFilters.tsx`
- Modify: `app/admin/pipelines/page.tsx`

- [ ] **Step 1: Create `PipelineFilters.tsx`**

```tsx
'use client';

import { Switch } from '@/components/ui/Switch';
import { Tooltip } from '@/components/ui/Tooltip';
import type { LeadStatus, LeadPackage } from '@/lib/api-client';

export interface PipelineFiltersValue {
  status: LeadStatus | 'all';
  pkg: LeadPackage | 'all';
  needsHuman: boolean;
  stuck24h: boolean;
  order: 'oldest' | 'newest';
}

interface Props {
  value: PipelineFiltersValue;
  onChange: (next: PipelineFiltersValue) => void;
}

const STATUS_OPTIONS: Array<{ value: LeadStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'agents_complete', label: 'Awaiting review' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'routed_to_custom', label: 'Routed to custom' },
  { value: 'live', label: 'Live' },
  { value: 'abandoned', label: 'Abandoned' },
];

const PACKAGE_OPTIONS: Array<{ value: LeadPackage | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'business_starter', label: 'Starter' },
  { value: 'business_pro', label: 'Pro' },
];

export function PipelineFilters({ value, onChange }: Props) {
  const statusDisabled = value.needsHuman;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-surface rounded-lg border border-border">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Status</span>
        <Tooltip
          content={statusDisabled ? '"Needs human action" forces status = Awaiting review' : ''}
        >
          <select
            disabled={statusDisabled}
            value={value.status}
            onChange={(e) => onChange({ ...value, status: e.target.value as LeadStatus | 'all' })}
            className="px-2 py-1 rounded border border-border bg-surface text-text disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Tooltip>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Package</span>
        <select
          value={value.pkg}
          onChange={(e) => onChange({ ...value, pkg: e.target.value as LeadPackage | 'all' })}
          className="px-2 py-1 rounded border border-border bg-surface text-text"
        >
          {PACKAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={value.needsHuman}
          onChange={(checked) => onChange({ ...value, needsHuman: checked })}
        />
        <span>Needs human action</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={value.stuck24h}
          onChange={(checked) => onChange({ ...value, stuck24h: checked })}
        />
        <span>Stuck &gt; 24h</span>
      </label>

      <div className="ml-auto flex items-center gap-1 text-sm">
        <span className="text-text-muted mr-1">Sort</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'oldest' })}
          className={`px-2 py-1 rounded ${value.order === 'oldest' ? 'bg-accent-light text-text' : 'text-text-muted'}`}
        >
          Oldest first
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'newest' })}
          className={`px-2 py-1 rounded ${value.order === 'newest' ? 'bg-accent-light text-text' : 'text-text-muted'}`}
        >
          Newest first
        </button>
      </div>
    </div>
  );
}
```

> If `Switch` from `@/components/ui/Switch` uses `onCheckedChange` (or any other prop name) instead of `onChange`, adjust accordingly. Open the file to confirm.

- [ ] **Step 2: Wire filters into the page with URL sync**

Replace `app/admin/pipelines/page.tsx` with the URL-synced version:

```tsx
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { Tooltip } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { adminApi, type LeadSummary, type LeadStatus, type LeadPackage } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatAge } from './_lib/age';
import { blockedOnLabel } from './_lib/blocked-on';
import { STATUS_VARIANT } from './_lib/status-variant';
import { PipelineFilters, type PipelineFiltersValue } from './_components/PipelineFilters';

const PACKAGE_LABEL: Record<LeadPackage, string> = {
  business_starter: 'Starter',
  business_pro: 'Pro',
};

const STATUS_LABEL: Record<LeadStatus, string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Failed',
};

function blockedOnCell(lead: LeadSummary): string {
  const base = blockedOnLabel[lead.status] ?? '—';
  if (
    (lead.status === 'routed_to_custom' || lead.status === 'failed') &&
    lead.scope_rejection_reason
  ) return `${base} · ${lead.scope_rejection_reason}`;
  return base;
}

function readFilters(sp: URLSearchParams): PipelineFiltersValue {
  return {
    status: (sp.get('status') as LeadStatus) || 'all',
    pkg: (sp.get('package') as LeadPackage) || 'all',
    needsHuman: sp.get('needsHuman') === '1',
    stuck24h: sp.get('stuck24h') === '1',
    order: (sp.get('order') as 'oldest' | 'newest') || 'oldest',
  };
}

function writeFilters(filters: PipelineFiltersValue): string {
  const sp = new URLSearchParams();
  if (filters.status !== 'all') sp.set('status', filters.status);
  if (filters.pkg !== 'all') sp.set('package', filters.pkg);
  if (filters.needsHuman) sp.set('needsHuman', '1');
  if (filters.stuck24h) sp.set('stuck24h', '1');
  if (filters.order !== 'oldest') sp.set('order', filters.order);
  const s = sp.toString();
  return s ? `?${s}` : '';
}

function AdminPipelinesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);

  const [leads, setLeads] = useState<LeadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setFilters = (next: PipelineFiltersValue) => {
    router.replace(`/admin/pipelines${writeFilters(next)}`);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const status: LeadStatus | undefined = filters.needsHuman
      ? 'agents_complete'
      : filters.status === 'all'
        ? undefined
        : filters.status;

    adminApi.intake
      .listLeads({
        status,
        package: filters.pkg === 'all' ? undefined : filters.pkg,
        age_min_hours: filters.stuck24h ? 24 : undefined,
        order: filters.order,
        limit: 50,
      })
      .then((res) => {
        if (!cancelled) setLeads(res.leads);
      })
      .catch((e) => {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load leads';
        setError(msg);
        addToast({ message: msg, type: 'error' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [filters, addToast]);

  const columns: AdminDataTableColumn<LeadSummary>[] = [
    {
      key: 'contact', header: 'Org / Contact',
      render: (lead) => (
        <div className="flex flex-col">
          <span className="font-medium text-text">{lead.contact_name}</span>
          <span className="text-xs text-text-muted">{lead.contact_email}</span>
        </div>
      ),
    },
    {
      key: 'package', header: 'Package',
      render: (lead) => (
        <AdminStatusBadge variant="info" label={PACKAGE_LABEL[lead.package]} dot={false} />
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (lead) => (
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status]}
          label={STATUS_LABEL[lead.status]}
        />
      ),
    },
    {
      key: 'age', header: 'Age',
      render: (lead) => (
        <Tooltip content={lead.created_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.created_at)}</span>
        </Tooltip>
      ),
    },
    {
      key: 'blocked_on', header: 'Blocked on',
      render: (lead) => {
        const label = blockedOnCell(lead);
        const truncated = label.length > 60 ? `${label.slice(0, 60)}…` : label;
        return label.length > 60 ? (
          <Tooltip content={label}>
            <span className="cursor-help">{truncated}</span>
          </Tooltip>
        ) : <span>{label}</span>;
      },
    },
    {
      key: 'last_activity', header: 'Last activity',
      render: (lead) => (
        <Tooltip content={lead.updated_at}>
          <span className="cursor-help text-text-muted">{formatAge(lead.updated_at)}</span>
        </Tooltip>
      ),
    },
  ];

  return (
    <>
      <AdminPageHeader title="Pipelines" subtitle="Operator queue — stuck leads" />
      <PipelineFilters value={filters} onChange={setFilters} />
      {error ? (
        <div className="p-6 border border-border rounded-lg flex items-center justify-between">
          <span className="text-text-muted">{error}</span>
          <Button size="sm" variant="outline" onClick={() => router.replace(window.location.pathname + window.location.search)}>Retry</Button>
        </div>
      ) : (
        <AdminDataTable
          data={leads}
          columns={columns}
          loading={loading}
          getRowKey={(lead) => lead.id}
          onRowClick={(lead) => router.push(`/admin/pipelines/${lead.id}`)}
          emptyMessage="No leads match these filters."
        />
      )}
    </>
  );
}

export default function AdminPipelinesPage() {
  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <Suspense fallback={null}>
          <AdminPipelinesPageContent />
        </Suspense>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
```

`useSearchParams` requires the Suspense boundary in client pages — same pattern as `app/admin/users/page.tsx`.

- [ ] **Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: clean for these files.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

- Toggle each filter, confirm URL updates and table re-fetches.
- Toggle "Needs human action" — Status dropdown becomes disabled and effective filter is `agents_complete`.
- Refresh with filters in URL — state restores.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add app/admin/pipelines
git commit -m "feat(pipelines): URL-synced filters (status/package/needs-human/stuck-24h/sort)"
```

---

## Task 7: Detail page skeleton + LeadStateHeader + ServicesPanel

**Files:**
- Create: `app/admin/pipelines/_components/LeadStateHeader.tsx`
- Create: `app/admin/pipelines/_components/ServicesPanel.tsx`
- Create: `app/admin/pipelines/[leadId]/page.tsx`

- [ ] **Step 1: Create `LeadStateHeader.tsx`**

```tsx
'use client';

import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import type { LeadDetail } from '@/lib/api-client';
import { formatAge } from '../_lib/age';
import { blockedOnLabel } from '../_lib/blocked-on';
import { STATUS_VARIANT } from '../_lib/status-variant';
import { formatDateWithRelative } from '@/lib/utils/time';

const STATUS_LABEL: Record<LeadDetail['status'], string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Failed',
};

function fmtCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Row {
  label: string;
  iso: string | null;
}

function TimestampGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4">
      {rows.map((row) => {
        if (!row.iso) {
          return (
            <div key={row.label}>
              <dt className="text-xs text-text-muted">{row.label}</dt>
              <dd className="text-sm text-text-faint">—</dd>
            </div>
          );
        }
        const f = formatDateWithRelative(row.iso);
        return (
          <div key={row.label}>
            <dt className="text-xs text-text-muted">{row.label}</dt>
            <Tooltip content={f.absolute}>
              <dd className="text-sm cursor-help">{f.relative}</dd>
            </Tooltip>
          </div>
        );
      })}
    </dl>
  );
}

export function LeadStateHeader({ lead }: { lead: LeadDetail }) {
  const blockedOn = blockedOnLabel[lead.status];
  const closingTimestamp = lead.scope_confirmed_at
    ? { label: 'Scope confirmed', iso: lead.scope_confirmed_at }
    : { label: 'Scope rejected', iso: lead.scope_rejected_at };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status]}
          label={STATUS_LABEL[lead.status]}
        />
        <Tooltip content={lead.created_at}>
          <span className="text-sm text-text-muted cursor-help">Age: {formatAge(lead.created_at)}</span>
        </Tooltip>
        {blockedOn && (
          <span className="text-sm text-text-muted">· {blockedOn}</span>
        )}
        <span className="ml-auto text-sm text-text-muted">
          Total cost: <span className="text-text">{fmtCost(lead.total_cost_cents)}</span>
        </span>
      </div>

      <TimestampGrid rows={[
        { label: 'Created', iso: lead.created_at },
        { label: 'Form submitted', iso: lead.form_submitted_at },
        { label: 'Agents complete', iso: lead.agents_completed_at },
        closingTimestamp,
      ]} />

      {lead.scope_rejection_reason && (
        <div className="mt-4 p-3 rounded border border-border bg-surface-alt text-sm">
          <span className="font-medium text-text">Rejected reason:</span>{' '}
          <span className="text-text-muted">{lead.scope_rejection_reason}</span>
        </div>
      )}
    </Card>
  );
}
```

> If `Card` requires a `title` prop or doesn't accept arbitrary children, open `components/ui/Card.tsx` and adapt — wrap in whatever container the codebase already uses. Same for `formatDateWithRelative` — use whatever shape it actually returns.

- [ ] **Step 2: Create `ServicesPanel.tsx`**

```tsx
'use client';

import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import type { LeadService } from '@/lib/api-client';
import { formatAge } from '../_lib/age';

const SERVICE_LABEL: Record<LeadService['service'], string> = {
  website: 'Website',
  dns: 'DNS',
  email: 'Email',
  domain: 'Domain',
};

export function ServicesPanel({ services }: { services: LeadService[] }) {
  if (services.length === 0) {
    return (
      <Card title="Customer-facing service status">
        <p className="text-sm text-text-muted">No service rows yet.</p>
      </Card>
    );
  }

  return (
    <Card title="Customer-facing service status">
      <ul className="divide-y divide-border">
        {services.map((s) => (
          <li key={s.service} className="py-3 flex items-center gap-4">
            <span className="font-medium text-text w-24">{SERVICE_LABEL[s.service]}</span>
            <span className="flex-1 text-sm text-text-muted">{s.progress_label || '—'}</span>
            <AdminStatusBadge variant="neutral" label={s.state} />
            <Tooltip content={s.updated_at}>
              <span className="text-xs text-text-muted cursor-help w-12 text-right">
                {formatAge(s.updated_at)}
              </span>
            </Tooltip>
          </li>
        ))}
      </ul>
    </Card>
  );
}
```

- [ ] **Step 3: Create the detail page (header + services only; agent cards in later tasks)**

Create `app/admin/pipelines/[leadId]/page.tsx`:

```tsx
'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import { adminApi, type LeadDetailResponse } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { LeadStateHeader } from '../_components/LeadStateHeader';
import { ServicesPanel } from '../_components/ServicesPanel';

const PACKAGE_LABEL = {
  business_starter: 'Starter',
  business_pro: 'Pro',
} as const;

export default function PipelineDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>;
}) {
  const { leadId } = use(params);
  const { addToast } = useToastStore();
  const [data, setData] = useState<LeadDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.intake.getLead(leadId);
      setData(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load lead';
      setError(msg);
      addToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [leadId, addToast]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        {loading && !data ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
          </div>
        ) : error && !data ? (
          <div className="p-6 border border-border rounded-lg flex items-center justify-between">
            <span className="text-text-muted">{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        ) : data ? (
          <>
            <AdminPageHeader
              title={`${data.lead.contact_name} — ${PACKAGE_LABEL[data.lead.package]}`}
              subtitle={data.lead.contact_email}
              breadcrumb={[
                { label: 'Admin', href: '/admin' },
                { label: 'Pipelines', href: '/admin/pipelines' },
                { label: data.lead.contact_name },
              ]}
            />
            <div className="space-y-6">
              <LeadStateHeader lead={data.lead} />
              <ServicesPanel services={data.services} />
              {/* Operator actions and agent cards land in subsequent tasks */}
            </div>
          </>
        ) : null}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
```

> Next.js 15 makes `params` async — the `use(params)` pattern is the App Router idiom. If your codebase uses a different convention (sync params + a `// @ts-expect-error`), match it.

- [ ] **Step 4: Type check**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

Click a row from the list. Detail page loads with header, status, timestamps, services. No actions or agent cards yet.

- [ ] **Step 6: Commit**

```bash
git add app/admin/pipelines
git commit -m "feat(pipelines): detail page skeleton with state header and services panel"
```

---

## Task 8: OperatorActions component + tests

**Files:**
- Create: `app/admin/pipelines/_components/OperatorActions.tsx`
- Create: `tests/admin/pipelines/OperatorActions.test.tsx`
- Modify: `app/admin/pipelines/[leadId]/page.tsx` (insert `<OperatorActions />`)

- [ ] **Step 1: Write the failing component test**

Create `tests/admin/pipelines/OperatorActions.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OperatorActions } from '@/app/admin/pipelines/_components/OperatorActions';
import type { LeadDetail } from '@/lib/api-client';

function makeLead(overrides: Partial<LeadDetail> = {}): LeadDetail {
  return {
    id: 'lead-1', firm_id: 'f', org_id: 'o',
    package: 'business_starter',
    contact_email: 'a@b.c', contact_name: 'A',
    status: 'agents_complete',
    version: 1, total_cost_cents: 0,
    created_at: '2026-05-06T00:00:00Z',
    form_submitted_at: null, agents_completed_at: null,
    scope_confirmed_at: null, scope_rejected_at: null,
    scope_rejection_reason: null,
    updated_at: '2026-05-06T00:00:00Z',
    lead_record: null, research_report: null, similarity_report: null,
    upsell_risk_report: null, copy_prep: null, structure_prep: null, design_prep: null,
    ...overrides,
  };
}

describe('OperatorActions', () => {
  it('shows confirm + reject + mark-failed when status=agents_complete', () => {
    render(
      <OperatorActions
        lead={makeLead({ status: 'agents_complete' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
        onMarkFailed={vi.fn()}
      />
    );
    expect(screen.getByRole('button', { name: /confirm scope/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^reject/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark failed/i })).toBeInTheDocument();
  });

  it('hides confirm + reject when status is not agents_complete; mark-failed still shown for non-terminal', () => {
    render(
      <OperatorActions
        lead={makeLead({ status: 'provisioning' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
        onMarkFailed={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /confirm scope/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^reject/i })).toBeNull();
    expect(screen.getByRole('button', { name: /mark failed/i })).toBeInTheDocument();
  });

  it('hides all buttons for terminal status', () => {
    render(
      <OperatorActions
        lead={makeLead({ status: 'live' })}
        onConfirmScope={vi.fn()}
        onReject={vi.fn()}
        onMarkFailed={vi.fn()}
      />
    );
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByText(/no operator actions available/i)).toBeInTheDocument();
  });

  it('reject modal blocks submission when reason is empty', async () => {
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(
      <OperatorActions
        lead={makeLead({ status: 'agents_complete' })}
        onConfirmScope={vi.fn()}
        onReject={onReject}
        onMarkFailed={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /^reject/i }));
    const submit = await screen.findByRole('button', { name: /submit reject/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText(/reason/i), '   ');
    expect(submit).toBeDisabled();
    await user.clear(screen.getByLabelText(/reason/i));
    await user.type(screen.getByLabelText(/reason/i), 'real reason');
    expect(submit).toBeEnabled();
    await user.click(submit);
    expect(onReject).toHaveBeenCalledWith('real reason');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:run -- tests/admin/pipelines/OperatorActions.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `OperatorActions.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import type { LeadDetail, LeadStatus } from '@/lib/api-client';

const TERMINAL_STATUSES: LeadStatus[] = ['live', 'routed_to_custom', 'abandoned', 'failed'];

interface Props {
  lead: LeadDetail;
  onConfirmScope: () => void | Promise<void>;
  onReject: (reason: string) => void | Promise<void>;
  onMarkFailed: (reason: string) => void | Promise<void>;
  busy?: boolean;
}

type ModalKind = 'confirm' | 'reject' | 'mark-failed' | null;

export function OperatorActions({ lead, onConfirmScope, onReject, onMarkFailed, busy }: Props) {
  const [open, setOpen] = useState<ModalKind>(null);
  const [reason, setReason] = useState('');

  const isAwaitingReview = lead.status === 'agents_complete';
  const isTerminal = TERMINAL_STATUSES.includes(lead.status);
  const canMarkFailed = !isTerminal;

  if (!isAwaitingReview && !canMarkFailed) {
    return (
      <p className="text-sm text-text-muted italic">
        No operator actions available in this state.
      </p>
    );
  }

  const closeModal = () => { setOpen(null); setReason(''); };

  const submitReject = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onReject(trimmed);
    closeModal();
  };

  const submitMarkFailed = async () => {
    const trimmed = reason.trim();
    if (!trimmed) return;
    await onMarkFailed(trimmed);
    closeModal();
  };

  return (
    <div className="flex flex-wrap gap-2">
      {isAwaitingReview && (
        <>
          <Button variant="primary" onClick={() => setOpen('confirm')} disabled={busy}>
            Confirm scope
          </Button>
          <Button variant="outline" onClick={() => setOpen('reject')} disabled={busy}>
            Reject
          </Button>
        </>
      )}
      {canMarkFailed && (
        <Button variant="outline" onClick={() => setOpen('mark-failed')} disabled={busy}>
          Mark failed
        </Button>
      )}

      {open === 'confirm' && (
        <Modal isOpen onClose={closeModal} title="Confirm scope">
          <p className="text-sm text-text-muted mb-4">
            Confirm scope and start provisioning? This emits <code>intake/scope.confirmed</code>. Idempotent.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button variant="primary" onClick={async () => { await onConfirmScope(); closeModal(); }} disabled={busy}>
              Confirm scope
            </Button>
          </div>
        </Modal>
      )}

      {open === 'reject' && (
        <Modal isOpen onClose={closeModal} title="Reject lead — route to custom build">
          <label className="block text-sm font-medium mb-1" htmlFor="reject-reason">Reason</label>
          <textarea
            id="reject-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
            rows={3}
            placeholder="e.g. scope mismatch — they want a Shopify store"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              aria-label="Submit reject"
              disabled={!reason.trim() || busy}
              onClick={submitReject}
            >
              Submit reject
            </Button>
          </div>
        </Modal>
      )}

      {open === 'mark-failed' && (
        <Modal isOpen onClose={closeModal} title="Mark failed">
          <label className="block text-sm font-medium mb-1" htmlFor="mark-failed-reason">Reason</label>
          <textarea
            id="mark-failed-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-2 border border-border rounded text-sm"
            rows={3}
            placeholder="e.g. OpenSRS registration failed after 3 retries"
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
            <Button
              variant="primary"
              aria-label="Submit mark failed"
              disabled={!reason.trim() || busy}
              onClick={submitMarkFailed}
            >
              Submit mark failed
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
```

> If `@/components/ui/Modal` has a different prop signature (e.g. `open` instead of `isOpen`, or no `title` prop), open the file and adjust. The intent is "modal with title, body, and close on overlay click."

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test:run -- tests/admin/pipelines/OperatorActions.test.tsx
```

Expected: PASS (all 4 tests).

- [ ] **Step 5: Wire `OperatorActions` into the detail page**

Modify `app/admin/pipelines/[leadId]/page.tsx`:

Add the import:
```tsx
import { OperatorActions } from '../_components/OperatorActions';
```

Add a `busy` state and three handlers inside the component:
```tsx
const [busy, setBusy] = useState(false);

const runAction = useCallback(
  async (fn: () => Promise<unknown>, successMsg: string) => {
    setBusy(true);
    try {
      await fn();
      addToast({ message: successMsg, type: 'success' });
      await load();
    } catch (e) {
      const apiErr = e as { statusCode?: number; details?: { error?: string; from?: string; to?: string }; message?: string };
      if (apiErr.statusCode === 409 && apiErr.details?.from && apiErr.details?.to) {
        addToast({
          message: `Already in state ${apiErr.details.to}.`,
          type: 'info',
        });
        await load();
      } else {
        addToast({ message: apiErr.message ?? 'Action failed', type: 'error' });
      }
    } finally {
      setBusy(false);
    }
  },
  [load, addToast]
);
```

Insert the component below `<LeadStateHeader />`:

```tsx
<OperatorActions
  lead={data.lead}
  busy={busy}
  onConfirmScope={() => runAction(() => adminApi.intake.confirmScope(leadId), 'Scope confirmed.')}
  onReject={(reason) => runAction(() => adminApi.intake.reject(leadId, reason), 'Lead routed to custom.')}
  onMarkFailed={(reason) => runAction(() => adminApi.intake.markFailed(leadId, reason), 'Lead marked failed.')}
/>
```

- [ ] **Step 6: Type check + manual smoke test**

```bash
npx tsc --noEmit
npm run dev
```

Open a lead in `agents_complete`. Click Confirm scope (modal appears, idempotent message). Click Reject (modal forces non-empty reason). Click Mark failed (same).

- [ ] **Step 7: Commit**

```bash
git add app/admin/pipelines tests/admin/pipelines/OperatorActions.test.tsx
git commit -m "feat(pipelines): operator actions with reason-required modals + tests"
```

---

## Task 9: GenericAgentCard + tests + wire Scout/Matchmaker/Strategist

**Files:**
- Create: `app/admin/pipelines/_components/AgentCards/GenericAgentCard.tsx`
- Create: `app/admin/pipelines/_components/AgentCards/ScoutCard.tsx`
- Create: `app/admin/pipelines/_components/AgentCards/MatchmakerCard.tsx`
- Create: `app/admin/pipelines/_components/AgentCards/StrategistCard.tsx`
- Create: `tests/admin/pipelines/GenericAgentCard.test.tsx`
- Modify: `app/admin/pipelines/[leadId]/page.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/admin/pipelines/GenericAgentCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GenericAgentCard } from '@/app/admin/pipelines/_components/AgentCards/GenericAgentCard';

describe('GenericAgentCard', () => {
  it('renders "Not yet generated" when data is null', () => {
    render(<GenericAgentCard agentName="Scout" field="research_report" data={null} />);
    expect(screen.getByText(/not yet generated/i)).toBeInTheDocument();
  });

  it('renders nested object keys', () => {
    render(
      <GenericAgentCard
        agentName="Scout"
        field="research_report"
        data={{ summary: 'A small B2B SaaS.', size: { employees: 12, revenue_band: 'sub-$1M' } }}
      />
    );
    expect(screen.getByText('summary')).toBeInTheDocument();
    expect(screen.getByText('A small B2B SaaS.')).toBeInTheDocument();
    expect(screen.getByText('size')).toBeInTheDocument();
    expect(screen.getByText('employees')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders array items inside an object', () => {
    render(
      <GenericAgentCard
        agentName="Strategist"
        field="upsell_risk_report"
        data={{ risks: ['churn', 'price'] }}
      />
    );
    expect(screen.getByText('risks')).toBeInTheDocument();
    expect(screen.getByText('churn')).toBeInTheDocument();
    expect(screen.getByText('price')).toBeInTheDocument();
  });

  it('toggles raw JSON view', async () => {
    const user = userEvent.setup();
    render(
      <GenericAgentCard agentName="Scout" field="research_report" data={{ a: 1 }} />
    );
    expect(screen.queryByText('"a": 1', { exact: false })).toBeNull();
    await user.click(screen.getByRole('button', { name: /view raw json/i }));
    expect(screen.getByText(/"a": 1/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:run -- tests/admin/pipelines/GenericAgentCard.test.tsx
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `GenericAgentCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface Props {
  agentName: string;
  field: string;
  data: unknown;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function ValueNode({ value, depth }: { value: unknown; depth: number }) {
  if (value === null || value === undefined) {
    return <span className="text-text-faint italic">—</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-sm text-text break-words">{value}</span>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-sm text-text">{String(value)}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-faint italic">empty</span>;
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm">
            <ValueNode value={item} depth={depth + 1} />
          </li>
        ))}
      </ul>
    );
  }
  if (isPlainObject(value)) {
    return <ObjectNode obj={value} depth={depth + 1} />;
  }
  return <span className="text-sm text-text">{String(value)}</span>;
}

function ObjectNode({ obj, depth }: { obj: Record<string, unknown>; depth: number }) {
  return (
    <dl className={depth === 0 ? 'space-y-3' : 'space-y-2 pl-4 border-l border-border'}>
      {Object.entries(obj).map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">{k}</dt>
          <dd className="mt-1"><ValueNode value={v} depth={depth} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function GenericAgentCard({ agentName, field, data }: Props) {
  const [showRaw, setShowRaw] = useState(false);
  return (
    <Card title={agentName}>
      <div className="text-xs text-text-muted -mt-2 mb-3">{field}</div>
      {data === null ? (
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      ) : isPlainObject(data) ? (
        <ObjectNode obj={data} depth={0} />
      ) : (
        <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
      )}
      {data !== null && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-xs text-text-muted underline"
          >
            {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
          </button>
          {showRaw && (
            <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
              {JSON.stringify(data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 4: Run test, verify it passes**

```bash
npm run test:run -- tests/admin/pipelines/GenericAgentCard.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Create the three thin wrappers**

`app/admin/pipelines/_components/AgentCards/ScoutCard.tsx`:
```tsx
import type { ResearchReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function ScoutCard({ data }: { data: ResearchReport | null }) {
  return <GenericAgentCard agentName="Scout" field="research_report" data={data} />;
}
```

`app/admin/pipelines/_components/AgentCards/MatchmakerCard.tsx`:
```tsx
import type { SimilarityReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function MatchmakerCard({ data }: { data: SimilarityReport | null }) {
  return <GenericAgentCard agentName="Matchmaker" field="similarity_report" data={data} />;
}
```

`app/admin/pipelines/_components/AgentCards/StrategistCard.tsx`:
```tsx
import type { UpsellRiskReport } from '@/lib/schemas/intake';
import { GenericAgentCard } from './GenericAgentCard';

export function StrategistCard({ data }: { data: UpsellRiskReport | null }) {
  return <GenericAgentCard agentName="Strategist" field="upsell_risk_report" data={data} />;
}
```

- [ ] **Step 6: Render the three cards on the detail page**

In `app/admin/pipelines/[leadId]/page.tsx`, add imports and render below `<OperatorActions />`:

```tsx
import { ScoutCard } from '../_components/AgentCards/ScoutCard';
import { MatchmakerCard } from '../_components/AgentCards/MatchmakerCard';
import { StrategistCard } from '../_components/AgentCards/StrategistCard';

// inside the JSX, below OperatorActions:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Scribe + Composer + Stylist will land here in later tasks */}
  <ScoutCard data={data.lead.research_report} />
  <MatchmakerCard data={data.lead.similarity_report} />
  <StrategistCard data={data.lead.upsell_risk_report} />
</div>
```

- [ ] **Step 7: Type check + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Open a lead with agent output. Three generic cards render. "View raw JSON" toggles correctly.

- [ ] **Step 8: Commit**

```bash
git add app/admin/pipelines tests/admin/pipelines/GenericAgentCard.test.tsx
git commit -m "feat(pipelines): generic agent card + Scout/Matchmaker/Strategist wrappers"
```

---

## Task 10: ScribeCard

**Files:**
- Create: `app/admin/pipelines/_components/AgentCards/ScribeCard.tsx`
- Modify: `app/admin/pipelines/[leadId]/page.tsx`

- [ ] **Step 1: Inspect the LeadRecord shape**

Open `lib/schemas/intake/LeadRecord/v1.ts` and note the top-level keys. The card surfaces (per the operator-queue doc): client/business name, services list, brand voice, SEO terms.

- [ ] **Step 2: Implement `ScribeCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { LeadRecord } from '@/lib/schemas/intake';

interface Props { data: LeadRecord | null }

export function ScribeCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Scribe">
        <div className="text-xs text-text-muted -mt-2 mb-3">lead_record</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  return (
    <Card title="Scribe">
      <div className="text-xs text-text-muted -mt-2 mb-3">lead_record</div>

      <section className="space-y-3">
        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Business</h4>
          <p className="text-sm font-medium">{data.client?.businessName ?? '—'}</p>
          <p className="text-sm text-text-muted">{data.client?.industry ?? ''}{data.client?.location ? ` · ${data.client.location}` : ''}</p>
        </div>

        {data.brand && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Brand voice</h4>
            <p className="text-sm">{data.brand.tagline ?? '—'}</p>
            {Array.isArray(data.brand.tone) && data.brand.tone.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {data.brand.tone.map((t) => (
                  <span key={t} className="px-2 py-0.5 text-xs rounded-full bg-surface-alt text-text-muted">{t}</span>
                ))}
              </div>
            )}
            {data.brand.voiceGuidelines && (
              <p className="text-sm text-text-muted mt-1">{data.brand.voiceGuidelines}</p>
            )}
          </div>
        )}

        {Array.isArray((data as any).services) && (data as any).services.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">Services</h4>
            <ul className="list-disc list-inside space-y-1">
              {(data as any).services.map((s: any, i: number) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{s.name}</span>
                  {s.description && <span className="text-text-muted"> — {s.description}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray((data as any).seo?.keywords) && (data as any).seo.keywords.length > 0 && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted">SEO terms</h4>
            <div className="flex flex-wrap gap-1">
              {(data as any).seo.keywords.map((k: string) => (
                <span key={k} className="px-2 py-0.5 text-xs rounded bg-surface-alt text-text-muted">{k}</span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-4">
        <button type="button" onClick={() => setShowRaw((v) => !v)} className="text-xs text-text-muted underline">
          {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}
```

> The `(data as any)` casts are deliberate fallbacks — if `services` or `seo` aren't on the inferred `LeadRecord` type (because the upstream schema is shaped differently), the card still renders gracefully. After step 1 you may know the exact field names; tighten the types if you can. Don't crash if a field is missing.

- [ ] **Step 3: Render on the detail page**

Add to imports and place **first** in the agent-card grid:

```tsx
import { ScribeCard } from '../_components/AgentCards/ScribeCard';

// at the top of the agent-card grid, before ScoutCard:
<ScribeCard data={data.lead.lead_record} />
```

- [ ] **Step 4: Type check + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/pipelines
git commit -m "feat(pipelines): Scribe card — brand profile structured view"
```

---

## Task 11: ComposerCard

**Files:**
- Create: `app/admin/pipelines/_components/AgentCards/ComposerCard.tsx`
- Modify: `app/admin/pipelines/[leadId]/page.tsx`

- [ ] **Step 1: Inspect ContentPlanReport shape**

Open `lib/schemas/intake/ContentPlanReport/v1.ts`. Identify: pages list, hero copy, missing-assets list. The operator-queue doc mentions all three.

- [ ] **Step 2: Implement `ComposerCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { ContentPlanReport } from '@/lib/schemas/intake';

interface Props { data: ContentPlanReport | null }

export function ComposerCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Composer">
        <div className="text-xs text-text-muted -mt-2 mb-3">copy_prep</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  const d = data as any;
  const pages = Array.isArray(d.pages) ? d.pages : [];
  const missingAssets = Array.isArray(d.missingAssets) ? d.missingAssets
    : Array.isArray(d.missing_assets) ? d.missing_assets : [];

  return (
    <Card title="Composer">
      <div className="text-xs text-text-muted -mt-2 mb-3">copy_prep</div>

      {missingAssets.length > 0 && (
        <div className="mb-4 p-3 rounded border border-warning bg-warning-soft">
          <p className="text-xs font-medium uppercase tracking-wide text-warning mb-1">
            Missing assets ({missingAssets.length})
          </p>
          <ul className="list-disc list-inside space-y-0.5">
            {missingAssets.map((m: any, i: number) => (
              <li key={i} className="text-sm">
                {typeof m === 'string' ? m : (m.label ?? m.name ?? JSON.stringify(m))}
              </li>
            ))}
          </ul>
        </div>
      )}

      {pages.length > 0 ? (
        <ul className="space-y-3">
          {pages.map((p: any, i: number) => (
            <li key={i} className="border border-border rounded p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{p.title ?? p.name ?? `Page ${i + 1}`}</span>
                {p.slug && <span className="text-xs text-text-muted">/{p.slug}</span>}
              </div>
              {(p.hero?.headline || p.heroHeadline) && (
                <p className="mt-1 text-sm">{p.hero?.headline ?? p.heroHeadline}</p>
              )}
              {(p.hero?.subhead || p.heroSubhead) && (
                <p className="text-sm text-text-muted">{p.hero?.subhead ?? p.heroSubhead}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">No pages in this plan.</p>
      )}

      <div className="mt-4">
        <button type="button" onClick={() => setShowRaw((v) => !v)} className="text-xs text-text-muted underline">
          {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}
```

> Same `(d as any)` defensive pattern as ScribeCard. If `warning-soft` isn't a Tailwind token in this codebase, swap for `bg-warning/10` or whatever exists. Look at how other admin cards style alerts — `components/ui/InfoCallout.tsx` is a good reference.

- [ ] **Step 3: Render on the detail page**

```tsx
import { ComposerCard } from '../_components/AgentCards/ComposerCard';

// in the grid, after Strategist:
<ComposerCard data={data.lead.copy_prep} />
```

- [ ] **Step 4: Type check + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add app/admin/pipelines
git commit -m "feat(pipelines): Composer card — pages + missing assets callout"
```

---

## Task 12: StylistCard

**Files:**
- Create: `app/admin/pipelines/_components/AgentCards/StylistCard.tsx`
- Modify: `app/admin/pipelines/[leadId]/page.tsx`

- [ ] **Step 1: Inspect DesignDirectionReport shape**

Open `lib/schemas/intake/DesignDirectionReport/v1.ts`. Identify: colors (with `hex`), font pairings, layout sections.

- [ ] **Step 2: Implement `StylistCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { DesignDirectionReport } from '@/lib/schemas/intake';

interface Props { data: DesignDirectionReport | null }

function Swatch({ hex, label, role }: { hex: string; label?: string; role?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-8 h-8 rounded border border-border flex-shrink-0"
        style={{ backgroundColor: hex }}
        aria-label={label ?? hex}
      />
      <div className="flex flex-col">
        {label && <span className="text-xs font-medium">{label}</span>}
        <span className="text-xs text-text-muted font-mono">{hex}</span>
        {role && <span className="text-[10px] text-text-faint uppercase">{role}</span>}
      </div>
    </div>
  );
}

export function StylistCard({ data }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  if (!data) {
    return (
      <Card title="Stylist">
        <div className="text-xs text-text-muted -mt-2 mb-3">design_prep</div>
        <p className="text-sm text-text-muted italic">Not yet generated</p>
      </Card>
    );
  }

  const d = data as any;
  const colors = Array.isArray(d.colors) ? d.colors : [];
  const fonts = Array.isArray(d.fonts) ? d.fonts : Array.isArray(d.fontPairings) ? d.fontPairings : [];
  const layouts = Array.isArray(d.layouts) ? d.layouts
    : Array.isArray(d.sections) ? d.sections : [];

  return (
    <Card title="Stylist">
      <div className="text-xs text-text-muted -mt-2 mb-3">design_prep</div>

      {colors.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Palette</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {colors.map((c: any, i: number) => (
              <Swatch key={i} hex={c.hex} label={c.name} role={c.role} />
            ))}
          </div>
        </section>
      )}

      {fonts.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Typography</h4>
          <div className="space-y-2">
            {fonts.map((f: any, i: number) => {
              const family = f.family ?? f.fontFamily ?? f.name;
              const role = f.role ?? f.usage;
              return (
                <div key={i} className="flex items-baseline gap-3">
                  <span style={{ fontFamily: family }} className="text-base">
                    {family ?? '—'}
                  </span>
                  {role && <span className="text-xs text-text-muted">{role}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {layouts.length > 0 && (
        <section className="mb-4">
          <h4 className="text-xs font-medium uppercase tracking-wide text-text-muted mb-2">Layout sections</h4>
          <div className="flex flex-wrap gap-1">
            {layouts.map((l: any, i: number) => (
              <span key={i} className="px-2 py-0.5 text-xs rounded bg-surface-alt text-text-muted">
                {l.name ?? l.type ?? `Section ${i + 1}`}
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-4">
        <button type="button" onClick={() => setShowRaw((v) => !v)} className="text-xs text-text-muted underline">
          {showRaw ? 'Hide raw JSON' : 'View raw JSON'}
        </button>
        {showRaw && (
          <pre className="mt-2 p-3 bg-surface-alt rounded text-xs overflow-auto max-h-80">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Render on the detail page (final agent-card grid order)**

The order in the grid should now be:

```tsx
import { StylistCard } from '../_components/AgentCards/StylistCard';

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <ScribeCard data={data.lead.lead_record} />
  <ScoutCard data={data.lead.research_report} />
  <MatchmakerCard data={data.lead.similarity_report} />
  <StrategistCard data={data.lead.upsell_risk_report} />
  <ComposerCard data={data.lead.copy_prep} />
  <StylistCard data={data.lead.design_prep} />
</div>
```

- [ ] **Step 4: Type check + manual smoke**

```bash
npx tsc --noEmit
npm run dev
```

Verify color swatches render with the correct background colors and font pairings render in their declared families.

- [ ] **Step 5: Commit**

```bash
git add app/admin/pipelines
git commit -m "feat(pipelines): Stylist card — color swatches, font previews, layout tags"
```

---

## Task 13: Final QA pass and lint

**Files:** none new — verification only.

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: all tests PASS (no regressions in unrelated suites).

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Fix any errors specific to the new files. Pre-existing warnings unrelated to this work can be left.

- [ ] **Step 3: Run TypeScript on the whole project**

```bash
npx tsc --noEmit
```

Resolve any errors in the new files.

- [ ] **Step 4: Manual end-to-end QA**

```bash
npm run dev
```

Walk these flows against the dev backend (logged in as a superadmin):

1. **Queue list:** open `/admin/pipelines`. Toggle every filter. Refresh page — filter state restored from URL.
2. **Detail navigation:** click a row. Detail page loads with header, services, action buttons (only visible when applicable), six agent cards (or "Not yet generated" placeholders).
3. **Confirm scope** (lead in `agents_complete`): click → modal → confirm. Toast says success, status badge flips to "Scope confirmed".
4. **Reject** (separate `agents_complete` lead): click → modal blocks empty/whitespace-only reason → enter reason → submit. Status flips to "Routed to custom".
5. **Mark failed** (any non-terminal lead): same modal pattern.
6. **Idempotency / 409 path:** replay confirm-scope on the lead from step 3. Toast says "Already in state scope_confirmed" (or similar) — no error toast.
7. **Error path:** stop the backend, click an action — error toast appears, page does not crash.

Fix anything that misbehaves before committing.

- [ ] **Step 5: Final commit (if anything changed) and final summary**

If any fixes were made:

```bash
git add -A
git commit -m "fix(pipelines): post-QA polish"
```

Otherwise no commit needed. The branch is now ready for PR.

---

## Out of scope (post-this-PR)

- **JAV-119 1.6** — Pax8 manual queue lane (separate phase).
- **JAV-119 1.7 follow-up** — update `javelina-intake/src/lib/inngest/on-form-submitted.ts` to use `[leadId]` instead of `[orgId]` in the Teams deep link. Different repo; tracked separately.
- Polling / realtime updates.
- Bulk actions / row selection.
- An `operator_actions` history view (no read endpoint exists yet).
