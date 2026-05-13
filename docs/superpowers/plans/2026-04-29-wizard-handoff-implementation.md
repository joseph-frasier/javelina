# Wizard Backend Handoff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the business setup wizard off localStorage onto Postgres so it persists server-side, fix the "My Business" header visibility on dev, and forward the submitted form data to the Intake App at wizard completion.

**Architecture:** Drafts persist to `organizations.settings.business_intake` (jsonb) on Javelina via per-step PATCH calls. On final submit, Javelina forwards the assembled payload to the Intake App's `POST /api/internal/intake-submission` endpoint and marks the local intake as completed. The dashboard reads server state for header visibility, intake data, provisioning status, and pipeline events. No new tables, columns, or enums.

**Tech Stack:**
- Backend: Express + TypeScript (`javelina-backend`), Supabase admin client (`supabaseAdmin`), Auth0 session middleware
- Frontend: Next.js App Router (`javelina`), Zustand for in-flight UI state, React Query for server state, fetch-based server actions for API calls
- Verification: curl for backend, browser flow for end-to-end

**Out of scope** (handled in a separate plan): wizard image uploads, drag-and-drop, image optimization, orphan cleanup automation.

---

## File Structure

### `javelina-backend` (new)

| File | Responsibility |
|---|---|
| `src/config/intakeApp.ts` | Reads `INTAKE_APP_INTERNAL_URL` and `INTAKE_APP_INTERNAL_TOKEN` from env; exposes typed config |
| `src/services/intakeApp.ts` | Single function `forwardSubmission(payload)` that POSTs to the Intake App with the service-to-service token; handles error mapping |
| `src/controllers/businessIntakeController.ts` | Four route handlers (listMyBusinesses, getBusiness, upsertIntakeDraft, completeIntake) |
| `src/routes/businessIntake.ts` | Route registration with auth + member checks |

### `javelina-backend` (modified)

| File | Change |
|---|---|
| `src/routes/index.ts` | Mount the new `businessIntake` router at `/business` |

### `javelina` (new)

| File | Responsibility |
|---|---|
| `lib/api/business.ts` | Server-side fetch helpers for the four endpoints, mirroring `lib/api/audit.ts` pattern |
| `app/business/[orgId]/IntakeIncompleteState.tsx` | Empty-state component shown when dashboard loads but intake isn't complete |

### `javelina` (modified)

| File | Change |
|---|---|
| `lib/business-intake-store.ts` | Drop `persist()`; add `hydrate(data)` action; remove the `intakes` cross-org map (kept thin for in-flight wizard only) |
| `components/layout/Header.tsx` | Replace local-store check with React Query call to `/api/business/me` |
| `components/business/wizard/BusinessWizardShell.tsx` | Per-step debounced PATCH to `/intake`; on `complete()` call `/intake/complete` |
| `app/business/[orgId]/layout.tsx` | Read intake completion from server (via React Query); redirect-or-empty-state instead of local-store check |
| `app/business/[orgId]/page.tsx` | Fetch from server via `lib/api/business.ts`; render empty state when intake incomplete |

---

## Task 1: Backend — Intake App service config

**Files:**
- Create: `javelina-backend/src/config/intakeApp.ts`

- [ ] **Step 1: Create the config module**

```ts
// javelina-backend/src/config/intakeApp.ts
export const intakeAppConfig = {
  internalUrl: process.env.INTAKE_APP_INTERNAL_URL || "",
  internalToken: process.env.INTAKE_APP_INTERNAL_TOKEN || "",
  get isConfigured(): boolean {
    return !!(this.internalUrl && this.internalToken);
  },
};

if (process.env.NODE_ENV !== "production") {
  if (intakeAppConfig.isConfigured) {
    console.log(`✅ Intake App configured at ${intakeAppConfig.internalUrl}`);
  } else {
    console.warn(
      "⚠️ Intake App not configured. Set INTAKE_APP_INTERNAL_URL and INTAKE_APP_INTERNAL_TOKEN."
    );
  }
}
```

- [ ] **Step 2: Add the env vars to local `.env` documentation**

Append to `javelina-backend/.env.example` (create entry if file exists; if not, skip):

```
# Intake App service-to-service (Option A wizard handoff)
INTAKE_APP_INTERNAL_URL=
INTAKE_APP_INTERNAL_TOKEN=
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/config/intakeApp.ts .env.example
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): add Intake App service-to-service config"
```

