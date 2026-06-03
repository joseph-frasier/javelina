# Javelina Frontend — Claude Code Rules

## Role

You are the coding assistant for the Javelina frontend. Your job is to modify and extend the codebase safely, respect architecture boundaries, and prefer minimal precise edits over large refactors unless asked. This is a production-grade app. Stability > cleverness.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5.7
- **Styling**: Tailwind CSS 3.4 + CVA (class-variance-authority) + clsx
- **State**: Zustand (client), @tanstack/react-query (server state)
- **Animation**: GSAP
- **Database**: Supabase (PostgreSQL); migrations live in `supabase/migrations/` in this repo
- **Auth**: Auth0 primary (Universal Login; backend handles callback and sets a BFF session cookie). Supabase Auth is legacy (pre-Auth0 users) + the staff admin portal only. `public.profiles` is the canonical identity table — `auth.users` is deprecated. See `docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md`.
- **Payments**: Stripe (@stripe/stripe-js + @stripe/react-stripe-js)
- **Backend**: Separate Express.js API (`javelina-backend`) on port 3001 (Railway in prod)
- **Deployment**: Vercel

## Architecture Rules (Mandatory)

### Frontend responsibilities
- UI rendering, user interactions, React Query API calls to backend
- Client-side auth session reading via Supabase
- Stripe Elements for payment UI

### Frontend MUST NOT
- Directly read/write Supabase tables (except auth + admin portal)
- Access Supabase service role keys or Stripe secret keys
- Perform CRUD operations locally or call external services directly

### Correct data flow
```
Frontend → Backend API → Supabase
Frontend → Backend API → Stripe
Frontend → Backend API → External services
```

### Exceptions (do NOT "fix" these)
1. **Supabase Auth (legacy)** — Client-side auth calls (`getSession`, `signIn*`, `signOut`) for legacy users must stay in frontend. Auth0 login itself is handled by the backend (session cookie).
2. **Admin Portal** — Staff-only pages may query Supabase directly. Do not migrate admin CRUD to backend unless explicitly asked

## Code Style

### General
- TypeScript for all files, no `any` unless absolutely necessary
- Functional components with hooks
- Named exports (except pages/layouts which use default)
- Keep functions pure and testable, < 30 lines when possible

### Naming
- Files: `PascalCase.tsx` for components, `kebab-case.ts`/`camelCase.ts` for utilities
- Components: `PascalCase`
- Hooks: `use` prefix
- Server Actions: `action` suffix
- Types/Interfaces: `PascalCase`, use interfaces for object shapes, types for unions

### Component structure
1. Imports (React, Next.js, external libs, internal modules)
2. Types/Interfaces
3. Component (hooks first, then handlers, then render)

### State management
- Local UI state: `useState`, `useReducer`
- Global client state: Zustand
- Server state: @tanstack/react-query (never store server data in global state)
- Derived state: compute with `useMemo` or selectors

## Next.js Rules

- Server Components by default, `"use client"` only when needed
- Use `useRouter` from `next/navigation` (not `next/router`)
- Use `next/image` for images, `next/font` for fonts
- Lazy load heavy components with `dynamic(() => import(...))`
- Leverage `loading.tsx`, `error.tsx`, `not-found.tsx` for UX

## Tailwind & Brand

### Color palette
| Token | HEX | Use |
|-------|-----|-----|
| `orange` (DEFAULT) | #EF7215 | CTAs, brand highlights |
| `orange-dark` | #0B0C0D | Primary text, contrast sections |
| `orange-light` | #F2F2F2 | Base backgrounds |
| `gray-light` | #D9D9D9 | Secondary backgrounds |
| `gray-slate` | #456173 | UI elements, neutral text |
| `blue-electric` | #00B0FF | Buttons, icons, links |
| `blue-teal` | #00796B | Accents, hover states |

### Typography
- Main titles: Roboto Black (900)
- Subtitles: Roboto Regular (400)
- Body: Roboto Light (300)
- Logo: Roboto Condensed (600)

### Rules
- Use Tailwind tokens from `tailwind.config.ts`, no hardcoded HEX or px
- Use CVA for component variants
- Merge classNames with `clsx` or `cn`
- No arbitrary values unless tokenized
- Maintain WCAG AA+ contrast

## Folder Structure

```
app/                  # Next.js App Router (pages, layouts)
                      #   _components/ + _lib/ inside a route = route-private code
components/           # React components, grouped by feature
  ui/                 # Reusable UI (Button, Input, Card, Modal)
  layout/             # Structural (Header, Footer, Sidebar)
  modals/             # Modal components
  business/           # Business-products feature (own ui/ + wizard/)
lib/
  api-client.ts       # Backend API wrapper (the main data path)
  permissions.ts      # RBAC helpers (UI gating only)
  api/                # Feature-specific API clients
  stores/             # ALL Zustand stores (auth-store, toast-store, ...)
  hooks/              # Custom hooks
  actions/            # Server actions
  admin/              # Admin-portal helpers (auth, export, impersonation)
  mocks/              # Mock data for dev/demo modes
  constants/          # Config constants (plans, domains)
  schemas/            # Zod schemas
  supabase/           # Supabase clients (browser/server/service-role)
  utils/              # Generic utilities
types/                # Shared TypeScript types
tests/                # Vitest tests — mirrors source paths (no colocated tests)
docs/                 # Documentation — see docs/README.md
```

Place files where similar code already lives. Maintain existing conventions.
Tests go in `tests/` mirroring the source path, never next to the source file.

## Git

### Branch naming
- `feat/feature-name`, `fix/bug-description`, `chore/task-name`

### Commits
- Follow Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`
- No emojis in commit messages
- WIP commits are acceptable on feature branches with clear messages
- Squash or reword WIP commits before merging

## Security
- Never commit secrets or API keys
- Validate all user input on the server
- Sanitize data before rendering (XSS prevention)

## When making changes
1. Determine if the change belongs in frontend or backend
2. Propose the smallest safe set of edits
3. Respect architecture boundaries
4. Never rewrite large amounts of code or move logic across layers unless asked
5. Never introduce new dependencies without permission

## Anti-patterns to avoid
- Over-engineering simple features
- 200+ line components that should be split
- Unnecessary wrapper functions
- Adding libraries for simple tasks
- Passing inline objects/functions as props every render
- Over-using Context for frequently changing values
