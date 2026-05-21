# JBP Mock Data Toggle & Real-Data Wiring — Design

**Status:** Draft
**Date:** 2026-05-06
**Owner:** Seth
**Branches:** `feat/intake-setup-frontend` (frontend), `feat/intake-setup` (backend)

## Goal

Two-mode dashboard for the Javelina Business Portal (JBP):

1. **Real mode** (default for everyone). Every card and detail page displays data sourced from the javelina database. Where the javelina DB has nothing to back a section, the section keeps its frame and shows an empty / "not available yet" state — no UI elements are removed.
2. **Mock mode** (superuser-only toggle). Every section that has a corresponding `MOCK_*` dataset in `lib/business/page-mocks.ts` renders that dataset, so the dashboard looks fully populated for demos.

Scope is exclusively the **javelina** database (organizations, zones, dns_records, domains, certificates, subscriptions, invoices, business_intake settings, provisioning_status, pipeline_events). Intake-app data integration is **out of scope** for this spec.

## Non-goals

- Building a real analytics pipeline (no Plausible/GA wiring).
- Building a website/page or deploy registry.
- Adding a per-card mock override or per-page toggle.
- Persisting the toggle server-side or syncing across devices.
- Exposing the toggle to non-superuser accounts in any form.

## Mode toggle

### Surface

A new item inside the existing user dropdown menu in `components/layout/Header.tsx`, rendered **only when `user.role === 'superuser'`**. The item reads:

> **Demo data**  ·  `ON` / `OFF`

Clicking it flips the flag and re-renders. No nav, no modal, no confirmation.

A small badge (`DEMO`) appears in the header next to the logo whenever mock mode is on, regardless of role, so it's never accidentally left on during a screenshare.

### Persistence

Zustand store with `persist` middleware → `localStorage` key `jbp:dashboard-mode`. Browser-scoped, survives reloads. No backend round-trip.

```ts
// lib/dashboard-mode-store.ts
type DashboardMode = 'real' | 'mock';
interface State {
  mode: DashboardMode;
  setMode(m: DashboardMode): void;
  toggle(): void;
}
```

Default: `'real'`.

### Hook

```ts
// lib/hooks/useDashboardMode.ts
export function useDashboardMode(): { mode: DashboardMode; isMock: boolean; toggle: () => void; }
```

All JBP components read mode through this hook. No prop drilling.

### Guard

`Header.tsx` only renders the toggle item when `user.role === 'superuser'`. Non-superusers always see real mode. If a non-superuser ever has a stale `'mock'` value in localStorage (e.g. role change), the hook coerces it to `'real'` for them.

## Empty-state strategy

Per Q2 / option D — **no UI elements removed**.

- **Sidebar cards & overview cards** with no real source: keep the card frame; replace contents with a calm one-liner empty state appropriate to the card.
- **Detail pages with zero real source** (analytics, website): keep the `PageHeader`, sidebar nav, and overall page chrome; replace the page body with a single "Not available yet" panel that explains what will appear here once it's live.

Mock mode overrides every empty state with rich `MOCK_*` content.

## Per-page data inventory

Each row maps a section to (a) what real data exists in the javelina DB today, (b) what the empty state looks like in real mode, and (c) what mock content is shown in mock mode.

Symbols:
- ✅ already wired to real data — no work needed
- 🔌 wire to existing backend endpoint
- 🪧 empty state only (no real source in javelina DB)

### Overview (`app/business/[orgId]/page.tsx` → `BusinessPlaceholderDashboard.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Site preview (`SitePreview`) | ✅ intake (`org.settings.business_intake`) | Renders intake fields | Renders intake fields (no separate mock) |
| Build progress (`ServiceStatusGrid`) | ✅ `provisioning_status` | Real tiles | Synthetic "all complete" tiles |
| DNS card (`DNSStatusCard`) | 🔌 `zones` + `dns_records` (primary zone) | Real domain, NS, record count | Pretty mock domain + record count |
| Billing card (`BillingCard`) | ✅ `subscriptions` | Real | Real (no separate mock) |
| Analytics placeholder | 🪧 none | Existing "coming soon" panel (already empty) | `MOCK_TRAFFIC` mini-tiles |
| "What happens next" | static copy | unchanged | unchanged |

### Website detail (`app/business/[orgId]/website/page.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Page header & sidebar nav | static | unchanged | unchanged |
| Deploy history | 🪧 none | Page-level "Not available yet" panel replacing page body below header | `MOCK_DEPLOYS` |
| Pages list | 🪧 none | (subsumed by panel above) | `MOCK_PAGES` |

### DNS detail (`app/business/[orgId]/dns/page.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Stat: Records count | 🔌 `dns_records` count for primary zone | Real count | `MOCK_DNS_RECORDS.length` |
| Stat: Propagation % | 🪧 none | "—" + tooltip "Not available yet" | mock 100% |
| Nameservers | static `JAVELINA_NAMESERVERS` | unchanged | unchanged |
| Records table | 🔌 `GET /api/dns-records/zone/:zoneId` | Real records (read-only for v1) | `MOCK_DNS_RECORDS` |

If the org has no zone yet, the records section becomes an empty state ("Your zone hasn't been created yet").

