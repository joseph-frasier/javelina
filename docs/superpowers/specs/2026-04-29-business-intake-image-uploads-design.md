# Business Intake Image Uploads — Design

**Branch:** `feat/business-plans-on-pricing` (both `javelina` and `javelina-backend`)
**Status:** Spec — pending implementation
**Depends on:** the (forthcoming) Option-A revision of `BUSINESS_WIZARD_BACKEND_HANDOFF_PLAN.md`. This spec assumes drafts live in `organizations.settings.business_intake` on Javelina and are forwarded to the Intake App's `/api/internal/intake-submission` endpoint on wizard completion.

---

## Goal

Replace the wizard step 2 fake "uploads" (logo and photos) with real Supabase Storage-backed uploads. Persisted images must:

1. Render as previews in the wizard immediately on upload.
2. Survive page reload and browser close — re-rendering from server state when the user returns to the wizard.
3. Be addressable by the Intake App + downstream automation agent at submit time, so they can be used as inputs to website-generation prompts.

## Non-goals

- Client-side image compression, server-side optimization, thumbnail generation
- Drag-and-drop, reordering, captions, alt text, crop editor
- Orphan-asset cleanup automation (manual until volume warrants a cron)
- Migrating image storage to the Intake App's Supabase project (Javelina is the canonical home for the bytes)

---

## Architecture

```
[Wizard step 2]                                    [Supabase: dev branch ipfsrbxjgewhdcvonrbo]
   |                                                  |
   | POST /api/business/:orgId/intake/logo  (multipart)
   | POST /api/business/:orgId/intake/photos (multipart)
   | DELETE /api/business/:orgId/intake/photos/:photoId
   | GET /api/business/:orgId/intake/asset-urls
   |                                                  |
   v                                                  |
[Express backend]                                     |
   - Auth0 → profiles → organization_members          |
   - validates: mime, size, count                     |
   - writes to bucket via service-role  ------------->|  dev-business-logos / dev-business-photos
   - persists metadata in                             |
     organizations.settings.business_intake.website   |
   - returns { storage_path, signed_url }             |
   |                                                  |
   v                                                  |
[Wizard]                                              |
   - shows preview from returned signed_url           |
   - on hydrate: GET /asset-urls returns fresh        |
     1-hour signed URLs                               |
```

On wizard completion, Javelina forwards 7-day signed URLs + storage paths to the Intake App in the `intake-submission` payload. The Intake App and automation agent fetch the bytes via those URLs.

---

## Storage

### Buckets (created via migration; user applies manually)

| Bucket | Public | File size limit | Allowed mime types |
|---|---|---|---|
| `dev-business-logos` | false | 5 MB (5,242,880 B) | `image/png`, `image/jpeg`, `image/svg+xml`, `image/webp` |
| `dev-business-photos` | false | 25 MB (26,214,400 B) | `image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif` |

`dev-` prefix matches the existing `dev-profile-pictures` convention on the dev branch (`ipfsrbxjgewhdcvonrbo`).

### Path conventions

- Logo: `{org_id}/logo.{ext}` — single object per org, replaced on re-upload.
- Photos: `{org_id}/{uuid}.{ext}` — one object per photo, UUID-keyed to avoid collisions.

### RLS on `storage.objects`

Both buckets have all anonymous and authenticated direct access denied. The Express backend uses the service-role key (RLS-bypassing) for all read/write operations. Frontend code never touches Storage directly.

### Migration file location

`javelina/supabase/migrations/<timestamp>_business_intake_assets_buckets.sql` — DDL only:

- `INSERT INTO storage.buckets ...` for both buckets
- `CREATE POLICY ...` to deny all non-service-role access
- No `apply_migration` runtime call from Claude — user applies manually on the dev branch.

---

## Data model

Wizard image metadata lives in `organizations.settings.business_intake.website` (jsonb). Building on the existing `business_intake` jsonb structure:

```jsonc
{
  "business_intake": {
    "website": {
      "bizName": "Acme Co",
      "industry": "...",
      "...": "other existing wizard fields",

      "logo": {
        "storage_path": "<org_id>/logo.png",
        "original_filename": "acme-logo.png",
        "size_bytes": 234567,
        "mime_type": "image/png",
        "uploaded_at": "2026-04-29T..."
      },

      "photos": [
        {
          "id": "<uuid>",
          "storage_path": "<org_id>/<uuid>.jpg",
          "original_filename": "team-photo.jpg",
          "size_bytes": 4321000,
          "mime_type": "image/jpeg",
          "uploaded_at": "2026-04-29T..."
        }
      ]
    },
    "started_at": "...",
    "completed_at": null
  }
}
```

