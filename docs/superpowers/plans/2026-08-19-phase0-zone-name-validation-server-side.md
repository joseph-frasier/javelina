# Phase 0: Move Zone-Name Validation Server-Side — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the browser's direct Supabase read of every organization's zone names, replacing it with a backend endpoint that returns only a boolean and a conflict reason.

**Architecture:** The backend already performs this exact validation inside `createZone` (`zonesController.ts:289-304`). Extract that logic into a reusable helper, expose it as `GET /zones/name-available`, and have `AddZoneModal` call it instead of querying Supabase from the browser. No new business logic is introduced — existing logic is relocated and exposed.

**Tech Stack:** Express 4 + TypeScript + Jest (backend, `javelina-backend`); Next.js 15 + React 19 + TypeScript + Vitest (frontend, `javelina`).

**Spec:** `docs/superpowers/specs/2026-08-19-aws-migration-design.md` (§6 "Phase 0 detail")

## Global Constraints

- **Two repositories.** Backend is `/Users/sethchesky/Documents/GitHub/javelina-backend`; frontend is `/Users/sethchesky/Documents/GitHub/javelina`. Each has its own git history — commit separately, never assume a shared root.
- **Local-first.** All verification happens against locally running services (backend `:3001`, frontend `:3000`). Nothing deploys to hosted dev until Task 6 passes.
- **Never run `npm run build` in `javelina` while the dev server is running** — it corrupts `.next`. Use `npx tsc --noEmit` to type-check.
- **No database changes.** This phase writes no migrations and mutates no data. Any DB apply is out of scope.
- **Branch:** `feat/aws-migration` in `javelina`. Create a matching `feat/aws-migration` branch in `javelina-backend` with `--no-track`.
- **Never set a branch upstream and never push.** The repository owner publishes branches manually.
- **The response must never include a zone list.** The entire point of this phase is that the browser stops receiving other organizations' zone names. Any shape wider than `{ available, conflict? }` fails review.

---

## File Structure

**Backend (`javelina-backend`):**

| File | Change | Responsibility |
|---|---|---|
| `src/controllers/zonesController.ts` | Modify | Add `checkZoneNameConflict` helper and `checkZoneNameAvailability` handler; refactor `createZone` to use the helper |
| `src/controllers/zonesController.nameAvailable.test.ts` | Create | Unit tests for the helper and the handler |
| `src/middleware/rateLimit.ts` | Modify | Add `zoneNameCheckRateLimiter` |
| `src/routes/zones.ts` | Modify | Register `GET /name-available` **before** `GET /:id` |

**Frontend (`javelina`):**

| File | Change | Responsibility |
|---|---|---|
| `lib/api-client.ts` | Modify | Add `zonesApi.checkNameAvailable` |
| `components/modals/AddZoneModal.tsx` | Modify | Remove Supabase client and `allZoneNames`; call the API on submit |
| `tests/components/AddZoneModal.nameCheck.test.tsx` | Create | Vitest coverage for the new behavior |
| `lib/supabase/service-role.ts` | **Delete** | Dead code — a service-role key helper in the frontend |
| `docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md` | Modify | Close issue #1 |
| `CLAUDE.md` | Modify | Correct the stale claim that the frontend uses Supabase Auth |

---

## Task 1: Backend — extract `checkZoneNameConflict`

**Files:**
- Modify: `src/controllers/zonesController.ts:289-304` (extract), plus a new exported helper
- Test: `src/controllers/zonesController.nameAvailable.test.ts` (create)

**Interfaces:**
- Consumes: `detectZoneOverlap(zoneName: string, existingZoneNames: string[]): string | null` from `../utils/validation`; `supabaseAdmin` from `../config/supabase`
- Produces:
  - `interface ZoneNameConflictResult { available: boolean; conflict?: string }`
  - `checkZoneNameConflict(name: string): Promise<ZoneNameConflictResult>`

