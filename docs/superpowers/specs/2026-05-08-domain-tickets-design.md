# Domain Page Tickets — Design

Covers JAV-100, JAV-101, JAV-102, JAV-103. JAV-100 references the existing
`2026-04-10-domain-renewal-billing-design.md` spec; the other three share the
domain detail page and OpenSRS service and are designed together here.

## Tickets

| ID | Title | Stream |
|---|---|---|
| JAV-100 | Auto-renew not charging customers | A — billing |
| JAV-101 | Display domain transfer (EPP/auth) code on detail page | B — detail page |
| JAV-102 | Transfer status not updating despite successful transfer | B — detail page |
| JAV-103 | Display registrant verification status on detail page | B — detail page |

## Stream A — JAV-100 (Auto-renew billing)

Implement the existing pre-charge billing spec at
`docs/superpowers/specs/2026-04-10-domain-renewal-billing-design.md` as written.
This design adds:

- A small UI surface on the domain detail page surfacing an upcoming pre-charge
  invoice (see Stream B → frontend → Renewal section).
- The migration shown below to create `domain_renewal_invoices`.

No revisions to the underlying billing approach.

## Stream B — JAV-101 / 102 / 103

### Architecture

- **Backend:** new helpers in `javelina-backend/src/services/opensrs.ts`, new
  endpoints in `domainsController.ts` and `routes/domains.ts`, new
  reconciliation job in `src/jobs/domain-sync.ts`.
- **Frontend:** new "Transfer & Verification" card on
  `javelina/app/domains/[id]/page.tsx`, new `domainsApi` methods in
  `lib/api-client.ts`, extended types in `types/domains.ts`.
- **Sync:** detail-page load fires a debounced sync; an hourly cron reconciles
  any `transferring` row not synced in the last 50 minutes.

### Backend — OpenSRS helpers (`services/opensrs.ts`)

```ts
export async function getDomainAuthCode(domain: string):
  Promise<{ success: boolean; auth_code?: string; error?: string }>;

export async function getTransferState(domain: string):
  Promise<{ state: 'transferring' | 'completed' | 'cancelled' | 'failed'; raw?: string }>;

export async function getRegistrantVerificationStatus(domain: string):
  Promise<{ verified: boolean; deadline?: string; email?: string; error?: string }>;

export async function resendVerificationEmail(domain: string):
  Promise<{ success: boolean; error?: string }>;
```

The exact OpenSRS action names are confirmed during implementation against the
reseller API docs; helper signatures are stable.

### Backend — endpoints

| Method | Path | Purpose | Ticket |
|---|---|---|---|
| `POST` | `/api/domains/:id/auth-code` | Returns `{ auth_code }`. Sensitive — POST, never cached. | JAV-101 |
| `POST` | `/api/domains/:id/sync` | Force refresh of status/expiry/verification from OpenSRS. | JAV-102 |
| `GET`  | `/api/domains/:id/verification` | Returns `{ verified, deadline, email }` from cached columns. | JAV-103 |
| `POST` | `/api/domains/:id/verification/resend` | Triggers OpenSRS to re-send verification email. | JAV-103 |

All require auth and an ownership check (existing pattern in
`domainsController.ts`).

### Backend — augmented endpoint

`GET /api/domains/:id/management` (powering the detail page) is extended to
return:

- `verification?: { verified, deadline, email }` — only for transfer-type
  domains.
- `upcoming_renewal_invoice?: { amount, currency, due_date, status }` — joins
  `domain_renewal_invoices` so the page can show "Auto-renewal payment of
  $X.XX scheduled for [date]" without an extra round-trip.

### Backend — reconciliation logic

**On-view sync** (`POST /:id/sync`):
1. If `last_synced_at` is within 60 seconds, skip.
2. If `status === 'transferring'`: call `getTransferState`. On `completed`,
   set `status='active'` and refresh `expires_at`, `registered_at`,
   `nameservers` via `getDomainInfo`.