### Domains detail (`app/business/[orgId]/domains/page.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Primary domain header | 🔌 `domains` (where `is_primary=true` for org) | Real | `MOCK_DOMAINS[0]` |
| Domain list | 🔌 `GET /api/domains?organization_id=…` | Real | `MOCK_DOMAINS` |
| Auto-renew / expires / status | 🔌 same | Real | mock |

If the org has no domains, list section shows a calm empty state.

### Analytics detail (`app/business/[orgId]/analytics/page.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Stat tiles (visitors, pageviews, etc.) | 🪧 none | Page-level "Not available yet" panel replacing the body below `PageHeader` | `MOCK_TRAFFIC` tiles |
| Top pages | 🪧 none | (subsumed) | `MOCK_TOP_PAGES` |
| Traffic sources | 🪧 none | (subsumed) | `MOCK_TRAFFIC_SOURCES` |

### Billing detail (`app/business/[orgId]/billing/page.tsx`)

| Section | Real source | Real-mode behavior | Mock-mode |
|---|---|---|---|
| Subscription summary | ✅ already real | unchanged | unchanged |
| Invoice history | 🔌 Stripe via existing subscription/billing endpoints (verify endpoint exists; if not, follow-up task) | Real list | `MOCK_INVOICES` |

If real invoice listing requires a new backend endpoint, mark as a follow-up task in the implementation plan but do not block v1 — render an empty state for invoices in real mode if necessary.

## Frontend architecture

### New files

- `lib/dashboard-mode-store.ts` — Zustand store + persist.
- `lib/hooks/useDashboardMode.ts` — Hook wrapping the store, role-coerces non-superusers to `'real'`.
- `lib/api/zones.ts` — `listZonesForOrg(orgId)` server-action wrapper.
- `lib/api/dns-records.ts` — `listDnsRecordsForZone(zoneId)` server-action wrapper.
- `lib/api/domains.ts` — `listDomainsForOrg(orgId)` server-action wrapper.
- `components/business/ui/NotAvailableYet.tsx` — shared empty-state panel for "no real source" pages.
- `components/business/ui/EmptyCardState.tsx` — small inline empty for cards.

All API wrappers follow the existing `lib/api/business.ts` pattern (server action, `authedFetch`, `cache: 'no-store'`).

### Modified files

- `components/layout/Header.tsx` — add `Demo data` toggle in user dropdown (superuser-gated), add `DEMO` badge next to logo when `isMock`.
- `app/business/[orgId]/dns/page.tsx` — switch from `MOCK_DNS_RECORDS` to either real records (real mode) or mock (mock mode), via `useDashboardMode`.
- `app/business/[orgId]/domains/page.tsx` — same pattern with domains API.
- `app/business/[orgId]/billing/page.tsx` — invoice list reads from real source or mock.
- `app/business/[orgId]/website/page.tsx` — wrap body in a `mode === 'mock' ? mockContent : <NotAvailableYet …/>` switch.
- `app/business/[orgId]/analytics/page.tsx` — same switch as website.
- `components/business/dashboard/DNSStatusCard.tsx` — use real records count + primary zone domain when real; fall back to mock display when mock.
- `lib/business/page-mocks.ts` — keep as-is; this remains the single source of mock data.

### Conditional pattern

Each section uses the simplest viable shape:

```tsx
const { isMock } = useDashboardMode();
const realQuery = useQuery({ queryKey: [...], queryFn: ..., enabled: !isMock });

const records = isMock ? MOCK_DNS_RECORDS : (realQuery.data ?? []);
```

When `isMock`, the real query is disabled to avoid useless fetches. When real and the query returns empty, the empty-state component renders.

### `DEMO` badge

A small pill rendered in `Header.tsx` to the right of the logo, only when `isMock`. Always visible regardless of role — purely a visual safety so demo mode is never confused for live customer data.

## Backend changes

None required for v1. All needed endpoints (`/api/zones`, `/api/dns-records/zone/:zoneId`, `/api/domains`, subscription endpoints) already exist.

If the billing page needs a Stripe invoice list endpoint and one is missing, that becomes a follow-up task captured in the implementation plan, not a blocker.

## Testing

- Unit: `useDashboardMode` coerces non-superusers off mock mode even if localStorage says otherwise.
- Component: each modified page renders correctly under both modes (snapshot or RTL render assertions).
- Manual: superuser flips toggle, every JBP page reflects the new mode immediately. Non-superuser never sees the toggle and is always on real mode.

## Out of scope / future work

- Persisting toggle in DB so it follows a superuser across browsers.
- Per-section mock overrides (e.g., "show real DNS but mock analytics").
- Wiring real analytics, website pages, deploy history once those data sources exist.
- Intake-app database integration — separate spec.

## Open assumptions

- `user.role === 'superuser'` is the correct gate (matches existing dropdown's "Super User" label).
- Each business org has at most one zone we care about for the DNS card / detail (the "primary zone"). If multi-zone becomes real, the card and detail page will need a zone selector — not v1.
- Mock data quality in `lib/business/page-mocks.ts` is acceptable as-is for demos; no further enrichment in this spec.
