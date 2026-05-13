# Domain Detail Enhancements (JAV-101 / 102 / 103) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add transfer auth-code reveal, transfer-status reconciliation, and registrant verification status + resend to the domain detail page.

**Architecture:** New OpenSRS service helpers + four new backend endpoints + an hourly reconciliation job; frontend gains a "Transfer & Verification" card on the domain detail page and an on-load sync that flips `transferring → active` when OpenSRS confirms completion. All OpenSRS calls stay in the backend.

**Tech Stack:** Express + TypeScript (backend), Next.js 15 App Router + React 19 + TypeScript (frontend), Supabase Postgres, OpenSRS reseller API, Jest.

**Spec:** `docs/superpowers/specs/2026-05-08-domain-tickets-design.md` (Stream B).

**Both repos must be on branch `fix/domain-transfer` before starting any task.** Verify with `git branch --show-current` in each.

---

## File Map

### `javelina-backend/`
- Modify: `src/services/opensrs.ts` — add 4 new helpers
- Modify: `src/services/__tests__/opensrs.test.ts` (or create alongside) — unit tests for new helpers
- Modify: `src/controllers/domainsController.ts` — add 4 new controller fns + extend `getDomainManagement`
- Modify: `src/controllers/__tests__/domainsController.test.ts` (create if missing) — controller tests
- Modify: `src/routes/domains.ts` — wire 4 new routes
- Create: `src/jobs/domain-sync.ts` — hourly reconciliation cron
- Modify: `src/index.ts` — start the new cron alongside `startExpiryReminderJob()`

### `javelina/` (frontend)
- Modify: `types/domains.ts` — new types + extend `DomainManagementResponse`, `Domain`
- Modify: `lib/api-client.ts` — new `domainsApi` methods
- Create: `components/domains/TransferVerificationCard.tsx` — new card component
- Modify: `app/domains/[id]/page.tsx` — render new card; add sync-on-load
- Modify: `components/domains/DomainsList.tsx` — debounced sync for transferring rows
- Create: `app/domains/__tests__/TransferVerificationCard.test.tsx`

### Database
- Migration file (user applies manually): `<timestamp>_add_domain_sync_and_verification_columns.sql`

---

## Migration (apply manually before Task 1)

Save to `javelina-backend/supabase/migrations/<timestamp>_add_domain_sync_and_verification_columns.sql`:

```sql
ALTER TABLE public.domains
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN registrant_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN registrant_verification_deadline timestamptz;

CREATE INDEX idx_domains_status_synced
  ON public.domains(status, last_synced_at)
  WHERE status = 'transferring';
```

Apply manually to dev branch (project ref `ipfsrbxjgewhdcvonrbo`). Confirm columns exist with `\d public.domains` before proceeding.

---

## Task 1: OpenSRS — `getDomainAuthCode` helper

**Files:**
- Modify: `javelina-backend/src/services/opensrs.ts`
- Test: `javelina-backend/src/services/__tests__/opensrs.test.ts` (create if missing)

- [ ] **Step 1: Write the failing test**

Append to `__tests__/opensrs.test.ts`:

```ts
import { getDomainAuthCode, sendRequest } from "../opensrs";

jest.mock("../opensrs", () => {
  const actual = jest.requireActual("../opensrs");
  return { ...actual, sendRequest: jest.fn() };
});

describe("getDomainAuthCode", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns the auth code on success", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: true,
      attributes: { domain_auth_info: "ABC-123-XYZ" },
    });
    const result = await getDomainAuthCode("example.com");
    expect(result).toEqual({ success: true, auth_code: "ABC-123-XYZ" });
  });

  it("returns error when OpenSRS fails", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: false,
      response_text: "Domain locked",
    });
    const result = await getDomainAuthCode("example.com");
    expect(result).toEqual({ success: false, error: "Domain locked" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t getDomainAuthCode`
Expected: FAIL with "getDomainAuthCode is not a function".

- [ ] **Step 3: Implement the helper**

Append to `src/services/opensrs.ts` (near other domain helpers, after `getDomainInfo`):

