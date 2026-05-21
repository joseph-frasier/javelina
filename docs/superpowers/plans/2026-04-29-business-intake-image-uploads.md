# Business Intake Image Uploads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the wizard step 2 fake logo/photos UI with real Supabase Storage uploads (server-stored, hydratable on reload, forwardable to the Intake App at submit time).

**Architecture:** Wizard posts multipart uploads to new Express endpoints under `/api/business/:orgId/intake/{logo,photos,asset-urls}`. The backend uses `supabaseAdmin` (service role) to write to two private buckets (`dev-business-logos`, `dev-business-photos`) and persists asset metadata under `organizations.settings.business_intake.website.{logo,photos}`. Signed URLs are generated on demand: 1 hour for the wizard, 7 days at submit time and injected into the existing `/intake/complete` forward.

**Tech Stack:**
- Backend: Express + TypeScript (`javelina-backend`), `multer` (memory storage) for multipart, `supabaseAdmin` for storage and DB writes
- Frontend: Next.js App Router (`javelina`), Zustand for in-flight wizard state, React Query for hydration, `'use server'` actions with `FormData` passthrough for uploads
- Storage: Supabase dev branch `ipfsrbxjgewhdcvonrbo`

**Out of scope:** image optimization, thumbnails, drag-and-drop, captions, alt text, orphan cleanup automation.

**Branches (verified, both repos):** `feat/business-plans-on-pricing`.

---

## File Structure

### `javelina` (new)

| File | Responsibility |
|---|---|
| `supabase/migrations/20260429000000_business_intake_assets_buckets.sql` | DDL: insert two private buckets with size + mime caps; deny-all RLS for non-service-role |
| `lib/api/business-assets.ts` | Server-side helpers (`uploadLogo`, `uploadPhotos`, `deletePhoto`, `getAssetUrls`); accept `FormData`, forward to backend with the session cookie |

### `javelina` (modified)

| File | Change |
|---|---|
| `lib/business-intake-store.ts` | Replace `logoName: string \| null` and `photoCount: number` with `logo: LogoAsset \| null` and `photos: PhotoAsset[]`; add types and update defaults |
| `components/business/wizard/StepWebsite.tsx` | Replace fake logo + photos UI (lines ~220–312) with real `<input type="file">` flows, optimistic Blob-URL previews, server uploads, and on-mount asset-urls hydration |

### `javelina-backend` (new)

| File | Responsibility |
|---|---|
| `src/controllers/businessAssetsController.ts` | Four handlers (`uploadLogo`, `uploadPhotos`, `deletePhoto`, `getAssetUrls`); validates per spec, writes to storage + jsonb |
| `src/middleware/uploadLimits.ts` | Two configured `multer` instances: `logoUpload` (5 MB, logo mimes) and `photoUpload` (25 MB, photo mimes), memory storage |

### `javelina-backend` (modified)

| File | Change |
|---|---|
| `src/routes/businessIntake.ts` | Mount four new routes for `/intake/logo`, `/intake/photos`, `/intake/photos/:photoId`, `/intake/asset-urls` |
| `src/controllers/businessIntakeController.ts` | In `completeIntake`, inject 7-day signed URLs for `logo` + each `photo` into the forwarded payload before calling `forwardSubmission` |

---

## Task 1: Confirm `multer` install with the user

**No files changed in this task — just an interactive confirmation gate before the install.**

- [ ] **Step 1: Check whether `multer` is already a dependency**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && grep -E '"(multer|@types/multer)"' package.json || echo "NOT INSTALLED"`
Expected output: `NOT INSTALLED` (otherwise skip Step 2).

- [ ] **Step 2: Ask the user to confirm before installing**

Surface a single confirmation message to the user:
> "Will install `multer@1.4.5-lts.1` and `@types/multer@1.4.11` in `javelina-backend` for multipart parsing. OK to proceed?"

After explicit user approval, run:
```bash
cd /Users/sethchesky/Documents/GitHub/javelina-backend && npm install multer@1.4.5-lts.1 @types/multer@1.4.11
```

Expected: package.json lists both, `package-lock.json` updated.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add package.json package-lock.json
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "chore(business): add multer for multipart upload parsing"
```

---

## Task 2: Storage buckets migration (file only — user applies manually)

**Files:**
- Create: `javelina/supabase/migrations/20260429000000_business_intake_assets_buckets.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 20260429000000_business_intake_assets_buckets.sql
-- Private buckets for business intake wizard image uploads.
-- Bytes are accessed only via service-role (Express backend); frontend never
-- reads these buckets directly — instead it consumes short-lived signed URLs.

-- 1. Logos: 5 MB cap; png/jpeg/svg/webp.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dev-business-logos',
  'dev-business-logos',
  false,
  5242880,
  ARRAY['image/png','image/jpeg','image/svg+xml','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Photos: 25 MB cap; png/jpeg/webp/heic/heif.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dev-business-photos',
  'dev-business-photos',
  false,
  26214400,
  ARRAY['image/png','image/jpeg','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public            = EXCLUDED.public,
  file_size_limit   = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Deny all non-service-role access on these two buckets.
-- (service_role bypasses RLS, so no positive policy is needed for the backend.)
DROP POLICY IF EXISTS "Deny anon/authed read on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed read on business intake assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed insert on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed insert on business intake assets"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed update on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed update on business intake assets"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);

DROP POLICY IF EXISTS "Deny anon/authed delete on business intake assets" ON storage.objects;
CREATE POLICY "Deny anon/authed delete on business intake assets"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (
  bucket_id NOT IN ('dev-business-logos', 'dev-business-photos')
);
```

