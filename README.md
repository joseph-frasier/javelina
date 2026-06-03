# Javelina

DNS management platform frontend — enterprise-grade DNS record management, multi-organization support, domain registration, and Stripe billing.

This repo is the **Next.js frontend only**. It talks to a separate Express API ([`javelina-backend`](https://github.com/joseph-frasier/javelina-backend)) which owns all business logic and data access.

## 🗺️ Project Map (Start Here)

```
┌──────────────────┐      ┌─────────────────────┐      ┌──────────────┐
│  THIS REPO        │      │  javelina-backend    │      │  Supabase    │
│  Next.js 15       │ ───► │  Express API         │ ───► │  PostgreSQL  │
│  localhost:3000   │      │  localhost:3001      │      │  (database)  │
└──────────────────┘      │  (Railway in prod)   │      └──────────────┘
                           └─────────────────────┘
```

- **Frontend** (this repo): UI, React Query calls to the backend, Stripe Elements. Deployed on Vercel.
- **Backend** (`javelina-backend`): all CRUD, Auth0 callback handling, sessions, Stripe webhooks, external services. The frontend never reads/writes Supabase tables directly (exceptions: auth session reading and the staff-only admin portal).
- **Database**: Supabase PostgreSQL. Migrations live in [`supabase/migrations/`](supabase/migrations/) **in this repo** — there is no separate database repo.
- **Docs**: [`docs/`](docs/README.md) — architecture docs, feature specs, and backend handoffs. Start with [`docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md`](docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md) for auth.

### Authentication (read this before touching auth)

Javelina uses a **hybrid auth model** (see [`docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md`](docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md)):

- **Auth0** — primary authentication for customers (Universal Login). The Express backend handles the Auth0 callback and sets a session cookie; the frontend middleware checks that cookie.
- **Supabase Auth** — legacy (pre-Auth0 users) and the **staff admin portal** (`/admin/login`). Supabase `auth.users` is deprecated as a user source of truth — `public.profiles` is the canonical identity table.
- Sessions are cookie-based via the backend (BFF pattern), not client-held JWTs.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A running `javelina-backend` (port 3001) — required for login and all data
- Supabase + Stripe credentials (ask a teammate, or use the dev env file)

### Setup

```bash
git clone https://github.com/joseph-frasier/javelina.git
cd javelina
npm install

# Use the dev environment (copies .env.dev → .env.local)
npm run env:dev

npm run dev          # → http://localhost:3000
```

### Environment switching

`.env.local` is generated — don't edit it directly. Edit `.env.dev` / `.env.production` and switch:

```bash
npm run env:dev      # dev Supabase project + test Stripe keys
npm run env:prod     # production project — be careful
npm run env:status   # show which environment is active
```

## 🔧 Environment Variables

Variables actually read by the frontend code (see `.env.local.example` for a template):

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_API_URL` | ✅ | Express backend URL (`http://localhost:3001` in dev) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe publishable key |
| `STRIPE_SECRET_KEY` | server | Stripe secret (server-side routes only) |
| `ADMIN_JWT_SECRET` | server | Admin-portal JWT — must match the backend's value |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Service-role key (admin portal server code only) |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical site URL |
| `NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID` | optional | Feature flags |
| `NEXT_PUBLIC_HCAPTCHA_SITE_KEY_DEV` / `_PROD` | optional | Captcha on auth forms |
| `NEXT_PUBLIC_SUPABASE_CAPTCHA_ENABLED` | optional | Toggle captcha |
| `NEXT_PUBLIC_OPENSRS_STOREFRONT_URL` | optional | Domain registration storefront |
| `NEXT_PUBLIC_FRESHDESK_DOMAIN` / `FRESHDESK_API_KEY` / `NEXT_PUBLIC_FRESHDESK_ENABLED` | optional | Support ticket integration |
| `NEXT_PUBLIC_IDLE_TIMEOUT_MS` / `NEXT_PUBLIC_IDLE_WARNING_MS` / `NEXT_PUBLIC_ADMIN_IDLE_TIMEOUT_MS` | optional | Inactivity logout tuning |
| `NEXT_PUBLIC_STRIPE_PRICE_*` | optional | Stripe price IDs per plan |

## 📊 Scripts

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Vitest (watch mode)
npm run test:run     # Vitest (single run)
npm run test:ui      # Vitest UI
npm run env:dev      # Switch to dev environment
npm run env:prod     # Switch to prod environment
npm run env:status   # Show active environment
```

## 📚 Project Structure

```
javelina/
├── app/                  # Next.js App Router routes
│   ├── admin/            #   Staff admin portal (separate Supabase-JWT auth)
│   │   └── pipelines/    #   _components/ + _lib/ are route-private (Next.js convention)
│   ├── organization/     #   Org pages
│   ├── zone/             #   Zone detail + DNS records
│   └── ...
├── components/           # React components, grouped by feature
│   ├── ui/               #   Shared design system (Button, Card, Modal, ...)
│   ├── business/         #   Business-products feature (has its own ui/ + wizard/)
│   ├── modals/           #   Modal dialogs
│   └── ...
├── lib/
│   ├── api-client.ts     #   ⭐ Backend API wrapper — all data goes through this
│   ├── api/              #   Feature-specific API clients
│   ├── stores/           #   Zustand stores (client state)
│   ├── hooks/            #   Custom hooks
│   ├── actions/          #   Server actions
│   ├── admin/            #   Admin-portal helpers (auth, export, impersonation)
│   ├── mocks/            #   Mock data for dev/demo modes
│   ├── schemas/          #   Zod schemas
│   ├── supabase/         #   Supabase clients (browser/server/service-role)
│   └── utils/            #   Generic utilities
├── types/                # Shared TypeScript types
├── tests/                # Vitest tests (mirrors source structure)
├── supabase/             # Database migrations + local config (no separate DB repo)
├── scripts/              # Dev/ops utilities (env switcher, SQL maintenance)
└── docs/                 # Documentation — see docs/README.md
```

Conventions: use `@/` imports (never deep relative paths); components are `PascalCase.tsx`; utilities are `kebab-case.ts`/`camelCase.ts`; tests go in `tests/` mirroring the source path.

## 🔐 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **SuperAdmin** | Full org control, can delete organization |
| **Admin** | Manage resources, team, billing |
| **BillingContact** | Billing management only, read-only DNS |
| **Editor** | Full DNS management (zones, records, tags) |
| **Viewer** | Read-only access |

Global staff access is separate: `profiles.superadmin = true` gates the `/admin` portal.

Enforcement is layered: Supabase RLS (database) → backend RBAC middleware (API) → `lib/permissions.ts` (UI rendering only — never the sole gate).

## 💳 Billing

- Plans: Starter / Pro / Business / Enterprise, monthly or lifetime (see `lib/plans-config.ts`).
- Stripe Checkout + Customer Portal; **webhooks are handled by the backend**, not this repo.
- The `subscriptions` table holds one row per org (the org's *plan*); per-mailbox subscriptions live in `domain_mailboxes`.
- Domain auto-renewals are billed via Stripe invoices (Stripe sends receipts/failure emails).

## 🧪 Testing

```bash
npm run test:run
```

Tests live in `tests/` mirroring source paths (e.g. `lib/permissions.ts` → `tests/lib/permissions.test.ts`). Setup file: `setupTests.ts` (wired in `vitest.config.ts`).

## 🌐 Deployment

- **Frontend**: Vercel — `main` → production, `dev` → preview.
- **Backend**: Railway (prod env vars live there). Resend handles transactional email.
- Open PRs against the `dev` branch.

## 🐛 Troubleshooting

- **Can't log in locally** — is `javelina-backend` running on 3001? Login requires the backend (it sets the session cookie after Auth0).
- **Wrong database** — run `npm run env:status`; you may be pointed at prod.
- **Backend connection** — verify `NEXT_PUBLIC_API_URL`; test with the `/test-api` page.
- **Stripe** — webhook issues are backend-side; check the backend logs and Stripe dashboard.