### Storage-of-truth notes

- **Bucket name is not stored.** Mapping (`logo → dev-business-logos`, `photos[] → dev-business-photos`) lives in backend code; the dev/prod swap is a single env-config change.
- **Signed URLs are not persisted.** Generated on demand (1-hour TTL for previews; 7-day TTL only for the submit handoff to the Intake App).
- **Original filenames + mime types are persisted** so the automation agent can use filename hints (`team-photo.jpg → about page`) without HEAD-ing storage objects.

---

## Backend endpoints

New controller: `businessAssetsController.ts` in `javelina-backend`. All routes authorize: Auth0 user → `profiles.id` → active row in `organization_members` for `(user_id, org_id)`. Matches existing controllers' pattern.

| Route | Purpose |
|---|---|
| `POST /api/business/:orgId/intake/logo` | Multipart, single field `file`. Validates mime + 5 MB cap. Writes to `dev-business-logos/{org_id}/logo.{ext}`, deletes any prior logo at a different extension, updates `settings.business_intake.website.logo`. Returns `{ storage_path, signed_url, expires_at, ...metadata }`. |
| `POST /api/business/:orgId/intake/photos` | Multipart, field `files[]`. Validates count (existing + new ≤ 10), per-file mime + 25 MB cap. Writes each to `dev-business-photos/{org_id}/{uuid}.{ext}`, appends to `settings.business_intake.website.photos[]`. Returns array of `{ id, storage_path, signed_url, expires_at, ...metadata }`. |
| `DELETE /api/business/:orgId/intake/photos/:photoId` | Removes the entry from `photos[]`, then deletes the storage object. Returns 204. Storage-delete failures don't block; orphans handled by future cleanup. |
| `GET /api/business/:orgId/intake/asset-urls` | Returns fresh 1-hour signed URLs for the current logo + all photos. Called by the wizard on re-entry to render previews from persisted server state. |

### Multipart parsing

Use `multer` (or whichever middleware is already in use; match the existing pattern). Memory storage (no temp files), with `limits: { fileSize: 25 * 1024 * 1024 }` as the hard ceiling. Per-route `fileFilter` enforces the per-bucket mime allow-list and the logo's tighter 5 MB cap.

### Validation layers (defense in depth)

1. Frontend `accept=` attribute (UX only).
2. Backend `multer` middleware (size + mime).
3. Bucket-level `file_size_limit` + `allowed_mime_types` (last line).

### Lifecycle

- **Logo re-upload:** read prior `storage_path` from `settings.business_intake.website.logo`. Upsert new path. If old `storage_path` differs from new, delete the old object. Update DB last so a failed delete doesn't lose new metadata.
- **Photo delete:** remove from `photos[]` array first, then delete storage object. Storage-delete failure is non-blocking (orphan).
- **Photo count enforcement:** entire batch rejected with `400 { error: 'photo_limit_exceeded', current, max: 10 }` if exceeded; no partial uploads.
- **Concurrent uploads from two tabs:** last writer wins (acceptable; single-user wizard).
- **Cancelled wizards:** assets remain until orphan cleanup is implemented (future work).

---

## Frontend

### Store changes (`javelina/lib/business-intake-store.ts`)

Replace:

```ts
logoName: string | null;
photoCount: number;
```

with:

```ts
logo: LogoAsset | null;
photos: PhotoAsset[];
```

Types match the jsonb shape from the data model section.

### `StepWebsite.tsx` changes

**Logo block:**

- Replace the "Upload logo" button's `onClick` with a hidden `<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp">`. Visible button triggers it.
- On file selected:
  1. Render `URL.createObjectURL(file)` immediately in the 80×80 thumbnail.
  2. POST to `/api/business/:orgId/intake/logo` in the background.
  3. On success: replace local Blob URL with returned `signed_url`; store metadata in Zustand under `website.logo`.
  4. On failure: revert preview, show inline error.
- "Skip, use text wordmark" button: clears `website.logo` (no server call needed if nothing was uploaded yet; otherwise, a separate "remove" UX is out of scope per Section 6 — re-upload is the standard path).