---

## Task 2: Backend — Intake App forwarder service

**Files:**
- Create: `javelina-backend/src/services/intakeApp.ts`

- [ ] **Step 1: Create the forwarder**

```ts
// javelina-backend/src/services/intakeApp.ts
import axios from "axios";
import { intakeAppConfig } from "../config/intakeApp";

export interface IntakeSubmissionPayload {
  org_id: string;
  submission_id: string;
  lead_record: Record<string, unknown>;
}

export class IntakeAppError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "IntakeAppError";
  }
}

export async function forwardSubmission(
  payload: IntakeSubmissionPayload
): Promise<void> {
  if (!intakeAppConfig.isConfigured) {
    throw new IntakeAppError("Intake App not configured", 500);
  }

  const url = `${intakeAppConfig.internalUrl}/api/internal/intake-submission`;
  const response = await axios.post(url, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${intakeAppConfig.internalToken}`,
    },
    timeout: 30000,
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    throw new IntakeAppError(
      `Intake App returned ${response.status}`,
      response.status,
      response.data
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/services/intakeApp.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): add Intake App submission forwarder"
```

---

## Task 3: Backend — Controller + route skeleton

**Files:**
- Create: `javelina-backend/src/controllers/businessIntakeController.ts`
- Create: `javelina-backend/src/routes/businessIntake.ts`
- Modify: `javelina-backend/src/routes/index.ts`

- [ ] **Step 1: Create the controller skeleton**

```ts
// javelina-backend/src/controllers/businessIntakeController.ts
import { Response } from "express";
import { supabaseAdmin } from "../config/supabase";
import { AuthenticatedRequest } from "../types";
import { sendSuccess } from "../utils/response";