- [ ] **Step 2: Notify the user — DO NOT auto-apply**

Tell the user:
> "Migration written to `javelina/supabase/migrations/20260429000000_business_intake_assets_buckets.sql`. Apply it manually on Supabase dev branch `ipfsrbxjgewhdcvonrbo` before testing the upload endpoints."

Do **not** invoke `mcp__plugin_supabase_supabase__apply_migration` — user applies.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add supabase/migrations/20260429000000_business_intake_assets_buckets.sql
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): migration for business intake asset buckets"
```

---

## Task 3: Backend — multer middleware module

**Files:**
- Create: `javelina-backend/src/middleware/uploadLimits.ts`

- [ ] **Step 1: Create the middleware module**

```ts
// javelina-backend/src/middleware/uploadLimits.ts
import multer from "multer";
import type { Request } from "express";

const LOGO_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
]);

const PHOTO_MIMES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function buildFileFilter(allowed: Set<string>): multer.Options["fileFilter"] {
  return (
    _req: Request,
    file: Express.Multer.File,
    cb: (err: Error | null, accept: boolean) => void
  ): void => {
    if (allowed.has(file.mimetype)) {
      cb(null, true);
    } else {
      // Tag the error so the controller can map to a 400 with the correct code.
      const err = new Error("unsupported_file_type") as Error & {
        code: string;
        allowed: string[];
      };
      err.code = "UNSUPPORTED_FILE_TYPE";
      err.allowed = Array.from(allowed);
      cb(err, false);
    }
  };
}

export const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: buildFileFilter(LOGO_MIMES),
});

export const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: buildFileFilter(PHOTO_MIMES),
});

export const PHOTO_MAX_COUNT = 10;
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit 2>&1 | grep "uploadLimits" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/middleware/uploadLimits.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): add multer middleware for logo/photo uploads"
```

---

## Task 4: Backend — assets controller skeleton + storage helpers

**Files:**
- Create: `javelina-backend/src/controllers/businessAssetsController.ts`

- [ ] **Step 1: Create the controller with helpers + four stubbed handlers**

```ts
// javelina-backend/src/controllers/businessAssetsController.ts
import { Response } from "express";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "../config/supabase";
import {
  AuthenticatedRequest,
  AppError,
  NotFoundError,
  ValidationError,
} from "../types";
import { sendSuccess } from "../utils/response";

export const LOGO_BUCKET = "dev-business-logos";
export const PHOTO_BUCKET = "dev-business-photos";
export const PHOTO_MAX_COUNT = 10;
export const PREVIEW_TTL_SECONDS = 60 * 60; // 1 hour
export const SUBMIT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

type Json = Record<string, unknown>;

