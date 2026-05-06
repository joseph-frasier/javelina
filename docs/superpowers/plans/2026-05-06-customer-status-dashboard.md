# Customer Status Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mocked `BuildProgressCard` with a live 4-service tile dashboard (`website`, `dns`, `email`, `domain`) driven by `GET /api/business/:orgId`, narrating provisioning state via `state` + `progress_label` + `metadata.phase`.

**Architecture:** Pure derivation helpers in `lib/business/service-status.ts` map the existing typed `BusinessDetail.provisioning[]` into normalized tile data. Two presentational components (`ServiceStatusTile`, `ServiceStatusGrid`) render the tiles. Polling is added by setting a dynamic `refetchInterval` on the existing `useQuery` call in `app/business/[orgId]/page.tsx` (the page already uses TanStack Query). The legacy `BuildProgressCard` and `build-progress-mock.ts` are deleted.

**Tech Stack:** Next.js 15 (client components), TanStack Query (already wired), TypeScript, vitest + React Testing Library + jsdom.

**Spec:** `docs/superpowers/specs/2026-05-06-customer-status-dashboard-design.md`

---

## File map

| Path | Action | Responsibility |
|------|--------|----------------|
| `lib/business/service-status.ts` | CREATE | Pure helpers: `normalizeProvisioning`, `shouldPoll`, `summaryHeadline`, types. |
| `lib/business/service-status.test.ts` | CREATE | Unit tests for the helpers. |
| `components/business/dashboard/ServiceStatusTile.tsx` | CREATE | Renders one tile: glyph + title + sub-line. Visuals only. |
| `components/business/dashboard/ServiceStatusTile.test.tsx` | CREATE | RTL tests across 6 states. |
| `components/business/dashboard/ServiceStatusGrid.tsx` | CREATE | Wraps `Card`, headline summary, four tiles in canonical order. |
| `components/business/dashboard/ServiceStatusGrid.test.tsx` | CREATE | RTL tests for ordering and headline. |
| `components/business/dashboard/BusinessPlaceholderDashboard.tsx` | EDIT | Drop `MOCK_MILESTONES` import + `<BuildProgressCard>`; accept `provisioning` prop; render `<ServiceStatusGrid>`. |
| `app/business/[orgId]/page.tsx` | EDIT | Add dynamic `refetchInterval`; pass `provisioning` to dashboard. |
| `components/business/dashboard/BuildProgressCard.tsx` | DELETE | Replaced by tile model. |
| `lib/business/build-progress-mock.ts` | DELETE | Replaced by real data. |

---

## Task 1: Service status types and helpers (TDD)

**Files:**
- Create: `lib/business/service-status.ts`
- Create: `lib/business/service-status.test.ts`

- [ ] **Step 1.1: Write failing tests**