**Photos block:**

- Replace the "Browse files" button's `onClick` with a multi-file `<input type="file" multiple accept="image/...">`.
- On files selected:
  1. Client-side count check (existing + new ≤ 10); show inline error if exceeded.
  2. Render local Blob-URL previews in a grid; each tile in an "uploading" state with spinner overlay.
  3. POST all files in one multipart request to `/api/business/:orgId/intake/photos`.
  4. On success: replace local previews with returned `signed_url`s; store metadata array in Zustand.
- Each tile gets a hover ✕ button → `DELETE /api/business/:orgId/intake/photos/:photoId`, optimistic removal.

### Hydration on wizard re-entry

On `StepWebsite` mount, if `website.logo.storage_path` or `website.photos[]` exist in the store but no `signed_url` is cached in component state, call `GET /api/business/:orgId/intake/asset-urls` once and populate previews.

Signed URLs are kept in component state only (not in Zustand `persist()`), since they expire and re-fetching is cheap.

---

## Handoff to Intake App on submit

When wizard completion fires (the future `/intake/complete` endpoint per the parent handoff plan):

1. Validate idempotency (`completed_at` is null) and required fields.
2. Generate **7-day** signed URLs for the logo and every photo.
3. POST to the Intake App's `/api/internal/intake-submission`:
   ```jsonc
   {
     "org_id": "...",
     "lead_record": {
       "website": {
         "bizName": "...",
         "logo": {
           "storage_path": "...",
           "signed_url": "https://...?token=...",
           "original_filename": "...",
           "mime_type": "..."
         },
         "photos": [ { "...": "same shape" } ],
         "...": "rest of website fields"
       },
       "contact": { "...": "..." },
       "dns": { "...": "..." },
       "domain": { "...": "..." }
     }
   }
   ```
4. On 2xx response: set `settings.business_intake.completed_at = now()`. Wizard finishes.
5. On failure: leave `completed_at` null; return error to frontend; wizard shows "submission failed, retry." Drafts and uploads remain intact.

**Why include `storage_path` and `signed_url`:** path is the durable identifier the Intake App stores in `leads.lead_record`; signed URL is the immediate-fetch handle for the agent. Intake App may copy bytes into its own storage or just keep the URL — either is fine, no Javelina credential leaves Javelina.

**Service-to-service auth:** match the existing pattern your teammate set up for `/api/internal/intake-submission` (shared secret / service token).

**Retry posture:** Javelina makes a single synchronous attempt. The Intake App's own `pending_jobs` handles downstream retries. If Javelina's call to Intake App fails, the user retries by clicking submit again — drafts and uploaded images are still intact in Javelina.

---

## Error handling summary

| Scenario | Surface | User experience |
|---|---|---|
| File over size cap | `400 { error: 'file_too_large', max_bytes: ... }` | Inline error under the upload control |
| Wrong mime | `400 { error: 'unsupported_file_type', allowed: [...] }` | Inline error |
| Photo count exceeded | `400 { error: 'photo_limit_exceeded', current, max: 10 }` | Inline error; no partial upload |
| Supabase upload failure | `502 { error: 'storage_upload_failed' }` | Optimistic preview reverts; inline retry button |
| Asset-urls call failure | `5xx`, no body update | Previews show "couldn't load preview" placeholder; "Retry" button |
| Intake-submission forward failure | `5xx`, `completed_at` stays null | Wizard shows "submission failed"; user retries |

---

## Implementation order

1. **Migration file** (created, not applied; user applies manually on `ipfsrbxjgewhdcvonrbo`).
2. **Backend controller + routes** (`businessAssetsController.ts`) with multer wired up.
3. **Wizard store types** updated; `StepWebsite.tsx` real upload logic with optimistic previews.
4. **Hydration** via `GET /asset-urls` on step mount.
5. **Submit-time forward** (Section "Handoff to Intake App") — gated on the parent handoff plan's `/intake/complete` endpoint; can be stubbed initially.

---

## Open questions

None blocking. Listed for awareness:

- Service-to-service auth for the Intake App call: match teammate's existing `intake-submission` convention; pattern will be confirmed at implementation time.
- Multer vs. another multipart middleware: pick whichever Express stack already includes; if neither, install `multer`.
- Logo "remove" UX: deferred — re-upload is the canonical replace path; explicit removal can be added later if users request it.
