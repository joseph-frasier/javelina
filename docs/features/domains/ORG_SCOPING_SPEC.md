# Domains: Org Scoping (User → Organization)

**Status:** Approved — ready for implementation (expand phase only; see Migration Strategy)
**Backend Status:** Pending (requires coordinated changes in `javelina-backend`)
**Date:** 2026-07-08 (decisions resolved 2026-07-10)
**Branch:** `domains/quality-of-life`

## Approach: expand now, backfill later (expand/contract)

Dev accounts belong to multiple orgs and the production owner→org mapping must be
determined by hand against the real dataset, so there is **no reliable automated
backfill**. This change therefore ships only the **expand** phase to the local branch +
dev DB: add a nullable `organization_id`, make new domains org-scoped at creation, and
authorize by org membership **with a legacy `user_id` fallback** so existing (un-backfilled)
domains keep working unchanged. The data backfill, `SET NOT NULL`, and removal of the
fallback are a **separate later effort** against production (see "Deferred — later effort").

## Motivation

Feedback: domains should be owned by **organizations**, not individual users. Today
a domain belongs to a single `profiles` row (`domains.user_id`). We want a domain to
belong to an org so any member (per role) can manage it, billing attaches to the org,
and the business/org UI can list a real set of org-owned domains instead of the
current client-side hack.

The overall change is **medium difficulty**: an additive nullable DB column (no backfill
in this phase), a mechanical (but high-count) dual-mode backend authorization rewrite, and
a frontend change with an org picker. The org infrastructure to copy already exists.

---

## Current state (user-scoped)

### DB (migrations in this repo, `supabase/migrations/`)
- `domains` table created in `20260316000000_create_domains_table.sql`.
  - Ownership column: `user_id uuid not null references public.profiles(id) on delete cascade` (line 6). **No `organization_id`.** The header comment (line 2) explicitly states domains are user-scoped.
  - Later ALTERs add unrelated columns only (`20260318…` registration type; `20260508…` sync/verification; `20260528…` dkim) — none add an org column.
- **RLS**: 4 policies, all `auth.uid() = user_id` (SELECT/INSERT/UPDATE) + a service-role FOR ALL policy (`20260316000000_create_domains_table.sql:74-94`). No DELETE policy (unlink goes through the backend service role).
- Related user-scoped tables that likely want the same treatment for consistency:
  - `ssl_certificates.user_id → profiles(id)`, RLS by `auth.uid()` (`20260323000000_create_ssl_certificates_table.sql:6,90-100`).
  - `domain_renewal_invoices.user_id → auth.users(id)` (note: still references `auth.users`, not `profiles`) (`20260508000001_create_domain_renewal_invoices.sql:7,34-37`).
  - `domain_mailboxes.domain_id → domains(id)` — inherits scope via the domain (`20260409000000_create_mailbox_tables.sql:20`).

### Backend (`javelina-backend`, separate repo)
- Every `/domains` route uses the `authenticate` middleware; `req.user.id` resolves to `profiles.id` for both the session-cookie and Auth0-bearer paths (`src/middleware/auth.ts:125-307`).
- Ownership of a specific domain is enforced **inline** in each handler: `getDomainById(id)` then `if (!domain || domain.user_id !== userId) → 404`. This pattern is repeated in **~14 handlers** in `src/controllers/domainsController.ts` (lines `563, 610, 762, 787, 915, 968, 1022, 1075, 1120, 1183, 1455, 1487, 1515, 1572`) plus the `unlinkDomain` delete filter `.eq("user_id", userId)` (`1134-1138`).
- A **second controller** repeats the pattern for mailbox routes: `getDomainForUser` / DKIM variant (`src/controllers/mailboxController.ts:77-86, 848-857`).
- List: `getUserDomains(userId)` → `.eq("user_id", userId)` (`src/utils/domain-helpers.ts:104-117`); handler `listDomains` (`domainsController.ts:650-663`).
- Write paths that set the owner: `createDomainCheckout` and `linkDomain` both call `createDomainRecord({ user_id: userId, … })` (`domain-helpers.ts:19-46`; `domainsController.ts:245-256, 714-727`); `user_id` also flows into Stripe session metadata.
- Owner-derived side paths: renewal billing resolves org via `subscriptions.org_id` keyed off `domain.user_id` (`src/jobs/domain-renewal-billing.ts:98-124,148`); billing portal already falls back to the user's org Stripe customer (`domainsController.ts:1584-1607`); owner email fallback (`src/utils/domain-recipient.ts:8-23`).