export interface LogoAsset {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface PhotoAsset {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

export function extForMime(mime: string): string {
  const ext = EXT_BY_MIME[mime];
  if (!ext) throw new ValidationError("unsupported_file_type");
  return ext;
}

async function loadOrgSettings(orgId: string): Promise<Json> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("settings")
    .eq("id", orgId)
    .single();
  if (error || !data) throw new NotFoundError("Organization not found");
  return (data.settings ?? {}) as Json;
}

async function writeOrgSettings(
  orgId: string,
  settings: Json
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("organizations")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", orgId);
  if (error) {
    throw new AppError(500, `Failed to update settings: ${error.message}`);
  }
}

function getWebsite(settings: Json): Json {
  const intake = (settings.business_intake ?? {}) as Json;
  return (intake.website ?? {}) as Json;
}

function setWebsite(settings: Json, website: Json): Json {
  const intake = ((settings.business_intake ?? {}) as Json) ?? {};
  return {
    ...settings,
    business_intake: {
      ...intake,
      website,
      started_at:
        (intake as Json).started_at ?? new Date().toISOString(),
    },
  };
}

export async function signPath(
  bucket: string,
  path: string,
  ttlSeconds: number
): Promise<{ signed_url: string; expires_at: string }> {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(path, ttlSeconds);
  if (error || !data) {
    throw new AppError(502, `signed_url_failed: ${error?.message ?? "unknown"}`);
  }
  return {
    signed_url: data.signedUrl,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}

// --- Handlers ---------------------------------------------------------------

export async function uploadLogo(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function uploadPhotos(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function deletePhoto(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}

export async function getAssetUrls(
  _req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  res.status(501).json({ error: "not_implemented" });
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors (existing errors, if any, unchanged).

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessAssetsController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): scaffold business assets controller"
```

---

## Task 5: Backend — wire routes for asset endpoints

**Files:**
- Modify: `javelina-backend/src/routes/businessIntake.ts`

- [ ] **Step 1: Add routes after the existing `/intake/complete` route**

Replace the entire file with:

```ts
// javelina-backend/src/routes/businessIntake.ts
import { Router, Request, Response, NextFunction } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { requireOrgMember } from "../middleware/rbac";
import { logoUpload, photoUpload } from "../middleware/uploadLimits";
import * as controller from "../controllers/businessIntakeController";
import * as assetsController from "../controllers/businessAssetsController";

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

// Map multer errors to typed validation errors so the global error handler
// returns proper 400s rather than the multer default.
function mapMulterError(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!err) return next();
  const e = err as { code?: string; message?: string; allowed?: string[] };
  if (e.code === "LIMIT_FILE_SIZE") {
    res.status(400).json({ error: "file_too_large" });
    return;
  }
  if (e.code === "UNSUPPORTED_FILE_TYPE") {
    res.status(400).json({
      error: "unsupported_file_type",
      allowed: e.allowed ?? [],
    });
    return;
  }
  if (e.code === "LIMIT_UNEXPECTED_FILE" || e.code === "LIMIT_FILE_COUNT") {
    res.status(400).json({ error: "invalid_upload" });
    return;
  }
  next(err);
}

router.post(
  "/:orgId/intake/logo",
  requireOrgMember(),
  (req, res, next) => logoUpload.single("file")(req, res, (err) =>
    mapMulterError(err, req, res, next)
  ),
  asyncHandler(assetsController.uploadLogo)
);

router.post(
  "/:orgId/intake/photos",
  requireOrgMember(),
  (req, res, next) =>
    photoUpload.array("files", 10)(req, res, (err) =>
      mapMulterError(err, req, res, next)
    ),
  asyncHandler(assetsController.uploadPhotos)
);

router.delete(
  "/:orgId/intake/photos/:photoId",
  requireOrgMember(),
  asyncHandler(assetsController.deletePhoto)
);

router.get(
  "/:orgId/intake/asset-urls",
  requireOrgMember(),
  asyncHandler(assetsController.getAssetUrls)
);

export default router;
```

- [ ] **Step 2: Boot check**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors.

If a dev server is running locally:
```bash
curl -i -X POST http://localhost:3001/api/business/00000000-0000-0000-0000-000000000000/intake/logo
```
Expected: `401` from `authenticate` (confirms route is mounted).

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/routes/businessIntake.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): mount asset upload routes with multer error mapping"
```

---

## Task 6: Backend — implement `POST /intake/logo`

**Files:**
- Modify: `javelina-backend/src/controllers/businessAssetsController.ts`

- [ ] **Step 1: Replace the `uploadLogo` handler**

Replace the stub with:

```ts
export async function uploadLogo(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;
  const file = (req as AuthenticatedRequest & { file?: Express.Multer.File }).file;
  if (!file) throw new ValidationError("file_required");

  const ext = extForMime(file.mimetype);
  const newPath = `${orgId}/logo.${ext}`;

  const settings = await loadOrgSettings(orgId);
  const website = getWebsite(settings);
  const priorLogo = (website.logo ?? null) as LogoAsset | null;

  // Upload (upsert to overwrite same-extension re-uploads cleanly).
  const { error: upErr } = await supabaseAdmin.storage
    .from(LOGO_BUCKET)
    .upload(newPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });
  if (upErr) {
    throw new AppError(502, `storage_upload_failed: ${upErr.message}`);
  }

  // If the prior logo lived at a different extension, delete the old object.
  if (priorLogo && priorLogo.storage_path && priorLogo.storage_path !== newPath) {
    const { error: delErr } = await supabaseAdmin.storage
      .from(LOGO_BUCKET)
      .remove([priorLogo.storage_path]);
    if (delErr) {
      // Non-fatal; orphan tolerated until cleanup is automated.
      console.warn("[business-assets] failed to delete prior logo", {
        orgId,
        oldPath: priorLogo.storage_path,
        message: delErr.message,
      });
    }
  }

  const logo: LogoAsset = {
    storage_path: newPath,
    original_filename: file.originalname,
    size_bytes: file.size,
    mime_type: file.mimetype,
    uploaded_at: new Date().toISOString(),
  };

  const newWebsite: Json = { ...website, logo };
  await writeOrgSettings(orgId, setWebsite(settings, newWebsite));

  const signed = await signPath(LOGO_BUCKET, newPath, PREVIEW_TTL_SECONDS);
  sendSuccess(res, { ...logo, ...signed });
}
```

- [ ] **Step 2: Verify with curl**

Backend running, with a valid session and an org you're a member of:

```bash
curl -s -b "javelina_session=<token>" \
  -F "file=@/path/to/test-logo.png" \
  http://localhost:3001/api/business/<orgId>/intake/logo | jq
```

Expected: `200` with `{ data: { storage_path: "<orgId>/logo.png", original_filename: "...", size_bytes: ..., mime_type: "image/png", uploaded_at: "...", signed_url: "https://...", expires_at: "..." } }`.

Verify in DB:
```sql
SELECT settings->'business_intake'->'website'->'logo'
FROM organizations WHERE id = '<orgId>';
```
Expected: jsonb mirrors the response (without signed_url/expires_at).

Re-upload with a different extension; verify the prior path is no longer in the bucket (Supabase Studio → Storage → `dev-business-logos` → `<orgId>/`).

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessAssetsController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement POST /intake/logo upload"
```

---

## Task 7: Backend — implement `POST /intake/photos`

**Files:**
- Modify: `javelina-backend/src/controllers/businessAssetsController.ts`

- [ ] **Step 1: Replace the `uploadPhotos` handler**

```ts
export async function uploadPhotos(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;
  const files = (req as AuthenticatedRequest & {
    files?: Express.Multer.File[];
  }).files;

  if (!files || files.length === 0) {
    throw new ValidationError("files_required");
  }

  const settings = await loadOrgSettings(orgId);
  const website = getWebsite(settings);
  const existingPhotos = (Array.isArray(website.photos)
    ? website.photos
    : []) as PhotoAsset[];

  const projectedTotal = existingPhotos.length + files.length;
  if (projectedTotal > PHOTO_MAX_COUNT) {
    res.status(400).json({
      error: "photo_limit_exceeded",
      current: existingPhotos.length,
      max: PHOTO_MAX_COUNT,
    });
    return;
  }

  // Upload all files. Track partial-success so we can roll back on failure.
  const newPhotos: PhotoAsset[] = [];
  for (const file of files) {
    const id = randomUUID();
    const ext = extForMime(file.mimetype);
    const path = `${orgId}/${id}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from(PHOTO_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (upErr) {
      // Rollback: remove anything we already uploaded in this batch.
      const toRemove = newPhotos.map((p) => p.storage_path);
      if (toRemove.length > 0) {
        await supabaseAdmin.storage.from(PHOTO_BUCKET).remove(toRemove);
      }
      throw new AppError(502, `storage_upload_failed: ${upErr.message}`);
    }

    newPhotos.push({
      id,
      storage_path: path,
      original_filename: file.originalname,
      size_bytes: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date().toISOString(),
    });
  }

  const merged: PhotoAsset[] = [...existingPhotos, ...newPhotos];
  const newWebsite: Json = { ...website, photos: merged };
  await writeOrgSettings(orgId, setWebsite(settings, newWebsite));

  const responsePhotos = await Promise.all(
    newPhotos.map(async (p) => {
      const signed = await signPath(PHOTO_BUCKET, p.storage_path, PREVIEW_TTL_SECONDS);
      return { ...p, ...signed };
    })
  );

  sendSuccess(res, { photos: responsePhotos });
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s -b "javelina_session=<token>" \
  -F "files=@/path/to/photo1.jpg" \
  -F "files=@/path/to/photo2.jpg" \
  http://localhost:3001/api/business/<orgId>/intake/photos | jq
```

Expected: `200` with `{ data: { photos: [{ id, storage_path, signed_url, expires_at, ... }, ...] } }`.

Verify cap: upload enough photos to push past 10 in one request → expect `400 { error: "photo_limit_exceeded", current, max: 10 }`.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessAssetsController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement POST /intake/photos upload"
```

---

## Task 8: Backend — implement `DELETE /intake/photos/:photoId`

**Files:**
- Modify: `javelina-backend/src/controllers/businessAssetsController.ts`

- [ ] **Step 1: Replace the `deletePhoto` handler**

```ts
export async function deletePhoto(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;
  const photoId = req.params.photoId;
  if (!photoId) throw new ValidationError("photo_id_required");

  const settings = await loadOrgSettings(orgId);
  const website = getWebsite(settings);
  const photos = (Array.isArray(website.photos) ? website.photos : []) as PhotoAsset[];

  const target = photos.find((p) => p.id === photoId);
  if (!target) {
    res.status(404).json({ error: "photo_not_found" });
    return;
  }

  const remaining = photos.filter((p) => p.id !== photoId);
  const newWebsite: Json = { ...website, photos: remaining };
  await writeOrgSettings(orgId, setWebsite(settings, newWebsite));

  // Storage delete is best-effort; orphan handled by future cleanup.
  const { error: delErr } = await supabaseAdmin.storage
    .from(PHOTO_BUCKET)
    .remove([target.storage_path]);
  if (delErr) {
    console.warn("[business-assets] storage delete failed", {
      orgId,
      photoId,
      storage_path: target.storage_path,
      message: delErr.message,
    });
  }

  res.status(204).end();
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -i -X DELETE -b "javelina_session=<token>" \
  http://localhost:3001/api/business/<orgId>/intake/photos/<uuid>
```

Expected: `204` for an existing id, `404` with `{ error: "photo_not_found" }` for a bogus id. The remaining `photos[]` in the jsonb should no longer include the deleted entry.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessAssetsController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement DELETE /intake/photos/:photoId"
```

---

## Task 9: Backend — implement `GET /intake/asset-urls`

**Files:**
- Modify: `javelina-backend/src/controllers/businessAssetsController.ts`

- [ ] **Step 1: Replace the `getAssetUrls` handler**

```ts
export async function getAssetUrls(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const orgId = req.params.orgId;

  const settings = await loadOrgSettings(orgId);
  const website = getWebsite(settings);
  const logo = (website.logo ?? null) as LogoAsset | null;
  const photos = (Array.isArray(website.photos) ? website.photos : []) as PhotoAsset[];

  let logoOut: (LogoAsset & { signed_url: string; expires_at: string }) | null = null;
  if (logo) {
    const signed = await signPath(LOGO_BUCKET, logo.storage_path, PREVIEW_TTL_SECONDS);
    logoOut = { ...logo, ...signed };
  }

  const photosOut = await Promise.all(
    photos.map(async (p) => {
      const signed = await signPath(PHOTO_BUCKET, p.storage_path, PREVIEW_TTL_SECONDS);
      return { ...p, ...signed };
    })
  );

  sendSuccess(res, { logo: logoOut, photos: photosOut });
}
```

- [ ] **Step 2: Verify with curl**

```bash
curl -s -b "javelina_session=<token>" \
  http://localhost:3001/api/business/<orgId>/intake/asset-urls | jq
```

Expected: `200` with `{ data: { logo: { ...metadata, signed_url, expires_at } | null, photos: [...] } }`. `curl -I "<signed_url>"` should return `200` from Supabase Storage.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessAssetsController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): implement GET /intake/asset-urls hydration endpoint"
```

---

## Task 10: Backend — inject 7-day signed URLs into `completeIntake` forward

**Files:**
- Modify: `javelina-backend/src/controllers/businessIntakeController.ts`

- [ ] **Step 1: Add the import block**

At the top of the file, add after the existing imports:

```ts
import {
  LOGO_BUCKET,
  PHOTO_BUCKET,
  SUBMIT_TTL_SECONDS,
  signPath,
  type LogoAsset,
  type PhotoAsset,
} from "./businessAssetsController";
```

- [ ] **Step 2: Build the enriched website payload before `forwardSubmission`**

In `completeIntake`, replace the existing `payload` definition:

```ts
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
```

with:

```ts
  const submissionId = randomUUID();

  const websiteIntake = (intake.website ?? {}) as Record<string, unknown>;
  const persistedLogo = (websiteIntake.logo ?? null) as LogoAsset | null;
  const persistedPhotos = (Array.isArray(websiteIntake.photos)
    ? websiteIntake.photos
    : []) as PhotoAsset[];

  let logoOut: (LogoAsset & { signed_url: string; expires_at: string }) | null = null;
  if (persistedLogo?.storage_path) {
    const signed = await signPath(
      LOGO_BUCKET,
      persistedLogo.storage_path,
      SUBMIT_TTL_SECONDS
    );
    logoOut = { ...persistedLogo, ...signed };
  }

  const photosOut = await Promise.all(
    persistedPhotos
      .filter((p) => !!p?.storage_path)
      .map(async (p) => {
        const signed = await signPath(
          PHOTO_BUCKET,
          p.storage_path,
          SUBMIT_TTL_SECONDS
        );
        return { ...p, ...signed };
      })
  );

  const websitePayload = {
    ...websiteIntake,
    logo: logoOut,
    photos: photosOut,
  };

  const payload = {
    org_id: orgId,
    submission_id: submissionId,
    lead_record: {
      website: websitePayload,
      contact: intake.contact ?? {},
      dns: intake.dns ?? {},
      domain: intake.domain ?? {},
    },
  };
```

- [ ] **Step 3: Verify**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina-backend && npx tsc --noEmit`
Expected: no new errors.

With backend running, an org that has a logo + at least one photo, and a stub Intake App receiver listening on `INTAKE_APP_INTERNAL_URL`:

```bash
curl -s -X POST -b "javelina_session=<token>" \
  http://localhost:3001/api/business/<orgId>/intake/complete | jq
```

Inspect the stub's received body — `lead_record.website.logo.signed_url` and each `lead_record.website.photos[i].signed_url` should be present and `HEAD`-able for 7 days.

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina-backend add src/controllers/businessIntakeController.ts
git -C /Users/sethchesky/Documents/GitHub/javelina-backend commit -m "feat(business): inject 7-day signed URLs into intake handoff"
```

---

## Task 11: Frontend — wizard store types for `logo` + `photos`

**Files:**
- Modify: `javelina/lib/business-intake-store.ts`

- [ ] **Step 1: Replace the website asset fields**

In the `BusinessIntakeData` interface, replace these two lines inside `website`:

```ts
    logoName: string | null;
    photoCount: number;
```

with:

```ts
    logo: LogoAsset | null;
    photos: PhotoAsset[];
```

And add the asset types at the top of the file (after the `import` line):

```ts
export interface LogoAsset {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}

export interface PhotoAsset {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
}
```

- [ ] **Step 2: Update the `defaults()` factory**

Inside `defaults()`, replace:

```ts
      logoName: null,
      photoCount: 0,
```

with:

```ts
      logo: null,
      photos: [],
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep -E "business-intake-store|StepWebsite|logoName|photoCount" | head -30`

Expected: errors will surface in `StepWebsite.tsx` referencing `logoName` / `photoCount`. Those are addressed in Task 13. (No errors elsewhere — `lib/business-intake-store.ts` itself should compile.)

- [ ] **Step 4: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add lib/business-intake-store.ts
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): replace fake logoName/photoCount with real asset types"
```

---

## Task 12: Frontend — server-action helpers for asset endpoints

**Files:**
- Create: `javelina/lib/api/business-assets.ts`

- [ ] **Step 1: Create the helpers module**

```ts
// javelina/lib/api/business-assets.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface LogoResponse {
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
  signed_url: string;
  expires_at: string;
}

export interface PhotoResponse {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  mime_type: string;
  uploaded_at: string;
  signed_url: string;
  expires_at: string;
}

export interface AssetUrlsResponse {
  logo: LogoResponse | null;
  photos: PhotoResponse[];
}

export type UploadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number };

async function sessionHeader(): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const sess = cookieStore.get('javelina_session');
  return sess ? { Cookie: `javelina_session=${sess.value}` } : {};
}

async function postFormData(path: string, form: FormData): Promise<Response> {
  const headers = await sessionHeader();
  // Note: do NOT set Content-Type — fetch will set the multipart boundary.
  return fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: form,
    headers,
    cache: 'no-store',
  });
}

export async function uploadLogo(
  orgId: string,
  form: FormData
): Promise<UploadResult<LogoResponse>> {
  try {
    const res = await postFormData(`/api/business/${orgId}/intake/logo`, form);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
    }
    return { ok: true, data: json?.data as LogoResponse };
  } catch (err) {
    console.error('[business-assets api] uploadLogo', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function uploadPhotos(
  orgId: string,
  form: FormData
): Promise<UploadResult<{ photos: PhotoResponse[] }>> {
  try {
    const res = await postFormData(`/api/business/${orgId}/intake/photos`, form);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
    }
    return { ok: true, data: json?.data as { photos: PhotoResponse[] } };
  } catch (err) {
    console.error('[business-assets api] uploadPhotos', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function deletePhoto(
  orgId: string,
  photoId: string
): Promise<UploadResult<null>> {
  try {
    const headers = await sessionHeader();
    const res = await fetch(
      `${API_BASE_URL}/api/business/${orgId}/intake/photos/${photoId}`,
      { method: 'DELETE', headers, cache: 'no-store' }
    );
    if (res.status === 204) return { ok: true, data: null };
    const json = await res.json().catch(() => ({}));
    return { ok: false, error: json?.error ?? `http_${res.status}`, status: res.status };
  } catch (err) {
    console.error('[business-assets api] deletePhoto', err);
    return { ok: false, error: 'network_error', status: 0 };
  }
}

export async function getAssetUrls(
  orgId: string
): Promise<AssetUrlsResponse | null> {
  try {
    const headers = await sessionHeader();
    const res = await fetch(
      `${API_BASE_URL}/api/business/${orgId}/intake/asset-urls`,
      { headers, cache: 'no-store' }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data ?? null) as AssetUrlsResponse | null;
  } catch (err) {
    console.error('[business-assets api] getAssetUrls', err);
    return null;
  }
}
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep "business-assets" | head`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add lib/api/business-assets.ts
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): server-action helpers for asset upload/list/delete"
```

---

## Task 13: Frontend — real upload UI in `StepWebsite.tsx`

**Files:**
- Modify: `javelina/components/business/wizard/StepWebsite.tsx`

This task replaces the fake logo + photos blocks (lines ~220–312) with real flows, adds local preview state for signed URLs, and triggers asset-urls hydration on mount. It is one large change; commit after the whole thing compiles.

- [ ] **Step 1: Update imports at the top of the file**

Replace the existing import block (lines 1–10) with:

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import type { BusinessIntakeData, LogoAsset, PhotoAsset } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { AestheticCard } from './AestheticCard';
import {
  uploadLogo,
  uploadPhotos,
  deletePhoto,
  getAssetUrls,
} from '@/lib/api/business-assets';
```

- [ ] **Step 2: Add upload state + hydration inside the component**

Locate the function header `export function StepWebsite({ t, data, set }: Props) {` and the line `const w = data.website;` immediately below.

After `const update = (patch: Partial<W>) => set({ website: patch });`, insert:

```tsx
  // Local-only signed URL cache (1-hour TTL, not persisted in Zustand).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  // On mount (or when stored asset metadata changes from outside), pull fresh
  // 1-hour signed URLs so previews render after page reload.
  useEffect(() => {
    let cancelled = false;
    const hasLogoMeta = !!w.logo?.storage_path;
    const hasPhotoMeta = (w.photos ?? []).length > 0;
    if (!hasLogoMeta && !hasPhotoMeta) return;
    void (async () => {
      const urls = await getAssetUrls(data.orgId);
      if (cancelled || !urls) return;
      setLogoUrl(urls.logo?.signed_url ?? null);
      const map: Record<string, string> = {};
      for (const p of urls.photos) map[p.id] = p.signed_url;
      setPhotoUrls(map);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.orgId, w.logo?.storage_path, (w.photos ?? []).length]);

  async function handleLogoSelect(file: File) {
    setLogoError(null);
    setLogoBusy(true);
    // Optimistic preview.
    const objectUrl = URL.createObjectURL(file);
    setLogoUrl(objectUrl);

    const form = new FormData();
    form.append('file', file);
    const result = await uploadLogo(data.orgId, form);
    setLogoBusy(false);
    URL.revokeObjectURL(objectUrl);

    if (!result.ok) {
      setLogoUrl(null);
      setLogoError(result.error);
      update({ logo: null });
      return;
    }
    const { signed_url, ...meta } = result.data;
    update({ logo: meta as LogoAsset });
    setLogoUrl(signed_url);
  }

  async function handlePhotosSelect(files: FileList) {
    setPhotoError(null);
    const incoming = Array.from(files);
    const existing = w.photos ?? [];
    if (existing.length + incoming.length > 10) {
      setPhotoError(`photo_limit_exceeded (${existing.length}/10)`);
      return;
    }
    setPhotoBusy(true);
    const form = new FormData();
    for (const f of incoming) form.append('files', f);
    const result = await uploadPhotos(data.orgId, form);
    setPhotoBusy(false);
    if (!result.ok) {
      setPhotoError(result.error);
      return;
    }
    const newMeta: PhotoAsset[] = result.data.photos.map(({ signed_url, expires_at, ...m }) => m);
    update({ photos: [...existing, ...newMeta] });
    setPhotoUrls((prev) => {
      const next = { ...prev };
      for (const p of result.data.photos) next[p.id] = p.signed_url;
      return next;
    });
  }

  async function handlePhotoDelete(photoId: string) {
    const existing = w.photos ?? [];
    const optimisticRemaining = existing.filter((p) => p.id !== photoId);
    update({ photos: optimisticRemaining });
    setPhotoUrls((prev) => {
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
    const result = await deletePhoto(data.orgId, photoId);
    if (!result.ok) {
      // Revert on failure.
      update({ photos: existing });
      setPhotoError(result.error);
    }
  }
```

- [ ] **Step 3: Replace the logo block (was lines ~220–271)**

Find the block beginning with `<FieldLabel t={t} optional>Logo</FieldLabel>` and replace the entire surrounding `<div>` (the parent of that FieldLabel and the upload UI) with:

```tsx
        <div>
          <FieldLabel t={t} optional>Logo</FieldLabel>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleLogoSelect(f);
              e.currentTarget.value = '';
            }}
          />
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: 10,
                border: `1.5px dashed ${t.borderStrong}`,
                background: t.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, fontSize: 11, fontFamily: MONO,
                textAlign: 'center', padding: 6, overflow: 'hidden', position: 'relative',
              }}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={w.logo?.original_filename ?? 'logo preview'}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              ) : (
                'no file'
              )}
              {logoBusy && (
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, color: t.textMuted,
                }}>
                  Uploading…
                </div>
              )}
            </div>
            <div
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  t={t}
                  variant="secondary"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  iconLeft={<Icon name="plus" size={13} />}
                >
                  {w.logo ? 'Replace logo' : 'Upload logo'}
                </Button>
                <Button
                  t={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    update({ logo: null });
                    setLogoUrl(null);
                    setLogoError(null);
                  }}
                >
                  Skip, use text wordmark
                </Button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                SVG or PNG, transparent background works best. We&apos;ll generate favicons automatically.
              </div>
              {logoError && (
                <div style={{ fontSize: 12, color: '#b91c1c' }}>
                  Couldn&apos;t upload logo ({logoError}).
                </div>
              )}
            </div>
          </div>
        </div>
```

- [ ] **Step 4: Replace the photos block (was lines ~273–312)**

Find the block beginning with `<FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>` and replace it with:

```tsx
        <div>
          <FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>
          <input
            ref={photoInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            style={{ display: 'none' }}
            onChange={(e) => {
              const fs = e.target.files;
              if (fs && fs.length > 0) void handlePhotosSelect(fs);
              e.currentTarget.value = '';
            }}
          />
          <div
            style={{
              padding: 16, borderRadius: 10,
              border: `1.5px dashed ${t.borderStrong}`,
              background: t.surfaceAlt,
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: t.surface, border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted,
              }}
            >
              <Icon name="plus" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {(w.photos ?? []).length
                  ? `${(w.photos ?? []).length} of 10 photos uploaded`
                  : 'Drop product shots, team photos, or work samples'}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                Up to 10 files. PNG, JPG, WEBP, or HEIC.
              </div>
            </div>
            <Button
              t={t}
              variant="secondary"
              size="sm"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoBusy ? 'Uploading…' : 'Browse files'}
            </Button>
          </div>
          {photoError && (
            <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 6 }}>
              Couldn&apos;t upload photos ({photoError}).
            </div>
          )}
          {(w.photos ?? []).length > 0 && (
            <div
              style={{
                marginTop: 10,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                gap: 8,
              }}
            >
              {(w.photos ?? []).map((p) => {
                const url = photoUrls[p.id];
                return (
                  <div
                    key={p.id}
                    style={{
                      position: 'relative',
                      aspectRatio: '1 / 1',
                      borderRadius: 8,
                      overflow: 'hidden',
                      background: t.surface,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={p.original_filename}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%', height: '100%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: t.textMuted, fontFamily: MONO,
                        }}
                      >
                        loading…
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void handlePhotoDelete(p.id)}
                      aria-label="Remove photo"
                      style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 22, height: 22, borderRadius: 11,
                        background: 'rgba(15,20,25,0.7)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
```

- [ ] **Step 5: Typecheck**

Run: `cd /Users/sethchesky/Documents/GitHub/javelina && npx tsc --noEmit 2>&1 | grep -E "StepWebsite|logoName|photoCount" | head`
Expected: no output.

- [ ] **Step 6: Browser smoke test**

Start `npm run dev` in `javelina` and `javelina-backend`. Walk to wizard step 2:

1. Click "Upload logo" → pick a small PNG → preview appears immediately, then is replaced by the signed URL once the upload returns.
2. Reload the page → return to step 2 → the logo preview re-renders (proves hydration).
3. Click "Browse files" → pick 2–3 photos → tiles appear as a grid.
4. Hover a tile → click `×` → tile disappears optimistically.
5. Try uploading 11 photos in one batch → inline error `photo_limit_exceeded`.
6. Try uploading a `.txt` file as a logo → inline error `unsupported_file_type` (the backend rejects, the inline message renders).

Verify in the DB:
```sql
SELECT settings->'business_intake'->'website'->'logo',
       settings->'business_intake'->'website'->'photos'
FROM organizations WHERE id = '<orgId>';
```

- [ ] **Step 7: Commit**

```bash
git -C /Users/sethchesky/Documents/GitHub/javelina add components/business/wizard/StepWebsite.tsx
git -C /Users/sethchesky/Documents/GitHub/javelina commit -m "feat(business): real logo + photo uploads in wizard step 2"
```

---

## Task 14: End-to-end smoke test (no new files)

Manual end-to-end verification across both repos. Apply the migration first.

- [ ] **Step 1: Apply the migration on the dev branch**

Confirm with the user that the migration file from Task 2 has been applied on Supabase dev branch `ipfsrbxjgewhdcvonrbo`. Verify in Studio: `Storage → Buckets` shows `dev-business-logos` and `dev-business-photos`, both private, with the configured size + mime caps.

- [ ] **Step 2: Walk the full flow**

1. Log into the wizard as a paid user → navigate to step 2.
2. Upload a logo + 3 photos. Confirm previews render.
3. Navigate to step 3 (DNS) and back to step 2. Previews still render — hydration loop populated them from `/asset-urls`.
4. Reload the browser tab. Return to step 2. Previews re-render (Zustand has the metadata via the wizard's debounced sync; signed URLs come back from `/asset-urls`).
5. Delete one photo → `photos[]` length decrements, tile disappears.
6. With the Intake App stub configured (`INTAKE_APP_INTERNAL_URL` + token), submit the wizard.
7. Inspect the stub's received body: `lead_record.website.logo.signed_url` and each `lead_record.website.photos[i].signed_url` are present and resolve to the actual bytes via `curl -I`.

- [ ] **Step 3: Verification only — no commit**

If anything fails, fix in the relevant earlier task and re-run.

---

## Self-review notes

**Spec coverage:**
- Storage buckets + RLS → Task 2.
- Backend endpoints (logo / photos / delete photo / asset-urls) → Tasks 3–9.
- Submit-time 7-day signed URL handoff → Task 10.
- Wizard store types update → Task 11.
- Wizard frontend (real upload, optimistic preview, hydration, error surfaces) → Tasks 12–13.
- E2E smoke → Task 14.

**Deferred per spec (not addressed here):**
- Orphan cleanup automation (cancelled wizards leaving assets in storage).
- Explicit logo "remove" UX (the spec deferred this; "Skip, use text wordmark" clears local metadata only — re-upload is the canonical replace path).
- Image optimization / thumbnail generation.

**Cross-task type consistency:**
- `LogoAsset` and `PhotoAsset` share field names across the controller (Task 4), the store (Task 11), and the API helpers (Task 12). The API helpers return `LogoResponse`/`PhotoResponse` (= `*Asset` + `signed_url` + `expires_at`); the wizard strips the URL fields before persisting metadata into the store.
- `getAssetUrls` returns `{ logo, photos }`; the wizard's hydration effect destructures them into separate state slices.
