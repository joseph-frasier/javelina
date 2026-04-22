# Business Intake Flow — Design

**Date:** 2026-04-22
**Scope:** Frontend-only, mock-data phase
**Branch:** `feat/business-plans-on-pricing`
**Related:** `2026-04-15-business-products-storefront-design.md`, `2026-04-22-business-plans-on-pricing-design.md`

## Goal

When a customer clicks **Javelina Business Starter** or **Javelina Business Pro** on `/pricing`, route them through a distinct post-purchase intake experience (a 5-step setup wizard) that is completely separate from the standard DNS plan checkout. The standard DNS plan flow must remain untouched and fully functional.

This phase uses mock data only — no backend writes, no Stripe changes beyond the existing subscription creation, no OpenSRS/Vercel/Microsoft 365 integrations. The goal is to prove out UX end-to-end before committing to schema and provisioning work.

## Source material

Visual and behavioral spec lives in `/.jbp_mockup/JBP/` (not in production build). Relevant files:

- `components/wizard.jsx` — the 5-step setup wizard (DNS → Website → Domain → Contact → Confirm)
- `components/dashboard.jsx` — post-setup customer dashboard (out of scope this pass, beyond placeholder)
- `components/jbp-admin.jsx` — internal multi-tenant admin (out of scope)

The mockup is React-without-build (globals, inline styles, custom primitives). We re-implement using the existing app's stack (Next.js App Router, Tailwind, Zustand), but we **adopt the mockup's visual language wholesale** — design tokens, primitive styling (Button, Input, Card, Badge, Radio, Checkbox, Toggle), spacing, typography, border radii, shadows. The existing Javelina UI (orange `/pricing`, `/checkout`, dashboard) is **not** restyled in this pass; it stays as-is. Any rest-of-app redesign is a separate, later initiative.

## Visual system

All new surfaces (`/business/setup`, `/business/[orgId]`, and every new primitive used there) follow the mockup's token system, mapped to Javelina brand colors:

- **Font stack:** `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, system-ui, sans-serif` (body) and `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` (mono). Add Inter via `next/font` if not already present.
- **Accent = Javelina orange:** `#EF7215` (replacing the mockup's default sky blue). Derive accent-soft (light tint ~ `#FEF0E5`) and ring (`rgba(239,114,21,0.18)`) to match the mockup's `accentSoft` / `ring` roles.
- **Neutrals:** use the mockup's light-mode grays verbatim (`bg: #f7f8fa`, `surface: #fff`, `surfaceAlt: #fafbfc`, `border: #e6e8ec`, `borderStrong: #d3d7de`, `text: #0f1419`, `textMuted: #566271`, `textFaint: #8a94a3`). These are intentionally cooler/sharper than Javelina's current palette — that's the point of the refresh.
- **Radii:** `8` (inputs/buttons), `10` (inline panels), `12` (radio cards), `14` (cards).
- **Shadows:** mockup's `shadowSm` / `shadowMd` values verbatim.
- **Status colors:** success `#059669`, warning `#d97706`, danger `#dc2626` (mockup values; do not swap for Javelina orange).
- **Dark mode:** tokens exist in the mockup. Not required this pass; design tokens must be structured so dark mode can be added later without rework.

Tokens live in a single source of truth — either a CSS variable block injected at the root of business routes, or a Tailwind config extension scoped via a CSS-layer class. Either way, the **rest of the app is unaffected**.

The mockup's inline-style primitives (Button, Input, Card, Badge, Radio, Checkbox, Toggle, Icon) are reimplemented as real React+Tailwind components in `components/business/ui/`. They are **separate from `components/ui/`** (which keeps the current Javelina style in use across DNS surfaces). This deliberate duplication is temporary: when the broader redesign happens, the business-style primitives graduate to `components/ui/` and the originals are retired.

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Pay first, then wizard** (matches mockup "post-purchase setup" label) | Simplest; mirrors mockup intent |
| 2 | **Keep the existing org modal** before checkout for business plans | Stripe subscription needs an `org_id` at creation time; matches existing contract; wizard's "Business name" is pre-filled from the modal input |
| 3 | **Forced wizard, resumable via localStorage** | All fields are required for provisioning; blank dashboard is incoherent. Resumable = Zustand `persist` middleware keyed by `orgId` |
| 4 | **Same wizard for Starter and Pro in this phase** | Differences (M365 email, AI agent) are fulfillment concerns, not intake. Confirm step *displays* plan-specific line items. Plan-conditional steps deferred to a follow-up |
| 5 | **Route: `/business/setup`** for wizard, **`/business/[orgId]`** for placeholder dashboard | Namespaced; leaves room for future business-line screens |
| 6 | **Launch = local-only in mock phase** | Sets `completedAt` in store, logs payload, routes to placeholder dashboard. No DB, no provisioning calls |
| 7 | **Uploads stubbed** | Logo / photo "upload" buttons set a filename string in state. No file inputs, no Supabase Storage wiring |
| 8 | **Placeholder dashboard is intentionally minimal** | Three stacked cards (status, submitted data, what's next). Full mockup dashboard is a later design |

## Architecture

### Entry point branching

`app/pricing/PricingContent.tsx::handleOrgCreated` gains a single `productLine === 'business'` branch. Today it always routes to `/checkout?...`. After the change:

- `plan.productLine === 'business'` → `/checkout?...&intake=business` (checkout itself is unchanged — same `AddOrganizationModal`, same Stripe flow)
- `plan.productLine === 'dns'` → existing behavior (unchanged)

The fork from DNS happens on **checkout success**, not at `/pricing`:

- `app/checkout/page.tsx` success handler: if `intake === 'business'`, redirect to `/business/setup?org_id=<id>&plan_code=<code>`
- Otherwise: existing DNS destination (unchanged)

This keeps the divergence to two tiny additions: one URL param on the way in, one conditional redirect on the way out. Everything else in the checkout pipeline is shared.

### New routes

```
app/business/
├── setup/
│   └── page.tsx          ← wizard shell (client component)
└── [orgId]/
    └── page.tsx          ← placeholder dashboard (client component)
```

### Components

```
components/business/
├── wizard/
│   ├── BusinessWizardShell.tsx
│   ├── Stepper.tsx
│   ├── StepDNS.tsx
│   ├── StepWebsite.tsx
│   ├── StepDomain.tsx
│   ├── StepContact.tsx
│   └── StepConfirm.tsx
└── dashboard/
    └── BusinessPlaceholderDashboard.tsx
```

**Primitives come from a new `components/business/ui/` directory** modeled after the mockup's `tokens.jsx`. We do NOT import the Javelina-styled `components/ui/Button`, `Input`, `Card`, `Breadcrumb`, etc. — the whole point of this pass is the new look. We do reuse the Javelina `Logo` SVG (brand mark stays), but styled per the new tokens.

### State

`lib/business-intake-store.ts` — Zustand store with `zustand/middleware/persist`, modeled after `lib/subscription-store.ts`.

```ts
interface BusinessIntakeData {
  orgId: string;
  planCode: 'business_starter' | 'business_pro';
  currentStep: 0 | 1 | 2 | 3 | 4;
  dns: { mode: 'jbp' | 'self' | 'skip'; provider?: string };
  website: {
    bizName: string; bizType: string; tagline: string; description: string;
    logoName: string | null; photoCount: number;
    tone: string; aesthetic: 'bold' | 'simple' | 'choose';
    customColor?: string; customFont?: string;
    letUsWrite: boolean;
  };
  domain: {
    mode: 'transfer' | 'connect' | 'register';
    domain?: string; epp?: string; registrar?: string; unlocked?: boolean;
    search?: string;
  };
  contact: {
    firstName: string; lastName: string; org?: string;
    email: string; phone: string;
    address: string; city: string; state: string; zip: string;
    whois: boolean;
  };
  completedAt: string | null;
}

// Store is keyed by orgId — one intake record per business org
interface IntakeStore {
  intakes: Record<string, BusinessIntakeData>;
  get(orgId: string): BusinessIntakeData | null;
  init(orgId: string, planCode: string, bizName: string): void;
  update(orgId: string, patch: DeepPartial<BusinessIntakeData>): void;
  setStep(orgId: string, step: number): void;
  complete(orgId: string): void;
}
```

Fields are seeded with the mockup's demo defaults on `init` so the wizard feels populated from step one, but every field is user-editable.

### Route guard

A small client-side guard on `/business/[orgId]`:

- If store has no intake for `orgId` → redirect to `/business/setup?org_id=<id>`
- If intake exists and `completedAt == null` → redirect to `/business/setup?org_id=<id>`
- Otherwise render the placeholder dashboard

Implemented as a `useEffect` in the page component for mock phase. A real middleware guard comes with the backend schema work.

### Launch action

Clicking "Launch my site" on Step 5:

1. `store.complete(orgId)` — sets `completedAt = new Date().toISOString()`
2. `console.info('[business-intake] launch payload', payload)` for inspection
3. `router.push('/business/' + orgId)`

No `fetch`, no mutation, no Stripe side effects.

## Placeholder dashboard scope

Three stacked cards on `/business/[orgId]`:

1. **Status card** — "Your site is being prepared", bizName, plan badge, primary domain (from `domain.domain` or `search`)
2. **What you submitted** — `SummaryRow`-style list mirroring Step 5 Confirm
3. **What happens next** — static copy: "Your account manager will reach out within one business day" (mock)

Plus an "Edit setup" link that returns to the wizard at the relevant step.

**Not included (deferred):** site preview, analytics, DNS records table, billing card, shortcuts grid, side nav. Those belong in a dedicated dashboard design.

## What is explicitly out of scope

- Full JBP customer dashboard (mockup screen 2)
- JBP internal admin / tenants view (mockup screen 3)
- Real file uploads (logo, photos) — stubbed
- Real domain search and availability lookup — mocked with hard-coded results
- OpenSRS contact submission, EPP validation
- Microsoft 365 mailbox provisioning (Pro)
- "Custom AI Agent" setup (Pro)
- Backend schema for business orgs / intake records
- Provisioning workers, Vercel deploy, DNS record creation
- Plan-conditional wizard steps (same 5 steps for both Starter and Pro this pass)

Each of the above is a candidate for a follow-up design.

## Files changed

**New:**
- `app/business/setup/page.tsx`
- `app/business/[orgId]/page.tsx`
- `app/business/layout.tsx` — injects the new-style CSS variable scope and Inter font
- `components/business/ui/tokens.ts` — exports token object + type
- `components/business/ui/Button.tsx`
- `components/business/ui/Input.tsx`
- `components/business/ui/Card.tsx`
- `components/business/ui/Badge.tsx`
- `components/business/ui/Radio.tsx`
- `components/business/ui/Checkbox.tsx`
- `components/business/ui/Toggle.tsx`
- `components/business/ui/Icon.tsx` — wraps the mockup's tiny stroke icon set
- `components/business/ui/StepHeader.tsx`
- `components/business/ui/FieldLabel.tsx`
- `components/business/wizard/BusinessWizardShell.tsx`
- `components/business/wizard/Stepper.tsx`
- `components/business/wizard/StepDNS.tsx`
- `components/business/wizard/StepWebsite.tsx`
- `components/business/wizard/StepDomain.tsx`
- `components/business/wizard/StepContact.tsx`
- `components/business/wizard/StepConfirm.tsx`
- `components/business/wizard/AestheticCard.tsx` — used inside StepWebsite
- `components/business/wizard/SummaryRow.tsx` — used inside StepConfirm + dashboard
- `components/business/dashboard/BusinessPlaceholderDashboard.tsx`
- `lib/business-intake-store.ts`

**Modified (minimal):**
- `app/pricing/PricingContent.tsx` — add `productLine === 'business'` branch in `handleOrgCreated` (appends `&intake=business` to the checkout URL)
- `app/checkout/page.tsx` — on successful payment, if `intake === 'business'`, redirect to `/business/setup?org_id=<id>&plan_code=<code>` instead of the DNS destination

**Untouched (guaranteed):**
- `lib/subscription-store.ts`
- DNS plan success path in checkout
- `AddOrganizationModal`
- `lib/plans-config.ts` (the `BUSINESS_PLAN_FEATURES` block is already there and is read — not written — by the wizard's Confirm step)
- All other pricing-page sections (DNS monthly, lifetime, FAQ)

## Testing approach

- **Manual browser test** of both flows end-to-end: DNS starter → unchanged happy path; business starter → wizard → placeholder dashboard
- **Per-step unit-ish tests** with Vitest + React Testing Library for each `Step*` component: renders, defaults set, edits propagate to store
- **Store tests** for `business-intake-store`: init, update patches deep-merge, `complete` sets timestamp, persist round-trip
- **Regression check:** DNS starter monthly plan completes checkout and lands where it used to land

## Open risks / follow-ups

1. `/checkout` success handler may not currently pass through custom redirect destinations. If it hard-codes the next route, we need to make that conditional — small change but worth auditing during implementation.
2. `BUSINESS_PLAN_FEATURES` is currently a static map in `lib/plans-config.ts`. If/when plans move fully into the DB, the wizard's Confirm step needs to read from the same source as the pricing card — not diverge.
3. Zustand persistence is per-browser. A user who pays on one device and opens the dashboard on another will not see their in-progress wizard. Acceptable in mock phase; must be replaced with a DB-backed intake record when provisioning goes real.
4. Forced-wizard guard is client-only this pass. A determined user could hand-navigate around it. Fine for a mock, insufficient for production — the real guard will be server-side.