3. If `registration_type === 'transfer'`: call
   `getRegistrantVerificationStatus`; update `registrant_verified` and
   `registrant_verification_deadline`.
4. Update `last_synced_at = now()`.
5. Return `{ synced: true, changed: <bool> }`.

**On OpenSRS unreachable:** return `{ synced: false }` and the cached row.
The page must never fail because of a sync error.

**Hourly cron** (`src/jobs/domain-sync.ts`):
- `SELECT id, domain_name FROM domains WHERE status = 'transferring' AND
  (last_synced_at IS NULL OR last_synced_at < now() - interval '50 minutes')`
  (uses the partial index in migration 2).
- For each row, run the same logic as on-view sync.
- Triggered the same way as the JAV-100 billing job (Railway cron or pg_cron
  hitting an internal authenticated endpoint) for consistency.

### Backend — JAV-100 file changes (per existing spec)

- New: `src/jobs/domain-renewal-billing.ts`.
- Modified: `src/controllers/stripeController.ts` — handle `invoice.paid` and
  `invoice.payment_failed` filtered on `metadata.type === 'domain_renewal'`.
  On failure, call `setAutoRenew(domain, false)` and flip `domains.auto_renew`.

### Backend — error handling, logging, audit

- All new OpenSRS calls return `{ success, error }` objects, never throw to the
  controller.
- Auth-code retrieval and verification-resend each write an `audit_logs` row
  (`domain.auth_code_revealed`, `domain.verification_resent`) — sensitive
  actions need a trail.
- Sync operations log to console only.
- Auth-code endpoint returns generic 502 on OpenSRS failure; never leaks
  upstream error text.

### Frontend — new "Transfer & Verification" card

Placed on `app/domains/[id]/page.tsx` directly after the Domain Settings card.
Contents are conditional; if neither section applies the card is not rendered.

**Transfer code section** (when `registration_type !== 'linked'` and
`status === 'active'`):
- Heading: "Transfer this domain away".
- Description: "If you're moving this domain to another registrar, you'll
  need an authorization code (EPP code)."
- Button "Reveal transfer code" → calls `POST /:id/auth-code` → replaces
  button with monospace code + copy button + "Hide" link. Auto-hides after
  60 seconds.
- If `domainLocked === true`, button is disabled with helper text: "Disable
  Domain Lock above to retrieve your transfer code."

**Verification section** (when `registration_type === 'transfer'`):
- Heading: "Registrant Verification".
- Status pill: green "Verified" / yellow "Pending verification" / red
  "Verification expired".
- Pending text: "Verification email sent to **[email]**. Verify by
  **[deadline]** or your domain may be suspended."
- Button "Resend verification email" → calls
  `POST /:id/verification/resend`; toast on success.

### Frontend — sync-on-load

Inside `loadData`, after `getManagement`, fire `POST /:id/sync`
fire-and-forget. If the response indicates a status change, refetch
`getManagement` and toast: "Transfer complete — your domain is now active."
This is the user-facing fix for JAV-102.

### Frontend — JAV-100 surface

In the existing Renewal section, when `upcoming_renewal_invoice` is present:

> Auto-renewal payment of **$X.XX** scheduled for **[date]**.

(Status-aware text if `failed` or `paid`.)

### Frontend — domains list

`components/domains/DomainsList.tsx`: when a row's `status === 'transferring'`,
fire `POST /:id/sync` once per session per domain (debounced via a
`useRef` Set) so the list view stays current without polling.

### Frontend — types and api-client

```ts
// types/domains.ts (additions)
export interface DomainAuthCodeResponse { auth_code: string; }
export interface DomainVerification { verified: boolean; deadline?: string; email?: string; }

// DomainManagementResponse gains:
verification?: DomainVerification;
upcoming_renewal_invoice?: {
  amount: number;
  currency: string;
  due_date: string;
  status: 'pending' | 'paid' | 'failed';
};

// Domain gains (from DB columns):
last_synced_at?: string;
registrant_verified?: boolean;
registrant_verification_deadline?: string;
```