Create `lib/business/service-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { BusinessDetail } from '@/lib/api/business';
import {
  normalizeProvisioning,
  shouldPoll,
  summaryHeadline,
  type ServiceTileData,
} from './service-status';

function makeDetail(
  provisioning: BusinessDetail['provisioning']
): BusinessDetail {
  return {
    org: { id: 'o1', name: 'Acme', slug: 'acme', status: 'active', created_at: '2026-05-06T00:00:00Z' },
    intake: null,
    provisioning,
    events: [],
  };
}

describe('normalizeProvisioning', () => {
  it('returns 4 tiles in canonical order, defaulting missing services to not_started', () => {
    const tiles = normalizeProvisioning([]);
    expect(tiles.map((t) => t.service)).toEqual(['website', 'dns', 'email', 'domain']);
    expect(tiles.every((t) => t.state === 'not_started')).toBe(true);
    expect(tiles.every((t) => t.progressLabel === null)).toBe(true);
    expect(tiles.every((t) => t.phase === null)).toBe(true);
  });

  it('passes through known states verbatim', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'website',
        state: 'in_progress',
        internal_state: null,
        progress_label: 'Generated page-by-page copy for your site',
        metadata: { phase: 'content' },
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    const website = tiles.find((t) => t.service === 'website')!;
    expect(website.state).toBe('in_progress');
    expect(website.progressLabel).toBe('Generated page-by-page copy for your site');
    expect(website.phase).toBe('content');
    expect(website.updatedAt).toBe('2026-05-06T12:00:00Z');
  });

  it('coerces unknown state strings to not_started', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'dns',
        state: 'something_weird',
        internal_state: null,
        progress_label: null,
        metadata: {},
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    expect(tiles.find((t) => t.service === 'dns')!.state).toBe('not_started');
  });

  it('handles non-string phase metadata as null', () => {
    const tiles = normalizeProvisioning([
      {
        service: 'website',
        state: 'in_progress',
        internal_state: null,
        progress_label: null,
        metadata: { phase: 42 as unknown as string },
        updated_at: '2026-05-06T12:00:00Z',
      },
    ]);
    expect(tiles.find((t) => t.service === 'website')!.phase).toBeNull();
  });

  it('preserves all six canonical states', () => {
    const states = ['not_started', 'in_progress', 'needs_input', 'failed', 'live', 'not_applicable'] as const;
    for (const state of states) {
      const tiles = normalizeProvisioning([
        { service: 'email', state, internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T12:00:00Z' },
      ]);
      expect(tiles.find((t) => t.service === 'email')!.state).toBe(state);
    }
  });
});

describe('shouldPoll', () => {
  it('returns false for null detail', () => {
    expect(shouldPoll(null)).toBe(false);
  });

  it('returns true when any tile is in_progress', () => {
    const detail = makeDetail([
      { service: 'website', state: 'in_progress', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(true);
  });

  it('returns true when all tiles are not_started (pre-emit window)', () => {
    expect(shouldPoll(makeDetail([]))).toBe(true);
  });

  it('returns false when website is live and others terminal', () => {
    const detail = makeDetail([
      { service: 'website', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'dns', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'email', state: 'needs_input', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
      { service: 'domain', state: 'live', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(false);
  });

  it('returns false when any tile is failed and none in_progress', () => {
    const detail = makeDetail([
      { service: 'website', state: 'failed', internal_state: null, progress_label: null, metadata: {}, updated_at: '2026-05-06T00:00:00Z' },
    ]);
    expect(shouldPoll(detail)).toBe(false);
  });
});

describe('summaryHeadline', () => {
  function tilesWith(overrides: Partial<Record<ServiceTileData['service'], ServiceTileData['state']>>): ServiceTileData[] {
    const base: ServiceTileData['service'][] = ['website', 'dns', 'email', 'domain'];
    return base.map((s) => ({
      service: s,
      title: s,
      state: overrides[s] ?? 'not_started',
      progressLabel: null,
      phase: null,
      updatedAt: null,
    }));
  }

  it('all live → business is live', () => {
    expect(summaryHeadline(tilesWith({ website: 'live', dns: 'live', email: 'live', domain: 'live' })))
      .toBe('Your business is live.');
  });

  it('any failed → snag copy', () => {
    expect(summaryHeadline(tilesWith({ website: 'in_progress', dns: 'failed' })))
      .toBe('We hit a snag — our team is on it.');
  });

  it('website live but others working → finishing up copy', () => {
    expect(summaryHeadline(tilesWith({ website: 'live', dns: 'in_progress' })))
      .toBe('Your site is live. Finishing up the rest.');
  });

  it('default → setting up copy', () => {
    expect(summaryHeadline(tilesWith({}))).toBe('Setting up your business…');
  });
});
```

- [ ] **Step 1.2: Run test, confirm fail**

Run: `npx vitest run lib/business/service-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 1.3: Implement `lib/business/service-status.ts`**

```ts
import type { BusinessDetail } from '@/lib/api/business';

export type ServiceId = 'website' | 'dns' | 'email' | 'domain';

export type ServiceState =
  | 'not_started'
  | 'in_progress'
  | 'needs_input'
  | 'failed'
  | 'live'
  | 'not_applicable';

export interface ServiceTileData {
  service: ServiceId;
  title: string;
  state: ServiceState;
  progressLabel: string | null;
  phase: string | null;
  updatedAt: string | null;
}

const SERVICE_ORDER: ServiceId[] = ['website', 'dns', 'email', 'domain'];

const TITLES: Record<ServiceId, string> = {
  website: 'Your site',
  dns: 'DNS',
  email: 'Email',
  domain: 'Domain',
};

const VALID_STATES: ReadonlyArray<ServiceState> = [
  'not_started',
  'in_progress',
  'needs_input',
  'failed',
  'live',
  'not_applicable',
];

