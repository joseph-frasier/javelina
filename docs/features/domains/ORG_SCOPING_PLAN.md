# Domains Org-Scoping Implementation Plan (Expand Phase)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `organization_id` to domains and scope all access/billing by org, while keeping existing user-owned domains working via a legacy fallback — the safe "expand" half of an expand/contract migration.

**Architecture:** Additive, nullable `domains.organization_id` (no backfill, no `NOT NULL`). Every authorization decision is **dual-mode**: if the domain has an `organization_id`, enforce org membership (with role gating); if it's `NULL` (legacy, un-backfilled), fall back to `domain.user_id = auth.uid()`. New domains are always created org-scoped. Backend enforces access in application code via the service-role Supabase client; RLS is updated in parallel as defense-in-depth for direct/admin access.

**Tech Stack:** Supabase/Postgres migrations (frontend repo `javelina`), Express.js + TypeScript (`javelina-backend`), Next.js 15 / React 19 (`javelina`). Backend tests: Jest 29. Frontend tests: Vitest + @testing-library/react.

## Repos & branch

- **FE** = `/Users/sethchesky/Documents/GitHub/javelina` (Next.js; also holds `supabase/migrations/`)
- **BE** = `/Users/sethchesky/Documents/GitHub/javelina-backend` (Express API)
- Both are on branch **`domains/quality-of-life`** (local; do not push/set upstream).

## Global Constraints

- **Nullable column, no backfill, no `NOT NULL`** in this phase. `ON DELETE SET NULL` (not CASCADE).
- **Dual-mode everywhere:** org membership when `organization_id` set, else legacy `user_id` fallback.
- **Role gating (mirrors zones):** view = any org member (`SuperAdmin/Admin/BillingContact/Editor/Viewer`); edit nameservers/DNS/config/renew = `SuperAdmin/Admin/Editor`; unlink/transfer = `SuperAdmin/Admin`.
- **SSL certificates: out of scope** — do not touch `ssl_certificates`.
- **Renewal billing** charges the org's Stripe customer (default payment method) directly from `domain.organization_id` when set; legacy `user_id → subscriptions.org_id` path stays as fallback.
- **Keep `user_id`** on domains as "registered by" / transition fallback — never drop it in this phase.
- Backend uses the **service-role** client (`supabaseAdmin`), so RLS does not enforce these paths — application-code checks are the real gate.
- **Deferred (NOT in this plan):** production data backfill, `SET NOT NULL`, removing the `user_id` fallback.
- Execute on the local branch + **dev** DB (`ipfsrbxjgewhdcvonrbo`) first — never prod. Conventional Commits, no emojis.

---

## File Structure

**FE — DB**
- Create: `supabase/migrations/20260710000000_domains_add_organization_id.sql` — add column, index, dual-mode RLS.

**BE**
- Modify: `src/utils/domain-helpers.ts` — `organization_id` on create params/insert; new `userCanAccessDomain`, `getDomainForOrgMember`, `getDomainsForUserAndOrg`; role constants.
- Modify: `src/controllers/domainsController.ts` — convert inline `user_id` guards; org-aware `createDomainCheckout`, `linkDomain`, `listDomains`, `unlinkDomain`, `createDomainBillingPortal`.
- Modify: `src/controllers/mailboxController.ts` — `getDomainForUser` / `getDomainWithDkim` dual-mode.
- Modify: `src/jobs/domain-renewal-billing.ts` — resolve org/customer from `domain.organization_id`.
- Modify: `src/routes/domains.ts` — require org role on checkout/link.
- Modify/Create tests under `src/__tests__/` and `src/controllers/__tests__/`.

**FE — app**
- Modify: `lib/api-client.ts` — thread `org_id` into `domainsApi.list/checkout/link`.
- Modify: `types/domains.ts` — `org_id` on `DomainCheckoutParams`; `organization_id` on `Domain`.
- Modify: `lib/api/domains.ts` — `listUserDomains(orgId)` server action hits real `org_id` query.
- Modify: `app/business/[orgId]/domains/page.tsx` — drop client-side name-match, fetch by org.
- Create: `components/domains/OrgSelect.tsx` — small org dropdown.
- Modify: `components/domains/MyDomainsContent.tsx` — org dropdown drives the list; role-gate link.
- Modify: `app/domains/page.tsx` — thread selected org into checkout.
- Tests mirror source under `tests/`.

---

# PHASE A — Database (FE repo)

### Task 1: Migration — add nullable `organization_id`, index, dual-mode RLS

**Files:**
- Create: `supabase/migrations/20260710000000_domains_add_organization_id.sql`

**Interfaces:**
- Produces: `public.domains.organization_id uuid NULL`; RLS policies named `"Members can view org or own domains"`, `"Members can insert org or own domains"`, `"Members can update org or own domains"` (replacing the 4 legacy policies); the pre-existing `"Service role full access"` policy is preserved.

- [ ] **Step 1: Write the migration file**

```sql
-- 20260710000000_domains_add_organization_id.sql
-- Expand phase of user->org scoping for domains.
-- Nullable column, NO backfill, NO NOT NULL. organization_id NULL == legacy (pre-org) row.
-- Dual-mode RLS: org membership when organization_id is set, else legacy user_id fallback.

-- 1. Additive nullable column. SET NULL (not CASCADE): deleting an org must not delete legacy domains.
alter table public.domains
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null;

-- 2. Index for the new access path.
create index if not exists idx_domains_organization_id
  on public.domains(organization_id);

-- 3. Replace the 4 user-scoped policies with dual-mode ones. Keep "Service role full access".
drop policy if exists "Users can view own domains"   on public.domains;
drop policy if exists "Users can insert own domains"  on public.domains;
drop policy if exists "Users can update own domains"  on public.domains;

-- SELECT: any member of the domain's org, OR (legacy) the owner when org is NULL.
create policy "Members can view org or own domains"
  on public.domains for select
  using (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );

-- INSERT: SuperAdmin/Admin/Editor of the target org, OR (legacy) the owner when org is NULL.
create policy "Members can insert org or own domains"
  on public.domains for insert
  with check (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
          and om.role in ('SuperAdmin', 'Admin', 'Editor')
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );

-- UPDATE: SuperAdmin/Admin/Editor of the domain's org, OR (legacy) the owner when org is NULL.
create policy "Members can update org or own domains"
  on public.domains for update
  using (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
          and om.role in ('SuperAdmin', 'Admin', 'Editor')
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );
```