### Frontend (`javelina`)
Two separate domain surfaces exist:
- **Personal**: `app/domains/page.tsx` → `components/domains/MyDomainsContent.tsx:29` → `domainsApi.list()` (`lib/api-client.ts:1477`, `GET /domains`). **No org concept at all.**
- **Business/org**: `app/business/[orgId]/domains/page.tsx` fetches *all* the user's domains and **filters client-side by name-matching** the org's intake-recorded domain (`:74-76`). The workaround is documented in `lib/api/domains.ts:29-31`: *"The domains table has no organization_id column, so callers wanting to scope to an org must filter client-side…"*.
- Domain→org is currently **derived, not stored**: `getManagement` returns a `zone` object carrying `organization_id`/`organization_name` (`types/domains.ts:138-143`), matched from a `zones` row (a zone is org-scoped). This is nullable and fragile (depends on a name-matched zone existing).

---

## Proposed change (org-scoped)

Add `domains.organization_id` as the authoritative owner, mirroring the **zones** model
(`zones.organization_id`, membership-based RLS — see the template migration
`20251205000000_remove_environments.sql`). Keep `user_id` as "who registered it"
(historical/creator), but scope access and billing by org.

**Expand-phase difference vs. zones:** the zones migration added the column, backfilled,
and set `NOT NULL` in one shot. We cannot backfill reliably (see Approach), so in this
change `organization_id` stays **nullable** and every authorization rule is **dual-mode**:
org membership when `organization_id` is set, else the legacy `user_id = auth.uid()` check
when it is `NULL`. New domains are always created with a non-NULL `organization_id`, so
NULL means "legacy, not yet backfilled". The `NOT NULL` tightening and fallback removal
come later (Deferred).

### Template to copy
The zones table did this exact move when environments were removed:
`20251205000000_remove_environments.sql` — add column, backfill from the old relation,
`SET NOT NULL`, index, and rewrite RLS to membership-based, e.g.:
```sql
CREATE POLICY "Users can view zones in their organizations"
  ON public.zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = zones.organization_id AND om.user_id = auth.uid()));
```
Write policies additionally gate on `om.role IN ('SuperAdmin','Admin','Editor')`.

### Org data model (what we scope to)
- `organizations` and `organization_members(organization_id, user_id, role)` with
  composite PK `(organization_id, user_id)` — **a user CAN belong to multiple orgs**
  (`20250101000000_base_schema.sql:49-70`; FKs repointed to `profiles` in
  `20260128000001_refactor_fks_to_profiles.sql`).
- Roles: `SuperAdmin | Admin | Editor | Viewer`.
- No DB "current org"; the frontend tracks it via `hierarchy-store.currentOrgId`
  (`lib/stores/hierarchy-store.ts:5`), the `[orgId]` route param, and
  `auth-store.user.organizations`.
- Backend RBAC helpers already exist to enforce this: `getUserOrgRole`, `hasOrgRole`,
  `requireOrgRole`, `requireOrgMember` (`src/middleware/rbac.ts`).

---

## Change surface

### DB (this repo)
1. New migration: `ALTER TABLE public.domains ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;` — **nullable, no backfill, no `NOT NULL`.** (`ON DELETE SET NULL` rather than `CASCADE`: deleting an org should not delete legacy domain rows.)
2. `CREATE INDEX idx_domains_organization_id ON public.domains(organization_id);`
3. Rewrite the 4 domains RLS policies to **dual-mode** (copy zones membership pattern, add the legacy fallback), with the agreed role gating:
   - **SELECT**: any org member of `organization_id`, OR (`organization_id IS NULL` AND `user_id = auth.uid()`).
   - **INSERT/UPDATE**: `role IN ('SuperAdmin','Admin','Editor')` for the row's org, OR the NULL-org legacy fallback.
   - **Unlink/transfer** are enforced in the backend service-role path (no DELETE RLS policy today); gate those to `SuperAdmin/Admin` there.
4. **SSL certificates: out of scope entirely** — `ssl_certificates` is deprecated (not developed, never exposed to end users) and is NOT touched now or later.

### Backend (`javelina-backend`)
1. Add `organization_id` to `CreateDomainRecordParams` + insert (`domain-helpers.ts:3-46`).
2. Set + validate org on the write paths: `createDomainCheckout` (`:245-284`) and
   `linkDomain` (`:714-727`) must **accept and membership-check an `org_id`** from the
   request (mirror `mailboxController.enableEmail`, which already requires `org_id`).
   Add it to Stripe metadata.
3. Change list scoping: `listDomains` accepts `org_id` and returns that org's domains
   (membership-checked, org-join like zones — `zonesController.ts:58-96` is the template),
   **plus** the caller's own legacy NULL-org domains during the transition.
4. Replace the ~16 inline `domain.user_id !== userId` checks (14 in `domainsController`,
   2 in `mailboxController`) with a single shared **dual-mode** helper
   (e.g. `getDomainForOrgMember(domainId, userId, requiredRole)`): if the domain has an
   `organization_id`, enforce `hasOrgRole(...)` with the agreed gating (view=any member,
   edit=SuperAdmin/Admin/Editor); if `organization_id IS NULL`, fall back to
   `domain.user_id === userId`. 404 otherwise.
5. Fix the `unlinkDomain` delete filter (`:1134-1138`): scope by org membership
   (`SuperAdmin/Admin`) when org-scoped, else the legacy `user_id` filter. Same dual-mode.