export async function listMyBusinesses(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function getBusiness(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function upsertIntakeDraft(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function completeIntake(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}
```

- [ ] **Step 2: Create the route file**

```ts
// javelina-backend/src/routes/businessIntake.ts
import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { requireOrgMember } from "../middleware/rbac";
import * as controller from "../controllers/businessIntakeController";

const router = Router();

router.use(authenticate);

router.get("/me", asyncHandler(controller.listMyBusinesses));
router.get(
  "/:orgId",
  requireOrgMember(),
  asyncHandler(controller.getBusiness)
);
router.post(
  "/:orgId/intake",
  requireOrgMember(),
  asyncHandler(controller.upsertIntakeDraft)
);
router.post(
  "/:orgId/intake/complete",
  requireOrgMember(),
  asyncHandler(controller.completeIntake)
);

export default router;
```

- [ ] **Step 3: Mount the router**

In `javelina-backend/src/routes/index.ts`, add the import after the existing imports block:

```ts
import businessIntakeRoutes from "./businessIntake";
```

And add the mount line near the bottom of the existing mounts (e.g. after `mailbox`):

```ts
router.use("/business", businessIntakeRoutes);
```

- [ ] **Step 4: Verify it boots**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors

(If a dev server is running locally, hit `curl -i http://localhost:3001/api/business/me` — expect 401 from the auth middleware, which confirms the route is mounted.)

- [ ] **Step 5: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts src/routes/businessIntake.ts src/routes/index.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): scaffold business intake controller and routes"
```

---

## Task 4: Backend — Implement `GET /api/business/me`

Returns orgs the user belongs to that have any `provisioning_status` row (Option A header visibility).

**Files:**
- Modify: `javelina-backend/src/controllers/businessIntakeController.ts`

- [ ] **Step 1: Replace the `listMyBusinesses` stub**

```ts
export async function listMyBusinesses(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const userId = req.user!.id;

  // Orgs where user is an active member
  const { data: memberships, error: memErr } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (memErr) {
    throw new Error(`Failed to load memberships: ${memErr.message}`);
  }

  const orgIds = (memberships ?? []).map((m: any) => m.organization_id);
  if (orgIds.length === 0) {
    sendSuccess(res, { businesses: [] });
    return;
  }

  // Filter to orgs that already have provisioning_status rows
  const { data: provRows, error: provErr } = await supabaseAdmin
    .from("provisioning_status")
    .select("org_id")
    .in("org_id", orgIds);

  if (provErr) {
    throw new Error(`Failed to load provisioning_status: ${provErr.message}`);
  }

  const orgIdsWithProv = Array.from(
    new Set((provRows ?? []).map((r: any) => r.org_id))
  );

  if (orgIdsWithProv.length === 0) {
    sendSuccess(res, { businesses: [] });
    return;
  }

  const { data: orgs, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id, name, settings")
    .in("id", orgIdsWithProv);

  if (orgErr) {
    throw new Error(`Failed to load organizations: ${orgErr.message}`);
  }

  const businesses = (orgs ?? []).map((o: any) => {
    const intake = o.settings?.business_intake;
    return {
      org_id: o.id,
      name: o.name,
      intake_started_at: intake?.started_at ?? null,
      intake_completed_at: intake?.completed_at ?? null,
    };
  });

  sendSuccess(res, { businesses });
}
```

- [ ] **Step 2: Verify with curl**

Start the backend if not running. With a valid `javelina_session` cookie for a user that owns an org with provisioning_status rows:

```bash
curl -s -b "javelina_session=<token>" http://localhost:3001/api/business/me
```

Expected: `200 { "data": { "businesses": [{ "org_id": "...", "name": "...", "intake_started_at": ..., "intake_completed_at": ... }] } }` (shape may vary — confirm `businesses` is an array; for a fresh user who has paid but hasn't started the wizard, `intake_started_at` should be null).

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement GET /api/business/me for header visibility"
```

---

## Task 5: Backend — Implement `GET /api/business/:orgId`

Returns the dashboard payload: org row, intake jsonb, provisioning_status rows, recent pipeline_events.

**Files:**
- Modify: `javelina-backend/src/controllers/businessIntakeController.ts`

- [ ] **Step 1: Replace the `getBusiness` stub**

```ts
export async function getBusiness(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;

  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id, name, slug, status, settings, created_at")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    res.status(404).json({ error: "organization_not_found" });
    return;
  }

  const { data: prov, error: provErr } = await supabaseAdmin
    .from("provisioning_status")
    .select("service, state, internal_state, progress_label, metadata, updated_at")
    .eq("org_id", orgId);

  if (provErr) {
    throw new Error(`Failed to load provisioning_status: ${provErr.message}`);
  }

  const { data: events, error: evErr } = await supabaseAdmin
    .from("pipeline_events")
    .select(
      "id, service, previous_state, new_state, message, actor_type, created_at"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (evErr) {
    throw new Error(`Failed to load pipeline_events: ${evErr.message}`);
  }

  sendSuccess(res, {
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      status: org.status,
      created_at: org.created_at,
    },
    intake: org.settings?.business_intake ?? null,
    provisioning: prov ?? [],
    events: events ?? [],
  });
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s -b "javelina_session=<token>" http://localhost:3001/api/business/<orgId>
```

Expected: `200` with `{ data: { org, intake, provisioning, events } }`. For a user not in the org, `requireOrgMember` middleware should return `403` before the handler runs.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement GET /api/business/:orgId for dashboard"
```

---

## Task 6: Backend — Implement `POST /api/business/:orgId/intake` (draft upsert)

Merges the request body into `organizations.settings.business_intake`. The wizard calls this per step.

**Files:**
- Modify: `javelina-backend/src/controllers/businessIntakeController.ts`

- [ ] **Step 1: Add a helper for jsonb deep merge**

At the top of the controller file (after imports), add:

```ts
type Json = Record<string, unknown>;

function deepMerge(base: Json, patch: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    const current = out[k];
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      typeof current === "object" &&
      current !== null &&
      !Array.isArray(current)
    ) {
      out[k] = deepMerge(current as Json, v as Json);
    } else {
      out[k] = v;
    }
  }
  return out;
}
```

- [ ] **Step 2: Replace the `upsertIntakeDraft` stub**

```ts
export async function upsertIntakeDraft(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;
  const patch = req.body?.intake;

  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    res.status(400).json({ error: "invalid_intake_payload" });
    return;
  }

  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    res.status(404).json({ error: "organization_not_found" });
    return;
  }

  const settings = (org.settings ?? {}) as Json;
  const existingIntake = (settings.business_intake ?? {}) as Json;

  const mergedIntake = {
    ...deepMerge(existingIntake, patch as Json),
    started_at: existingIntake.started_at ?? new Date().toISOString(),
  };

  // Don't allow client to set completed_at via this endpoint
  if ("completed_at" in (patch as Json)) {
    delete (mergedIntake as Json).completed_at;
    if (existingIntake.completed_at) {
      mergedIntake.completed_at = existingIntake.completed_at;
    }
  }

  const newSettings = { ...settings, business_intake: mergedIntake };

  const { error: updErr } = await supabaseAdmin
    .from("organizations")
    .update({ settings: newSettings, updated_at: new Date().toISOString() })
    .eq("id", orgId);

  if (updErr) {
    throw new Error(`Failed to update settings: ${updErr.message}`);
  }

  sendSuccess(res, { intake: mergedIntake });
}
```

- [ ] **Step 3: Verify with curl**

```bash
curl -s -b "javelina_session=<token>" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/business/<orgId>/intake \
  -d '{"intake":{"website":{"bizName":"Test Co"}}}'