- [ ] **Step 2: Verify the SQL parses / dry-run locally**

If a local Supabase stack is available:
Run: `cd /Users/sethchesky/Documents/GitHub/javelina && supabase db reset --db-url "$LOCAL_DB_URL"` (or `supabase migration up` against a local instance).
Expected: migration applies with no error; `\d public.domains` shows `organization_id` and `idx_domains_organization_id`; `\d` policies list the three new names + `"Service role full access"`.

If no local stack, at minimum run a syntax check by piping the file through `psql --set ON_ERROR_STOP=1 -f <file>` against a scratch database, or lint with `supabase db lint`.

> NOTE: Applying to the **dev** project (`ipfsrbxjgewhdcvonrbo`) is an execution step done with the user in the loop, not part of writing/committing this migration. The connected Supabase MCP cannot reach dev; dev application requires the `supabase` CLI linked to dev or a `psql` dev connection string supplied by the user. Do NOT apply to production.

- [ ] **Step 3: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add supabase/migrations/20260710000000_domains_add_organization_id.sql
git commit -m "feat(db): add nullable domains.organization_id with dual-mode RLS"
```

---

# PHASE B — Backend (`javelina-backend`)

### Task 2: `domain-helpers` — org column + shared dual-mode access helpers

**Files:**
- Modify: `src/utils/domain-helpers.ts`
- Test: `src/__tests__/utils/domain-helpers.access.test.ts` (create)

**Interfaces:**
- Produces:
  - `CreateDomainRecordParams.organization_id?: string`
  - `DOMAIN_VIEW_ROLES`, `DOMAIN_EDIT_ROLES`, `DOMAIN_ADMIN_ROLES: string[]`
  - `userCanAccessDomain(domain: { organization_id: string | null; user_id: string }, userId: string, allowedRoles: string[]): Promise<boolean>`
  - `getDomainForOrgMember(domainId: string, userId: string, allowedRoles: string[]): Promise<any | null>`
  - `getDomainsForUserAndOrg(userId: string, orgId?: string): Promise<any[]>`
- Consumes: `hasOrgRole` from `../middleware/rbac`; existing `getDomainById`, `supabaseAdmin`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/utils/domain-helpers.access.test.ts
jest.mock("../../config/supabase", () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock("../../middleware/rbac", () => ({ hasOrgRole: jest.fn() }));

import { userCanAccessDomain, DOMAIN_EDIT_ROLES } from "../../utils/domain-helpers";
import { hasOrgRole } from "../../middleware/rbac";

const mockHasOrgRole = hasOrgRole as jest.Mock;

describe("userCanAccessDomain", () => {
  beforeEach(() => jest.clearAllMocks());

  it("legacy row (org NULL): true only for the owner, no rbac call", async () => {
    const domain = { organization_id: null, user_id: "user-1" };
    await expect(userCanAccessDomain(domain, "user-1", DOMAIN_EDIT_ROLES)).resolves.toBe(true);
    await expect(userCanAccessDomain(domain, "user-2", DOMAIN_EDIT_ROLES)).resolves.toBe(false);
    expect(mockHasOrgRole).not.toHaveBeenCalled();
  });

  it("org-scoped row: delegates to hasOrgRole with the org and allowed roles", async () => {
    mockHasOrgRole.mockResolvedValue(true);
    const domain = { organization_id: "org-1", user_id: "user-1" };
    await expect(userCanAccessDomain(domain, "user-9", DOMAIN_EDIT_ROLES)).resolves.toBe(true);
    expect(mockHasOrgRole).toHaveBeenCalledWith("user-9", "org-1", DOMAIN_EDIT_ROLES);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx jest src/__tests__/utils/domain-helpers.access.test.ts`
Expected: FAIL — `userCanAccessDomain`/`DOMAIN_EDIT_ROLES` not exported.

- [ ] **Step 3: Add the column to create params + insert**

In `src/utils/domain-helpers.ts`, add to `CreateDomainRecordParams` (after `user_id: string;`):

```ts
  organization_id?: string;
```

In `createDomainRecord`, add to the `.insert({ ... })` object (after `user_id: params.user_id,`):

```ts
      organization_id: params.organization_id,
```

- [ ] **Step 4: Add role constants + access helpers**

At the top of `src/utils/domain-helpers.ts`, add the import (below the existing supabase import on line 1):

```ts
import { hasOrgRole } from "../middleware/rbac";
```

Append these exports to the file:

```ts
// Role gating for domains (mirrors zones).
export const DOMAIN_VIEW_ROLES = ["SuperAdmin", "Admin", "BillingContact", "Editor", "Viewer"];
export const DOMAIN_EDIT_ROLES = ["SuperAdmin", "Admin", "Editor"];
export const DOMAIN_ADMIN_ROLES = ["SuperAdmin", "Admin"];

/**
 * Dual-mode access check. When the domain is org-scoped, require the given org
 * role; when it's a legacy (organization_id NULL) row, fall back to ownership.
 */
export async function userCanAccessDomain(
  domain: { organization_id: string | null; user_id: string },
  userId: string,
  allowedRoles: string[]
): Promise<boolean> {
  if (domain.organization_id) {
    return hasOrgRole(userId, domain.organization_id, allowedRoles);
  }
  return domain.user_id === userId;
}

/** Fetch a domain by id and return it only if the caller may access it (dual-mode). */
export async function getDomainForOrgMember(
  domainId: string,
  userId: string,
  allowedRoles: string[]
): Promise<any | null> {
  const domain = await getDomainById(domainId);
  if (!domain) return null;
  return (await userCanAccessDomain(domain, userId, allowedRoles)) ? domain : null;
}

/**
 * List domains visible to a caller. Always includes the caller's own rows
 * (covers legacy NULL-org domains); when orgId is given and the caller is a
 * member, also includes that org's domains. Deduped by id.
 */
export async function getDomainsForUserAndOrg(
  userId: string,
  orgId?: string
): Promise<any[]> {
  const own = await getUserDomains(userId);

  if (!orgId) return own;

  const isMember = await hasOrgRole(userId, orgId, DOMAIN_VIEW_ROLES);
  if (!isMember) return own;

  const { data: orgDomains, error } = await supabaseAdmin
    .from("domains")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch org domains: ${error.message}`);
  }

  const byId = new Map<string, any>();
  for (const d of [...(orgDomains || []), ...own]) byId.set(d.id, d);
  return Array.from(byId.values());
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx jest src/__tests__/utils/domain-helpers.access.test.ts`
Expected: PASS (both tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/utils/domain-helpers.ts src/__tests__/utils/domain-helpers.access.test.ts
git commit -m "feat(domains): add org column to create params and dual-mode access helpers"
```