function coerceState(s: string): ServiceState {
  return (VALID_STATES as ReadonlyArray<string>).includes(s) ? (s as ServiceState) : 'not_started';
}

export function normalizeProvisioning(
  rows: BusinessDetail['provisioning'],
): ServiceTileData[] {
  const byService = new Map<string, BusinessDetail['provisioning'][number]>();
  for (const row of rows) byService.set(row.service, row);

  return SERVICE_ORDER.map((service) => {
    const row = byService.get(service);
    if (!row) {
      return {
        service,
        title: TITLES[service],
        state: 'not_started',
        progressLabel: null,
        phase: null,
        updatedAt: null,
      };
    }
    const rawPhase = (row.metadata as Record<string, unknown> | null)?.phase;
    const phase = typeof rawPhase === 'string' ? rawPhase : null;
    return {
      service,
      title: TITLES[service],
      state: coerceState(row.state),
      progressLabel: row.progress_label,
      phase,
      updatedAt: row.updated_at,
    };
  });
}

export function shouldPoll(detail: BusinessDetail | null): boolean {
  if (!detail) return false;
  const tiles = normalizeProvisioning(detail.provisioning);
  if (tiles.some((t) => t.state === 'in_progress')) return true;
  const allNotStarted = tiles.every((t) => t.state === 'not_started');
  return allNotStarted;
}

export function summaryHeadline(tiles: ServiceTileData[]): string {
  if (tiles.length > 0 && tiles.every((t) => t.state === 'live')) {
    return 'Your business is live.';
  }
  if (tiles.some((t) => t.state === 'failed')) {
    return 'We hit a snag — our team is on it.';
  }
  const website = tiles.find((t) => t.service === 'website');
  if (website?.state === 'live') return 'Your site is live. Finishing up the rest.';
  return 'Setting up your business…';
}
```

- [ ] **Step 1.4: Run tests, confirm pass**

Run: `npx vitest run lib/business/service-status.test.ts`
Expected: PASS — all describe blocks green.

- [ ] **Step 1.5: Commit**

```bash
git add lib/business/service-status.ts lib/business/service-status.test.ts
git commit -m "$(cat <<'EOF'
feat(business): service-status normalization helpers

Pure helpers map BusinessDetail.provisioning[] to canonical 4-tile shape,
default missing services to not_started, and decide polling/headline copy.
TDD with vitest.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: ServiceStatusTile component (TDD)

**Files:**
- Create: `components/business/dashboard/ServiceStatusTile.tsx`
- Create: `components/business/dashboard/ServiceStatusTile.test.tsx`

- [ ] **Step 2.1: Write failing tests**

Create `components/business/dashboard/ServiceStatusTile.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceStatusTile } from './ServiceStatusTile';
import type { Tokens } from '@/components/business/ui/tokens';
import type { ServiceTileData } from '@/lib/business/service-status';

const t: Tokens = {
  bg: '#fff', surface: '#fff', surfaceAlt: '#f5f5f5', surfaceHover: '#eee',
  border: '#ddd', borderStrong: '#bbb',
  text: '#111', textMuted: '#555', textFaint: '#888',
  accent: '#f80', accentHover: '#e70', accentSoft: '#fc8', accentSoftStrong: '#fa6',
  ring: '#fa6', success: '#0a0', warning: '#fa0', danger: '#c00',
  shadowSm: '', shadowMd: '', shadowLg: '',
};

function tile(overrides: Partial<ServiceTileData> = {}): ServiceTileData {
  return {
    service: 'website',
    title: 'Your site',
    state: 'in_progress',
    progressLabel: null,
    phase: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('ServiceStatusTile', () => {
  it('renders the tile title', () => {
    render(<ServiceStatusTile t={t} tile={tile({ title: 'Your site' })} />);
    expect(screen.getByText('Your site')).toBeInTheDocument();
  });

  it('renders the progress label verbatim when present', () => {
    render(
      <ServiceStatusTile
        t={t}
        tile={tile({ state: 'in_progress', progressLabel: 'Generated page-by-page copy for your site' })}
      />,
    );
    expect(screen.getByText('Generated page-by-page copy for your site')).toBeInTheDocument();
  });

  it('renders not_started placeholder copy when no progress label', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'not_started', progressLabel: null })} />);
    expect(screen.getByText('Waiting to start')).toBeInTheDocument();
  });

  it('renders failed copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'failed' })} />);
    expect(screen.getByText('Our team is investigating.')).toBeInTheDocument();
  });

  it('renders needs_input copy when no progress label', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'needs_input', progressLabel: null })} />);
    expect(screen.getByText("We'll let you know if we need anything from you.")).toBeInTheDocument();
  });

  it('renders live copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'live' })} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('renders not_applicable copy', () => {
    render(<ServiceStatusTile t={t} tile={tile({ state: 'not_applicable' })} />);
    expect(screen.getByText('Not included in your plan.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2.2: Run test, confirm fail**

Run: `npx vitest run components/business/dashboard/ServiceStatusTile.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 2.3: Implement `ServiceStatusTile.tsx`**