```

Expected: `200` with `{ data: { intake: { website: { bizName: "Test Co" }, started_at: "..." } } }`. Re-running with a different patch (e.g. `{"intake":{"contact":{"firstName":"Alice"}}}`) should preserve `website.bizName` from the prior call.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement POST /api/business/:orgId/intake draft upsert"
```

---

## Task 7: Backend — Implement `POST /api/business/:orgId/intake/complete`

Forwards the assembled payload to the Intake App and marks the local intake as completed on success.

**Files:**
- Modify: `javelina-backend/src/controllers/businessIntakeController.ts`

- [ ] **Step 1: Add imports at the top of the controller**

Add after the existing imports:

```ts
import { randomUUID } from "crypto";
import { forwardSubmission, IntakeAppError } from "../services/intakeApp";
```

- [ ] **Step 2: Replace the `completeIntake` stub**

```ts
export async function completeIntake(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;

  const { data: org, error: orgErr } = await supabaseAdmin
    .from("organizations")
    .select("id, name, settings")
    .eq("id", orgId)
    .single();

  if (orgErr || !org) {
    res.status(404).json({ error: "organization_not_found" });
    return;
  }

  const settings = (org.settings ?? {}) as Json;
  const intake = (settings.business_intake ?? null) as Json | null;

  if (!intake) {
    res.status(400).json({ error: "intake_not_started" });
    return;
  }

  // Idempotency: already completed
  if (intake.completed_at) {
    sendSuccess(res, { intake, already_completed: true });
    return;
  }

  const submissionId = randomUUID();
  const payload = {
    org_id: orgId,
    submission_id: submissionId,
    lead_record: {
      website: intake.website ?? {},
      contact: intake.contact ?? {},
      dns: intake.dns ?? {},
      domain: intake.domain ?? {},
    },
  };

  try {
    await forwardSubmission(payload);
  } catch (err) {
    const status =
      err instanceof IntakeAppError && err.status >= 400 && err.status < 500
        ? err.status
        : 502;
    res.status(status).json({
      error: "intake_app_forward_failed",
      detail: err instanceof Error ? err.message : "unknown",
    });
    return;
  }

  const completedAt = new Date().toISOString();
  const updatedIntake = { ...intake, completed_at: completedAt };
  const newSettings = { ...settings, business_intake: updatedIntake };

  const { error: updErr } = await supabaseAdmin
    .from("organizations")
    .update({ settings: newSettings, updated_at: completedAt })
    .eq("id", orgId);

  if (updErr) {
    // Note: at this point the Intake App already accepted the submission.
    // We surface a 500 so the caller knows local state didn't persist; the
    // Intake App's own idempotency on submission_id protects against retries.
    throw new Error(`Failed to mark intake completed: ${updErr.message}`);
  }

  sendSuccess(res, { intake: updatedIntake, submission_id: submissionId });
}
```

- [ ] **Step 3: Verify with curl**

With the Intake App not configured (no env vars set), the call should return 500 from the forwarder. With a stub that returns 200:

```bash
INTAKE_APP_INTERNAL_URL=http://localhost:9999 \
INTAKE_APP_INTERNAL_TOKEN=test \
# (in another terminal: nc -l 9999 or run a small Express stub returning 200)

curl -s -b "javelina_session=<token>" \
  -X POST http://localhost:3001/api/business/<orgId>/intake/complete
```

