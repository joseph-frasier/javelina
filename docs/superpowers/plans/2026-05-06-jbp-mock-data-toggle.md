# JBP Mock Data Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a superuser-only "demo data" toggle to JBP that swaps the customer dashboard between real javelina-DB data and the existing `MOCK_*` constants, with calm empty states wherever real data is unavailable.

**Architecture:** A single `localStorage`-backed Zustand store holds the dashboard `mode` (`'real' | 'mock'`). A hook (`useDashboardMode`) reads that store, coerces non-superusers to `'real'`, and is consumed by every JBP page/component to decide between real data (TanStack Query → existing backend endpoints) and the static mock dataset in `lib/business/page-mocks.ts`. Two new shared empty-state components (`NotAvailableYet` page panel, `EmptyCardState` inline) keep the UI populated when real mode has nothing to show.

**Tech Stack:** Next.js 14 App Router, React, Zustand (with `persist`), TanStack Query, Vitest + Testing Library, existing Express backend (`/api/zones`, `/api/dns-records`, `/api/domains`, `/api/subscriptions`).

**Spec:** `docs/superpowers/specs/2026-05-06-jbp-mock-data-toggle-design.md`

**Branch:** `feat/intake-setup-frontend`

---

## File Structure

**New files:**
- `lib/dashboard-mode-store.ts` — Zustand persist store, single boolean-ish flag.
- `lib/hooks/useDashboardMode.ts` — Hook wrapping the store; coerces non-superusers to `'real'`.
- `lib/api/zones.ts` — Server action wrapping `GET /api/zones/organization/:orgId`.
- `lib/api/dns-records.ts` — Server action wrapping `GET /api/dns-records/zone/:zoneId`.
- `lib/api/domains.ts` — Server action wrapping `GET /api/domains` plus org-side filter.
- `components/business/ui/NotAvailableYet.tsx` — Page-body empty panel.
- `components/business/ui/EmptyCardState.tsx` — Inline card empty state.
- `tests/lib/useDashboardMode.test.tsx`
- `tests/components/DemoModeToggle.test.tsx`

**Modified files:**
- `components/layout/Header.tsx` — Add toggle item to user dropdown (superuser-gated); add `DEMO` badge next to logo when mock mode is on.
- `components/business/dashboard/DNSStatusCard.tsx` — Read primary zone + record count from real data when real, mock when mock.
- `app/business/[orgId]/dns/page.tsx` — Records table + record count switch on mode.
- `app/business/[orgId]/domains/page.tsx` — Domains list + primary domain switch on mode.
- `app/business/[orgId]/website/page.tsx` — Body becomes `NotAvailableYet` when real, mock when mock.
- `app/business/[orgId]/analytics/page.tsx` — Same `NotAvailableYet` switch.
- `app/business/[orgId]/billing/page.tsx` — Invoice section: empty state when real (no source available), mock when mock.

---

## Task 1: Dashboard mode store

**Files:**
- Create: `lib/dashboard-mode-store.ts`

- [ ] **Step 1: Implement the store**

```ts
// lib/dashboard-mode-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DashboardMode = 'real' | 'mock';

interface DashboardModeState {
  mode: DashboardMode;
  setMode: (mode: DashboardMode) => void;
  toggle: () => void;
}

export const useDashboardModeStore = create<DashboardModeState>()(
  persist(
    (set, get) => ({
      mode: 'real',
      setMode: (mode) => set({ mode }),
      toggle: () => set({ mode: get().mode === 'real' ? 'mock' : 'real' }),
    }),
    {
      name: 'jbp:dashboard-mode',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
```

- [ ] **Step 2: Commit**

```bash
git add lib/dashboard-mode-store.ts
git commit -m "feat(jbp): add dashboard mode store"
```

---

## Task 2: useDashboardMode hook with role coercion

**Files:**
- Create: `lib/hooks/useDashboardMode.ts`
- Create: `tests/lib/useDashboardMode.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
// tests/lib/useDashboardMode.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useDashboardModeStore } from '@/lib/dashboard-mode-store';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { useAuthStore } from '@/lib/auth-store';

function setUser(role: 'user' | 'superuser' | null) {
  useAuthStore.setState({
    // @ts-expect-error partial user shape is fine for the role coercion test
    user: role === null ? null : { id: 'u1', email: 'a@b', role },
  });
}

describe('useDashboardMode', () => {
  beforeEach(() => {
    useDashboardModeStore.setState({ mode: 'real' });
    setUser('superuser');
  });

  it('returns real by default', () => {
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
    expect(result.current.isMock).toBe(false);
  });

  it('returns mock when superuser sets it', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('mock');
    expect(result.current.isMock).toBe(true);
  });

  it('coerces non-superusers to real even if store says mock', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    setUser('user');
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
    expect(result.current.isMock).toBe(false);
  });

  it('coerces signed-out users to real', () => {
    useDashboardModeStore.setState({ mode: 'mock' });
    setUser(null);
    const { result } = renderHook(() => useDashboardMode());
    expect(result.current.mode).toBe('real');
  });

  it('toggle flips the underlying store', () => {
    const { result } = renderHook(() => useDashboardMode());
    act(() => result.current.toggle());
    expect(useDashboardModeStore.getState().mode).toBe('mock');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/lib/useDashboardMode.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the hook**

```ts
// lib/hooks/useDashboardMode.ts
'use client';