```ts
// lib/api-client.ts (additions)
domainsApi.getAuthCode(id)         // POST /:id/auth-code
domainsApi.syncDomain(id)          // POST /:id/sync
domainsApi.getVerification(id)     // GET  /:id/verification
domainsApi.resendVerification(id)  // POST /:id/verification/resend
```

### Frontend — UX details

- Auth-code reveal reuses the existing `NsCopyButton` clipboard pattern
  (check-mark feedback).
- Buttons reuse the existing `Button` component's disabled+spinner pattern
  used by the renewal/lock toggles.
- Errors use `useToastStore.addToast('error', ...)`.
- Tailwind tokens only (`orange`, `orange-dark`, etc.). No new colors.
- No new dependencies. No new global state. No React Query introduced.

## Database changes

The user applies migrations manually. Schema verified against the dev branch
(project ref `ipfsrbxjgewhdcvonrbo`) on 2026-05-08.

### Migration 1 — `<timestamp>_create_domain_renewal_invoices.sql` (JAV-100)

```sql
CREATE TABLE public.domain_renewal_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_invoice_id text,
  amount numeric(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','cancelled')),
  renewal_period_start timestamptz,
  renewal_period_end timestamptz,
  due_date timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_domain_renewal_invoices_domain_id
  ON public.domain_renewal_invoices(domain_id);
CREATE INDEX idx_domain_renewal_invoices_user_id
  ON public.domain_renewal_invoices(user_id);
CREATE UNIQUE INDEX idx_domain_renewal_invoices_stripe_id
  ON public.domain_renewal_invoices(stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

ALTER TABLE public.domain_renewal_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own renewal invoices"
  ON public.domain_renewal_invoices
  FOR SELECT
  USING (auth.uid() = user_id);

-- Writes are performed by the service role from the backend job.
```

### Migration 2 — `<timestamp>_add_domain_sync_and_verification_columns.sql` (JAV-102 + JAV-103)

```sql
ALTER TABLE public.domains
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN registrant_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN registrant_verification_deadline timestamptz;

CREATE INDEX idx_domains_status_synced
  ON public.domains(status, last_synced_at)
  WHERE status = 'transferring';
```

### Not migrated

JAV-101 stores nothing — auth/EPP codes are fetched live and never persisted.

## Testing

- **Backend unit:** new OpenSRS helpers (mock `sendRequest`), controller
  ownership checks, error paths, sync logic state transitions.
- **Frontend unit:** extend `app/domains/__tests__/DomainsPage.test.tsx`
  for new card's conditional rendering and the auth-code reveal flow.
- **Manual smoke:**
  - Active registered domain → click reveal → code shows, copies, hides.
  - Locked domain → reveal button disabled with helper text.
  - Transfer-in domain → status pill correct; resend triggers toast.
  - `transferring` domain → on page load status flips to active when OpenSRS
    confirms completion; toast appears.

## Edge cases

- Linked domains: no transfer code section, no verification section.
- OpenSRS down during sync: page renders with cached data and a `synced:false`
  flag; no error surfaced to the user.
- Auth-code button clicked rapidly: backend rate-limited via existing
  `rate_limits` table pattern (1 call per 10s per domain).
- Verification deadline already passed: pill shows red "Verification expired";
  resend still allowed (OpenSRS may or may not accept).
- Multi-year transfer reaches `expires_at` while still verifying: out of scope;
  the existing renewal job handles it.

## Out of scope

- Verification warning emails (planned for the same cron once verification
  state is cached — but the email work itself is a follow-up ticket).
- Automatic re-sync from OpenSRS webhooks (we poll instead; webhooks can be
  added later without schema changes).
- Multi-year auto-renewal billing (per the JAV-100 spec, 1-year only at
  first).