```ts
/**
 * Get the EPP/auth code for a domain so it can be transferred OUT to another registrar.
 * Uses GET with type="domain_auth_info"; falls back to no-op error if unsupported.
 */
export async function getDomainAuthCode(
  domain: string
): Promise<{ success: boolean; auth_code?: string; error?: string }> {
  try {
    const result = await sendRequest("GET", "DOMAIN", {
      domain,
      type: "domain_auth_info",
    });
    if (!result.is_success) {
      return { success: false, error: result.response_text };
    }
    const code =
      result.attributes?.domain_auth_info ||
      result.attributes?.auth_info ||
      result.attributes?.password;
    if (!code) {
      return { success: false, error: "Auth code not returned by registrar" };
    }
    return { success: true, auth_code: String(code) };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t getDomainAuthCode`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd javelina-backend
git add src/services/opensrs.ts src/services/__tests__/opensrs.test.ts
git commit -m "feat(domains): add getDomainAuthCode helper for transfer-out"
```

---

## Task 2: OpenSRS — `getTransferState` helper

**Files:**
- Modify: `javelina-backend/src/services/opensrs.ts`
- Test: `javelina-backend/src/services/__tests__/opensrs.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `__tests__/opensrs.test.ts`:

```ts
describe("getTransferState", () => {
  beforeEach(() => jest.clearAllMocks());

  it("maps OpenSRS statuses to our state values", async () => {
    const cases: Array<[string, string]> = [
      ["completed", "completed"],
      ["pending_owner", "transferring"],
      ["pending_admin", "transferring"],
      ["cancelled", "cancelled"],
      ["server_cancelled", "cancelled"],
      ["transferred_away", "completed"],
    ];
    for (const [raw, expected] of cases) {
      (sendRequest as jest.Mock).mockResolvedValueOnce({
        is_success: true,
        attributes: { status: raw },
      });
      const result = await getTransferState("example.com");
      expect(result.state).toBe(expected);
      expect(result.raw).toBe(raw);
    }
  });

  it("returns failed when OpenSRS request fails", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: false,
      response_text: "Not found",
    });
    const result = await getTransferState("example.com");
    expect(result.state).toBe("failed");
  });
});
```

Add the import at the top: `import { ..., getTransferState } from "../opensrs";`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t getTransferState`
Expected: FAIL.

- [ ] **Step 3: Implement the helper**

Append to `src/services/opensrs.ts`:

```ts
/**
 * Map OpenSRS transfer status strings to our DomainStatus state.
 */