import { useDashboardModeStore, type DashboardMode } from '@/lib/dashboard-mode-store';
import { useAuthStore } from '@/lib/auth-store';

interface UseDashboardModeResult {
  mode: DashboardMode;
  isMock: boolean;
  toggle: () => void;
  setMode: (mode: DashboardMode) => void;
}

export function useDashboardMode(): UseDashboardModeResult {
  const storedMode = useDashboardModeStore((s) => s.mode);
  const toggle = useDashboardModeStore((s) => s.toggle);
  const setMode = useDashboardModeStore((s) => s.setMode);
  const role = useAuthStore((s) => s.user?.role ?? null);

  const mode: DashboardMode = role === 'superuser' ? storedMode : 'real';

  return {
    mode,
    isMock: mode === 'mock',
    toggle,
    setMode,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/lib/useDashboardMode.test.tsx`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/useDashboardMode.ts tests/lib/useDashboardMode.test.tsx
git commit -m "feat(jbp): add useDashboardMode hook with superuser gating"
```

---

## Task 3: Shared empty-state components

**Files:**
- Create: `components/business/ui/NotAvailableYet.tsx`
- Create: `components/business/ui/EmptyCardState.tsx`

- [ ] **Step 1: Implement the page-level panel**

```tsx
// components/business/ui/NotAvailableYet.tsx
'use client';

import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Icon } from '@/components/business/ui/Icon';

interface Props {
  title: string;
  description: string;
}

export function NotAvailableYet({ title, description }: Props) {
  const t = useBusinessTheme();
  return (
    <Card t={t}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          fontFamily: FONT,
          gap: 12,
        }}
      >
        <div style={{ color: t.textMuted }}>
          <Icon name="info" size={20} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.55, maxWidth: 460 }}>
          {description}
        </div>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Implement the inline card empty state**

```tsx
// components/business/ui/EmptyCardState.tsx
'use client';

import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';

interface Props {
  message: string;
}

export function EmptyCardState({ message }: Props) {
  const t = useBusinessTheme();
  return (
    <div
      style={{
        padding: '20px 4px',
        fontSize: 13,
        color: t.textMuted,
        fontFamily: FONT,
        lineHeight: 1.5,
      }}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/business/ui/NotAvailableYet.tsx components/business/ui/EmptyCardState.tsx
git commit -m "feat(jbp): add shared empty-state components"
```

---

## Task 4: Header — DEMO badge + superuser toggle item

**Files:**
- Modify: `components/layout/Header.tsx`
- Create: `tests/components/DemoModeToggle.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/DemoModeToggle.test.tsx
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Header } from '@/components/layout/Header';
import { useAuthStore } from '@/lib/auth-store';
import { useDashboardModeStore } from '@/lib/dashboard-mode-store';

function mountAs(role: 'user' | 'superuser') {
  useAuthStore.setState({
    // @ts-expect-error minimal user
    user: { id: 'u1', email: 'a@b', role, display_name: 'Test' },
    profileReady: true,
  });
}

describe('Header demo mode toggle', () => {
  beforeEach(() => {
    useDashboardModeStore.setState({ mode: 'real' });
  });

  it('non-superusers never see the toggle', async () => {
    mountAs('user');
    render(<Header />);
    await userEvent.click(screen.getByRole('button', { name: /User menu/ }));
    expect(screen.queryByRole('menuitem', { name: /Demo data/ })).toBeNull();
  });

  it('superusers see the toggle and can flip it', async () => {
    mountAs('superuser');
    render(<Header />);
    await userEvent.click(screen.getByRole('button', { name: /User menu/ }));
    const item = screen.getByRole('menuitem', { name: /Demo data/ });
    expect(item).toHaveTextContent(/OFF/);
    await userEvent.click(item);
    expect(useDashboardModeStore.getState().mode).toBe('mock');
  });

  it('shows DEMO badge next to logo when mock is on', () => {
    mountAs('superuser');
    useDashboardModeStore.setState({ mode: 'mock' });
    render(<Header />);
    expect(screen.getByText('DEMO')).toBeInTheDocument();
  });

  it('hides DEMO badge when mock is off', () => {
    mountAs('superuser');
    render(<Header />);
    expect(screen.queryByText('DEMO')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/DemoModeToggle.test.tsx`
Expected: FAIL — toggle / badge not present.

- [ ] **Step 3: Modify `Header.tsx` — add hook import and badge**

In `components/layout/Header.tsx`, add to the existing imports (after the `useQuery` import block):

```tsx
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
```

Inside the `Header` component, just below the existing `useQuery` call:

```tsx
const { isMock, toggle: toggleDemoMode } = useDashboardMode();
```

Replace the existing `<Link href="/" …Logo… />` block with the same Link plus a DEMO badge sibling. The current block looks like:

```tsx
<Link href="/" className="flex items-center shrink-0" aria-label="Go to home page">
  <Logo width={325} height={130} priority className="h-20 w-auto" />
</Link>
```

Replace with:

```tsx
<Link href="/" className="flex items-center shrink-0" aria-label="Go to home page">
  <Logo width={325} height={130} priority className="h-20 w-auto" />
</Link>
{isMock && (
  <span
    className="ml-2 inline-flex items-center rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-500"
    aria-label="Demo data mode is active"
  >
    DEMO
  </span>
)}
```

- [ ] **Step 4: Modify `Header.tsx` — add toggle item inside dropdown**

Inside the existing user dropdown, locate the `<div className="py-1">` that wraps the Profile / Settings / Sign out items. Just before the `<button … onClick={handleLogout} …>Sign out</button>`, add a superuser-only divider + toggle:

```tsx
{userRole === 'superuser' && (
  <>
    <div className="my-1 border-t border-border" />
    <button
      type="button"
      onClick={() => {
        toggleDemoMode();
        setIsDropdownOpen(false);
      }}
      className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surface-hover transition-colors flex items-center justify-between"
      role="menuitem"
    >
      <span>Demo data</span>
      <span className={isMock ? 'text-accent font-semibold' : 'text-text-muted'}>
        {isMock ? 'ON' : 'OFF'}
      </span>
    </button>
  </>
)}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/components/DemoModeToggle.test.tsx`
Expected: PASS, 4 tests.

- [ ] **Step 6: Commit**

```bash
git add components/layout/Header.tsx tests/components/DemoModeToggle.test.tsx
git commit -m "feat(jbp): superuser demo data toggle and DEMO badge in header"
```

---

## Task 5: API wrapper for zones

**Files:**
- Create: `lib/api/zones.ts`

- [ ] **Step 1: Implement the wrapper**

```ts
// lib/api/zones.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ZoneRow {
  id: string;
  name: string;
  organization_id: string;
  status?: string | null;
  soa_serial?: number | null;
  last_valid_serial?: number | null;
  created_at?: string | null;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

export async function listZonesForOrg(orgId: string): Promise<ZoneRow[]> {
  try {
    const res = await authedFetch(`/api/zones/organization/${orgId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.zones ?? json?.zones ?? [];
  } catch (err) {
    console.error('[zones api]', err);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/zones.ts
git commit -m "feat(jbp): add zones API wrapper"
```

---

## Task 6: API wrapper for DNS records

**Files:**
- Create: `lib/api/dns-records.ts`

- [ ] **Step 1: Implement the wrapper**

```ts
// lib/api/dns-records.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DnsRecordRow {
  id: string;
  zone_id: string;
  type: string;
  name: string;
  content: string;
  ttl: number | null;
  priority?: number | null;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

export async function listDnsRecordsForZone(zoneId: string): Promise<DnsRecordRow[]> {
  try {
    const res = await authedFetch(`/api/dns-records/zone/${zoneId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.records ?? json?.records ?? [];
  } catch (err) {
    console.error('[dns-records api]', err);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/dns-records.ts
git commit -m "feat(jbp): add dns-records API wrapper"
```

---

## Task 7: API wrapper for domains (org-filtered)

**Files:**
- Create: `lib/api/domains.ts`

- [ ] **Step 1: Implement the wrapper**

```ts
// lib/api/domains.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DomainRow {
  id: string;
  domain_name: string;
  organization_id: string | null;
  status: string | null;
  registered_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  is_primary: boolean | null;
  registrar: string | null;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

export async function listDomainsForOrg(orgId: string): Promise<DomainRow[]> {
  try {
    const res = await authedFetch('/api/domains');
    if (!res.ok) return [];
    const json = await res.json();
    const all: DomainRow[] = json?.data?.domains ?? json?.domains ?? [];
    return all.filter((d) => d.organization_id === orgId);
  } catch (err) {
    console.error('[domains api]', err);
    return [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/domains.ts
git commit -m "feat(jbp): add domains API wrapper with org filter"
```

---

## Task 8: DNS detail page — wire records to mode

**Files:**
- Modify: `app/business/[orgId]/dns/page.tsx`

- [ ] **Step 1: Replace the page body with mode-aware data**

Replace the entire contents of `app/business/[orgId]/dns/page.tsx` with:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { EmptyCardState } from '@/components/business/ui/EmptyCardState';
import { MOCK_DNS_RECORDS } from '@/lib/business/page-mocks';
import { JAVELINA_NAMESERVERS } from '@/lib/domain-constants';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { listZonesForOrg, type ZoneRow } from '@/lib/api/zones';
import { listDnsRecordsForZone, type DnsRecordRow } from '@/lib/api/dns-records';

export default function BusinessDnsPage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const zonesQuery = useQuery({
    queryKey: ['zones', orgId],
    queryFn: () => listZonesForOrg(orgId),
    enabled: !!orgId && !isMock,
  });
  const primaryZone: ZoneRow | undefined = zonesQuery.data?.[0];

  const recordsQuery = useQuery({
    queryKey: ['dns-records', primaryZone?.id ?? ''],
    queryFn: () => listDnsRecordsForZone(primaryZone!.id),
    enabled: !!primaryZone?.id && !isMock,
  });

  const recordsCount = isMock
    ? MOCK_DNS_RECORDS.length
    : recordsQuery.data?.length ?? 0;
  const primaryDomain = isMock
    ? 'acmebusiness.com'
    : primaryZone?.name ?? '—';

  return (
    <div>
      <PageHeader
        t={t}
        title="DNS"
        description="Records, nameservers, and propagation status for your zones."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Zone status" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatRow t={t} label="Primary domain" value={primaryDomain} />
            <StatRow t={t} label="Resolution" value={isMock ? 'Healthy' : (primaryZone ? 'Healthy' : '—')} tone={primaryZone || isMock ? 'success' : undefined} />
            <StatRow t={t} label="Propagation" value={isMock ? '100%' : '—'} tone={isMock ? 'success' : undefined} />
            <StatRow t={t} label="Records" value={`${recordsCount} active`} />
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Nameservers" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {JAVELINA_NAMESERVERS.map((ns) => (
              <div key={ns} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: t.text }}>{ns}</span>
                <Badge t={t} tone="success" dot>Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Records" />
          {(() => {
            if (isMock) {
              return <RecordsTable t={t} records={MOCK_DNS_RECORDS.map((r) => ({ type: r.type, name: r.name, value: r.value, ttl: r.ttl }))} />;
            }
            if (!primaryZone) {
              return <EmptyCardState message="Your zone hasn't been created yet. It will appear here once provisioning completes." />;
            }
            const real = (recordsQuery.data ?? []).map((r) => ({
              type: r.type,
              name: r.name,
              value: r.content,
              ttl: r.ttl != null ? String(r.ttl) : '—',
            }));
            if (real.length === 0) {
              return <EmptyCardState message="No DNS records yet." />;
            }
            return <RecordsTable t={t} records={real} />;
          })()}
          <div style={{ marginTop: 12, fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
            Changes propagate globally within 5–15 minutes.
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecordsTable({
  t,
  records,
}: {
  t: ReturnType<typeof useBusinessTheme>;
  records: Array<{ type: string; name: string; value: string; ttl: string }>;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '80px 140px 1fr 80px',
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <TableHeader t={t}>Type</TableHeader>
      <TableHeader t={t}>Name</TableHeader>
      <TableHeader t={t}>Value</TableHeader>
      <TableHeader t={t}>TTL</TableHeader>
      {records.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <TableCell t={t} accent mono>{r.type}</TableCell>
          <TableCell t={t} mono>{r.name}</TableCell>
          <TableCell t={t} mono>{r.value}</TableCell>
          <TableCell t={t} muted mono>{r.ttl}</TableCell>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Manual smoke test**

Run dev server and visit `/business/<orgId>/dns` for an org you own. With demo OFF, expect real records or an empty state. Toggle demo ON, expect mock records.

- [ ] **Step 3: Commit**

```bash
git add app/business/[orgId]/dns/page.tsx
git commit -m "feat(jbp): wire DNS detail page to mode-aware data"
```

---

## Task 9: Domains detail page — mode-aware

**Files:**
- Modify: `app/business/[orgId]/domains/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `app/business/[orgId]/domains/page.tsx` with:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow } from '@/components/business/dashboard/_pageBits';
import { EmptyCardState } from '@/components/business/ui/EmptyCardState';
import { MOCK_DOMAINS } from '@/lib/business/page-mocks';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { listDomainsForOrg, type DomainRow } from '@/lib/api/domains';

interface DisplayDomain {
  name: string;
  primary: boolean;
  active: boolean;
  autoRenew: boolean;
  registered: string | null;
  expires: string | null;
}

function fromDomainRow(d: DomainRow): DisplayDomain {
  return {
    name: d.domain_name,
    primary: !!d.is_primary,
    active: (d.status ?? '').toLowerCase() === 'active',
    autoRenew: !!d.auto_renew,
    registered: d.registered_at,
    expires: d.expires_at,
  };
}

function fromMock(m: (typeof MOCK_DOMAINS)[number]): DisplayDomain {
  return {
    name: m.name,
    primary: m.primary,
    active: m.status === 'active',
    autoRenew: m.autoRenew,
    registered: m.registered,
    expires: m.expires,
  };
}

export default function BusinessDomainsPage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const realQuery = useQuery({
    queryKey: ['domains', orgId],
    queryFn: () => listDomainsForOrg(orgId),
    enabled: !!orgId && !isMock,
  });

  const domains: DisplayDomain[] = isMock
    ? MOCK_DOMAINS.map(fromMock)
    : (realQuery.data ?? []).map(fromDomainRow);

  const primary = domains.find((d) => d.primary) ?? domains[0];

  return (
    <div>
      <PageHeader
        t={t}
        title="Domains"
        description="Domains attached to this business — registration, transfer, and renewal."
        actions={
          <>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="refresh" size={14} />}>
              Transfer in
            </Button>
            <Button t={t} size="md" iconLeft={<Icon name="plus" size={14} color="#fff" />}>
              Register domain
            </Button>
          </>
        }
      />

      {primary ? (
        <Card t={t} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Primary domain
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: t.text, letterSpacing: -0.3 }}>
                  {primary.name}
                </span>
                {primary.active && <Badge t={t} tone="success" dot>Active</Badge>}
                {primary.autoRenew && <Badge t={t} tone="accent">Auto-renew on</Badge>}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Registered</div>
                  <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{formatDate(primary.registered)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Renews</div>
                  <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{formatDate(primary.expires)}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card t={t} style={{ marginBottom: 16 }}>
          <EmptyCardState message="No primary domain yet. Register one or connect an existing domain to get started." />
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="All domains" />
          {domains.length === 0 ? (
            <EmptyCardState message="No domains attached to this business yet." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {domains.map((d, i) => (
                <div
                  key={d.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: t.text }}>{d.name}</span>
                      {d.primary && <Badge t={t} tone="accent">Primary</Badge>}
                    </div>
                    <div style={{ marginTop: 2, fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
                      Renews {formatDate(d.expires)} · {d.autoRenew ? 'Auto-renew on' : 'Manual'}
                    </div>
                  </div>
                  {d.active && <Badge t={t} tone="success" dot>Active</Badge>}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Registration" />
          {primary ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <StatRow t={t} label="Registrar" value="Javelina (OpenSRS)" />
              <StatRow t={t} label="Privacy" value={isMock ? 'Enabled' : '—'} tone={isMock ? 'success' : undefined} />
              <StatRow t={t} label="Lock" value={isMock ? 'On' : '—'} tone={isMock ? 'success' : undefined} />
            </div>
          ) : (
            <EmptyCardState message="Registration details appear after a domain is attached." />
          )}
        </Card>
      </div>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
```

- [ ] **Step 2: Commit**

```bash
git add app/business/[orgId]/domains/page.tsx
git commit -m "feat(jbp): wire Domains detail page to mode-aware data"
```

---

## Task 10: Website detail page — NotAvailableYet body in real mode

**Files:**
- Modify: `app/business/[orgId]/website/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `app/business/[orgId]/website/page.tsx` with:

```tsx
'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { NotAvailableYet } from '@/components/business/ui/NotAvailableYet';
import { MOCK_DEPLOYS, MOCK_PAGES } from '@/lib/business/page-mocks';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';

export default function BusinessWebsitePage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();

  return (
    <div>
      <PageHeader
        t={t}
        title="Website"
        description="Manage your managed website — content, deploys, and preview."
        actions={
          <>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="external" size={14} />}>
              Open live site
            </Button>
            <Button t={t} size="md" iconLeft={<Icon name="rocket" size={14} color="#fff" />}>
              New deploy
            </Button>
          </>
        }
      />

      {!isMock ? (
        <NotAvailableYet
          title="Website analytics aren't connected yet"
          description="Once your managed site is live, deploy history, page lists, and uptime metrics will appear here automatically."
        />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            <Card t={t}>
              <SectionHeader t={t} title="Recent deploys" linkLabel="View all" />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {MOCK_DEPLOYS.map((d, i) => (
                  <div
                    key={d.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>{d.commit}</div>
                      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: MONO, marginTop: 2 }}>
                        {d.id} · {d.when}
                      </div>
                    </div>
                    <Badge t={t} tone="success" dot>Live</Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card t={t}>
              <SectionHeader t={t} title="Health" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <StatRow t={t} label="Uptime (30d)" value="99.98%" tone="success" />
                <StatRow t={t} label="SSL" value="Auto-renewing" tone="success" />
                <StatRow t={t} label="Last build" value="2 hours ago" />
                <StatRow t={t} label="Avg. response" value="142ms" />
              </div>
            </Card>
          </div>

          <div style={{ marginTop: 16 }}>
            <Card t={t}>
              <SectionHeader t={t} title="Pages" linkLabel="Edit content" />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr',
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  overflow: 'hidden',
                  fontFamily: FONT,
                  fontSize: 13,
                }}
              >
                <TableHeader t={t}>Page</TableHeader>
                <TableHeader t={t}>Path</TableHeader>
                <TableHeader t={t}>Words</TableHeader>
                <TableHeader t={t}>Updated</TableHeader>
                {MOCK_PAGES.map((p) => (
                  <div key={p.path} style={{ display: 'contents' }}>
                    <TableCell t={t}>{p.name}</TableCell>
                    <TableCell t={t} mono>{p.path}</TableCell>
                    <TableCell t={t}>{String(p.words)}</TableCell>
                    <TableCell t={t} muted>{p.updated}</TableCell>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/business/[orgId]/website/page.tsx
git commit -m "feat(jbp): website detail shows NotAvailableYet in real mode"
```

---

## Task 11: Analytics detail page — NotAvailableYet body in real mode

**Files:**
- Modify: `app/business/[orgId]/analytics/page.tsx`

- [ ] **Step 1: Replace the file**

Replace the entire contents of `app/business/[orgId]/analytics/page.tsx` with:

```tsx
'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatTile } from '@/components/business/dashboard/_pageBits';
import { NotAvailableYet } from '@/components/business/ui/NotAvailableYet';
import { MOCK_TRAFFIC, MOCK_TOP_PAGES, MOCK_TRAFFIC_SOURCES } from '@/lib/business/page-mocks';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';

export default function BusinessAnalyticsPage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();

  return (
    <div>
      <PageHeader
        t={t}
        title="Analytics"
        description="Traffic, engagement, and conversion metrics for your site."
        actions={
          <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="external" size={14} />}>
            Last 30 days
          </Button>
        }
      />

      {!isMock ? (
        <NotAvailableYet
          title="Analytics aren't connected yet"
          description="Once traffic starts flowing through your site, visitors, pageviews, top pages, and traffic sources will appear here automatically."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <StatTile t={t} label="Visitors" value={MOCK_TRAFFIC.visitors.value.toLocaleString()} delta={MOCK_TRAFFIC.visitors.delta} />
            <StatTile t={t} label="Pageviews" value={MOCK_TRAFFIC.pageviews.value.toLocaleString()} delta={MOCK_TRAFFIC.pageviews.delta} />
            <StatTile t={t} label="Avg. session" value={MOCK_TRAFFIC.avgSession.value} delta={MOCK_TRAFFIC.avgSession.delta} />
            <StatTile t={t} label="Bounce rate" value={MOCK_TRAFFIC.bounceRate.value} delta={MOCK_TRAFFIC.bounceRate.delta} />
          </div>

          <Card t={t} style={{ marginBottom: 16 }}>
            <SectionHeader t={t} title="Visitors over time" />
            <FakeChart t={t} />
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card t={t}>
              <SectionHeader t={t} title="Top pages" linkLabel="See all" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_TOP_PAGES.map((p, i) => (
                  <BarRow key={p.path} t={t} label={p.path} sublabel={`${p.views.toLocaleString()} views`} share={p.share} index={i} mono />
                ))}
              </div>
            </Card>

            <Card t={t}>
              <SectionHeader t={t} title="Traffic sources" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_TRAFFIC_SOURCES.map((s, i) => (
                  <BarRow key={s.source} t={t} label={s.source} share={s.share} index={i} />
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FakeChart({ t }: { t: ReturnType<typeof useBusinessTheme> }) {
  const points = [22, 28, 35, 30, 42, 48, 52, 47, 58, 65, 60, 72, 78, 70, 82, 88, 95, 90, 102, 108, 100, 115, 120, 118, 128, 135, 130, 142, 148, 155];
  const max = Math.max(...points);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '8px 4px' }}>
      {points.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: i === points.length - 1 ? t.accent : t.accentSoft,
            borderRadius: 3,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function BarRow({ t, label, sublabel, share, index, mono }: { t: ReturnType<typeof useBusinessTheme>; label: string; sublabel?: string; share: number; index: number; mono?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: t.text, fontFamily: mono ? MONO : FONT, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
          {sublabel ? `${sublabel} · ` : ''}{share.toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 6, background: t.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${share}%`,
            height: '100%',
            background: index === 0 ? t.accent : t.accentSoftStrong,
          }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/business/[orgId]/analytics/page.tsx
git commit -m "feat(jbp): analytics detail shows NotAvailableYet in real mode"
```

---

## Task 12: Billing detail page — invoices honor mode

**Files:**
- Modify: `app/business/[orgId]/billing/page.tsx`

The subscription summary is already real. Only the invoice list needs to honor mode. There is no invoice-list endpoint wired in `lib/api/`, so real mode shows an empty state and we capture a follow-up.

- [ ] **Step 1: Add imports**

Add to the existing imports at the top of `app/business/[orgId]/billing/page.tsx`:

```tsx
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { EmptyCardState } from '@/components/business/ui/EmptyCardState';
```

- [ ] **Step 2: Add the hook call**

Inside the component, near the other hook calls (e.g., next to `const t = useBusinessTheme();`), add:

```tsx
const { isMock } = useDashboardMode();
```

- [ ] **Step 3: Replace the billing-history Card body**

Locate this exact block (around lines 223–252):

```tsx
<Card t={t}>
  <SectionHeader t={t} title="Billing history" />
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr 100px',
      border: `1px solid ${t.border}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}
  >
    <TableHeader t={t}>Reference</TableHeader>
    <TableHeader t={t}>Date</TableHeader>
    <TableHeader t={t}>Amount</TableHeader>
    <TableHeader t={t}>Status</TableHeader>
    {MOCK_INVOICES.map((inv) => (
      <div key={inv.id} style={{ display: 'contents' }}>
        <TableCell t={t} mono accent>{inv.id}</TableCell>
        <TableCell t={t}>{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
        <TableCell t={t}>{inv.amount}</TableCell>
        <TableCell t={t}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: t.success, fontFamily: FONT, textTransform: 'capitalize' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: t.success, display: 'inline-block' }} />
            {inv.status}
          </span>
        </TableCell>
      </div>
    ))}
  </div>
</Card>
```

Replace with:

```tsx
<Card t={t}>
  <SectionHeader t={t} title="Billing history" />
  {isMock ? (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 100px',
        border: `1px solid ${t.border}`,
        borderRadius: 8,
        overflow: 'hidden',
      }}
    >
      <TableHeader t={t}>Reference</TableHeader>
      <TableHeader t={t}>Date</TableHeader>
      <TableHeader t={t}>Amount</TableHeader>
      <TableHeader t={t}>Status</TableHeader>
      {MOCK_INVOICES.map((inv) => (
        <div key={inv.id} style={{ display: 'contents' }}>
          <TableCell t={t} mono accent>{inv.id}</TableCell>
          <TableCell t={t}>{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
          <TableCell t={t}>{inv.amount}</TableCell>
          <TableCell t={t}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: t.success, fontFamily: FONT, textTransform: 'capitalize' }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: t.success, display: 'inline-block' }} />
              {inv.status}
            </span>
          </TableCell>
        </div>
      ))}
    </div>
  ) : (
    <EmptyCardState message="Invoice history isn't available yet. It will appear here once billing has run for at least one cycle." />
  )}
</Card>
```

- [ ] **Step 4: Manual smoke test**

Visit `/business/<orgId>/billing` with demo OFF — invoice section shows empty state. Toggle ON — mock invoices appear.

- [ ] **Step 5: Commit**

```bash
git add app/business/[orgId]/billing/page.tsx
git commit -m "feat(jbp): billing invoice list honors dashboard mode"
```

---

## Task 13: Overview DNS card — mode-aware

**Files:**
- Modify: `components/business/dashboard/DNSStatusCard.tsx`

The card currently displays `resolveDomain(data)` (intake domain) and a hardcoded local `RECORDS` array. We replace both with real values from `listZonesForOrg` + `listDnsRecordsForZone` when not in mock mode, falling back to the existing intake-driven behavior in mock mode.

- [ ] **Step 1: Add imports**

At the top of `components/business/dashboard/DNSStatusCard.tsx`, add to the existing imports:

```tsx
import { useQuery } from '@tanstack/react-query';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { listZonesForOrg } from '@/lib/api/zones';
import { listDnsRecordsForZone } from '@/lib/api/dns-records';
```

- [ ] **Step 2: Replace the component body up to the first JSX `return`**

Replace this block (currently lines 40–43):

```tsx
export function DNSStatusCard({ t, data }: DNSStatusCardProps) {
  const domain = resolveDomain(data);
  const managed = data.dns.mode === 'jbp';

  return (
```

with:

```tsx
export function DNSStatusCard({ t, data }: DNSStatusCardProps) {
  const { isMock } = useDashboardMode();
  const managed = data.dns.mode === 'jbp';

  const zonesQuery = useQuery({
    queryKey: ['zones', data.orgId],
    queryFn: () => listZonesForOrg(data.orgId),
    enabled: !!data.orgId && !isMock,
  });
  const primaryZone = zonesQuery.data?.[0];

  const recordsQuery = useQuery({
    queryKey: ['dns-records', primaryZone?.id ?? ''],
    queryFn: () => listDnsRecordsForZone(primaryZone!.id),
    enabled: !!primaryZone?.id && !isMock,
  });

  const domain = isMock
    ? resolveDomain(data)
    : (primaryZone?.name ?? resolveDomain(data));

  const realRecords = (recordsQuery.data ?? []).map((r): [string, string, string, string] => [
    r.type,
    r.name,
    r.content,
    r.ttl != null ? String(r.ttl) : '—',
  ]);
  const displayedRecords = isMock ? RECORDS : realRecords;

  return (
```

- [ ] **Step 3: Replace the records-block render**

Replace this block (currently around lines 120–147):

```tsx
      <div style={{ marginTop: 18, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginBottom: 10 }}>
          Active records <span style={{ color: t.text, fontWeight: 500 }}>· {RECORDS.length}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 60px',
            gap: 0,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            fontFamily: MONO,
            fontSize: 12,
          }}
        >
          {RECORDS.map((r, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div style={cell(t, i === 0, 'accent')}>{r[0]}</div>
              <div style={cell(t, i === 0)}>{r[1]}</div>
              <div style={cell(t, i === 0)} title={r[2]}>
                {r[2]}
              </div>
              <div style={{ ...cell(t, i === 0), color: t.textMuted }}>{r[3]}</div>
            </div>
          ))}
        </div>
      </div>
```

with:

```tsx
      <div style={{ marginTop: 18, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginBottom: 10 }}>
          Active records <span style={{ color: t.text, fontWeight: 500 }}>· {displayedRecords.length}</span>
        </div>
        {displayedRecords.length === 0 ? (
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, padding: '12px 0' }}>
            No DNS records yet.
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr 1fr 60px',
              gap: 0,
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              overflow: 'hidden',
              fontFamily: MONO,
              fontSize: 12,
            }}
          >
            {displayedRecords.map((r, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div style={cell(t, i === 0, 'accent')}>{r[0]}</div>
                <div style={cell(t, i === 0)}>{r[1]}</div>
                <div style={cell(t, i === 0)} title={r[2]}>
                  {r[2]}
                </div>
                <div style={{ ...cell(t, i === 0), color: t.textMuted }}>{r[3]}</div>
              </div>
            ))}
          </div>
        )}
      </div>
```

- [ ] **Step 4: Manual smoke test**

Visit `/business/<orgId>` overview. Demo OFF — domain comes from your real zone (or falls back to intake's domain), record table reflects real DB or shows "No DNS records yet." Demo ON — domain falls back to intake/mock, record table shows the local `RECORDS` constant.

- [ ] **Step 5: Commit**

```bash
git add components/business/dashboard/DNSStatusCard.tsx
git commit -m "feat(jbp): DNS card reads real zone + records when not mock"
```

---

## Task 14: Final verification

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: All previously-passing tests still pass, plus the new tests from Tasks 2 and 4.

- [ ] **Step 2: Run typecheck and build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: Next build completes.

- [ ] **Step 3: Manual demo walkthrough**

Sign in as a superuser. Open the dropdown → flip "Demo data" to ON. Verify:
- `DEMO` badge appears next to the logo.
- `/business` listing still works (unaffected).
- `/business/[orgId]` (overview) renders the dashboard, with the DNS card showing values appropriate to mode.
- `/business/[orgId]/dns` shows mock records when ON, real records (or empty state) when OFF.
- `/business/[orgId]/domains` shows mock domain set when ON, real (org-filtered) when OFF.
- `/business/[orgId]/website` and `/analytics` show full mock dashboard when ON, `NotAvailableYet` panel when OFF.
- `/business/[orgId]/billing` shows mock invoices when ON, empty state when OFF.

Sign in as a regular `user` and confirm: no toggle in dropdown, no `DEMO` badge ever, all pages always real.

- [ ] **Step 4: Commit any minor touch-ups discovered during walkthrough**

```bash
git add -A
git commit -m "chore(jbp): post-walkthrough fixups for dashboard mode"
```

(Skip if nothing changed.)

---

## Out of scope / follow-ups captured

- Real Stripe invoice list endpoint (front+back) — separate plan.
- Multi-zone DNS picker on the overview card — only matters once a customer can have more than one zone.
- Server-side persistence of the demo-mode flag for cross-device use — separate spec if desired.
- Wiring real analytics, deploy history, page list — depends on intake-app DB integration (out of scope for this spec).