Expected on success: `200 { data: { intake: { ..., completed_at: "..." }, submission_id: "<uuid>" } }`. Re-running should return `{ already_completed: true }`.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement POST /api/business/:orgId/intake/complete"
```

---

## Task 8: Frontend — API helpers

**Files:**
- Create: `javelina/lib/api/business.ts`

- [ ] **Step 1: Create the API module**

```ts
// javelina/lib/api/business.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface BusinessSummary {
  org_id: string;
  name: string;
  intake_started_at: string | null;
  intake_completed_at: string | null;
}

export interface BusinessDetail {
  org: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    created_at: string;
  };
  intake: Record<string, unknown> | null;
  provisioning: Array<{
    service: string;
    state: string;
    internal_state: string | null;
    progress_label: string | null;
    metadata: Record<string, unknown>;
    updated_at: string;
  }>;
  events: Array<{
    id: string;
    service: string;
    previous_state: string | null;
    new_state: string;
    message: string | null;
    actor_type: string;
    created_at: string;
  }>;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export async function listMyBusinesses(): Promise<BusinessSummary[]> {
  const res = await authedFetch('/api/business/me');
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.businesses ?? [];
}

export async function getBusiness(orgId: string): Promise<BusinessDetail | null> {
  const res = await authedFetch(`/api/business/${orgId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function upsertIntakeDraft(
  orgId: string,
  patch: Record<string, unknown>
): Promise<{ intake: Record<string, unknown> } | null> {
  const res = await authedFetch(`/api/business/${orgId}/intake`, {
    method: 'POST',
    body: JSON.stringify({ intake: patch }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function completeIntake(
  orgId: string
): Promise<
  | { ok: true; intake: Record<string, unknown>; submission_id?: string; already_completed?: boolean }
  | { ok: false; error: string; status: number }
> {
  const res = await authedFetch(`/api/business/${orgId}/intake/complete`, {
    method: 'POST',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
  }
  return {
    ok: true,
    intake: json?.data?.intake ?? {},
    submission_id: json?.data?.submission_id,
    already_completed: json?.data?.already_completed,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep "lib/api/business" | head`
Expected: no output (no errors)

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add lib/api/business.ts
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): add frontend API helpers for business intake"
```

---

## Task 9: Frontend — Header visibility from server

**Files:**
- Modify: `javelina/components/layout/Header.tsx`

- [ ] **Step 1: Read the current Header file**

Run: `cat /Users/sethchesky/Documents/GitHub/javelina/components/layout/Header.tsx | head -40`

Identify the lines:

```ts
const hasBusinessIntakes = useBusinessIntakeStore(
  (s) => Object.keys(s.intakes).length > 0,
);
```

and the corresponding `useBusinessIntakeStore` import.

- [ ] **Step 2: Replace with React Query call**

Replace the `useBusinessIntakeStore` import and the `hasBusinessIntakes` line with:

```ts
import { useQuery } from '@tanstack/react-query';
import { listMyBusinesses } from '@/lib/api/business';

// inside the component:
const { data: businesses } = useQuery({
  queryKey: ['business', 'me'],
  queryFn: () => listMyBusinesses(),
  staleTime: 60_000,
});
const hasBusinessIntakes = (businesses?.length ?? 0) > 0;
```

The rest of the Header (lines 179–186 referencing `hasBusinessIntakes`) stays unchanged.

- [ ] **Step 3: Verify React Query is already a dependency**

Run: `grep "@tanstack/react-query" /Users/sethchesky/Documents/GitHub/javelina/package.json`
Expected: a version line is printed. If empty, install: `cd /Users/sethchesky/Documents/GitHub/javelina && npm install @tanstack/react-query` (note: confirm with user before running install)

- [ ] **Step 4: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep "Header" | head`
Expected: no output

- [ ] **Step 5: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add components/layout/Header.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): drive My Business header button from server state"
```

---

## Task 10: Frontend — Wizard per-step persistence

**Files:**
- Modify: `javelina/components/business/wizard/BusinessWizardShell.tsx`

- [ ] **Step 1: Read the wizard shell**

Run: `cat /Users/sethchesky/Documents/GitHub/javelina/components/business/wizard/BusinessWizardShell.tsx | head -120`

Identify where the user navigates between steps (the next/back button handlers). Look for the call site of `setStep` or wherever `currentStep` is incremented.

- [ ] **Step 2: Add a debounced server sync**

At the top of `BusinessWizardShell.tsx`, add:

```ts
import { useEffect, useRef } from 'react';
import { upsertIntakeDraft } from '@/lib/api/business';
```

Inside the component, after `const data = useBusinessIntakeStore(...)`, add:

```ts
const lastSyncedRef = useRef<string>('');
useEffect(() => {
  if (!data || !data.orgId) return;
  // Debounce: serialize the synced fields and only fire if changed
  const payload = {
    dns: data.dns,
    website: data.website,
    domain: data.domain,
    contact: data.contact,
  };
  const serialized = JSON.stringify(payload);
  if (serialized === lastSyncedRef.current) return;

  const handle = setTimeout(() => {
    lastSyncedRef.current = serialized;
    void upsertIntakeDraft(data.orgId, payload).catch((err) => {
      console.warn('Failed to sync wizard draft:', err);
    });
  }, 800);
  return () => clearTimeout(handle);
}, [data?.orgId, data?.dns, data?.website, data?.domain, data?.contact]);
```

- [ ] **Step 3: Verify in browser**

Start the frontend (`npm run dev` in `javelina`). Walk through the wizard, fill out a field on each step. After ~1 second per change, check the dev tools network tab for `POST /api/business/<orgId>/intake` calls. Verify in the DB:

```sql
SELECT settings->'business_intake' FROM organizations WHERE id = '<orgId>';
```

Expected: the jsonb reflects what you typed in the wizard.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add components/business/wizard/BusinessWizardShell.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): debounced server sync for wizard drafts"
```