```tsx
'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import type { ServiceState, ServiceTileData } from '@/lib/business/service-status';

interface Props {
  t: Tokens;
  tile: ServiceTileData;
}

function defaultSubLine(state: ServiceState): string {
  switch (state) {
    case 'not_started':
      return 'Waiting to start';
    case 'in_progress':
      return 'In progress';
    case 'needs_input':
      return "We'll let you know if we need anything from you.";
    case 'failed':
      return 'Our team is investigating.';
    case 'live':
      return 'Live';
    case 'not_applicable':
      return 'Not included in your plan.';
  }
}

function StateGlyph({ t, state }: { t: Tokens; state: ServiceState }) {
  const base = {
    width: 26,
    height: 26,
    borderRadius: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    fontWeight: 700,
    flexShrink: 0,
  } as const;

  if (state === 'live') {
    return (
      <span aria-hidden style={{ ...base, background: t.success, color: '#fff' }}>
        ✓
      </span>
    );
  }
  if (state === 'failed') {
    return (
      <span aria-hidden style={{ ...base, background: t.danger, color: '#fff' }}>
        !
      </span>
    );
  }
  if (state === 'needs_input') {
    return (
      <span aria-hidden style={{ ...base, background: t.warning, color: '#fff' }}>
        ⏸
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          background: 'transparent',
          border: `2px solid ${t.accent}`,
          borderTopColor: 'transparent',
          animation: 'jav-spin 0.9s linear infinite',
        }}
      />
    );
  }
  if (state === 'not_applicable') {
    return (
      <span aria-hidden style={{ ...base, background: t.surfaceAlt, color: t.textFaint }}>
        –
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...base,
        background: t.surfaceAlt,
        border: `2px solid ${t.border}`,
      }}
    />
  );
}

export function ServiceStatusTile({ t, tile }: Props) {
  const subLine = tile.progressLabel ?? defaultSubLine(tile.state);
  const dim = tile.state === 'not_started' || tile.state === 'not_applicable';

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        padding: '14px 0',
        opacity: dim ? 0.7 : 1,
      }}
    >
      <StateGlyph t={t} state={tile.state} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: t.text,
            fontFamily: FONT,
          }}
        >
          {tile.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: t.textMuted,
            marginTop: 2,
            fontFamily: FONT,
            lineHeight: 1.5,
          }}
        >
          {subLine}
        </div>
      </div>
    </div>
  );
}

export default ServiceStatusTile;
```

- [ ] **Step 2.4: Run tests, confirm pass**

Run: `npx vitest run components/business/dashboard/ServiceStatusTile.test.tsx`
Expected: PASS.

- [ ] **Step 2.5: Commit**

```bash
git add components/business/dashboard/ServiceStatusTile.tsx components/business/dashboard/ServiceStatusTile.test.tsx
git commit -m "$(cat <<'EOF'
feat(business): ServiceStatusTile presentational component

Renders one tile per service with state-driven glyph + verbatim
progress_label sub-line. Six states (not_started, in_progress,
needs_input, failed, live, not_applicable) per integration guide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: ServiceStatusGrid component (TDD)

**Files:**
- Create: `components/business/dashboard/ServiceStatusGrid.tsx`
- Create: `components/business/dashboard/ServiceStatusGrid.test.tsx`

- [ ] **Step 3.1: Write failing tests**

Create `components/business/dashboard/ServiceStatusGrid.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ServiceStatusGrid } from './ServiceStatusGrid';
import type { Tokens } from '@/components/business/ui/tokens';
import type { BusinessDetail } from '@/lib/api/business';