---

### Task 3: Convert inline `user_id` guards in `domainsController` to dual-mode

**Files:**
- Modify: `src/controllers/domainsController.ts`
- Test: `src/__tests__/controllers/domainsAccess.test.ts` (create)

**Interfaces:**
- Consumes: `getDomainForOrgMember`, `DOMAIN_VIEW_ROLES`, `DOMAIN_EDIT_ROLES`, `DOMAIN_ADMIN_ROLES` (Task 2).
- Affects handlers: `getDomainDetails` (view), the edit handlers `updateContacts`/`updateNameservers`/`toggleAutoRenew`/`toggleDomainLock`/`renew` (edit), `createDomainBillingPortal` (view). `unlinkDomain` is Task 6.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/controllers/domainsAccess.test.ts
jest.mock("../../utils/domain-helpers", () => ({
  getDomainForOrgMember: jest.fn(),
  DOMAIN_VIEW_ROLES: ["view"],
  DOMAIN_EDIT_ROLES: ["edit"],
  DOMAIN_ADMIN_ROLES: ["admin"],
}));
jest.mock("../../config/supabase", () => ({ supabaseAdmin: { from: jest.fn() } }));

import { getDomainDetails } from "../../controllers/domainsController";
import { getDomainForOrgMember, DOMAIN_VIEW_ROLES } from "../../utils/domain-helpers";

