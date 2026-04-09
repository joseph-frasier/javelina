# OpenSRS Config Admin Page — Design Spec

## Overview

Add an "OpenSRS Config" tab to the admin sidebar that serves as a hub for OpenSRS-related configuration and monitoring. The first feature is a **Transaction Log** showing every domain registered, transferred, or linked — with action type, cost, and expiration date.

## Architecture Decisions

- **Option A (current state only):** Query the existing `domains` table — no new tables or migrations needed. Each row represents a domain and its current state.
- **Approach A (backend API):** All data flows through the Express backend via a new admin endpoint, matching the existing admin page pattern. No direct Supabase queries from the frontend.

## Sidebar & Routing

- Add "OpenSRS Config" to `navigationItems` in `AdminLayout.tsx`
- Route: `/admin/opensrs`
- Page: `/app/admin/opensrs/page.tsx`
- Standard `AdminProtectedRoute` + `AdminLayout` wrapper

## Page Layout

- **Tabbed layout** within the page content area for future extensibility
- First tab: "Transaction Log"
- Future tabs can be added alongside (API settings, pricing, TLD config, etc.)
- Tab UI follows existing patterns (simple horizontal tabs, not nested sidebar items)

## Backend: `GET /admin/domains`

- New admin endpoint in `javelina-backend`
- Queries `domains` table joined with `profiles` for user email/name
- Returns all domains with: `id`, `domain_name`, `tld`, `registration_type`, `status`, `amount_paid`, `currency`, `expires_at`, `registered_at`, `user_id`, `user_email`, `user_name`, `opensrs_order_id`
- Protected by existing admin auth middleware
- No server-side pagination (small dataset, ~12 rows currently)

## Frontend: Transaction Log Table

### Data Fields (columns)

| Column | Source | Display |
|--------|--------|---------|
| Domain | `domain_name` | Plain text |
| Action Type | `registration_type` | Badge: "New", "Transfer", "Linked" |
| Status | `status` | Badge: "Active", "Pending" |
| Cost | `amount_paid` / `currency` | Formatted: "$12.99" |
| Valid Until | `expires_at` | Date format, highlight if expiring soon |
| Registered | `registered_at` | Date format |
| User | `user_email` | Email or name |
| OpenSRS Order | `opensrs_order_id` | ID or "—" for linked domains |

### Filtering & Search

- **Search:** Filter by domain name (text input)
- **Action type filter:** Dropdown — All / New / Transfer / Linked
- **Status filter:** Dropdown — All / Active / Pending
- All filtering is client-side

### Sorting

- Sortable columns with direction toggle (matching existing admin table patterns)
- Default sort: `registered_at` descending (newest first)

## Existing Schema (no changes needed)

```sql
-- public.domains (12 rows)
id                        uuid        NOT NULL  DEFAULT gen_random_uuid()
user_id                   uuid        NOT NULL
domain_name               text        NOT NULL
tld                       text        NOT NULL
status                    text        NOT NULL  DEFAULT 'pending'
registration_type         text        NOT NULL  DEFAULT 'new'
opensrs_order_id          text        NULL
opensrs_transfer_id       text        NULL
registered_at             timestamptz NULL
expires_at                timestamptz NULL
years                     integer     NOT NULL  DEFAULT 1
auto_renew                boolean     NOT NULL  DEFAULT false
stripe_checkout_session_id text       NULL
stripe_payment_intent_id  text        NULL
amount_paid               integer     NULL
currency                  text        NOT NULL  DEFAULT 'usd'
contact_info              jsonb       NULL
nameservers               jsonb       NULL
metadata                  jsonb       NULL
created_at                timestamptz NOT NULL  DEFAULT now()
updated_at                timestamptz NOT NULL  DEFAULT now()
```

## Tech Stack (existing)

- Next.js 15 + React 19 + TypeScript
- Tailwind CSS with orange theme + dark mode
- GSAP for animations
- Zustand for state management
- Express backend API (proxied via Next.js)

## Frontend API Client

Add `adminApi.listDomains()` to `/lib/api-client.ts` following existing patterns.

## UI Components to Reuse

- `AdminLayout`, `AdminProtectedRoute` (page wrapper)
- Existing table patterns from `/app/admin/users/page.tsx` (sort, search, pagination)
- `TagBadge` or inline badges for status/action type
- Toast notifications for errors
- Dark mode support via existing theme system