---

## Task 11: Frontend — Wizard completion calls `/intake/complete`

**Files:**
- Modify: `javelina/components/business/wizard/BusinessWizardShell.tsx`
- Modify: `javelina/lib/business-intake-store.ts` (only to ensure local `complete()` still flips the local flag for instant UX feedback)

- [ ] **Step 1: Locate the completion call site**

Run: `grep -n "complete(" /Users/sethchesky/Documents/GitHub/javelina/components/business/wizard/BusinessWizardShell.tsx`

You'll see something like `complete(orgId);` on line ~65. That's the local-only completion.

- [ ] **Step 2: Replace with server-first completion**

Add the import:

```ts
import { completeIntake } from '@/lib/api/business';
import { useQueryClient } from '@tanstack/react-query';
```

Inside the component:

```ts
const queryClient = useQueryClient();
```

Replace the `complete(orgId);` call site with:

```ts
const result = await completeIntake(orgId);
if (!result.ok) {
  // Surface a user-facing error; for v1 use console + alert as a placeholder.
  // The wizard stays on the final step; user can retry.
  console.error('Wizard submission failed:', result);
  alert(
    'We couldn\'t submit your setup. Please try again in a moment. ' +
    `(Error: ${result.error})`
  );
  return;
}
complete(orgId); // local flag flip for immediate UX feedback
queryClient.invalidateQueries({ queryKey: ['business', 'me'] });
queryClient.invalidateQueries({ queryKey: ['business', orgId] });
// then proceed with whatever navigation the original code did (e.g. router.push)
```

Note: the surrounding handler likely needs to be marked `async`. If the existing handler isn't already async, add `async` to its signature.

- [ ] **Step 3: Verify in browser**

Walk through the wizard end-to-end. On final submit:
- With Intake App env vars unset: the `alert()` fires with `intake_app_forward_failed`.
- With env vars pointing at a stub returning 200: the wizard proceeds, the dashboard shows up, the header button now appears (if it wasn't already), and `business_intake.completed_at` is set in the DB.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add components/business/wizard/BusinessWizardShell.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): wizard submission forwards to backend completeIntake"
```

---

## Task 12: Frontend — Empty state component for unfinished intake

**Files:**
- Create: `javelina/app/business/[orgId]/IntakeIncompleteState.tsx`

- [ ] **Step 1: Create the component**

```tsx
// javelina/app/business/[orgId]/IntakeIncompleteState.tsx
'use client';

import Link from 'next/link';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Card } from '@/components/business/ui/Card';

interface Props {
  orgId: string;
  orgName: string;
  planCode?: string;
}

