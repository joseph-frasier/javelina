# Domains: Org Scoping (User → Organization)

**Status:** Proposal / not started — reference doc for a future switch
**Backend Status:** Pending (requires coordinated changes in `javelina-backend`)
**Date:** 2026-07-08
**Branch:** `domains/quality-of-life`

## Motivation

Feedback: domains should be owned by **organizations**, not individual users. Today
a domain belongs to a single `profiles` row (`domains.user_id`). We want a domain to
belong to an org so any member (per role) can manage it, billing attaches to the org,
and the business/org UI can list a real set of org-owned domains instead of the
current client-side hack.

The overall change is **medium difficulty**: additive DB column + backfill, a
mechanical (but high-count) backend authorization rewrite, and a frontend change that
includes one genuine UX decision. The org infrastructure to copy already exists.

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
1. New migration: `ALTER TABLE public.domains ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;`
2. Backfill (see below), then `SET NOT NULL` + `CREATE INDEX idx_domains_organization_id`.
3. Rewrite the 4 domains RLS policies to membership-based (copy zones), deciding which
   write ops require `role IN ('SuperAdmin','Admin','Editor')`.
4. (Optional, for consistency) same treatment for `ssl_certificates` and
   `domain_renewal_invoices`.

### Backend (`javelina-backend`)
1. Add `organization_id` to `CreateDomainRecordParams` + insert (`domain-helpers.ts:3-46`).
2. Set + validate org on the write paths: `createDomainCheckout` (`:245-284`) and
   `linkDomain` (`:714-727`) must **accept and membership-check an `org_id`** from the
   request (mirror `mailboxController.enableEmail`, which already requires `org_id`).
   Add it to Stripe metadata.
3. Change list scoping: `getUserDomains` → org-membership join like zones
   (`zonesController.ts:58-96` is the template); `listDomains` handler.
4. Replace the ~16 inline `domain.user_id !== userId` checks (14 in `domainsController`,
   2 in `mailboxController`) with an org-membership check via `hasOrgRole(...)`. Extract
   a shared helper (e.g. `getDomainForOrgMember`) since the pattern is copy-pasted.
5. Fix the `unlinkDomain` delete filter (`:1134-1138`) to scope by org.
6. Simplify owner-derived billing/renewal paths to use the new direct
   `organization_id` instead of deriving org from `user_id`.
7. Update tests: `domainEditLock.test.ts`, `domainRenewal.test.ts`,
   `mailboxController.test.ts`.

### Frontend (this repo)
1. Replace the client-side name-match filter in `app/business/[orgId]/domains/page.tsx:74-76`
   (and the workaround in `lib/api/domains.ts:29-31`) with a real org-scoped fetch
   (`GET /domains?org_id=…` or `listByOrg`).
2. **Add an org concept/selector to the personal `app/domains/page.tsx`** — it has none
   today. (This is the main UX decision — see Open Decisions.)
3. Thread `org_id` into `domainsApi.list` / `checkout` / `link` (`lib/api-client.ts:1458-1521`).
   Org context is already available (`hierarchy-store.currentOrgId`, `[orgId]` param,
   `auth-store.user.organizations`; `mailboxApi.enable` already passes `orgId`).

---

## Migration / backfill

Every existing customer with a domain is believed to have exactly one straightforward
org. Backfill maps each domain's owner to that owner's org membership:

```sql
-- 1. Add column
ALTER TABLE public.domains
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Backfill from the owner's org membership
UPDATE public.domains d
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = d.user_id;

-- 3. After verifying every domain got exactly one org:
ALTER TABLE public.domains ALTER COLUMN organization_id SET NOT NULL;
CREATE INDEX idx_domains_organization_id ON public.domains(organization_id);
```

This mirrors the zones backfill (`20251205000000_remove_environments.sql:12-19`), joining
through membership instead of environments.

### Pre-flight validation (READ-ONLY — run before writing the migration)
Because `organization_members` PK is `(organization_id, user_id)`, a user *can* have
multiple memberships; the naive backfill would multi-match and pick nondeterministically,
and users with zero memberships would be left NULL and fail `SET NOT NULL`. Confirm the
"one org per domain owner" invariant first:

```sql
-- Expect ZERO rows. Any row = a domain owner needing a manual org mapping rule.
SELECT user_id, count(*)
FROM organization_members
WHERE user_id IN (SELECT user_id FROM domains)
GROUP BY user_id
HAVING count(*) <> 1;
```

Fallback backfill source if some owners are ambiguous: the derived zone match
(`zones.name = domains.domain_name → zones.organization_id`).

---

## Open decisions / risks

1. **Multi-org ambiguity** (data correctness). The clean `NOT NULL` backfill depends on
   the pre-flight returning zero rows. Decide a disambiguation rule for any exceptions.
2. **Create-time org selection** (API contract change). Registering/linking must now
   specify which org owns the domain. The register/checkout/link endpoints and the
   personal `/domains` UI must send an `org_id` (mirror mailbox-enable). This is the one
   new bit of product design.
3. **Personal `/domains` page UX.** It has no org concept today. Decide whether it keeps
   existing (with an org selector) or folds into the per-org business view. This is the
   biggest single unknown.
4. **Role gating.** Decide which org roles may view vs. edit vs. unlink a domain (Viewer
   read-only? Editor can change nameservers? Admin-only for transfer/unlink?).
5. **`user_id` semantics.** Keep it as "registered by" (creator/audit) rather than
   dropping it, so history and owner-email fallbacks still work.
6. **Related tables.** Decide whether `ssl_certificates` / `domain_renewal_invoices` move
   to org scope in the same change or later.

---

## Effort estimate

Roughly **a few days for one engineer** end-to-end. The migration/backfill and the
create-time org-selection contract dominate; the ~16 authorization rewrites are
high-count but mechanical and low-risk given the existing zone/RBAC template.

## Out of scope
- Actually applying any migration or DB change (this doc is a plan only).
- Search indexing of domains (domains are not in universal search today).
- Any change to the OpenSRS integration itself.