const mockAccess = getDomainForOrgMember as jest.Mock;
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("getDomainDetails access", () => {
  beforeEach(() => jest.clearAllMocks());

  it("404s when the caller cannot access the domain", async () => {
    mockAccess.mockResolvedValue(null);
    const res = makeRes();
    await getDomainDetails({ params: { id: "d1" }, user: { id: "u1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("checks access with VIEW roles and returns the domain", async () => {
    const domain = { id: "d1", organization_id: "o1", user_id: "u9" };
    mockAccess.mockResolvedValue(domain);
    const res = makeRes();
    await getDomainDetails({ params: { id: "d1" }, user: { id: "u1" } } as any, res);
    expect(mockAccess).toHaveBeenCalledWith("d1", "u1", DOMAIN_VIEW_ROLES);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx jest src/__tests__/controllers/domainsAccess.test.ts`
Expected: FAIL — `getDomainDetails` still uses `getDomainById` + `domain.user_id !== userId` and calls the real (unmocked) helper.

- [ ] **Step 3: Update imports in `domainsController.ts`**

Where domain helpers are imported (lines 7-17), add:

```ts
  getDomainForOrgMember,
  DOMAIN_VIEW_ROLES,
  DOMAIN_EDIT_ROLES,
```

- [ ] **Step 4: Replace the view guard in `getDomainDetails` (lines ~758-766)**

Replace:

```ts
    const { id } = req.params;
    const userId = req.user!.id;

    const domain = await getDomainById(id);

    if (!domain || domain.user_id !== userId) {
      sendError(res, "Domain not found", 404);
      return;
    }
```

with:

```ts
    const { id } = req.params;
    const userId = req.user!.id;

    const domain = await getDomainForOrgMember(id, userId, DOMAIN_VIEW_ROLES);

    if (!domain) {
      sendError(res, "Domain not found", 404);
      return;
    }
```

- [ ] **Step 5: Convert every remaining inline guard, choosing the role set by operation**

First enumerate all remaining occurrences so none are missed:

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && grep -n "domain.user_id !== userId" src/controllers/domainsController.ts`

Replace each `const domain = await getDomainById(id);` + `if (!domain || domain.user_id !== userId) { ... 404 ... }` guard with the dual-mode form, picking the role constant per this mapping:

| Handler(s) | Operation | Role constant |
|---|---|---|
| `getDomainDetails`, `getDomainManagement` (`/:id/manage`), `getVerification`, `resendVerification`, `syncDomain`, `createDomainBillingPortal` | view / read | `DOMAIN_VIEW_ROLES` |
| `updateContacts`, `updateNameservers`, `toggleAutoRenew`, `toggleDomainLock`, `renew` | edit config | `DOMAIN_EDIT_ROLES` |
| `getAuthCode` (transfer-away) | transfer | `DOMAIN_ADMIN_ROLES` |

The replacement (substitute the right constant and the handler's id/userId variable names):

```ts
    const domain = await getDomainForOrgMember(id, userId, DOMAIN_EDIT_ROLES);
    if (!domain) {
      sendError(res, "Domain not found", 404);
      return;
    }
```

For `createDomainBillingPortal` the params/vars differ slightly (`const { id: domainId } = req.params;`):

```ts
  const domain = await getDomainForOrgMember(domainId, userId, DOMAIN_VIEW_ROLES);
  if (!domain) {
    sendError(res, "Domain not found", 404);
    return;
  }
```

Add `DOMAIN_ADMIN_ROLES` to the domain-helpers import block (used by `getAuthCode`). After editing, re-run the grep above and confirm **zero** remaining `domain.user_id !== userId` occurrences in `domainsController.ts` (except `unlinkDomain`, handled in Task 6).

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx jest src/__tests__/controllers/domainsAccess.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the existing edit-lock suite to confirm no regression**

Run: `npx jest src/__tests__/controllers/domainEditLock.test.ts`
Expected: it references `getDomainById`. Update its mocks: add `getDomainForOrgMember` to the `jest.mock("../../utils/domain-helpers", ...)` factory returning the same fixture the test currently returns from `getDomainById`, and set `DOMAIN_EDIT_ROLES`/`DOMAIN_VIEW_ROLES` to any array. Re-run until PASS.

- [ ] **Step 8: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git add src/controllers/domainsController.ts src/__tests__/controllers/domainsAccess.test.ts src/__tests__/controllers/domainEditLock.test.ts
git commit -m "feat(domains): dual-mode authorization for domain read/edit handlers"
```

---

### Task 4: Org-scoped `listDomains`

**Files:**
- Modify: `src/controllers/domainsController.ts` (`listDomains`, lines 650-663)
- Test: `src/__tests__/controllers/listDomains.test.ts` (create)

**Interfaces:**
- Consumes: `getDomainsForUserAndOrg` (Task 2). Reads `req.query.org_id`.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/controllers/listDomains.test.ts
jest.mock("../../utils/domain-helpers", () => ({ getDomainsForUserAndOrg: jest.fn() }));
jest.mock("../../config/supabase", () => ({ supabaseAdmin: { from: jest.fn() } }));

import { listDomains } from "../../controllers/domainsController";
import { getDomainsForUserAndOrg } from "../../utils/domain-helpers";

const mockList = getDomainsForUserAndOrg as jest.Mock;
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("listDomains", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes org_id from the query string", async () => {
    mockList.mockResolvedValue([{ id: "d1" }]);
    const res = makeRes();
    await listDomains({ user: { id: "u1" }, query: { org_id: "o1" } } as any, res);
    expect(mockList).toHaveBeenCalledWith("u1", "o1");
  });

  it("works with no org_id (legacy)", async () => {
    mockList.mockResolvedValue([]);
    const res = makeRes();
    await listDomains({ user: { id: "u1" }, query: {} } as any, res);
    expect(mockList).toHaveBeenCalledWith("u1", undefined);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/controllers/listDomains.test.ts`
Expected: FAIL — `listDomains` still calls `getUserDomains(userId)`.

- [ ] **Step 3: Update `listDomains`**

Add `getDomainsForUserAndOrg` to the domain-helpers import block, then replace the body of `listDomains`:

```ts
  try {
    const userId = req.user!.id;
    const orgId = (req.query.org_id as string) || undefined;
    const domains = await getDomainsForUserAndOrg(userId, orgId);

    sendSuccess(res, { domains });
  } catch (error: any) {
    console.error("Error listing domains:", error);
    sendError(res, error.message || "Failed to list domains", 500);
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/controllers/listDomains.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/domainsController.ts src/__tests__/controllers/listDomains.test.ts
git commit -m "feat(domains): scope domain listing by org_id with legacy fallback"
```

---

### Task 5: Org-required create + link (checkout & link)

**Files:**
- Modify: `src/routes/domains.ts` (checkout route line ~58-64, link route line ~93-97)
- Modify: `src/controllers/domainsController.ts` (`createDomainCheckout`, `linkDomain`)
- Test: `src/__tests__/controllers/domainCreateOrg.test.ts` (create)

**Interfaces:**
- Consumes: `requireOrgRole` from `../middleware/rbac`; `createDomainRecord` now accepts `organization_id` (Task 2).
- Produces: `/domains/checkout` and `/domains/link` require `org_id` in the body and gate on `SuperAdmin/Admin/Editor`; `domainRecord.organization_id` is set; `org_id` added to Stripe checkout metadata.

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/controllers/domainCreateOrg.test.ts
jest.mock("../../utils/domain-helpers", () => ({
  createDomainRecord: jest.fn().mockResolvedValue({ id: "rec-1" }),
  updateDomainStatus: jest.fn(),
  getDomainByName: jest.fn().mockResolvedValue(null),
  extractTld: jest.fn().mockReturnValue("com"),
}));
jest.mock("../../config/supabase", () => ({ supabaseAdmin: { from: jest.fn() } }));

import { linkDomain } from "../../controllers/domainsController";
import { createDomainRecord } from "../../utils/domain-helpers";

const mockCreate = createDomainRecord as jest.Mock;
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("linkDomain org scoping", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes organization_id from the body into the domain record", async () => {
    const res = makeRes();
    await linkDomain(
      { user: { id: "u1" }, body: { domain: "example.com", org_id: "o1" } } as any,
      res
    );
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ organization_id: "o1", user_id: "u1" })
    );
  });
});
```

> The route-level `requireOrgRole` guard (membership + role + org_id-required) is covered by existing rbac middleware tests; this test covers the controller wiring.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/controllers/domainCreateOrg.test.ts`
Expected: FAIL — `createDomainRecord` called without `organization_id`.

- [ ] **Step 3: Gate the routes**

In `src/routes/domains.ts`, import `requireOrgRole` (alongside the existing middleware imports):

```ts
import { requireOrgRole } from "../middleware/rbac";
```

Add the guard to checkout (line ~58-64) and link (line ~93-97) — `requireOrgRole` also enforces `org_id` presence (throws `ValidationError` if missing) and pulls it from `req.body.org_id`:

```ts
router.post(
  "/checkout",
  authenticate,
  requireEmailVerification,
  requireOrgRole(["SuperAdmin", "Admin", "Editor"]),
  billingRateLimiter,
  asyncHandler(createDomainCheckout)
);
```

```ts
router.post(
  "/link",
  authenticate,
  requireOrgRole(["SuperAdmin", "Admin", "Editor"]),
  asyncHandler(linkDomain)
);
```

- [ ] **Step 4: Thread `organization_id` in the controllers**

In `createDomainCheckout`, read `org_id` from the body (add to the destructure at lines 181-187):

```ts
    const { domain, years = 1, contact_info, registration_type = "new", auth_code, org_id } = req.body;
```

Add `organization_id: org_id,` to the `createDomainRecord({ ... })` call (after `user_id: userId,`), and add `org_id,` to the Stripe session `metadata` object (after `user_id: userId,`).

In `linkDomain`, read `org_id` from the body and pass it to `createDomainRecord`:

```ts
    const { org_id } = req.body;
```

Add `organization_id: org_id,` to the `createDomainRecord({ ... })` call (after `user_id: userId,`).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/__tests__/controllers/domainCreateOrg.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/routes/domains.ts src/controllers/domainsController.ts src/__tests__/controllers/domainCreateOrg.test.ts
git commit -m "feat(domains): require org_id and role on domain create/link; store organization_id"
```

---

### Task 6: Dual-mode `unlinkDomain`

**Files:**
- Modify: `src/controllers/domainsController.ts` (`unlinkDomain`, lines 1111-1151)
- Test: `src/__tests__/controllers/unlinkDomain.test.ts` (create)

**Interfaces:**
- Consumes: `getDomainForOrgMember`, `DOMAIN_ADMIN_ROLES` (Task 2). Unlink requires `SuperAdmin/Admin` (or legacy owner). The DB delete filters by `id` only once access is proven (org-scoped rows have no `user_id` match for other members).

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/controllers/unlinkDomain.test.ts
const mockDelete = jest.fn().mockResolvedValue({ error: null });
const mockEq2 = jest.fn().mockReturnValue({ error: null });
const mockEq1 = jest.fn().mockReturnValue({ eq: mockEq2 });
jest.mock("../../config/supabase", () => ({
  supabaseAdmin: { from: jest.fn(() => ({ delete: jest.fn(() => ({ eq: mockEq1 })) })) },
}));
jest.mock("../../utils/domain-helpers", () => ({
  getDomainForOrgMember: jest.fn(),
  DOMAIN_ADMIN_ROLES: ["admin"],
}));

import { unlinkDomain } from "../../controllers/domainsController";
import { getDomainForOrgMember, DOMAIN_ADMIN_ROLES } from "../../utils/domain-helpers";

const mockAccess = getDomainForOrgMember as jest.Mock;
const makeRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("unlinkDomain access", () => {
  beforeEach(() => jest.clearAllMocks());

  it("404s when caller lacks admin access", async () => {
    mockAccess.mockResolvedValue(null);
    const res = makeRes();
    await unlinkDomain({ params: { id: "d1" }, user: { id: "u1" } } as any, res);
    expect(mockAccess).toHaveBeenCalledWith("d1", "u1", DOMAIN_ADMIN_ROLES);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("rejects non-linked domains with 400", async () => {
    mockAccess.mockResolvedValue({ id: "d1", registration_type: "new", domain_name: "x.com" });
    const res = makeRes();
    await unlinkDomain({ params: { id: "d1" }, user: { id: "u1" } } as any, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/controllers/unlinkDomain.test.ts`
Expected: FAIL — current code uses `getDomainById` + `user_id` check.

- [ ] **Step 3: Update `unlinkDomain`**

Replace the guard (lines ~1117-1123):

```ts
    const { id } = req.params;
    const userId = req.user!.id;

    const domain = await getDomainForOrgMember(id, userId, DOMAIN_ADMIN_ROLES);
    if (!domain) {
      sendError(res, "Domain not found", 404);
      return;
    }
```

Replace the delete (lines ~1134-1138) — access is already proven, so filter by id only (an org-scoped row won't match the caller's `user_id`):

```ts
    const { error } = await supabaseAdmin
      .from("domains")
      .delete()
      .eq("id", id);
```

Ensure `getDomainForOrgMember` and `DOMAIN_ADMIN_ROLES` are in the domain-helpers import block.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/__tests__/controllers/unlinkDomain.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/controllers/domainsController.ts src/__tests__/controllers/unlinkDomain.test.ts
git commit -m "feat(domains): dual-mode admin-gated unlink"
```

---

### Task 7: Mailbox controller dual-mode domain fetch

**Files:**
- Modify: `src/controllers/mailboxController.ts` (`getDomainForUser` lines 71-88, `getDomainWithDkim` lines 842-859)
- Test: extend `src/controllers/__tests__/mailboxController.test.ts`

**Interfaces:**
- Consumes: `userCanAccessDomain`, `DOMAIN_VIEW_ROLES` (Task 2). Both helpers now select `organization_id` and apply the dual-mode check.

- [ ] **Step 1: Write the failing test**

Add to `src/controllers/__tests__/mailboxController.test.ts` a case asserting that a member of the domain's org (different `user_id`) can enable mail on an org-scoped domain. Extend `setupSupabaseMocks` so the `domains` table returns `{ id, domain_name, user_id: "other", organization_id: "org-1", contact_info: null }` and `organization_members` returns membership for `user-1`/`org-1`. Assert `res.status` is NOT 404:

```ts
  it("allows an org member (non-owner) to act on an org-scoped domain", async () => {
    setupSupabaseMocks({
      membershipData: { organization_id: "org-1" },
      orgData: { id: "org-1", stripe_customer_id: "cus_1" },
      domainData: { id: "domain-1", domain_name: "x.com", user_id: "other", organization_id: "org-1", contact_info: null },
    });
    const req = mockReq();
    const res = mockRes();
    await enableEmail(req, res);
    expect(res.status).not.toHaveBeenCalledWith(404);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/controllers/__tests__/mailboxController.test.ts`
Expected: FAIL — `getDomainForUser` returns null because `data.user_id !== userId`.

- [ ] **Step 3: Update the two helpers**

Add the import near the top of `mailboxController.ts`:

```ts
import { userCanAccessDomain, DOMAIN_VIEW_ROLES } from "../utils/domain-helpers";
```

`getDomainForUser` — add `organization_id` to the select and use the dual-mode check:

```ts
async function getDomainForUser(
  domainId: string,
  userId: string
): Promise<{
  domain_name: string;
  id: string;
  user_id: string;
  organization_id: string | null;
  contact_info: Record<string, any> | null;
} | null> {
  const { data } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, user_id, organization_id, contact_info")
    .eq("id", domainId)
    .single();

  if (!data) return null;
  if (!(await userCanAccessDomain(data, userId, DOMAIN_VIEW_ROLES))) return null;
  return data;
}
```

`getDomainWithDkim` — same treatment (add `organization_id` to the select and type, replace the `data.user_id !== userId` check):

```ts
  const { data } = await supabaseAdmin
    .from("domains")
    .select("id, domain_name, user_id, organization_id, dkim_enabled, dkim_selector")
    .eq("id", domainId)
    .single();

  if (!data) return null;
  if (!(await userCanAccessDomain(data, userId, DOMAIN_VIEW_ROLES))) return null;
  return data;
```

(Add `organization_id: string | null;` to its return type.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest src/controllers/__tests__/mailboxController.test.ts`
Expected: PASS (new case + existing cases).

- [ ] **Step 5: Commit**

```bash
git add src/controllers/mailboxController.ts src/controllers/__tests__/mailboxController.test.ts
git commit -m "feat(mailbox): dual-mode domain access for mail/dkim handlers"
```

---

### Task 8: Renewal billing charges the org's Stripe customer

**Files:**
- Modify: `src/jobs/domain-renewal-billing.ts` (DomainRow type line 11-18; candidate select line 41; customer/org resolution lines 98-138; invoice insert line 148)
- Test: extend `src/jobs/__tests__/domain-renewal-billing.test.ts`

**Interfaces:**
- Behavior: when `domain.organization_id` is set, resolve the Stripe customer from `organizations.stripe_customer_id` for that org and use the org's billing address; otherwise keep the existing `subscriptions.user_id → org_id` path. `collection_method: "charge_automatically"` already bills the customer's default payment method — no explicit PM needed.

- [ ] **Step 1: Write the failing test**

Add a case: a domain with `organization_id: "org-1"` resolves the customer via the `organizations` table (`stripe_customer_id: "cus_org"`) and never queries `subscriptions`. Mock `supabaseAdmin.from("organizations")` to return `{ id: "org-1", stripe_customer_id: "cus_org", billing_* : null }`, and assert the created Stripe invoice uses `customer: "cus_org"`. (Follow the file's existing mock structure for `stripe.invoices.create`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/jobs/__tests__/domain-renewal-billing.test.ts`
Expected: FAIL — code always reads `subscriptions` keyed on `user_id`.

- [ ] **Step 3: Add `organization_id` to the row type + select**

In `DomainRow` (lines 11-18) add:

```ts
  organization_id: string | null;
```

Update the candidate select (line 41) to include it:

```ts
    .select("id, domain_name, tld, expires_at, user_id, status, organization_id")
```

- [ ] **Step 4: Branch the customer/org resolution**

Replace the `subscriptions` lookup block (lines ~98-119, from `const { data: subRow } ...` down to the `const { data: org } = orgId ? ... : { data: null };`) with:

```ts
  let customerId: string | undefined;
  let orgId: string | undefined;

  if (domain.organization_id) {
    // Org-scoped domain: bill the org's Stripe customer (default payment method).
    orgId = domain.organization_id;
  } else {
    // Legacy: derive the org/customer from the owner's subscription.
    const { data: subRow } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, org_id")
      .eq("user_id", domain.user_id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .maybeSingle();
    customerId = subRow?.stripe_customer_id;
    orgId = subRow?.org_id;
  }

  const { data: org } = orgId
    ? await supabaseAdmin
        .from("organizations")
        .select("id, name, stripe_customer_id, billing_address, billing_city, billing_state, billing_zip")
        .eq("id", orgId)
        .maybeSingle()
    : { data: null };

  // For org-scoped domains, the org row is the source of the customer id.
  if (domain.organization_id) {
    customerId = org?.stripe_customer_id ?? undefined;
  }

  if (!customerId) {
    console.warn(
      `[Renewal Billing] No Stripe customer for domain ${domain.domain_name} (org ${orgId ?? "none"}, user ${domain.user_id}); skipping`
    );
    return;
  }
```

(The downstream `stripe.customers.retrieve(customerId)`, `syncCustomerAddress(..., org ?? {...}, org?.name ?? "")`, and invoice creation remain unchanged — they already consume `customerId` and `org`.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest src/jobs/__tests__/domain-renewal-billing.test.ts`
Expected: PASS (new org case + existing legacy cases).

- [ ] **Step 6: Commit**

```bash
git add src/jobs/domain-renewal-billing.ts src/jobs/__tests__/domain-renewal-billing.test.ts
git commit -m "feat(billing): bill domain renewals to the org Stripe customer when org-scoped"
```

---

### Task 9: Backend full-suite gate

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + full test run**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit && npx jest`
Expected: typecheck clean; all suites pass. Fix any fallout (most likely other tests that mock `domain-helpers` and now need the new exports added to their mock factories).

- [ ] **Step 2: Commit any test-mock fixups**

```bash
git add -A
git commit -m "test(domains): update mocks for org-scoping helpers"
```

---

# PHASE C — Frontend (`javelina`)

### Task 10: API layer threads `org_id`

**Files:**
- Modify: `types/domains.ts` (`DomainCheckoutParams`, `Domain`)
- Modify: `lib/api-client.ts` (`domainsApi.list/checkout/link`, lines 1458-1521)
- Test: `tests/lib/api-client.domains.test.ts` (create)

**Interfaces:**
- Produces: `domainsApi.list(orgId?: string)`, `domainsApi.link(domain: string, orgId: string)`, and `DomainCheckoutParams` gains `org_id: string`. `Domain` gains `organization_id: string | null`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/lib/api-client.domains.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const get = vi.fn().mockResolvedValue({ domains: [] });
const post = vi.fn().mockResolvedValue({});
vi.mock('@/lib/api-client', async (orig) => {
  // Import the real module but with a stubbed transport is complex; instead we assert URL/body shape via a spy module.
  return await orig();
});

// Simpler: unit-test the URL/body construction by importing the transport.
// See implementation note in Step 3; this test asserts the exported signatures.
import { domainsApi } from '@/lib/api-client';

describe('domainsApi org threading', () => {
  it('list accepts an optional orgId', () => {
    expect(domainsApi.list.length).toBeLessThanOrEqual(1);
  });
  it('link accepts (domain, orgId)', () => {
    expect(domainsApi.link.length).toBe(2);
  });
});
```

> If `apiClient` is easily mockable in this repo, prefer asserting the built URL/body (`get('/domains?org_id=o1')`, `post('/domains/link', { domain, org_id })`). Match whatever `tests/lib/` already does for `apiClient`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx vitest run tests/lib/api-client.domains.test.ts`
Expected: FAIL — `link` currently has arity 1.

- [ ] **Step 3: Update `domainsApi` methods (lib/api-client.ts)**

```ts
  list: (orgId?: string): Promise<DomainsListResponse> =>
    apiClient.get(orgId ? `/domains?org_id=${encodeURIComponent(orgId)}` : "/domains"),
```

```ts
  link: (domain: string, orgId: string): Promise<DomainDetailResponse> =>
    apiClient.post("/domains/link", { domain, org_id: orgId }),
```

`checkout` already forwards its `params` object — no method change; the `org_id` field rides along via the type change below.

- [ ] **Step 4: Update types (types/domains.ts)**

Add to `DomainCheckoutParams`:

```ts
  org_id: string;
```

Add to the `Domain` interface:

```ts
  organization_id: string | null;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/lib/api-client.domains.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api-client.ts types/domains.ts tests/lib/api-client.domains.test.ts
git commit -m "feat(domains): thread org_id through domainsApi list/checkout/link"
```

---

### Task 11: Server action `listUserDomains(orgId)` + business page uses real org scoping

**Files:**
- Modify: `lib/api/domains.ts` (`listUserDomains`)
- Modify: `app/business/[orgId]/domains/page.tsx` (remove name-match filter)
- Test: `tests/app/business/BusinessDomainsPage.test.tsx` (create or extend)

**Interfaces:**
- Produces: `listUserDomains(orgId?: string): Promise<DomainRow[]>` hitting `GET /api/domains?org_id=…`. `DomainRow` gains `organization_id: string | null`.

- [ ] **Step 1: Write the failing test**

Test that when `orgId` is passed, `listUserDomains` fetches `/api/domains?org_id=<id>`. Mock `next/headers` cookies and global `fetch`; assert the URL. (Match any existing `tests/` fetch-mock pattern; if none, use `vi.stubGlobal('fetch', vi.fn()...)`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/app/business/BusinessDomainsPage.test.tsx`
Expected: FAIL — current `listUserDomains()` takes no args and fetches `/api/domains`.

- [ ] **Step 3: Update the server action (lib/api/domains.ts)**

```ts
export interface DomainRow {
  id: string;
  domain_name: string;
  status: string | null;
  registered_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  is_primary: boolean | null;
  registrar: string | null;
  organization_id: string | null;
}

// Returns domains for the given org (and the caller's own legacy domains). With no
// orgId, returns just the caller's own domains (legacy behavior).
export async function listUserDomains(orgId?: string): Promise<DomainRow[]> {
  try {
    const path = orgId ? `/api/domains?org_id=${encodeURIComponent(orgId)}` : '/api/domains';
    const res = await authedFetch(path);
    if (!res.ok) return [];
    const json = await res.json();
    const all: DomainRow[] = json?.data?.domains ?? json?.domains ?? [];
    return all;
  } catch (err) {
    console.error('[domains api]', err);
    return [];
  }
}
```

Remove the stale comment block above the function (the "no organization_id column, filter client-side" note).

- [ ] **Step 4: Update the business page (app/business/[orgId]/domains/page.tsx)**

Replace the query + client-side filter (lines ~54-77). The query now passes `orgId`; delete `businessQuery`/`intakeDomain`/`normalizedIntake`/`matchedDomains` if only used for the filter:

```tsx
  const realQuery = useQuery({
    queryKey: ['domains', 'org', orgId],
    queryFn: () => listUserDomains(orgId),
    enabled: !!orgId && !isMock,
  });

  const allOrgDomains = realQuery.data ?? [];

  const domains: DisplayDomain[] = isMock
    ? MOCK_DOMAINS.map(fromMock)
    : allOrgDomains.map((d, i) => fromDomainRow(d, i === 0));
```

(If `businessQuery`/`getBusiness` are used elsewhere on the page for non-domain data, keep them; only remove the intake-domain name-match usage.)

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/app/business/BusinessDomainsPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/api/domains.ts app/business/[orgId]/domains/page.tsx tests/app/business/BusinessDomainsPage.test.tsx
git commit -m "feat(domains): scope business domains page by org via API instead of name-match"
```

---

### Task 12: `OrgSelect` dropdown component

**Files:**
- Create: `components/domains/OrgSelect.tsx`
- Test: `tests/components/domains/OrgSelect.test.tsx` (create)

**Interfaces:**
- Produces: `OrgSelect` — `{ value: string; onChange: (orgId: string) => void; orgs: { id: string; name: string; role: RBACRole }[] }`. Renders a labeled `<select>`; hidden (renders nothing) when `orgs.length < 2` but still reports the single org via `onChange` on mount is NOT done here (parent owns default).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/domains/OrgSelect.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OrgSelect from '@/components/domains/OrgSelect';

const orgs = [
  { id: 'o1', name: 'Acme', role: 'Admin' as const },
  { id: 'o2', name: 'Globex', role: 'Viewer' as const },
];

describe('OrgSelect', () => {
  it('renders an option per org and reports changes', () => {
    const onChange = vi.fn();
    render(<OrgSelect value="o1" onChange={onChange} orgs={orgs} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'o2' } });
    expect(onChange).toHaveBeenCalledWith('o2');
  });

  it('renders nothing for fewer than two orgs', () => {
    const { container } = render(<OrgSelect value="o1" onChange={() => {}} orgs={[orgs[0]]} />);
    expect(container.querySelector('select')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/domains/OrgSelect.test.tsx`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement the component**

```tsx
// components/domains/OrgSelect.tsx
'use client';

import type { RBACRole } from '@/lib/stores/auth-store';

interface OrgOption {
  id: string;
  name: string;
  role: RBACRole;
}

interface OrgSelectProps {
  value: string;
  onChange: (orgId: string) => void;
  orgs: OrgOption[];
}

export default function OrgSelect({ value, onChange, orgs }: OrgSelectProps) {
  if (orgs.length < 2) return null;

  return (
    <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
      <span>Organization</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-transparent px-2 py-1 text-sm text-text"
      >
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </label>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/domains/OrgSelect.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/domains/OrgSelect.tsx tests/components/domains/OrgSelect.test.tsx
git commit -m "feat(domains): add OrgSelect dropdown component"
```

---

### Task 13: `MyDomainsContent` — org dropdown drives the list + role-gated link

**Files:**
- Modify: `components/domains/MyDomainsContent.tsx`
- Test: extend `tests/app/domains/DomainsPage.test.tsx` or create `tests/components/domains/MyDomainsContent.test.tsx`

**Interfaces:**
- Consumes: `OrgSelect` (Task 12); `domainsApi.list(orgId)` and `domainsApi.link(domain, orgId)` (Task 10); `useAuthStore` (`user.organizations`), `useHierarchyStore` (`currentOrgId`).
- Behavior: selected org defaults to `currentOrgId` if it's one of the user's orgs, else the first org; list refetches on org change; the "Link domain" form is hidden unless the user's role in the selected org is `SuperAdmin/Admin/Editor` (edit gate).

- [ ] **Step 1: Write the failing test**

```tsx
// tests/components/domains/MyDomainsContent.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MyDomainsContent from '@/components/domains/MyDomainsContent';

const list = vi.fn().mockResolvedValue({ domains: [] });
vi.mock('@/lib/api-client', () => ({ domainsApi: { list, link: vi.fn() } }));
vi.mock('@/lib/stores/toast-store', () => ({ useToastStore: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/stores/hierarchy-store', () => ({ useHierarchyStore: () => ({ currentOrgId: 'o2' }) }));
vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: { organizations: [
      { id: 'o1', name: 'Acme', role: 'Viewer' },
      { id: 'o2', name: 'Globex', role: 'Admin' },
    ] },
  }),
}));

describe('MyDomainsContent org scoping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists domains for the current org by default', async () => {
    render(<MyDomainsContent />);
    await waitFor(() => expect(list).toHaveBeenCalledWith('o2'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/domains/MyDomainsContent.test.tsx`
Expected: FAIL — `list` called with no args.

- [ ] **Step 3: Update the component**

Add imports:

```tsx
import OrgSelect from '@/components/domains/OrgSelect';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useHierarchyStore } from '@/lib/stores/hierarchy-store';
```

Inside the component, derive orgs + selected org (place near the other `useState`s):

```tsx
  const { user } = useAuthStore();
  const { currentOrgId } = useHierarchyStore();
  const orgs = user?.organizations ?? [];
  const defaultOrgId =
    (currentOrgId && orgs.some((o) => o.id === currentOrgId) ? currentOrgId : undefined) ??
    orgs[0]?.id ??
    '';
  const [selectedOrgId, setSelectedOrgId] = useState(defaultOrgId);
  const canEdit = ['SuperAdmin', 'Admin', 'Editor'].includes(
    orgs.find((o) => o.id === selectedOrgId)?.role ?? ''
  );
```

Change `loadDomains` to scope by org and depend on `selectedOrgId`:

```tsx
  const loadDomains = useCallback(async () => {
    if (!selectedOrgId) return;
    try {
      setIsLoading(true);
      const result = await domainsApi.list(selectedOrgId);
      setDomains(result.domains || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedOrgId]);
```

Update the link handler to pass the org (find `domainsApi.link(trimmed)` and change to):

```tsx
      await domainsApi.link(trimmed, selectedOrgId);
```

In the render, add the dropdown above the list card and gate the "Link domain" callout on `canEdit`:

```tsx
      <div className="flex items-center justify-between">
        <OrgSelect value={selectedOrgId} onChange={setSelectedOrgId} orgs={orgs} />
      </div>
      {canEdit && (
        /* existing "Link domain" callout/button block */
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/domains/MyDomainsContent.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/domains/MyDomainsContent.tsx tests/components/domains/MyDomainsContent.test.tsx
git commit -m "feat(domains): org dropdown scopes personal domains list; role-gate linking"
```

---

### Task 14: Thread selected org into register/transfer checkout

**Files:**
- Modify: `app/domains/page.tsx` (the `handleCheckout` builder + header)
- Test: extend `tests/app/domains/DomainsPage.test.tsx`

**Interfaces:**
- Consumes: `DomainCheckoutParams.org_id` (Task 10). The page picks the org the same way as `MyDomainsContent`/mailbox (`currentOrgId` if valid, else first org) and includes `org_id` in every `domainsApi.checkout(...)` call.

- [ ] **Step 1: Read `handleCheckout` and the checkout params it builds**

Run: `sed -n '1,160p' app/domains/page.tsx` (locate `handleCheckout` and where it constructs the object passed to `domainsApi.checkout`).

- [ ] **Step 2: Write the failing test**

Extend `tests/app/domains/DomainsPage.test.tsx`: mock `domainsApi.checkout`, mock `useAuthStore`/`useHierarchyStore` as in Task 13, drive a checkout, and assert `checkout` was called with `expect.objectContaining({ org_id: 'o2' })`.

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/app/domains/DomainsPage.test.tsx`
Expected: FAIL — no `org_id` in the checkout params.

- [ ] **Step 4: Add org derivation + include `org_id` in the checkout call**

At the top of the component add (mirroring Task 13):

```tsx
  const { user } = useAuthStore();
  const { currentOrgId } = useHierarchyStore();
  const orgs = user?.organizations ?? [];
  const checkoutOrgId =
    (currentOrgId && orgs.some((o) => o.id === currentOrgId) ? currentOrgId : undefined) ??
    orgs[0]?.id ??
    '';
```

In the object passed to `domainsApi.checkout({ ... })` inside `handleCheckout`, add:

```tsx
    org_id: checkoutOrgId,
```

Guard: if `!checkoutOrgId`, surface a toast ("Select or join an organization to register a domain") and return before calling checkout.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run tests/app/domains/DomainsPage.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/domains/page.tsx tests/app/domains/DomainsPage.test.tsx
git commit -m "feat(domains): include org_id when registering/transferring a domain"
```

---

### Task 15: Frontend full-suite gate

**Files:** none (verification only)

- [ ] **Step 1: Typecheck + tests**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit && npx vitest run`
Expected: typecheck clean (note: **do not** run `npm run build` while a dev server is running); all tests pass. Fix fallout (e.g. other call sites of `domainsApi.link` now needing an orgId, or `DomainCheckoutParams` consumers needing `org_id`).

- [ ] **Step 2: Commit any fixups**

```bash
git add -A
git commit -m "test(domains): fix up frontend types/mocks for org scoping"
```

---

## Verification (end-to-end, on dev)

After all tasks and with the migration applied to **dev** (user-in-the-loop; never prod):

1. **New domain is org-scoped:** register/link a domain while an org is selected → the `domains` row has `organization_id` set; it appears in that org's list and on the business page.
2. **Cross-member access:** a second member (Editor) of the same org can view and edit nameservers; a Viewer can view but the link/edit controls are hidden; unlink is available only to SuperAdmin/Admin.
3. **Legacy fallback:** a pre-existing domain with `organization_id = NULL` is still visible/editable by its original owner and by nobody else.
4. **Renewal billing:** for an org-scoped domain, the renewal invoice is created against the org's Stripe customer.

## Out of scope (deferred)

Production data backfill, `SET NOT NULL` on `domains.organization_id`, and removal of the `user_id` fallback — a separate later effort against the production dataset.