const t: Tokens = {
  bg: '#fff', surface: '#fff', surfaceAlt: '#f5f5f5', surfaceHover: '#eee',
  border: '#ddd', borderStrong: '#bbb',
  text: '#111', textMuted: '#555', textFaint: '#888',
  accent: '#f80', accentHover: '#e70', accentSoft: '#fc8', accentSoftStrong: '#fa6',
  ring: '#fa6', success: '#0a0', warning: '#fa0', danger: '#c00',
  shadowSm: '', shadowMd: '', shadowLg: '',
};

function withProvisioning(
  rows: BusinessDetail['provisioning'],
): { provisioning: BusinessDetail['provisioning'] } {
  return { provisioning: rows };
}

describe('ServiceStatusGrid', () => {
  it('renders 4 tiles in canonical order even with empty provisioning', () => {
    render(<ServiceStatusGrid t={t} {...withProvisioning([])} />);
    const titles = screen.getAllByText(/^(Your site|DNS|Email|Domain)$/);
    expect(titles.map((el) => el.textContent)).toEqual(['Your site', 'DNS', 'Email', 'Domain']);
  });

  it('renders the default headline for empty provisioning', () => {
    render(<ServiceStatusGrid t={t} {...withProvisioning([])} />);
    expect(screen.getByText('Setting up your business…')).toBeInTheDocument();
  });

  it('renders the all-live headline when every service is live', () => {
    const live = (service: string): BusinessDetail['provisioning'][number] => ({
      service,
      state: 'live',
      internal_state: null,
      progress_label: null,
      metadata: {},
      updated_at: '2026-05-06T00:00:00Z',
    });
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([live('website'), live('dns'), live('email'), live('domain')])}
      />,
    );
    expect(screen.getByText('Your business is live.')).toBeInTheDocument();
  });

  it('renders snag headline when any tile is failed', () => {
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([
          {
            service: 'website',
            state: 'failed',
            internal_state: null,
            progress_label: null,
            metadata: {},
            updated_at: '2026-05-06T00:00:00Z',
          },
        ])}
      />,
    );
    expect(screen.getByText('We hit a snag — our team is on it.')).toBeInTheDocument();
  });

  it('renders the website progress_label inside the website tile', () => {
    render(
      <ServiceStatusGrid
        t={t}
        {...withProvisioning([
          {
            service: 'website',
            state: 'in_progress',
            internal_state: null,
            progress_label: 'Generated page-by-page copy for your site',
            metadata: { phase: 'content' },
            updated_at: '2026-05-06T00:00:00Z',
          },
        ])}
      />,
    );
    expect(screen.getByText('Generated page-by-page copy for your site')).toBeInTheDocument();
  });
});
```

- [ ] **Step 3.2: Run test, confirm fail**

Run: `npx vitest run components/business/dashboard/ServiceStatusGrid.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3.3: Implement `ServiceStatusGrid.tsx`**

```tsx
'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { ServiceStatusTile } from './ServiceStatusTile';
import { normalizeProvisioning, summaryHeadline } from '@/lib/business/service-status';
import type { BusinessDetail } from '@/lib/api/business';

interface Props {
  t: Tokens;
  provisioning: BusinessDetail['provisioning'];
}

export function ServiceStatusGrid({ t, provisioning }: Props) {
  const tiles = normalizeProvisioning(provisioning);
  const headline = summaryHeadline(tiles);

  return (
    <Card t={t}>
      <style>{`@keyframes jav-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: t.textMuted,
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              fontFamily: FONT,
            }}
          >
            Build progress
          </h3>
          <div
            style={{
              marginTop: 6,
              fontSize: 18,
              fontWeight: 600,
              color: t.text,
              fontFamily: FONT,
              letterSpacing: -0.2,
            }}
          >
            {headline}
          </div>
        </div>
        <div style={{ fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
          Updates live as we work
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tiles.map((tile) => (
          <ServiceStatusTile key={tile.service} t={t} tile={tile} />
        ))}
      </div>
    </Card>
  );
}