export async function getTransferState(
  domain: string
): Promise<{ state: "transferring" | "completed" | "cancelled" | "failed"; raw?: string }> {
  try {
    const result = await sendRequest("CHECK_TRANSFER", "DOMAIN", {
      domain,
      check_status: "1",
    });
    if (!result.is_success) {
      return { state: "failed" };
    }
    const raw = String(result.attributes?.status || "");
    if (/completed|transferred/i.test(raw)) {
      return { state: "completed", raw };
    }
    if (/cancel|reject|server_cancelled/i.test(raw)) {
      return { state: "cancelled", raw };
    }
    if (/pending|waiting/i.test(raw)) {
      return { state: "transferring", raw };
    }
    return { state: "transferring", raw };
  } catch (error: any) {
    return { state: "failed", raw: error.message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t getTransferState`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd javelina-backend
git add src/services/opensrs.ts src/services/__tests__/opensrs.test.ts
git commit -m "feat(domains): add getTransferState helper to map OpenSRS statuses"
```

---

## Task 3: OpenSRS — verification helpers

**Files:**
- Modify: `javelina-backend/src/services/opensrs.ts`
- Test: `javelina-backend/src/services/__tests__/opensrs.test.ts`

- [ ] **Step 1: Write the failing tests**

Append:

```ts
import {
  ...,
  getRegistrantVerificationStatus,
  resendVerificationEmail,
} from "../opensrs";

describe("getRegistrantVerificationStatus", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns verified=true when admin_email is verified", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: true,
      attributes: {
        admin_email: "owner@example.com",
        admin_email_status: "verified",
      },
    });
    const r = await getRegistrantVerificationStatus("example.com");
    expect(r.verified).toBe(true);
    expect(r.email).toBe("owner@example.com");
  });

  it("returns deadline when verification is pending", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: true,
      attributes: {
        admin_email: "owner@example.com",
        admin_email_status: "pending",
        admin_email_verification_due_date: "2026-05-22T00:00:00Z",
      },
    });
    const r = await getRegistrantVerificationStatus("example.com");
    expect(r.verified).toBe(false);
    expect(r.deadline).toBe("2026-05-22T00:00:00Z");
  });
});

describe("resendVerificationEmail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns success when OpenSRS accepts", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({ is_success: true });
    expect(await resendVerificationEmail("example.com")).toEqual({ success: true });
  });

  it("returns error on failure", async () => {
    (sendRequest as jest.Mock).mockResolvedValue({
      is_success: false,
      response_text: "Already verified",
    });
    expect(await resendVerificationEmail("example.com")).toEqual({
      success: false,
      error: "Already verified",
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t "getRegistrantVerificationStatus|resendVerificationEmail"`
Expected: FAIL.

- [ ] **Step 3: Implement helpers**

Append to `src/services/opensrs.ts`:

```ts
/**
 * Read registrant (admin) email verification status from OpenSRS.
 * After transfer-in, ICANN requires the registrant verify within 14 days.
 */
export async function getRegistrantVerificationStatus(
  domain: string
): Promise<{ verified: boolean; deadline?: string; email?: string; error?: string }> {
  try {
    const result = await sendRequest("GET", "DOMAIN", {
      domain,
      type: "admin_email",
    });
    if (!result.is_success) {
      return { verified: false, error: result.response_text };
    }
    const attrs = result.attributes || {};
    const status = String(attrs.admin_email_status || "").toLowerCase();
    return {
      verified: status === "verified" || status === "completed",
      deadline:
        attrs.admin_email_verification_due_date ||
        attrs.verification_due_date ||
        undefined,
      email: attrs.admin_email || undefined,
    };
  } catch (error: any) {
    return { verified: false, error: error.message };
  }
}

/**
 * Trigger OpenSRS to re-send the registrant verification email.
 */
export async function resendVerificationEmail(
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendRequest("SEND_VERIFICATION_EMAIL", "DOMAIN", { domain });
    if (!result.is_success) {
      return { success: false, error: result.response_text };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd javelina-backend && npx jest src/services/__tests__/opensrs.test.ts -t "getRegistrantVerificationStatus|resendVerificationEmail"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd javelina-backend
git add src/services/opensrs.ts src/services/__tests__/opensrs.test.ts
git commit -m "feat(domains): add registrant verification helpers"
```

---

## Task 4: Controller — `revealAuthCode` endpoint (JAV-101)

**Files:**
- Modify: `javelina-backend/src/controllers/domainsController.ts`
- Modify: `javelina-backend/src/routes/domains.ts`

- [ ] **Step 1: Add controller function**

Append to `domainsController.ts` (near other handlers; reuse existing imports):

```ts
import { getDomainAuthCode } from "../services/opensrs";
import { logAuditEvent } from "../utils/audit-logging";

export const revealAuthCode = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const domain = await getDomainById(id);
    if (!domain || domain.user_id !== userId) {
      sendError(res, "Domain not found", 404);
      return;
    }
    if (domain.registration_type === "linked") {
      sendError(res, "Auth codes are not available for linked domains", 400);
      return;
    }
    if (domain.status !== "active") {
      sendError(res, "Auth code is only available for active domains", 400);
      return;
    }

    const result = await getDomainAuthCode(domain.domain_name);
    if (!result.success || !result.auth_code) {
      console.error("[Domains] auth code fetch failed:", result.error);
      sendError(res, "Could not retrieve transfer code, please try again", 502);
      return;
    }

    await logAuditEvent({
      organizationId: null,
      userId,
      action: "create",
      resourceType: "domain.auth_code_revealed",
      resourceId: domain.id,
      details: { domain_name: domain.domain_name },
    });

    sendSuccess(res, { auth_code: result.auth_code });
  } catch (error: any) {
    console.error("Error revealing auth code:", error);
    sendError(res, "Could not retrieve transfer code, please try again", 502);
  }
};
```

- [ ] **Step 2: Wire the route**

Edit `src/routes/domains.ts`. Add to the named import block:

```ts
revealAuthCode,
```

Append after the existing `/:id/manage` route:

```ts
/**
 * POST /api/domains/:id/auth-code
 * Reveal the EPP/auth code for transfer-OUT (JAV-101)
 */
router.post(
  "/:id/auth-code",
  authenticate,
  asyncHandler(revealAuthCode)
);
```

- [ ] **Step 3: Smoke-test the route compiles**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/controllers/domainsController.ts src/routes/domains.ts
git commit -m "feat(domains): add POST /:id/auth-code endpoint (JAV-101)"
```

---

## Task 5: Controller — sync endpoint + reconciliation (JAV-102)

**Files:**
- Modify: `javelina-backend/src/controllers/domainsController.ts`
- Modify: `javelina-backend/src/routes/domains.ts`

- [ ] **Step 1: Add reconciliation helper + controller**

Append to `domainsController.ts` (place the helper above the controller so the cron job can import it later):

```ts
import { getTransferState, getDomainInfo, getRegistrantVerificationStatus } from "../services/opensrs";

const SYNC_DEBOUNCE_MS = 60 * 1000;

/**
 * Reconcile a single domain row against OpenSRS.
 * Returns whether anything changed.
 */
export async function syncDomainFromOpensrs(domainId: string): Promise<{
  synced: boolean;
  changed: boolean;
}> {
  const domain = await getDomainById(domainId);
  if (!domain) return { synced: false, changed: false };

  if (
    domain.last_synced_at &&
    Date.now() - new Date(domain.last_synced_at).getTime() < SYNC_DEBOUNCE_MS
  ) {
    return { synced: true, changed: false };
  }

  const updates: Record<string, any> = { last_synced_at: new Date().toISOString() };
  let changed = false;

  if (domain.status === "transferring") {
    const state = await getTransferState(domain.domain_name);
    if (state.state === "completed") {
      updates.status = "active";
      changed = true;
      const info = await getDomainInfo(domain.domain_name);
      if (info.exists) {
        if (info.expiry_date) updates.expires_at = info.expiry_date;
        if (info.registered_date) updates.registered_at = info.registered_date;
        if (info.nameservers) {
          updates.nameservers = info.nameservers.map((n, i) => ({
            name: n,
            sortorder: i + 1,
          }));
        }
      }
    } else if (state.state === "cancelled" || state.state === "failed") {
      updates.status = "cancelled";
      changed = true;
    }
  }

  if (domain.registration_type === "transfer") {
    const v = await getRegistrantVerificationStatus(domain.domain_name);
    if (typeof v.verified === "boolean" && v.verified !== domain.registrant_verified) {
      updates.registrant_verified = v.verified;
      changed = true;
    }
    if (v.deadline && v.deadline !== domain.registrant_verification_deadline) {
      updates.registrant_verification_deadline = v.deadline;
      changed = true;
    }
  }

  await supabaseAdmin.from("domains").update(updates).eq("id", domainId);

  return { synced: true, changed };
}

export const syncDomain = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const domain = await getDomainById(id);
    if (!domain || domain.user_id !== userId) {
      sendError(res, "Domain not found", 404);
      return;
    }

    try {
      const result = await syncDomainFromOpensrs(id);
      sendSuccess(res, result);
    } catch (err: any) {
      console.warn("[Domains] sync failed (returning cached):", err.message);
      sendSuccess(res, { synced: false, changed: false });
    }
  } catch (error: any) {
    console.error("Error syncing domain:", error);
    sendError(res, "Failed to sync domain", 500);
  }
};
```

If `getDomainById` doesn't already return `last_synced_at`, `registrant_verified`, `registrant_verification_deadline`, update its `select(...)` accordingly (in `src/utils/domain-helpers.ts` — change the `select` to `*` if not already).

- [ ] **Step 2: Wire the route**

Edit `src/routes/domains.ts`. Add `syncDomain` to the import; append:

```ts
/**
 * POST /api/domains/:id/sync
 * Reconcile domain status from OpenSRS (JAV-102)
 */
router.post("/:id/sync", authenticate, asyncHandler(syncDomain));
```

- [ ] **Step 3: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/controllers/domainsController.ts src/routes/domains.ts src/utils/domain-helpers.ts
git commit -m "feat(domains): add POST /:id/sync + reconciliation logic (JAV-102)"
```

---

## Task 6: Controller — verification endpoints (JAV-103)

**Files:**
- Modify: `javelina-backend/src/controllers/domainsController.ts`
- Modify: `javelina-backend/src/routes/domains.ts`

- [ ] **Step 1: Add controllers**

Append to `domainsController.ts`:

```ts
import { resendVerificationEmail as opensrsResendVerification } from "../services/opensrs";

export const getVerification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const domain = await getDomainById(id);
    if (!domain || domain.user_id !== userId) {
      sendError(res, "Domain not found", 404);
      return;
    }
    if (domain.registration_type !== "transfer") {
      sendError(res, "Verification status is only tracked for transferred domains", 400);
      return;
    }
    sendSuccess(res, {
      verified: domain.registrant_verified || false,
      deadline: domain.registrant_verification_deadline || null,
      email: (domain.contact_info as any)?.email || null,
    });
  } catch (error: any) {
    console.error("Error reading verification:", error);
    sendError(res, "Failed to read verification status", 500);
  }
};

export const resendVerification = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const domain = await getDomainById(id);
    if (!domain || domain.user_id !== userId) {
      sendError(res, "Domain not found", 404);
      return;
    }
    if (domain.registration_type !== "transfer") {
      sendError(res, "Verification email is only for transferred domains", 400);
      return;
    }

    const result = await opensrsResendVerification(domain.domain_name);
    if (!result.success) {
      sendError(res, result.error || "Could not resend verification email", 502);
      return;
    }

    await logAuditEvent({
      organizationId: null,
      userId,
      action: "create",
      resourceType: "domain.verification_resent",
      resourceId: domain.id,
      details: { domain_name: domain.domain_name },
    });

    sendSuccess(res, { success: true });
  } catch (error: any) {
    console.error("Error resending verification:", error);
    sendError(res, "Failed to resend verification email", 500);
  }
};
```

- [ ] **Step 2: Wire routes**

Edit `src/routes/domains.ts`. Add `getVerification, resendVerification` to imports; append:

```ts
/**
 * GET /api/domains/:id/verification (JAV-103)
 */
router.get("/:id/verification", authenticate, asyncHandler(getVerification));

/**
 * POST /api/domains/:id/verification/resend (JAV-103)
 */
router.post(
  "/:id/verification/resend",
  authenticate,
  asyncHandler(resendVerification)
);
```

- [ ] **Step 3: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/controllers/domainsController.ts src/routes/domains.ts
git commit -m "feat(domains): add verification endpoints (JAV-103)"
```

---

## Task 7: Extend `getDomainManagement` response

**Files:**
- Modify: `javelina-backend/src/controllers/domainsController.ts`

- [ ] **Step 1: Locate and modify `getDomainManagement`**

Find the existing `getDomainManagement` controller (it returns `{ domain, live, zone }`). Modify the response object to include `verification`:

```ts
const verification =
  domain.registration_type === "transfer"
    ? {
        verified: domain.registrant_verified || false,
        deadline: domain.registrant_verification_deadline || null,
        email: (domain.contact_info as any)?.email || null,
      }
    : undefined;

sendSuccess(res, {
  domain,
  live,
  zone,
  verification,
});
```

(Keep the existing `live` and `zone` logic untouched.)

- [ ] **Step 2: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina-backend
git add src/controllers/domainsController.ts
git commit -m "feat(domains): include verification in management response"
```

---

## Task 8: Hourly reconciliation cron

**Files:**
- Create: `javelina-backend/src/jobs/domain-sync.ts`
- Modify: `javelina-backend/src/index.ts`

- [ ] **Step 1: Create the job file**

Create `src/jobs/domain-sync.ts`:

```ts
import cron from "node-cron";
import { supabaseAdmin } from "../config/supabase";
import { syncDomainFromOpensrs } from "../controllers/domainsController";

const STALE_MINUTES = 50;

export function startDomainSyncJob() {
  cron.schedule("0 * * * *", async () => {
    console.log("[Domain Sync] Running hourly reconciliation...");
    try {
      const cutoff = new Date(Date.now() - STALE_MINUTES * 60 * 1000).toISOString();
      const { data, error } = await supabaseAdmin
        .from("domains")
        .select("id")
        .eq("status", "transferring")
        .or(`last_synced_at.is.null,last_synced_at.lt.${cutoff}`)
        .limit(200);

      if (error) {
        console.error("[Domain Sync] DB query error:", error.message);
        return;
      }
      if (!data || data.length === 0) {
        console.log("[Domain Sync] No stale transferring domains.");
        return;
      }
      console.log(`[Domain Sync] Reconciling ${data.length} domain(s)...`);
      for (const row of data) {
        try {
          await syncDomainFromOpensrs(row.id);
        } catch (err: any) {
          console.warn(`[Domain Sync] Failed for ${row.id}:`, err.message);
        }
      }
    } catch (err: any) {
      console.error("[Domain Sync] Cron error:", err.message);
    }
  });

  console.log("✅ Domain sync cron job scheduled (hourly)");
}
```

- [ ] **Step 2: Register the cron in `src/index.ts`**

Find where `startExpiryReminderJob()` is called. Add right after it:

```ts
import { startDomainSyncJob } from "./jobs/domain-sync";
// ...
startDomainSyncJob();
```

- [ ] **Step 3: Compile check**

Run: `cd javelina-backend && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd javelina-backend
git add src/jobs/domain-sync.ts src/index.ts
git commit -m "feat(domains): hourly reconciliation cron for transferring domains"
```

---

## Task 9: Frontend types

**Files:**
- Modify: `javelina/types/domains.ts`

- [ ] **Step 1: Add types and extend existing ones**

Edit `types/domains.ts`. Add after `DomainManagementResponse`:

```ts
export interface DomainAuthCodeResponse {
  auth_code: string;
}

export interface DomainVerification {
  verified: boolean;
  deadline: string | null;
  email: string | null;
}

export interface DomainSyncResponse {
  synced: boolean;
  changed: boolean;
}
```

Modify the `Domain` interface — add to the existing interface body:

```ts
last_synced_at?: string;
registrant_verified?: boolean;
registrant_verification_deadline?: string;
```

Modify `DomainManagementResponse` — add:

```ts
verification?: DomainVerification;
```

- [ ] **Step 2: Compile check**

Run: `cd javelina && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add types/domains.ts
git commit -m "feat(domains): add types for transfer code, verification, sync"
```

---

## Task 10: Frontend API client

**Files:**
- Modify: `javelina/lib/api-client.ts`

- [ ] **Step 1: Add `domainsApi` methods**

Find the `domainsApi` object in `lib/api-client.ts` and add these methods (match the existing style — likely `apiRequest` calls):

```ts
async getAuthCode(domainId: string): Promise<{ auth_code: string }> {
  return apiRequest(`/api/domains/${domainId}/auth-code`, { method: "POST" });
},

async syncDomain(domainId: string): Promise<{ synced: boolean; changed: boolean }> {
  return apiRequest(`/api/domains/${domainId}/sync`, { method: "POST" });
},

async getVerification(domainId: string): Promise<DomainVerification> {
  return apiRequest(`/api/domains/${domainId}/verification`);
},

async resendVerification(domainId: string): Promise<{ success: boolean }> {
  return apiRequest(`/api/domains/${domainId}/verification/resend`, { method: "POST" });
},
```

(Adjust to match the actual signature of `apiRequest`/equivalent in this file.)

- [ ] **Step 2: Compile check**

Run: `cd javelina && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add lib/api-client.ts
git commit -m "feat(domains): add api-client methods for transfer/verification"
```

---

## Task 11: `TransferVerificationCard` component

**Files:**
- Create: `javelina/components/domains/TransferVerificationCard.tsx`

- [ ] **Step 1: Create the component**

Create `components/domains/TransferVerificationCard.tsx`:

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import { domainsApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import type { Domain, DomainVerification } from '@/types/domains';

interface Props {
  domain: Domain;
  domainLocked: boolean;
  verification?: DomainVerification;
}

const REVEAL_TIMEOUT_MS = 60_000;

export function TransferVerificationCard({ domain, domainLocked, verification }: Props) {
  const { addToast } = useToastStore();

  const showTransferCode = domain.registration_type !== 'linked' && domain.status === 'active';
  const showVerification = domain.registration_type === 'transfer';

  if (!showTransferCode && !showVerification) return null;

  return (
    <div className="rounded-xl bg-white dark:bg-gray-slate shadow-md border border-gray-light p-6 space-y-6">
      <h3 className="text-base font-semibold text-orange">Transfer &amp; Verification</h3>

      {showTransferCode && (
        <TransferCodeSection domainId={domain.id} domainLocked={domainLocked} addToast={addToast} />
      )}

      {showVerification && (
        <VerificationSection domain={domain} verification={verification} addToast={addToast} />
      )}
    </div>
  );
}

function TransferCodeSection({
  domainId,
  domainLocked,
  addToast,
}: {
  domainId: string;
  domainLocked: boolean;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleReveal = async () => {
    setLoading(true);
    try {
      const result = await domainsApi.getAuthCode(domainId);
      setCode(result.auth_code);
      timerRef.current = setTimeout(() => setCode(null), REVEAL_TIMEOUT_MS);
    } catch (err: any) {
      addToast('error', err?.message || 'Could not retrieve transfer code');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback ignored
    }
  };

  const handleHide = () => {
    setCode(null);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  return (
    <div>
      <p className="text-sm font-medium text-orange-dark dark:text-white">Transfer this domain away</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        If you&apos;re moving this domain to another registrar, you&apos;ll need an authorization code (EPP code).
      </p>

      {domainLocked ? (
        <div className="mt-3">
          <Button variant="secondary" size="sm" disabled>
            Reveal transfer code
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Disable Domain Lock above to retrieve your transfer code.
          </p>
        </div>
      ) : code ? (
        <div className="mt-3 flex items-center gap-3">
          <code className="px-3 py-2 rounded-md bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 font-mono text-sm text-orange-dark dark:text-white">
            {code}
          </code>
          <button
            type="button"
            onClick={handleCopy}
            className="text-sm text-orange hover:text-orange/70 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={handleHide}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Hide
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <Button variant="secondary" size="sm" disabled={loading} onClick={handleReveal}>
            {loading ? 'Retrieving...' : 'Reveal transfer code'}
          </Button>
        </div>
      )}
    </div>
  );
}

function VerificationSection({
  domain,
  verification,
  addToast,
}: {
  domain: Domain;
  verification?: DomainVerification;
  addToast: (type: 'success' | 'error' | 'info', msg: string) => void;
}) {
  const [resending, setResending] = useState(false);
  const verified = verification?.verified ?? false;
  const deadline = verification?.deadline;
  const email = verification?.email;

  const expired = !verified && deadline ? new Date(deadline).getTime() < Date.now() : false;

  const pillClass = verified
    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    : expired
      ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  const pillLabel = verified ? 'Verified' : expired ? 'Verification expired' : 'Pending verification';

  const handleResend = async () => {
    setResending(true);
    try {
      await domainsApi.resendVerification(domain.id);
      addToast('success', 'Verification email sent.');
    } catch (err: any) {
      addToast('error', err?.message || 'Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium text-orange-dark dark:text-white">Registrant Verification</p>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${pillClass}`}>
          {pillLabel}
        </span>
      </div>
      {!verified && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {email ? <>Verification email sent to <strong>{email}</strong>. </> : null}
          {deadline ? <>Verify by <strong>{new Date(deadline).toLocaleDateString()}</strong> or your domain may be suspended.</> : null}
        </p>
      )}
      {!verified && (
        <div className="mt-3">
          <Button variant="secondary" size="sm" disabled={resending} onClick={handleResend}>
            {resending ? 'Sending...' : 'Resend verification email'}
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `cd javelina && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add components/domains/TransferVerificationCard.tsx
git commit -m "feat(domains): TransferVerificationCard component"
```

---

## Task 12: Wire card into detail page + sync-on-load

**Files:**
- Modify: `javelina/app/domains/[id]/page.tsx`

- [ ] **Step 1: Import the card**

Add to the existing import block:

```tsx
import { TransferVerificationCard } from '@/components/domains/TransferVerificationCard';
```

- [ ] **Step 2: Add sync-on-load inside `loadData`**

In `loadData`, after `setData(result);` but before reading the contact, add a fire-and-forget sync followed by a refetch only when something changed:

```tsx
domainsApi.syncDomain(domainId)
  .then((sync) => {
    if (sync.changed) {
      domainsApi.getManagement(domainId).then((fresh) => {
        setData(fresh);
        if (result.domain.status === 'transferring' && fresh.domain.status === 'active') {
          addToast('success', 'Transfer complete — your domain is now active.');
        }
      }).catch(() => {});
    }
  })
  .catch(() => { /* ignore — show cached data */ });
```

- [ ] **Step 3: Render the card**

Find the spot after the combined "Domain Settings + Renewal + Nameservers" card and before `{/* Email */}`. Insert:

```tsx
<TransferVerificationCard
  domain={domain}
  domainLocked={domainLocked}
  verification={data.verification}
/>
```

- [ ] **Step 4: Compile + visual check**

Run: `cd javelina && npx tsc --noEmit && npm run dev` and visit a domain detail page in the browser. Confirm:
- Active registered domain → "Reveal transfer code" button appears.
- Locked domain → button disabled with helper text.
- Transferred-in domain → verification pill renders.
- Stop the dev server when done (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
cd javelina
git add app/domains/[id]/page.tsx
git commit -m "feat(domains): integrate TransferVerificationCard + sync-on-load"
```

---

## Task 13: Domains list debounced sync

**Files:**
- Modify: `javelina/components/domains/DomainsList.tsx`

- [ ] **Step 1: Add session-scoped debounce sync**

Edit `DomainsList.tsx`. Add at the top of the component:

```tsx
import { useEffect, useRef } from 'react';
import { domainsApi } from '@/lib/api-client';

const syncedThisSession = new Set<string>();
```

Inside the component body, after props/state are set up:

```tsx
useEffect(() => {
  for (const d of domains) {
    if (d.status === 'transferring' && !syncedThisSession.has(d.id)) {
      syncedThisSession.add(d.id);
      domainsApi.syncDomain(d.id).catch(() => {});
    }
  }
}, [domains]);
```

(If `useEffect`/`useRef` are already imported in this file, don't duplicate the import.)

- [ ] **Step 2: Compile check**

Run: `cd javelina && npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
cd javelina
git add components/domains/DomainsList.tsx
git commit -m "feat(domains): debounced sync for transferring rows in list view"
```

---

## Task 14: Component tests

**Files:**
- Create: `javelina/app/domains/__tests__/TransferVerificationCard.test.tsx`

- [ ] **Step 1: Add render tests**

Create the test file:

```tsx
import { render, screen } from '@testing-library/react';
import { TransferVerificationCard } from '@/components/domains/TransferVerificationCard';
import type { Domain } from '@/types/domains';

const baseDomain: Domain = {
  id: 'd1',
  user_id: 'u1',
  domain_name: 'example.com',
  tld: '.com',
  status: 'active',
  registration_type: 'new',
  years: 1,
  auto_renew: false,
  currency: 'usd',
  created_at: '',
  updated_at: '',
};

jest.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({ addToast: jest.fn() }),
}));

describe('TransferVerificationCard', () => {
  it('renders nothing for linked domain', () => {
    const { container } = render(
      <TransferVerificationCard
        domain={{ ...baseDomain, registration_type: 'linked' }}
        domainLocked={false}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows reveal button for active registered domain', () => {
    render(<TransferVerificationCard domain={baseDomain} domainLocked={false} />);
    expect(screen.getByRole('button', { name: /reveal transfer code/i })).toBeEnabled();
  });

  it('disables reveal when domain is locked', () => {
    render(<TransferVerificationCard domain={baseDomain} domainLocked={true} />);
    expect(screen.getByRole('button', { name: /reveal transfer code/i })).toBeDisabled();
    expect(screen.getByText(/disable domain lock/i)).toBeInTheDocument();
  });

  it('shows verification pill for transferred domain', () => {
    render(
      <TransferVerificationCard
        domain={{ ...baseDomain, registration_type: 'transfer' }}
        domainLocked={false}
        verification={{ verified: false, deadline: '2099-01-01T00:00:00Z', email: 'a@b.com' }}
      />
    );
    expect(screen.getByText(/pending verification/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd javelina && npx jest TransferVerificationCard`
Expected: PASS (4 tests).

- [ ] **Step 3: Commit**

```bash
cd javelina
git add app/domains/__tests__/TransferVerificationCard.test.tsx
git commit -m "test(domains): TransferVerificationCard render tests"
```

---

## Task 15: Manual smoke test

- [ ] **Step 1: Start both stacks**

```bash
# terminal A
cd javelina-backend && npm run dev
# terminal B
cd javelina && npm run dev
```

- [ ] **Step 2: Verify each scenario**

In the browser:
1. Open an active registered domain → click "Reveal transfer code" → confirm code shows, copy works, hide works, auto-hides after 60s.
2. Enable Domain Lock → reload → confirm reveal button is disabled with helper text.
3. Open a transferred-in domain → confirm verification pill + email + deadline render. Click "Resend verification email" → success toast.
4. Open a `transferring` domain that completed at OpenSRS → reload page → status flips to "Active" + toast appears.
5. Open the domains list with a `transferring` row → confirm the sync fires once (check Network tab) and not on subsequent re-renders.

- [ ] **Step 3: Stop the dev servers**

Ctrl+C in each terminal.

---

## Self-Review

- **Spec coverage:** JAV-101 → Tasks 1, 4, 11, 12, 14. JAV-102 → Tasks 2, 5, 8, 12, 13. JAV-103 → Tasks 3, 6, 7, 9, 10, 11, 12, 14. Migration noted before Task 1. ✅
- **Placeholders:** none.
- **Type consistency:** `DomainVerification` shape matches across types/api-client/component/controller (`verified`, `deadline`, `email`).
- **Audit logging:** `domain.auth_code_revealed` (Task 4) and `domain.verification_resent` (Task 6) use `logAuditEvent` from `src/utils/audit-logging.ts`.
- **Cron pattern:** `node-cron` matches `expiry-reminders.ts`.

---

## Execution

Plan complete and saved to `docs/superpowers/plans/2026-05-08-domain-detail-enhancements.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.