export function IntakeIncompleteState({ orgId, orgName, planCode }: Props) {
  const t = useBusinessTheme();
  const resumeHref = `/business/setup?org_id=${orgId}&plan_code=${planCode ?? 'business_starter'}&org_name=${encodeURIComponent(orgName)}`;

  return (
    <div style={{ maxWidth: 640, margin: '32px auto' }}>
      <Card t={t}>
        <div style={{ padding: '24px 4px', textAlign: 'center', fontFamily: FONT }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 700,
              color: t.text,
              letterSpacing: -0.4,
            }}
          >
            Finish setting up {orgName}
          </h1>
          <p
            style={{
              margin: '12px 0 24px',
              fontSize: 14,
              color: t.textMuted,
              lineHeight: 1.6,
            }}
          >
            Your subscription is active, but we still need a few details to build your site, configure DNS, and set up email. It only takes a few minutes.
          </p>
          <Link href={resumeHref} style={{ textDecoration: 'none' }}>
            <Button t={t} size="md" iconLeft={<Icon name="sparkle" size={14} color="#fff" />}>
              Continue setup
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default IntakeIncompleteState;
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep "IntakeIncompleteState" | head`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add app/business/\[orgId\]/IntakeIncompleteState.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): add empty-state UI for incomplete intake"
```

---

## Task 13: Frontend — Dashboard reads from server

**Files:**
- Modify: `javelina/app/business/[orgId]/layout.tsx`
- Modify: `javelina/app/business/[orgId]/page.tsx`

- [ ] **Step 1: Update the layout to read from server**

Replace the entire contents of `javelina/app/business/[orgId]/layout.tsx`:

```tsx
'use client';

import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { FONT } from '@/components/business/ui/tokens';
import { SideNav } from '@/components/business/dashboard/SideNav';

export default function BusinessOrgLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const t = useBusinessTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
  });

  if (!orgId || isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>Loading…</main>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>
          Business not found.
        </main>
      </div>
    );
  }

  // Build a minimal BusinessIntakeData-shaped object for the SideNav so it can
  // continue to read website.bizName / planCode without the local store.
  const intake = (data.intake ?? {}) as Record<string, any>;
  const sideNavData = {
    orgId,
    planCode: (intake.planCode ?? 'business_starter') as 'business_starter' | 'business_pro',
    website: { bizName: intake.website?.bizName ?? data.org.name },
  } as any;

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <SideNav t={t} data={sideNavData} />
      <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto' }}>{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Update the dashboard page to read from server**

Replace `javelina/app/business/[orgId]/page.tsx` with:

```tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import { IntakeIncompleteState } from './IntakeIncompleteState';

export default function BusinessOrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
  });

  if (isLoading || !data) return null;

  const intake = (data.intake ?? null) as Record<string, any> | null;
  const completed = !!intake?.completed_at;

  if (!completed) {
    return (
      <IntakeIncompleteState
        orgId={orgId}
        orgName={data.org.name}
        planCode={intake?.planCode}
      />
    );
  }

  // Build the BusinessIntakeData-shaped object the existing component expects.
  // This is a thin adapter; once the full dashboard is wired to server data,
  // this shape can move into a dedicated selector.
  const adapted = {
    orgId,
    planCode: intake.planCode ?? 'business_starter',
    currentStep: 4,
    dns: intake.dns ?? { mode: 'jbp' },
    website: intake.website ?? { bizName: data.org.name, pages: [] },
    domain: intake.domain ?? { mode: 'connect' },
    contact: intake.contact ?? { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', whois: true },
    completedAt: intake.completed_at ?? null,
  } as any;

  return <BusinessPlaceholderDashboard data={adapted} />;
}
```

- [ ] **Step 3: Verify in browser**

For a user/org that has paid (provisioning_status rows exist) but never started the wizard: visit `/business/<orgId>` → see the IntakeIncompleteState card → click "Continue setup" → wizard loads.

For a user/org where the wizard is completed: the dashboard renders as before, but now the data comes from the server.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add app/business/\[orgId\]/layout.tsx app/business/\[orgId\]/page.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): dashboard reads intake state from server"
```

---

## Task 14: Frontend — Drop Zustand persistence

The Zustand store is now redundant for completion state. Keep it for in-flight wizard UI state (the form-control bindings) but remove `persist()` so the source of truth is unambiguous: server data via React Query.

**Files:**
- Modify: `javelina/lib/business-intake-store.ts`

- [ ] **Step 1: Replace the store factory**

Replace lines 114–155 (the `create<StoreState>()(persist(...))` block) with:

```ts
export const useBusinessIntakeStore = create<StoreState>()((set, get) => ({
  intakes: {},
  get: (orgId) => get().intakes[orgId] ?? null,
  init: (orgId, planCode, bizName) =>
    set((s) => {
      if (s.intakes[orgId]) return s;
      return { intakes: { ...s.intakes, [orgId]: defaults(orgId, planCode, bizName) } };
    }),
  update: (orgId, patch) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return { intakes: { ...s.intakes, [orgId]: deepMerge(curr, patch) } };
    }),
  setStep: (orgId, step) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return {
        intakes: {
          ...s.intakes,
          [orgId]: { ...curr, currentStep: clampStep(step) },
        },
      };
    }),
  complete: (orgId) =>
    set((s) => {
      const curr = s.intakes[orgId];
      if (!curr) return s;
      return {
        intakes: {
          ...s.intakes,
          [orgId]: { ...curr, completedAt: new Date().toISOString() },
        },
      };
    }),
}));
```

Also remove the unused import:

```ts
import { persist } from 'zustand/middleware';  // delete this line
```

- [ ] **Step 2: Verify in browser**

Reload the wizard mid-flow: with `persist()` removed, refreshing the page should reset the in-memory wizard, but on the dashboard the server-side draft is still there. (UX caveat: the wizard's "resume where you left off" UX now needs to come from a wizard-level hydrate that pulls from `getBusiness()` on mount. That's deferred to a follow-up — for now, the wizard restarts on refresh, but the server-side draft is preserved and the dashboard reflects it.)

- [ ] **Step 3: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep "business-intake-store" | head`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add lib/business-intake-store.ts
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "refactor(business): drop Zustand persist; server is source of truth"
```

---

## Task 15: End-to-end smoke test

**No new files.** Manual verification that the whole flow works.

- [ ] **Step 1: Start both repos**

```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend && npm run dev   # one terminal
cd /Users/sethchesky/Documents/GitHub/javelina && npm run dev          # another terminal
```

- [ ] **Step 2: Configure Intake App env vars**

In `javelina-backend/.env` (or wherever local env is sourced), set:

```
INTAKE_APP_INTERNAL_URL=<value from teammate>
INTAKE_APP_INTERNAL_TOKEN=<value from teammate>
```

(If the teammate's Intake App isn't reachable from your dev machine, run a stub: a tiny Express server returning 200 to `POST /api/internal/intake-submission` is sufficient to exercise the Javelina path.)

- [ ] **Step 3: Walk the flow**

1. Log in as a user that already has provisioning_status rows on dev (i.e., has paid).
2. Confirm the "My Business" header button now appears.
3. Click into `/business/<orgId>`. Verify the empty state appears (since the wizard hasn't been completed for this org yet).
4. Click "Continue setup" → wizard loads.
5. Walk through each step, filling in fields. After each step, verify the network tab shows `POST /api/business/<orgId>/intake` and the DB jsonb updates.
6. Submit the wizard. Verify `POST /api/business/<orgId>/intake/complete` returns 200, the Intake App stub receives the payload, and `business_intake.completed_at` is set in the DB.
7. Land back on the dashboard. Verify it now renders the full `BusinessPlaceholderDashboard` (not the empty state).

- [ ] **Step 4: Re-test the dev visibility fix**

In a browser with no localStorage for `business-intake-store`, log in as a paid user and confirm the "My Business" header button appears immediately. (This is the original bug the plan was written to fix.)

- [ ] **Step 5: Commit nothing — this task is verification only**

If any step fails, fix the underlying task and re-run from Step 1.

---

## Self-review notes

**Spec coverage:** every section of the revised handoff plan maps to at least one task here:
- "Backend work" → tasks 1–7
- "Frontend work" → tasks 8–14
- "Header visibility from `provisioning_status`" → task 4
- "`/intake/complete` flow + Intake App handoff" → tasks 2, 7
- "Empty-state UX for unfinished intake" → tasks 12, 13
- "Drop Zustand `persist()`" → task 14
- "Rollout sequence" → task ordering matches the doc's 1–7

**Open spec items not directly addressed (deferred to follow-ups):**
- Wizard "resume where you left off" hydration from server — noted in Task 14; would require a `BusinessWizardShell` mount-time fetch via `getBusiness()` and store hydration. Out of scope for this plan; tracked in follow-up.
- Required-field validation contract with the Intake App — Task 7 forwards whatever drafts exist; tightening required-field checks before forwarding is a follow-up once the schema is locked in with the teammate.