export default ServiceStatusGrid;
```

- [ ] **Step 3.4: Run tests, confirm pass**

Run: `npx vitest run components/business/dashboard/ServiceStatusGrid.test.tsx`
Expected: PASS.

- [ ] **Step 3.5: Commit**

```bash
git add components/business/dashboard/ServiceStatusGrid.tsx components/business/dashboard/ServiceStatusGrid.test.tsx
git commit -m "$(cat <<'EOF'
feat(business): ServiceStatusGrid composes tiles + headline

Wraps Card chrome, computes the headline summary, and renders four
ServiceStatusTile children in canonical order from provisioning rows.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Wire grid into dashboard, drop the mock

**Files:**
- Modify: `components/business/dashboard/BusinessPlaceholderDashboard.tsx`
- Modify: `app/business/[orgId]/page.tsx`

- [ ] **Step 4.1: Edit `BusinessPlaceholderDashboard.tsx` — add `provisioning` prop, swap in grid**

Replace the imports and prop type at the top of the file:

```tsx
'use client';

import Link from 'next/link';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import type { BusinessDetail } from '@/lib/api/business';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Card } from '@/components/business/ui/Card';
import { SitePreview } from './SitePreview';
import { DNSStatusCard } from './DNSStatusCard';
import { BillingCard } from './BillingCard';
import { AnalyticsPlaceholder } from './AnalyticsPlaceholder';
import { ServiceStatusGrid } from './ServiceStatusGrid';

interface Props {
  data: BusinessIntakeData;
  provisioning: BusinessDetail['provisioning'];
}

export function BusinessPlaceholderDashboard({ data, provisioning }: Props) {
```

Then replace the `<BuildProgressCard ... />` block (around line 70) with:

```tsx
      <div style={{ marginBottom: 16 }}>
        <ServiceStatusGrid t={t} provisioning={provisioning} />
      </div>
```

Remove the now-unused imports: `BuildProgressCard`, `MOCK_MILESTONES`.

- [ ] **Step 4.2: Edit `app/business/[orgId]/page.tsx` — add polling, pass provisioning**

Replace the file with:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { adaptDetailToLegacyIntake } from '@/lib/api/business-adapters';
import { shouldPoll } from '@/lib/business/service-status';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import { IntakeIncompleteState } from './IntakeIncompleteState';

export default function BusinessOrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const { data: result, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
    refetchInterval: (query) => {
      const r = query.state.data;
      if (!r || r.kind !== 'ok') return false;
      return shouldPoll(r.data) ? 5000 : false;
    },
    refetchIntervalInBackground: false,
  });

  if (isLoading || !result) return null;
  if (result.kind === 'not_found') {
    return <div style={{ padding: '28px 32px 60px' }}>Business not found.</div>;
  }
  if (result.kind === 'error') {
    return (
      <div style={{ padding: '28px 32px 60px' }}>
        Couldn&rsquo;t load this business right now. Please refresh.
      </div>
    );
  }

  const intake = (result.data.intake ?? null) as Record<string, any> | null;
  const completed = !!intake?.completed_at;

  if (!completed) {
    return (
      <IntakeIncompleteState
        orgId={orgId}
        orgName={result.data.org.name}
        planCode={intake?.planCode}
      />
    );
  }

  const adapted = adaptDetailToLegacyIntake(result.data) as any;

  return (
    <BusinessPlaceholderDashboard
      data={adapted}
      provisioning={result.data.provisioning}
    />
  );
}
```

- [ ] **Step 4.3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — no type errors.

- [ ] **Step 4.4: Run all tests**

Run: `npx vitest run`
Expected: PASS — all suites green.

- [ ] **Step 4.5: Commit**

```bash
git add components/business/dashboard/BusinessPlaceholderDashboard.tsx app/business/[orgId]/page.tsx
git commit -m "$(cat <<'EOF'
feat(business): wire ServiceStatusGrid into customer dashboard

Adds a 5s refetchInterval gated by shouldPoll() on the existing
useQuery so polling stops automatically when no tile is in_progress.
Passes provisioning rows into the dashboard alongside the legacy intake.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Delete the mock card

**Files:**
- Delete: `components/business/dashboard/BuildProgressCard.tsx`
- Delete: `lib/business/build-progress-mock.ts`

- [ ] **Step 5.1: Confirm no remaining references**