- [ ] **Step 1: Create the branch**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend
git checkout dev
git checkout -b feat/aws-migration --no-track
git rev-parse --abbrev-ref '@{u}' 2>&1 | head -1   # expect: "fatal: no upstream configured"
```

- [ ] **Step 2: Write the failing test**

Create `src/controllers/zonesController.nameAvailable.test.ts`:

```typescript
import { checkZoneNameConflict } from "./zonesController";
import { supabaseAdmin } from "../config/supabase";

jest.mock("../config/supabase", () => ({
  supabaseAdmin: { from: jest.fn() },
}));

function mockZonesSelect(rows: Array<{ name: string }> | null, error: any = null) {
  const query = {
    select: jest.fn().mockResolvedValue({ data: rows, error }),
  };
  (supabaseAdmin.from as jest.Mock).mockReturnValue(query);
  return query;
}

describe("checkZoneNameConflict", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns available when no zone overlaps", async () => {
    mockZonesSelect([{ name: "other.com" }, { name: "unrelated.net" }]);

    await expect(checkZoneNameConflict("example.com")).resolves.toEqual({
      available: true,
    });
  });

  it("reports a conflict when the candidate is a subdomain of an existing zone", async () => {
    mockZonesSelect([{ name: "example.com" }]);

    await expect(checkZoneNameConflict("api.example.com")).resolves.toEqual({
      available: false,
      conflict: "example.com",
    });
  });

  it("reports a conflict when an existing zone is a subdomain of the candidate", async () => {
    mockZonesSelect([{ name: "api.example.com" }]);

    await expect(checkZoneNameConflict("example.com")).resolves.toEqual({
      available: false,
      conflict: "api.example.com",
    });
  });

  it("treats an exact match as available (the unique constraint handles it)", async () => {
    mockZonesSelect([{ name: "example.com" }]);

    await expect(checkZoneNameConflict("example.com")).resolves.toEqual({
      available: true,
    });
  });

  it("treats a null result set as no conflict", async () => {
    mockZonesSelect(null);

    await expect(checkZoneNameConflict("example.com")).resolves.toEqual({
      available: true,
    });
  });

  it("throws when the underlying query fails", async () => {
    mockZonesSelect(null, { message: "connection reset" });

    await expect(checkZoneNameConflict("example.com")).rejects.toThrow(
      "Failed to validate zone name: connection reset"
    );
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx jest src/controllers/zonesController.nameAvailable.test.ts
```

Expected: FAIL — `checkZoneNameConflict is not a function` (it is not exported yet).

- [ ] **Step 4: Add the helper**

In `src/controllers/zonesController.ts`, add immediately above `export const createZone`:

```typescript
export interface ZoneNameConflictResult {
  available: boolean;
  conflict?: string;
}

/**
 * Checks whether a zone name conflicts with an existing zone anywhere in the
 * system (parent/child relationships across all organizations).
 *
 * Deliberately returns only a boolean plus the conflicting name — never the
 * zone list. This runs with service-role access, so callers must not expose
 * anything wider to untrusted clients.
 */
export const checkZoneNameConflict = async (
  name: string
): Promise<ZoneNameConflictResult> => {
  const { data: allZones, error: fetchError } = await supabaseAdmin
    .from("zones")
    .select("name");

  if (fetchError) {
    throw new Error(`Failed to validate zone name: ${fetchError.message}`);
  }

  const existingZoneNames = (allZones || []).map((z: any) => z.name);
  const conflictingZone = detectZoneOverlap(name, existingZoneNames);

  return conflictingZone
    ? { available: false, conflict: conflictingZone }
    : { available: true };
};
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx jest src/controllers/zonesController.nameAvailable.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 6: Refactor `createZone` to use the helper**

In `src/controllers/zonesController.ts`, replace this block (currently lines 289-304):

```typescript
  // Fetch all zone names globally (including soft-deleted) to check for overlap
  const { data: allZones, error: fetchError } = await supabaseAdmin
    .from("zones")
    .select("name");

  if (fetchError) {
    throw new Error(`Failed to validate zone name: ${fetchError.message}`);
  }

  // Check for hierarchical zone conflicts
  const existingZoneNames = (allZones || []).map((z: any) => z.name);
  const conflictingZone = detectZoneOverlap(name, existingZoneNames);

  if (conflictingZone) {
    throw new ValidationError(
      `Zone conflicts with existing zone: ${conflictingZone}. Cannot create parent or child zones.`
    );
  }
```

with:

```typescript
  // Check for hierarchical zone conflicts (shared with GET /zones/name-available)
  const nameConflict = await checkZoneNameConflict(name);

  if (!nameConflict.available) {
    throw new ValidationError(
      `Zone conflicts with existing zone: ${nameConflict.conflict}. Cannot create parent or child zones.`
    );
  }
```

The error message is byte-identical to the original, so existing behavior and any tests asserting on it are unaffected.

- [ ] **Step 7: Verify nothing regressed**

```bash
npx tsc --noEmit
npx jest src/controllers/
```

Expected: type-check clean; all controller tests pass.

Note: `detectZoneOverlap` is still imported and used — by the helper rather than by `createZone` directly. Do not remove the import.

- [ ] **Step 8: Commit**

```bash
git add src/controllers/zonesController.ts src/controllers/zonesController.nameAvailable.test.ts
git commit -m "refactor(zones): extract checkZoneNameConflict from createZone

Pulls the global zone-overlap check out of createZone so it can be reused by
a read-only availability endpoint. Behavior and error text are unchanged.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Backend — `GET /zones/name-available`

**Files:**
- Modify: `src/middleware/rateLimit.ts` (add limiter)
- Modify: `src/controllers/zonesController.ts` (add handler)
- Modify: `src/routes/zones.ts` (register route)
- Test: `src/controllers/zonesController.nameAvailable.test.ts` (extend)

**Interfaces:**
- Consumes: `checkZoneNameConflict` (Task 1); `validateDomainName`, `validateMinimumLabels`, `validateRequired` from `../utils/validation`; `sendSuccess` from `../utils/response`; `ValidationError` from `../types`
- Produces:
  - `checkZoneNameAvailability(req: AuthenticatedRequest, res: Response): Promise<void>` — responds `{ success: true, data: { available: boolean, conflict?: string } }`
  - `zoneNameCheckRateLimiter` exported from `../middleware/rateLimit`

- [ ] **Step 1: Add the rate limiter**

In `src/middleware/rateLimit.ts`, add after `zoneCreationRateLimiter` (line ~115):

```typescript
/**
 * Rate limiter for zone-name availability checks
 * 60 checks per minute per IP — read-only, but it probes global zone state,
 * so it should not be cheap to enumerate against.
 */
export const zoneNameCheckRateLimiter = createRateLimiter(
  60 * 1000, // 1 minute window
  60, // 60 checks per minute
  "Too many zone name checks. Please try again in a minute."
);
```

- [ ] **Step 2: Write the failing test**

First, update the existing import at the top of
`src/controllers/zonesController.nameAvailable.test.ts` to pull in the new handler:

```typescript
import { checkZoneNameConflict, checkZoneNameAvailability } from "./zonesController";
```

Then append the following to the end of the same file:

```typescript
function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("checkZoneNameAvailability handler", () => {
  beforeEach(() => jest.clearAllMocks());

  it("responds available:true for a non-conflicting name", async () => {
    mockZonesSelect([{ name: "other.com" }]);
    const res = mockRes();

    await checkZoneNameAvailability(
      { query: { name: "example.com" } } as any,
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { available: true },
      message: undefined,
    });
  });

  it("responds available:false with the conflicting zone name", async () => {
    mockZonesSelect([{ name: "example.com" }]);
    const res = mockRes();

    await checkZoneNameAvailability(
      { query: { name: "api.example.com" } } as any,
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { available: false, conflict: "example.com" },
      message: undefined,
    });
  });

  it("never leaks the zone list in the response", async () => {
    mockZonesSelect([
      { name: "customer-a.com" },
      { name: "customer-b.com" },
      { name: "customer-c.com" },
    ]);
    const res = mockRes();

    await checkZoneNameAvailability(
      { query: { name: "example.com" } } as any,
      res
    );

    const serialized = JSON.stringify(res.json.mock.calls[0][0]);
    expect(serialized).not.toContain("customer-a.com");
    expect(serialized).not.toContain("customer-b.com");
    expect(serialized).not.toContain("customer-c.com");
  });

  it("rejects a missing name", async () => {
    const res = mockRes();

    await expect(
      checkZoneNameAvailability({ query: {} } as any, res)
    ).rejects.toThrow();

    expect(supabaseAdmin.from as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects a malformed domain without querying the database", async () => {
    const res = mockRes();

    await expect(
      checkZoneNameAvailability({ query: { name: "not a domain" } } as any, res)
    ).rejects.toThrow("Zone name must be a valid domain name (max 253 characters)");

    expect(supabaseAdmin.from as jest.Mock).not.toHaveBeenCalled();
  });

  it("rejects a single-label name without querying the database", async () => {
    const res = mockRes();

    await expect(
      checkZoneNameAvailability({ query: { name: "example" } } as any, res)
    ).rejects.toThrow("at least 2 labels");

    expect(supabaseAdmin.from as jest.Mock).not.toHaveBeenCalled();
  });

  it("trims surrounding whitespace before validating", async () => {
    mockZonesSelect([]);
    const res = mockRes();

    await checkZoneNameAvailability(
      { query: { name: "  example.com  " } } as any,
      res
    );

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: { available: true },
      message: undefined,
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npx jest src/controllers/zonesController.nameAvailable.test.ts
```

Expected: FAIL — `checkZoneNameAvailability is not a function`.

- [ ] **Step 4: Add the handler**

In `src/controllers/zonesController.ts`, add directly after `checkZoneNameConflict`:

```typescript
/**
 * GET /api/zones/name-available?name=example.com
 *
 * Read-only zone-name availability check for client-side form validation.
 *
 * Returns ONLY { available, conflict? }. It must never return the zone list —
 * that would reproduce the cross-tenant enumeration this endpoint exists to
 * eliminate. See docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md.
 *
 * This is a UX affordance. POST /api/zones performs the same check
 * authoritatively, so a failure here is never a correctness gap.
 */
export const checkZoneNameAvailability = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const rawName = typeof req.query.name === "string" ? req.query.name : "";
  const name = rawName.trim();

  validateRequired({ name }, ["name"]);

  if (!validateDomainName(name)) {
    throw new ValidationError(
      "Zone name must be a valid domain name (max 253 characters)"
    );
  }

  if (!validateMinimumLabels(name)) {
    throw new ValidationError(
      'Zone name must have at least 2 labels (e.g., example.com, not just "example")'
    );
  }

  const result = await checkZoneNameConflict(name);

  sendSuccess(res, result);
};
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npx jest src/controllers/zonesController.nameAvailable.test.ts
```

Expected: PASS — 13 tests total across both describes.

- [ ] **Step 6: Register the route**

In `src/routes/zones.ts`, add the import to line 7:

```typescript
import { zoneCreationRateLimiter, mutationRateLimiter, zoneNameCheckRateLimiter } from "../middleware/rateLimit";
```

Then insert this line **immediately after line 18** (the `router.post("/")` line) and **before** the `GET /organization/:orgId` and `GET /:id` routes:

```typescript
router.get("/name-available", requireScopes("dns:read"), zoneNameCheckRateLimiter, asyncHandler(controller.checkZoneNameAvailability));
```

**Ordering is load-bearing.** Express matches routes in registration order. If `router.get("/:id")` (line 23) were registered first, a request to `/zones/name-available` would match it and be treated as a zone lookup with `id === "name-available"`. The new route must come before it.

- [ ] **Step 7: Verify route ordering and types**

```bash
npx tsc --noEmit
grep -n 'router.get' src/routes/zones.ts
```

Expected: type-check clean, and `/name-available` appears on a line numbered lower than the `/:id` line.

- [ ] **Step 8: Verify the endpoint against the running backend**

```bash
npm run dev            # leave running in a separate terminal; backend on :3001
```

In another terminal, confirm the route exists and is authenticated (all `/zones` routes sit behind `router.use(authenticate)` at line 14):

```bash
curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:3001/api/zones/name-available?name=example.com'
```

Expected: `401` — proving the route resolves and is auth-protected rather than falling through to `/:id`. A `404` means the route was registered in the wrong position; a `200` means authentication is not applied and must be investigated before proceeding.

- [ ] **Step 9: Run the full backend suite**

```bash
npx jest
```

Expected: PASS, with no new failures relative to `dev`.

- [ ] **Step 10: Commit**

```bash
git add src/controllers/zonesController.ts src/controllers/zonesController.nameAvailable.test.ts src/routes/zones.ts src/middleware/rateLimit.ts
git commit -m "feat(zones): add GET /zones/name-available

Read-only zone-name availability check returning only { available, conflict? }.
Replaces the browser's direct Supabase read of every organization's zone names.
Registered before GET /:id so it is not shadowed.

Refs docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md issue #1

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Frontend — add the API client method

**Files:**
- Modify: `lib/api-client.ts:437-486` (the `zonesApi` object)

**Interfaces:**
- Consumes: `apiClient.get` — note that `apiRequest` unwraps the `{ success, data }` envelope (`lib/api-client.ts:93`), so the resolved value is the inner object
- Produces: `zonesApi.checkNameAvailable(name: string): Promise<{ available: boolean; conflict?: string }>`

- [ ] **Step 1: Create the frontend branch (if not already on it)**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git branch --show-current    # expect: feat/aws-migration
```

If it is not `feat/aws-migration`, run `git checkout feat/aws-migration`.

- [ ] **Step 2: Add the method**

In `lib/api-client.ts`, inside the `zonesApi` object, add after the `create` method (line ~464):

```typescript
  /**
   * Check whether a zone name is available (no parent/child conflict).
   *
   * Server-side replacement for the former browser-side read of all zone
   * names. Returns only a boolean and the conflicting name — never a list.
   */
  checkNameAvailable: (name: string): Promise<{ available: boolean; conflict?: string }> => {
    return apiClient.get(`/zones/name-available?name=${encodeURIComponent(name)}`);
  },
```

`encodeURIComponent` is required — zone names are user input and go into a query string.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: clean. Do **not** run `npm run build` — it corrupts `.next` while the dev server is running.

- [ ] **Step 4: Commit**

```bash
git add lib/api-client.ts
git commit -m "feat(api-client): add zonesApi.checkNameAvailable

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Frontend — remove Supabase from `AddZoneModal`

**Files:**
- Modify: `components/modals/AddZoneModal.tsx` — imports (lines 14-15), state (line 44), the fetch effect (lines 69-96), the validation block (lines 164-169), and `handleSubmit` (line ~188)
- Test: `tests/components/AddZoneModal.nameCheck.test.tsx` (create)

**Interfaces:**
- Consumes: `zonesApi.checkNameAvailable` (Task 3)
- Produces: no exported interface change — `AddZoneModalProps` is unchanged

**Design note:** the overlap check moves from synchronous (against a preloaded list) to asynchronous (one request at submit time). `validateForm()` stays synchronous and keeps the format checks; the conflict check runs in `handleSubmit` after `validateForm()` passes. User-visible behavior is unchanged — the conflict error already only surfaced on submit.

- [ ] **Step 1: Write the failing test**

Create `tests/components/AddZoneModal.nameCheck.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddZoneModal } from '@/components/modals/AddZoneModal';

vi.mock('@/lib/api-client', () => ({
  zonesApi: { checkNameAvailable: vi.fn() },
  subscriptionsApi: { getOrgPlan: vi.fn().mockResolvedValue({ plan_code: 'pro' }) },
}));

vi.mock('@/lib/actions/zones', () => ({
  createZone: vi.fn().mockResolvedValue({ data: { id: 'z1', name: 'example.com' } }),
}));

vi.mock('@/lib/supabase/client', () => {
  throw new Error('AddZoneModal must not import the Supabase browser client');
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({ limits: { zones: -1 }, tier: 'pro', wouldExceedLimit: () => false }),
}));

vi.mock('@/lib/hooks/useUsageCounts', () => ({
  useUsageCounts: () => ({ usage: { zones: 0 }, refetch: vi.fn() }),
}));

vi.mock('@/lib/hooks/useFeatureFlags', () => ({
  useFeatureFlags: () => ({ hideUpgradeLimitCta: false }),
}));

import { zonesApi } from '@/lib/api-client';
import { createZone } from '@/lib/actions/zones';

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  organizationId: '11111111-1111-4111-8111-111111111111',
  organizationName: 'Acme',
  planCode: 'pro',
};

function fillAndSubmit(name: string) {
  const nameInput = screen.getByLabelText(/zone name/i);
  fireEvent.change(nameInput, { target: { value: name } });
  fireEvent.submit(nameInput.closest('form')!);
}

describe('AddZoneModal server-side name validation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks the backend whether the name is available', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({ available: true });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(zonesApi.checkNameAvailable).toHaveBeenCalledWith('example.com');
    });
  });

  it('blocks submission and shows the conflict when the backend reports one', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({
      available: false,
      conflict: 'example.com',
    });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('api.example.com');

    await waitFor(() => {
      expect(
        screen.getByText(/conflicts with existing zone: example\.com/i)
      ).toBeInTheDocument();
    });
    expect(createZone).not.toHaveBeenCalled();
  });

  it('proceeds to create the zone when the name is available', async () => {
    (zonesApi.checkNameAvailable as any).mockResolvedValue({ available: true });

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(createZone).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'example.com' })
      );
    });
  });

  it('still creates the zone if the availability check errors (POST /zones enforces it)', async () => {
    (zonesApi.checkNameAvailable as any).mockRejectedValue(new Error('network down'));

    render(<AddZoneModal {...defaultProps} />);
    fillAndSubmit('example.com');

    await waitFor(() => {
      expect(createZone).toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run tests/components/AddZoneModal.nameCheck.test.tsx
```

Expected: FAIL — the `@/lib/supabase/client` mock throws, because the component still imports it.

- [ ] **Step 3: Remove the Supabase import and add the API import**

In `components/modals/AddZoneModal.tsx`, delete line 15:

```typescript
import { createClient } from '@/lib/supabase/client';
```

and change line 16 from:

```typescript
import { subscriptionsApi } from '@/lib/api-client';
```

to:

```typescript
import { subscriptionsApi, zonesApi } from '@/lib/api-client';
```

Also delete line 14, which is now unused:

```typescript
import { detectZoneOverlap } from '@/lib/utils/dns-validation';
```

Leave `lib/utils/dns-validation.ts` itself in place — other modules import from it.

- [ ] **Step 4: Remove the state and the fetch effect**

Delete line 44:

```typescript
  const [allZoneNames, setAllZoneNames] = useState<string[]>([]);
```

Delete the entire effect at lines 69-96, from the `// Fetch all zone names globally for overlap detection` comment through the closing `}, [isOpen]);`.

- [ ] **Step 5: Remove the synchronous overlap check**

In `validateForm`, replace lines 163-169:

```typescript
      } else {
        // Check for zone overlap (hierarchical conflicts)
        const overlapResult = detectZoneOverlap(name, allZoneNames);
        if (overlapResult.hasOverlap) {
          newErrors.name = `Zone conflicts with existing zone: ${overlapResult.conflictingZone}`;
        }
      }
```

with:

```typescript
      }
      // Hierarchical overlap is checked server-side in handleSubmit via
      // zonesApi.checkNameAvailable — the browser must not read global zone names.
```

- [ ] **Step 6: Add the server-side check to `handleSubmit`**

In `handleSubmit`, immediately after `setErrors({});` and before the `try {` that calls `createZone`, insert:

```typescript
    // Server-side hierarchical overlap check. Advisory only: POST /zones
    // performs the same check authoritatively, so a failure here must not
    // block a legitimate creation.
    const candidateName = name.trim().toLowerCase();
    try {
      const availability = await zonesApi.checkNameAvailable(candidateName);
      if (!availability.available) {
        setErrors({
          name: `Zone conflicts with existing zone: ${availability.conflict}`,
        });
        setIsSubmitting(false);
        return;
      }
    } catch {
      // Non-blocking by design — the create request enforces this server-side.
    }
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
npx vitest run tests/components/AddZoneModal.nameCheck.test.tsx
```

Expected: PASS — 4 tests.

- [ ] **Step 8: Confirm no Supabase references remain in the component**

```bash
grep -n "supabase\|allZoneNames\|detectZoneOverlap" components/modals/AddZoneModal.tsx
```

Expected: no output.

- [ ] **Step 9: Type-check and run the frontend suite**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: type-check clean; no new test failures relative to `dev`.

- [ ] **Step 10: Commit**

```bash
git add components/modals/AddZoneModal.tsx tests/components/AddZoneModal.nameCheck.test.tsx
git commit -m "fix(zones): move zone-name overlap check server-side

AddZoneModal no longer reads every organization's zone names from the browser.
It calls GET /zones/name-available, which returns only { available, conflict? }.

This also repairs the check for Auth0 users: the old query ran as anon with no
Supabase session, so RLS returned nothing and validation silently no-opped.

Closes issue #1 in docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Frontend — delete the dead service-role helper

**Files:**
- Delete: `lib/supabase/service-role.ts`

**Interfaces:**
- Consumes: nothing
- Produces: nothing

- [ ] **Step 1: Prove it is unreferenced**

```bash
grep -rn "service-role" app lib components tests "--include=*.ts" "--include=*.tsx"
```

Expected: only the file's own path, or no output. **If any importer appears, stop** and report it — the file is not dead and this task does not apply.

- [ ] **Step 2: Delete it**

```bash
git rm lib/supabase/service-role.ts
```

- [ ] **Step 3: Verify nothing broke**

```bash
npx tsc --noEmit
npx vitest run
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(supabase): remove unused frontend service-role client

Dead code — imported by nothing. A service-role key helper has no place in
the frontend, where the key would be exposed if ever wired up.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Local end-to-end verification and documentation

**Files:**
- Modify: `docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything from Tasks 1-5
- Produces: nothing consumed by later tasks

- [ ] **Step 1: Start both services locally**

```bash
# terminal 1
npm run env:dev && npm run dev

# terminal 2
cd /Users/sethchesky/Documents/GitHub/javelina && npm run dev
```

Backend on `:3001`, frontend on `:3000`.

- [ ] **Step 2: Manually verify the happy path**

1. Log in at `http://localhost:3000` **as an Auth0 user** — this is the case that was broken before.
2. Open an organization page and click **Add Zone**.
3. Enter a zone name that does not conflict; submit.
4. Expected: the zone is created and a success toast appears.

- [ ] **Step 3: Manually verify the conflict path**

1. Note an existing zone name in the organization, e.g. `example.com`.
2. Open **Add Zone** and enter a child of it, e.g. `api.example.com`; submit.
3. Expected: the form shows `Zone conflicts with existing zone: example.com` and no zone is created.
4. **This is the regression-fix check** — before this change, an Auth0 user saw no conflict error at all, because the browser query returned nothing.

- [ ] **Step 4: Verify the second caller**

`AddZoneModal` has two call sites (spec §6, item 5). Step 2 exercised
`app/organization/[orgId]/OrganizationClient.tsx`; this step covers the other.

1. Navigate to a domain detail page, `http://localhost:3000/domains/<id>`
   (`app/domains/[id]/page.tsx:1126` renders the modal).
2. Open **Add Zone** from that page.
3. Repeat the happy path and the conflict path from Steps 2 and 3.
4. Expected: identical behavior in both locations.

- [ ] **Step 5: Confirm the browser no longer reads zone names**

1. Open DevTools → Network, filter by `supabase`.
2. Open the **Add Zone** modal.
3. Expected: **no** request to any `*.supabase.co` host.
4. Filter by `name-available`. Expected: on submit, exactly one request whose JSON response contains only `available` and optionally `conflict` — **no zone list**.

- [ ] **Step 6: Close the debt document's issue #1**

In `docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md`, replace the `## 1. …` section heading and body with:

```markdown
## 1. ~~Zone-name validation reads ALL orgs' zones~~ — RESOLVED 2026-08-19

Resolved by `GET /zones/name-available` (`zonesController.checkZoneNameAvailability`),
which runs the overlap check with service-role access and returns only
`{ available, conflict? }`. `AddZoneModal` no longer imports the Supabase browser
client. The unused `lib/supabase/service-role.ts` was deleted at the same time.

This also repaired the check for Auth0 users, for whom the old browser query
silently returned nothing.
```

Leave the header's `**Status:**` line as open — issue #2 (`AvatarUpload`) remains, and is Phase 4 of the AWS migration spec.

- [ ] **Step 7: Correct the stale claim in `CLAUDE.md`**

In `CLAUDE.md`, in the **Tech Stack** section, the `**Auth**` line currently states that Supabase Auth is used for "legacy (pre-Auth0 users) + the staff admin portal only". The frontend has **zero** `supabase.auth.*` call sites. Replace that line with:

```markdown
- **Auth**: Auth0 only (Universal Login; backend handles callback and sets a BFF session cookie). The frontend makes no Supabase Auth calls. `public.profiles` is the canonical identity table — `auth.users` is deprecated. Six backend `auth.admin.*` calls remain in `adminController`/`stripeController` and are scheduled for removal in the AWS migration. See `docs/architecture/AUTH0_SUPABASE_HYBRID_MODEL.md`.
```

Then, in the **Exceptions (do NOT "fix" these)** section, delete exception 1 ("Supabase Auth (legacy)") entirely — it describes behavior that does not exist.

- [ ] **Step 8: Verify the whole suite one final time**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit && npx vitest run
cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit && npx jest
```

Expected: all four commands clean.

- [ ] **Step 9: Commit**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina
git add docs/architecture/DIRECT_SUPABASE_ACCESS_DEBT.md CLAUDE.md
git commit -m "docs: close direct-Supabase debt issue #1; correct stale auth claim

CLAUDE.md described legacy Supabase Auth in the frontend; there are zero
supabase.auth.* call sites. Auth0 owns login end to end.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 10: Report branch state — do not push**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina && git log --oneline dev..HEAD
cd /Users/sethchesky/Documents/GitHub/javelina-backend && git log --oneline dev..HEAD
```

Both branches stay local with no upstream. The repository owner publishes them and deploys to hosted dev manually.

---

## Done When

- [ ] `components/modals/AddZoneModal.tsx` contains no reference to `supabase`
- [ ] `lib/supabase/service-role.ts` no longer exists
- [ ] `GET /zones/name-available` returns `{ available, conflict? }` and never a zone list
- [ ] Zone-overlap validation works for Auth0 users (it did not before)
- [ ] `GET /zones/name-available` is registered before `GET /:id`
- [ ] Backend and frontend suites pass; both type-check clean
- [ ] Issue #1 in `DIRECT_SUPABASE_ACCESS_DEBT.md` marked resolved; issue #2 left open
- [ ] `CLAUDE.md` no longer claims the frontend uses Supabase Auth
- [ ] Verified locally on `:3000`/`:3001`; nothing deployed to hosted dev
- [ ] Both branches local, no upstream, not pushed