6. **Renewal billing → org's default payment method.** The org is the Stripe customer, so
   when `domain.organization_id` is set, resolve the org's Stripe customer directly from
   the domain and bill its default payment method (`domain-renewal-billing.ts:98-124,148`).
   When `organization_id IS NULL` (legacy), keep today's `user_id → subscriptions.org_id`
   derivation as the fallback.
7. Update tests: `domainEditLock.test.ts`, `domainRenewal.test.ts`,
   `mailboxController.test.ts` — cover both org-scoped and legacy NULL-org paths.

### Frontend (this repo)
1. Replace the client-side name-match filter in `app/business/[orgId]/domains/page.tsx:74-76`
   (and the workaround in `lib/api/domains.ts:29-31`) with a real org-scoped fetch
   (`GET /domains?org_id=…` or `listByOrg`).
2. **Add an org dropdown to the personal `app/domains/page.tsx`** (decision resolved).
   The page keeps its own surface but gains a dedicated org picker; the selected org
   drives `GET /domains?org_id=…`. Default the selection sensibly (e.g. `currentOrgId`
   from `hierarchy-store`, falling back to the user's first org). Gate action buttons
   (edit nameservers, unlink/transfer) by the user's role in the selected org.
3. Thread `org_id` into `domainsApi.list` / `checkout` / `link` (`lib/api-client.ts:1458-1521`).
   Org context is already available (`hierarchy-store.currentOrgId`, `[orgId]` param,
   `auth-store.user.organizations`; `mailboxApi.enable` already passes `orgId`).

---

## Migration strategy

**No automated backfill in this change.** Dev accounts belong to multiple orgs, and the
production owner→org mapping is not mechanically derivable — it must be determined by hand
against the real dataset. So the expand phase adds the column and leaves existing rows
`NULL`; the dual-mode RLS/auth (org membership, else legacy `user_id`) keeps those rows
fully usable in the meantime. New domains are always created org-scoped and non-NULL.

The migration file therefore contains only the additive, safe steps:

```sql
-- Expand phase (this change): additive + nullable, NO backfill, NO NOT NULL
ALTER TABLE public.domains
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;
CREATE INDEX idx_domains_organization_id ON public.domains(organization_id);
-- + rewrite the 4 domains RLS policies to dual-mode (see DB change surface)
```

### Deferred — later effort (production dataset)
Tracked separately, NOT part of this change:
1. **Data backfill** — comb through production and assign each existing domain to the
   correct org (manual/curated; may draw on the derived `zones.name = domains.domain_name
   → zones.organization_id` match as a starting hint, verified by a human).
2. **`SET NOT NULL`** on `domains.organization_id` once every row is backfilled.
3. **Remove the legacy `user_id` fallback** from RLS and the `getDomainForOrgMember`
   helper (contract phase) — after which access is purely org-membership-based.

---

## Resolved decisions (2026-07-10)

1. **Backfill / multi-org ambiguity** — deferred. No automated backfill; column is nullable
   with a legacy `user_id` fallback. Production backfill is a later, manual effort.
2. **Create-time org selection** — register/checkout/link endpoints and the personal
   `/domains` UI must send an `org_id` (mirror mailbox-enable); membership-checked server-side.
3. **Personal `/domains` page UX** — keep the page, add a dedicated **org dropdown**; the
   selected org drives the fetch and role-gates the action buttons.
4. **Role gating** — view: any org member · edit nameservers/DNS/config:
   `SuperAdmin/Admin/Editor` · unlink/transfer: `SuperAdmin/Admin`. (Mirrors zones.)
5. **`user_id` semantics** — kept as "registered by" (creator/audit); also serves as the
   transition-period access fallback for NULL-org rows.
6. **Related tables** — `ssl_certificates`: **out of scope entirely** (deprecated, never
   user-exposed). `domain_renewal_invoices`: not re-scoped, but renewal **billing** now
   charges the org's default payment method (org = Stripe customer) resolved directly from
   `domain.organization_id`, with the legacy `user_id`-derived path as fallback for NULL-org.

---

## Effort estimate

Roughly **a few days for one engineer** for the expand phase. The create-time
org-selection contract and the dual-mode authorization rewrite dominate; the ~16
authorization rewrites are high-count but mechanical given the existing zone/RBAC template.
The deferred production backfill is separate and its cost depends on the dataset.

## Out of scope
- **Data backfill / `SET NOT NULL` / fallback removal** — deferred later effort against
  the production dataset (see Migration strategy).
- **`ssl_certificates`** — deprecated; not touched now or later.
- Search indexing of domains (domains are not in universal search today).
- Any change to the OpenSRS integration itself.

## Execution order (this change)
Execute on the local `domains/quality-of-life` branch + **dev** DB
(`ipfsrbxjgewhdcvonrbo`) first — never prod. Prod ship + manual customer backfill happen
afterward as a separate step.