Run: `grep -rn "BuildProgressCard\|MOCK_MILESTONES\|build-progress-mock" app components lib --include="*.ts" --include="*.tsx"`
Expected: no matches.

- [ ] **Step 5.2: Delete files**

```bash
git rm components/business/dashboard/BuildProgressCard.tsx lib/business/build-progress-mock.ts
```

- [ ] **Step 5.3: Re-run type-check and tests**

```bash
npx tsc --noEmit
npx vitest run
```
Expected: both PASS.

- [ ] **Step 5.4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore(business): remove BuildProgressCard mock

Replaced by ServiceStatusGrid driven by real provisioning data.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Manual E2E against the simulator

This task is non-coding verification. Document the result in the PR description.

- [ ] **Step 6.1: Confirm simulator prerequisites**

In `javelina-intake` repo: `npm run dev` (port 3002) and `npx inngest-cli@latest dev -u http://localhost:3002/api/inngest` running. `.env.local` populated. See `javelina-intake/docs/customer-dashboard-status-guide.md` §6.

- [ ] **Step 6.2: Find or create a real org_id**

Use an org Seth has already created end-to-end via the frontend wizard so `/business/[orgId]` resolves on Javelina. The smoke test's `uuidgen` org_ids will not work — they have no `businesses` row.

```bash
# In javelina-backend or via Supabase studio, list candidate orgs:
# select id, name from organizations order by created_at desc limit 10;
```

- [ ] **Step 6.3: Run `happy_path` scenario**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-intake
scripts/simulate-pipeline.sh <org_id> happy_path 4000
```

Open `http://localhost:3000/business/<org_id>` (or the Javelina dev port) and watch.

Acceptance:
- All 4 tiles transition `not_started → in_progress → live` over the simulator's run.
- `progress_label` text updates inside each tile as phases fire.
- Headline transitions through "Setting up your business…" → "Your site is live. Finishing up the rest." → "Your business is live."
- Polling stops once everything's `live` (verify in Network tab: no further `/api/business/<org_id>` calls after final transition).

- [ ] **Step 6.4: Run `pro_pending` scenario**

```bash
scripts/simulate-pipeline.sh <org_id> pro_pending 4000
```

Acceptance:
- Email tile parks at `needs_input` with the Pax8 progress label.
- Other tiles reach `live`.
- Polling stops (no `in_progress` tiles remain).

- [ ] **Step 6.5: Run `agent_failure` scenario**

```bash
scripts/simulate-pipeline.sh <org_id> agent_failure 4000
```

Acceptance:
- Website tile flips to `failed` with red glyph and "Our team is investigating." sub-line (or whatever `progress_label` carries — render it verbatim).
- Headline changes to "We hit a snag — our team is on it."
- Other tiles continue rendering as their data dictates.

- [ ] **Step 6.6: Run `transfer_pending` scenario**

```bash
scripts/simulate-pipeline.sh <org_id> transfer_pending 4000
```

Acceptance:
- Domain tile holds at `transfer_polling` phase with its progress label visible.
- Spinner does not time out (per integration guide §7.3 — backoff on the worker side, frontend just renders whatever the row says).

---

## Self-review checklist (executor: skip; planner already ran this)

- [x] Spec coverage — all sections (state model, 4 tiles, polling, headline, failure UX) mapped to tasks 1–4.
- [x] Test coverage — every helper, every component, plus manual E2E for the 4 simulator scenarios called out in spec §Testing.
- [x] No placeholders — all code blocks complete; no "TBD" or "similar to above".
- [x] Type consistency — `ServiceTileData` shape, `ServiceState` union, `ServiceId` union, prop signatures match across tasks 1→2→3→4.
- [x] Empty-state policy from spec §The four tiles is implemented in Task 1's `normalizeProvisioning` (defaults to `not_started`) and exercised in Task 1 + Task 3 tests.
- [x] Polling stop conditions from spec §Polling implemented in `shouldPoll` (Task 1) and applied via `refetchInterval` (Task 4).
- [x] Visibility-pause behavior — covered by `refetchIntervalInBackground: false` in Task 4.

Note: spec listed a separate `useBusinessPolling` hook. The plan folds polling directly into the existing `useQuery` via `refetchInterval` because the page already uses TanStack Query — a separate hook would be duplication. This is a deliberate tightening from spec to implementation.
