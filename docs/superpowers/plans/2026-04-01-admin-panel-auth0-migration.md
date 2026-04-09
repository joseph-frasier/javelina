# Admin Panel Auth0 Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin panel's Supabase-based login with the existing Auth0 session flow, and eliminate all direct frontend → database calls so all admin operations route through the Express backend.

**Architecture:** Reuse the main app's existing Auth0 session cookie (`javelina_session`). The backend already validates this cookie (Path 2 in auth middleware) and admin routes already call `checkSuperuser()`. Frontend server actions that bypass the backend will be replaced with api-client calls to new/existing backend endpoints. After this migration, the frontend will have zero direct Supabase calls for admin operations.

**Tech Stack:** Next.js (frontend), Express.js (backend), Auth0, Supabase (database only, not auth)

---

## Background

The admin panel currently authenticates via Supabase Auth (`signInWithPassword`), then creates a custom admin JWT signed with a shared `ADMIN_JWT_SECRET`. Since the main app migrated to Auth0, superadmin users no longer have Supabase Auth credentials, so they can't log in to the admin panel.

Additionally, several admin operations (flagged zone management, org member management) bypass the backend entirely with direct Supabase queries from Next.js server actions. This creates an inconsistent architecture where some admin operations go through the backend and others don't.

**This plan fixes both issues:**
1. Admin auth uses the existing Auth0 session cookie
2. All admin operations route through the Express backend

## Repos

- **Frontend:** `/Users/sethchesky/Documents/GitHub/javelina` (branch: `fix/admin-panel-auth0-migration`)
- **Backend:** `/Users/sethchesky/Documents/GitHub/javelina-backend` (branch: `fix/admin-panel-auth0-migration`)

## File Structure

**Frontend — Files to modify:**
- `lib/admin-auth.ts` — Replace Supabase login + admin JWT with session cookie check via backend API. Remove `verifyAdminAndGetClient` and `logAdminAction` (no more direct DB access).
- `lib/api-client.ts` — Remove admin JWT Authorization header logic. Add new admin zone API methods.
- `app/admin/login/page.tsx` — Replace email/password form with redirect to Auth0 login
- `app/admin/zones/page.tsx` — Replace server action imports with api-client calls
- `components/admin/AdminHeader.tsx` — Update logout flow, remove admin JWT imports
- `components/auth/IdleLogoutGuard.tsx` — Remove `clearAdminSessionToken` import, update admin idle logout
- `middleware.ts:40-47` — Check `javelina_session` cookie instead of `admin_session` cookie

**Frontend — Files to delete:**
- `lib/admin-session-token.ts` — No longer needed (admin JWT localStorage)
- `app/api/admin/set-session/route.ts` — Dead code (admin_session cookie API route)
- `lib/actions/admin/organizations.ts` — Dead code (org server actions not called from UI; admin pages already use api-client)
- `lib/actions/admin/zones.ts` — Replaced by api-client calls to new backend endpoints
- `lib/actions/admin/audit.ts` — Dead code (only called by other server actions being deleted; backend handles audit logging)

**Backend — Files to modify:**
- `src/middleware/auth.ts` — Remove admin JWT path (Path 1). Update `extractBearerToken` JSDoc.
- `src/routes/admin.ts` — Add `GET /me`, `GET /zones/flagged`, `PUT /zones/:id/approve`, `PUT /zones/:id/rename`, `DELETE /zones/:id` endpoints
- `src/controllers/adminController.ts` — Add `getAdminMe`, `getFlaggedZones`, `approveFlaggedZone`, `renameFlaggedZone`, `deleteFlaggedZone` controllers
- `src/middleware/rbac.ts:80-86` — Update superadmin RBAC bypass to check DB instead of `isAdminSession` flag
- `src/types/index.ts` — Remove `isAdminSession` and `"admin-jwt"` from types
- `src/config/env.ts` — Remove `adminJwtSecret` config

---

## Task 1: Backend — Add admin/me endpoint, remove admin JWT path, fix RBAC bypass

**Files:**
- Modify: `src/routes/admin.ts`
- Modify: `src/controllers/adminController.ts`
- Modify: `src/middleware/auth.ts`
- Modify: `src/middleware/rbac.ts`
- Modify: `src/types/index.ts`
- Modify: `src/config/env.ts`

- [ ] **Step 1: Add `GET /api/admin/me` endpoint to admin controller**

  In `src/controllers/adminController.ts`, add this function after the `checkSuperuser` helper (after line 29):

  ```typescript
  /**
   * GET /api/admin/me
   * Returns current user info if they are a superadmin.
   * Used by the frontend to check admin panel access.
   */
  export const getAdminMe = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    const isSuperuser = await checkSuperuser(userId);
    if (!isSuperuser) {
      throw new ForbiddenError("This endpoint requires superuser access");
    }

    sendSuccess(res, {
      id: userId,
      email: req.user!.email,
      name: req.user!.name || "Admin User",
      isSuperAdmin: true,
    });
  };
  ```

- [ ] **Step 2: Register the route in admin.ts**

  In `src/routes/admin.ts`, add this line after `router.use(authenticate);` (after line 10):

  ```typescript
  router.get("/me", asyncHandler(controller.getAdminMe));
  ```

- [ ] **Step 3: Remove admin JWT path from auth middleware**

  In `src/middleware/auth.ts`:

  1. Remove the entire "Path 1: Admin JWT" block — the section that checks for `__Host-admin_session` / `admin_session` cookies and verifies the HS256 JWT with `ADMIN_JWT_SECRET`. Find the block that starts with `// ─── Path 1: Admin JWT` and ends with the `catch (adminJwtError)` block. Remove it entirely.

  2. Update the `extractBearerToken` JSDoc (around line 8-12). Change:
     ```typescript
     /**
      * Extract Bearer token from Authorization header.
      * Used for admin JWT in production where cookies can't cross domains
      * (frontend on app.javelina.cloud, backend on javelina-api-backend.vercel.app).
      */
     ```
     To:
     ```typescript
     /**
      * Extract Bearer token from Authorization header.
      * Used for Auth0 Bearer token verification (MCP clients, API access).
      */
     ```

- [ ] **Step 4: Update RBAC superadmin bypass**

  In `src/middleware/rbac.ts`, replace the `isAdminSession` check (around line 80-86):

  ```typescript
  // OLD:
  if (req.user?.isAdminSession) {
    const isSuperAdmin = await isSystemSuperAdmin(userId);
    if (isSuperAdmin) {
      return next();
    }
  }
  ```

  With:
  ```typescript
  // System-level superadmins bypass org-level role checks
  const isSuperAdmin = await isSystemSuperAdmin(userId);
  if (isSuperAdmin) {
    return next();
  }
  ```

- [ ] **Step 5: Clean up types**

  In `src/types/index.ts`:
  - Remove `isAdminSession?: boolean` from the user interface
  - Remove `"admin-jwt"` from the `authMethod` type union (should become `"session-cookie" | "bearer-token"`)

- [ ] **Step 6: Remove `adminJwtSecret` from env config**

  In `src/config/env.ts`, remove the `adminJwtSecret` property and its `process.env.ADMIN_JWT_SECRET` reference.

- [ ] **Step 7: Run the build to verify**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  npm run build
  ```
  Expected: Clean compilation.

- [ ] **Step 8: Commit backend changes**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  git add src/routes/admin.ts src/controllers/adminController.ts src/middleware/auth.ts src/middleware/rbac.ts src/types/index.ts src/config/env.ts
  git commit -m "feat: add admin/me endpoint, remove admin JWT auth path

  - Add GET /api/admin/me for frontend admin access check
  - Remove Path 1 (admin JWT) from auth middleware
  - Update RBAC to check superadmin from DB instead of isAdminSession flag
  - Clean up types and env config"
  ```

---

## Task 2: Backend — Add flagged zone admin endpoints

**Files:**
- Modify: `src/routes/admin.ts`
- Modify: `src/controllers/adminController.ts`

**Context:** The frontend currently manages flagged zones via direct Supabase calls in `lib/actions/admin/zones.ts`. These operations need backend endpoints so the frontend can use the api-client instead.

- [ ] **Step 1: Add flagged zone controller functions**

  In `src/controllers/adminController.ts`, add these functions at the end of the file:

  ```typescript
  /**
   * GET /api/admin/zones/flagged
   * List all flagged zones (live = false) with their organization info.
   */
  export const getFlaggedZones = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;

    const isSuperuser = await checkSuperuser(userId);
    if (!isSuperuser) {
      throw new ForbiddenError("This endpoint requires superuser access");
    }

    const { data, error } = await supabaseAdmin
      .from("zones")
      .select(`
        *,
        organizations!inner(
          id,
          name
        )
      `)
      .eq("live", false)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch flagged zones: ${error.message}`);
    }

    sendSuccess(res, data);
  };

  /**
   * PUT /api/admin/zones/:id/approve
   * Approve a flagged zone (set live = true).
   */
  export const approveFlaggedZone = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const zoneId = req.params.id;

    validateUUID(zoneId, "zone ID");

    const isSuperuser = await checkSuperuser(userId);
    if (!isSuperuser) {
      throw new ForbiddenError("This endpoint requires superuser access");
    }

    const { data, error } = await supabaseAdmin
      .from("zones")
      .update({ live: true, updated_at: new Date().toISOString() })
      .eq("id", zoneId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to approve zone: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError("Zone not found");
    }

    await logAdminAction({
      userId,
      action: "zone.approved",
      tableName: "zones",
      recordId: zoneId,
      newData: data,
      metadata: {
        zone_name: data.name,
        approved_at: new Date().toISOString(),
        previous_live_status: false,
      },
    });

    sendSuccess(res, data);
  };

  /**
   * PUT /api/admin/zones/:id/rename
   * Rename a flagged zone and approve it (set live = true).
   */
  export const renameFlaggedZone = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const zoneId = req.params.id;
    const { name: newName } = req.body;

    validateUUID(zoneId, "zone ID");

    if (!newName || typeof newName !== "string" || !newName.trim()) {
      throw new ValidationError("New zone name is required");
    }

    const isSuperuser = await checkSuperuser(userId);
    if (!isSuperuser) {
      throw new ForbiddenError("This endpoint requires superuser access");
    }

    // Check if new name already exists
    const { data: existingZone } = await supabaseAdmin
      .from("zones")
      .select("id")
      .eq("name", newName.trim())
      .limit(1)
      .single();

    if (existingZone) {
      throw new ValidationError(`A zone with the name "${newName.trim()}" already exists`);
    }

    // Get old zone data for audit log
    const { data: oldZone } = await supabaseAdmin
      .from("zones")
      .select("*")
      .eq("id", zoneId)
      .single();

    if (!oldZone) {
      throw new NotFoundError("Zone not found");
    }

    // Update zone name and approve
    const { data, error } = await supabaseAdmin
      .from("zones")
      .update({
        name: newName.trim(),
        live: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", zoneId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to rename zone: ${error.message}`);
    }

    await logAdminAction({
      userId,
      action: "zone.renamed",
      tableName: "zones",
      recordId: zoneId,
      oldData: oldZone,
      newData: data,
      metadata: {
        old_name: oldZone.name,
        new_name: newName.trim(),
        renamed_at: new Date().toISOString(),
      },
    });

    sendSuccess(res, data);
  };

  /**
   * DELETE /api/admin/zones/:id
   * Hard delete a flagged zone.
   */
  export const deleteFlaggedZone = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    const userId = req.user!.id;
    const zoneId = req.params.id;

    validateUUID(zoneId, "zone ID");

    const isSuperuser = await checkSuperuser(userId);
    if (!isSuperuser) {
      throw new ForbiddenError("This endpoint requires superuser access");
    }

    // Get zone data before deletion for audit
    const { data: zone } = await supabaseAdmin
      .from("zones")
      .select("*")
      .eq("id", zoneId)
      .single();

    if (!zone) {
      throw new NotFoundError("Zone not found");
    }

    // Log BEFORE deletion
    await logAdminAction({
      userId,
      action: "DELETE",
      tableName: "zones",
      recordId: zoneId,
      oldData: zone,
      metadata: {
        zone_name: zone.name,
        deleted_at: new Date().toISOString(),
        reason: "admin_deleted_flagged_zone",
        permanent: true,
      },
    });

    // Hard delete
    const { error } = await supabaseAdmin
      .from("zones")
      .delete()
      .eq("id", zoneId);

    if (error) {
      throw new Error(`Failed to delete zone: ${error.message}`);
    }

    sendSuccess(res, { deleted: true });
  };
  ```

  > **Note:** The `logAdminAction` function used here is the existing `logAdminAction` utility from `src/utils/audit-logging.ts` that's already used by other admin controller functions (e.g., `disableUser`, `enableUser`). Check its signature to make sure the parameter names match (it may use `userId` vs `actorId`, `tableName` vs `resourceType`, etc.). Adapt the calls above to match the existing signature.

- [ ] **Step 2: Register the routes in admin.ts**

  In `src/routes/admin.ts`, add these routes after the existing admin routes (before `export default router`):

  ```typescript
  // Flagged zone management
  router.get("/zones/flagged", asyncHandler(controller.getFlaggedZones));
  router.put("/zones/:id/approve", requireEmailVerification, asyncHandler(controller.approveFlaggedZone));
  router.put("/zones/:id/rename", requireEmailVerification, asyncHandler(controller.renameFlaggedZone));
  router.delete("/zones/:id", requireEmailVerification, asyncHandler(controller.deleteFlaggedZone));
  ```

- [ ] **Step 3: Run the build to verify**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  npm run build
  ```
  Expected: Clean compilation. If `logAdminAction` signature doesn't match, read `src/utils/audit-logging.ts` and adapt the calls.

- [ ] **Step 4: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  git add src/routes/admin.ts src/controllers/adminController.ts
  git commit -m "feat: add flagged zone admin endpoints

  - GET /api/admin/zones/flagged — list all flagged zones
  - PUT /api/admin/zones/:id/approve — approve a flagged zone
  - PUT /api/admin/zones/:id/rename — rename and approve a flagged zone
  - DELETE /api/admin/zones/:id — hard delete a flagged zone

  All endpoints require superadmin access and log to audit_logs."
  ```

---

## Task 3: Frontend — Replace admin-auth.ts and delete server actions

**Files:**
- Modify: `lib/admin-auth.ts`
- Delete: `lib/admin-session-token.ts`
- Delete: `app/api/admin/set-session/route.ts`
- Delete: `lib/actions/admin/organizations.ts`
- Delete: `lib/actions/admin/zones.ts`
- Delete: `lib/actions/admin/audit.ts`

- [ ] **Step 1: Rewrite `lib/admin-auth.ts`**

  Replace the entire contents. No more Supabase imports, no more JWT signing, no more `verifyAdminAndGetClient`, no more `logAdminAction`. Clean, minimal file.

  ```typescript
  'use server';

  import { cookies } from 'next/headers';

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'javelina_session';

  /**
   * Check if the current user has an active Auth0 session and is a superadmin.
   * Calls the backend /api/admin/me endpoint which validates the session cookie
   * and checks profiles.superadmin in the database.
   */
  export async function getAdminSession(): Promise<{
    admin_users: { id: string; email: string; name: string };
  } | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) return null;

    try {
      const response = await fetch(`${API_URL}/api/admin/me`, {
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) return null;

      const result = await response.json();
      const data = result.data;

      return {
        admin_users: {
          id: data.id,
          email: data.email,
          name: data.name,
        },
      };
    } catch {
      return null;
    }
  }

  /**
   * Get the admin user from the current session.
   */
  export async function getAdminUser() {
    const session = await getAdminSession();
    if (!session) return null;
    return session.admin_users;
  }
  ```

- [ ] **Step 2: Delete all frontend files that bypass the backend**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  rm lib/admin-session-token.ts
  rm -r app/api/admin/set-session
  rm lib/actions/admin/organizations.ts
  rm lib/actions/admin/zones.ts
  rm lib/actions/admin/audit.ts
  ```

  Check if `lib/actions/admin/` directory is now empty. If so, delete it:
  ```bash
  rmdir lib/actions/admin 2>/dev/null || true
  ```

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add lib/admin-auth.ts
  git rm lib/admin-session-token.ts
  git rm -r app/api/admin/set-session
  git rm lib/actions/admin/organizations.ts
  git rm lib/actions/admin/zones.ts
  git rm lib/actions/admin/audit.ts
  git commit -m "feat: replace admin auth with Auth0 session, delete server actions

  - Admin auth now checks Auth0 session cookie via backend /api/admin/me
  - Delete all frontend server actions that bypassed the Express backend
  - Delete admin JWT localStorage management
  - Delete admin_session cookie API route"
  ```

---

## Task 4: Frontend — Update api-client.ts

**Files:**
- Modify: `lib/api-client.ts`

- [ ] **Step 1: Remove admin JWT Authorization header logic**

  In `lib/api-client.ts`, remove:

  1. The import of `getAdminSessionToken` from `@/lib/admin-session-token` (line 11)
  2. The `ADMIN_ENDPOINT_PREFIXES` constant (line 15)
  3. The `isAdminEndpoint` function (lines 17-19)
  4. The block that attaches the admin JWT as Authorization header (lines 46-54):
     ```typescript
     if (!headers['Authorization'] && isAdminEndpoint(endpoint)) {
       const adminToken = getAdminSessionToken();
       if (adminToken) {
         headers['Authorization'] = `Bearer ${adminToken}`;
       }
     }
     ```

- [ ] **Step 2: Add flagged zone API methods to adminApi**

  Find the `adminApi` object (around line 531+) and add these methods:

  ```typescript
  // Flagged zone management
  getFlaggedZones: () => apiClient.get('/admin/zones/flagged'),
  approveFlaggedZone: (zoneId: string) => apiClient.put(`/admin/zones/${zoneId}/approve`),
  renameFlaggedZone: (zoneId: string, name: string) => apiClient.put(`/admin/zones/${zoneId}/rename`, { name }),
  deleteFlaggedZone: (zoneId: string) => apiClient.delete(`/admin/zones/${zoneId}`),
  ```

  > **Note:** Check the existing `adminApi` object structure to match the pattern. The `apiClient` methods (`get`, `put`, `delete`) are wrappers around the `apiRequest` function.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add lib/api-client.ts
  git commit -m "fix: remove admin JWT header logic, add flagged zone API methods

  - Admin endpoints authenticate via session cookie (credentials: include)
  - Add getFlaggedZones, approveFlaggedZone, renameFlaggedZone, deleteFlaggedZone to adminApi"
  ```

---

## Task 5: Frontend — Update admin login page

**Files:**
- Modify: `app/admin/login/page.tsx`

- [ ] **Step 1: Replace the admin login page**

  Replace the entire contents of `app/admin/login/page.tsx`. Instead of an email/password form, the page checks if the user has an existing Auth0 session with superadmin access. If not logged in, it redirects to the main Auth0 login. If logged in but not superadmin, it shows an access denied message.

  > **Note on post-login redirect:** The Express `/auth/login` endpoint does not currently support a `returnTo` parameter. After Auth0 login, the user lands at `/` (main app). They will need to navigate back to `/admin`. This is acceptable for now — adding `returnTo` support is a separate enhancement.

  ```tsx
  'use client';

  import { useEffect, useState } from 'react';
  import { useRouter } from 'next/navigation';
  import Button from '@/components/ui/Button';

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  export default function AdminLoginPage() {
    const router = useRouter();
    const [status, setStatus] = useState<'checking' | 'not-logged-in' | 'not-admin'>('checking');

    useEffect(() => {
      const checkAdminAccess = async () => {
        try {
          const response = await fetch('/api/backend/admin/me', {
            credentials: 'include',
          });

          if (response.ok) {
            router.push('/admin');
            return;
          }

          if (response.status === 403) {
            setStatus('not-admin');
            return;
          }

          setStatus('not-logged-in');
        } catch {
          setStatus('not-logged-in');
        }
      };

      checkAdminAccess();
    }, [router]);

    const handleLogin = () => {
      window.location.href = `${API_URL}/auth/login`;
    };

    if (status === 'checking') {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-dark mx-auto mb-4"></div>
            <p style={{ color: 'var(--text-secondary)' }}>Checking admin access...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
        <div className="rounded-lg shadow-lg max-w-md w-full p-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-orange rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: 'var(--orange-dark)' }}>
            Admin Panel
          </h1>
          <p className="text-center mb-8" style={{ color: 'var(--text-secondary)' }}>
            Irongrove DNS Administration
          </p>

          {status === 'not-admin' && (
            <div className="mb-6 p-4 rounded-lg" style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: '#ef4444',
              borderWidth: '1px',
            }}>
              <p className="text-sm" style={{ color: '#ef4444' }}>
                Access denied. Your account does not have SuperAdmin privileges.
              </p>
            </div>
          )}

          {status === 'not-logged-in' && (
            <div className="mb-6 p-4 rounded-lg" style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: '#3b82f6',
              borderWidth: '1px',
            }}>
              <p className="text-sm" style={{ color: '#3b82f6' }}>
                Please sign in with your account to access the admin panel.
              </p>
            </div>
          )}

          <Button
            variant="primary"
            className="w-full"
            onClick={handleLogin}
          >
            {status === 'not-admin' ? 'Sign In with a Different Account' : 'Sign In'}
          </Button>

          <div className="mt-8 pt-8">
            <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
              Authorized personnel only. All access is logged.
            </p>
          </div>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add app/admin/login/page.tsx
  git commit -m "feat: replace admin login form with Auth0 session check

  Admin login page now checks for existing Auth0 session + superadmin
  status. Shows login button (redirects to Auth0) or access denied message."
  ```

---

## Task 6: Frontend — Update admin zones page to use api-client

**Files:**
- Modify: `app/admin/zones/page.tsx`

- [ ] **Step 1: Replace server action imports with api-client calls**

  In `app/admin/zones/page.tsx`:

  1. Remove the server action imports (around lines 9-14):
     ```typescript
     // DELETE these:
     import {
       getFlaggedZones,
       approveFlaggedZone,
       renameFlaggedZone,
       deleteFlaggedZone
     } from '@/lib/actions/admin/zones';
     ```

  2. Add api-client import:
     ```typescript
     import { adminApi } from '@/lib/api-client';
     ```

  3. Update the function calls throughout the file. Replace each server action call with the equivalent api-client call:

     **`getFlaggedZones()`** (around line 40):
     ```typescript
     // OLD: const result = await getFlaggedZones();
     // NEW:
     const data = await adminApi.getFlaggedZones();
     setZones(data || []);
     ```

     **`approveFlaggedZone(zoneId)`** (around line 61):
     ```typescript
     // OLD: const result = await approveFlaggedZone(zoneId);
     // NEW:
     await adminApi.approveFlaggedZone(zoneId);
     ```

     **`renameFlaggedZone(zoneId, newName)`** (around line 84):
     ```typescript
     // OLD: const result = await renameFlaggedZone(zoneId, newZoneName.trim());
     // NEW:
     await adminApi.renameFlaggedZone(zoneId, newZoneName.trim());
     ```

     **`deleteFlaggedZone(zoneId)`** (around line 108):
     ```typescript
     // OLD: const result = await deleteFlaggedZone(zoneId);
     // NEW:
     await adminApi.deleteFlaggedZone(zoneId);
     ```

  > **Important:** The server actions returned `{ success, data, error }` objects. The api-client throws on errors (via `ApiError`). Update the error handling in each function to use try/catch instead of checking `result.error`. Read the full zones page to understand the existing error handling patterns.

- [ ] **Step 2: Verify build**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  npm run build
  ```
  Expected: Should compile. The deleted server action files should have no remaining importers.

- [ ] **Step 3: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add app/admin/zones/page.tsx
  git commit -m "feat: migrate admin zones page from server actions to api-client

  All flagged zone operations now route through the Express backend
  via api-client instead of direct Supabase queries."
  ```

---

## Task 7: Frontend — Update middleware, AdminHeader, and IdleLogoutGuard

**Files:**
- Modify: `middleware.ts`
- Modify: `components/admin/AdminHeader.tsx`
- Modify: `components/auth/IdleLogoutGuard.tsx`

- [ ] **Step 1: Update middleware to check `javelina_session` for admin routes**

  In `middleware.ts`, replace the admin route protection block (lines 40-47):

  ```typescript
  // OLD:
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const adminCookie = request.cookies.get(
      process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session'
    )
    if (!adminCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  ```

  Replace with:

  ```typescript
  // Admin routes require a valid session (same Auth0 session as main app).
  // The actual superadmin check happens server-side via /api/admin/me.
  // Middleware just checks the session cookie exists as a fast gate.
  if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
    const sessionCookie = request.cookies.get('javelina_session')
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }
  ```

- [ ] **Step 2: Update AdminHeader imports and logout**

  In `components/admin/AdminHeader.tsx`:

  1. Remove the import of `clearAdminSessionToken` (line 7):
     ```typescript
     // DELETE:
     import { clearAdminSessionToken } from '@/lib/admin-session-token';
     ```

  2. Update the `logoutAdmin` import — remove it. Change line 6 from:
     ```typescript
     import { getAdminUser, logoutAdmin } from '@/lib/admin-auth';
     ```
     To:
     ```typescript
     import { getAdminUser } from '@/lib/admin-auth';
     ```

  3. Replace the `handleLogout` function (around line 51):
     ```typescript
     // OLD:
     const handleLogout = async () => {
       clearAdminSessionToken();
       await logoutAdmin();
       router.push('/admin/login');
       setIsDropdownOpen(false);
     };

     // NEW:
     const handleLogout = () => {
       setIsDropdownOpen(false);
       window.location.href = '/api/logout';
     };
     ```

- [ ] **Step 3: Update IdleLogoutGuard**

  In `components/auth/IdleLogoutGuard.tsx`:

  1. Remove the import of `clearAdminSessionToken` (line 8):
     ```typescript
     // DELETE:
     import { clearAdminSessionToken } from '@/lib/admin-session-token';
     ```

  2. Update the admin idle logout handler (around line 68-81). Replace:
     ```typescript
     if (isAdminRoute) {
       clearAdminSessionToken();
       try {
         localStorage.setItem('admin-logout-reason', 'inactivity');
         localStorage.removeItem('javelina-last-activity');
       } catch (error) {
         console.error('[IdleLogoutGuard] Failed to set logout reason:', error);
       }
       router.replace('/admin/login');
       return;
     }
     ```

     With:
     ```typescript
     if (isAdminRoute) {
       try {
         localStorage.removeItem('javelina-last-activity');
       } catch (error) {
         console.error('[IdleLogoutGuard] Failed to clear activity:', error);
       }
       window.location.href = '/api/logout';
       return;
     }
     ```

- [ ] **Step 4: Verify build**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  npm run build
  ```
  Expected: Clean build.

- [ ] **Step 5: Commit**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add middleware.ts components/admin/AdminHeader.tsx components/auth/IdleLogoutGuard.tsx
  git commit -m "fix: update middleware, header, and idle guard for Auth0 admin auth

  - Middleware checks javelina_session instead of admin_session
  - AdminHeader logout redirects to /api/logout (shared Auth0 session)
  - IdleLogoutGuard uses Auth0 logout for admin routes"
  ```

---

## Task 8: Clean up remaining references

- [ ] **Step 1: Search for stale references in frontend**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  grep -r "admin-session-token\|setAdminSessionToken\|getAdminSessionToken\|clearAdminSessionToken\|ADMIN_JWT_SECRET\|admin_session\|__Host-admin_session\|signAdminJwt\|verifyAdminJwt\|verifyAdminAndGetClient\|actions/admin" --include="*.ts" --include="*.tsx" -l
  ```

  Fix any remaining references found.

- [ ] **Step 2: Search backend for stale references**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  grep -r "adminJwtSecret\|ADMIN_JWT_SECRET\|admin_session\|__Host-admin_session\|javelina-admin\|isAdminSession" --include="*.ts" -l
  ```

  Fix any remaining references.

- [ ] **Step 3: Final build verification — both repos**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina-backend && npm run build
  cd /Users/sethchesky/Documents/GitHub/javelina && npm run build
  ```
  Expected: Both compile cleanly.

- [ ] **Step 4: Commit any remaining cleanup**

  ```bash
  # Frontend (if changes)
  cd /Users/sethchesky/Documents/GitHub/javelina
  git add -A && git diff --cached --stat
  git commit -m "chore: clean up stale admin JWT and server action references"

  # Backend (if changes)
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  git add -A && git diff --cached --stat
  git commit -m "chore: clean up stale admin JWT references"
  ```

---

## Task 9: End-to-end validation

- [ ] **Step 1: Start both servers locally**

  ```bash
  # Terminal 1 — backend
  cd /Users/sethchesky/Documents/GitHub/javelina-backend
  npm run dev

  # Terminal 2 — frontend
  cd /Users/sethchesky/Documents/GitHub/javelina
  npm run dev
  ```

- [ ] **Step 2: Test — not logged in, navigate to /admin**

  1. Open browser, clear cookies
  2. Navigate to `http://localhost:3000/admin`
  3. Expected: Redirected to `/admin/login`
  4. On login page: should see "Please sign in" message and a "Sign In" button
  5. Click "Sign In" — should redirect to Auth0 login

- [ ] **Step 3: Test — logged in as non-superadmin, navigate to /admin**

  1. Log in as a regular user (non-superadmin) via the main app
  2. Navigate to `http://localhost:3000/admin`
  3. Expected: `/admin/login` page shows "Access denied" message

- [ ] **Step 4: Test — logged in as superadmin, navigate to /admin**

  1. Log in as a user with `profiles.superadmin = true`
  2. Navigate to `http://localhost:3000/admin`
  3. Expected: Admin dashboard loads, shows user info in header
  4. Test: navigate between admin pages (users, organizations, audit logs)
  5. Test: admin API calls work (dashboard KPIs load, user list loads)

- [ ] **Step 5: Test — flagged zones (new backend endpoints)**

  1. Navigate to `/admin/zones`
  2. Expected: Flagged zones list loads (via `GET /api/admin/zones/flagged`)
  3. If flagged zones exist, test approve, rename, and delete operations
  4. Check backend logs to verify audit entries are created

- [ ] **Step 6: Test — admin logout**

  1. From the admin panel, click user avatar → "Sign out"
  2. Expected: Redirected to main app login (Auth0 session cleared)
  3. Navigate back to `/admin` — should redirect to `/admin/login`

- [ ] **Step 7: Test — session expiry**

  1. Log in as superadmin, access admin panel
  2. Wait for session inactivity timeout (or manually delete `javelina_session` cookie)
  3. Try to interact with admin panel
  4. Expected: Redirected to login page

- [ ] **Step 8: Verify no direct Supabase calls remain**

  ```bash
  cd /Users/sethchesky/Documents/GitHub/javelina
  grep -r "supabase\|createClient\|createServiceRoleClient" --include="*.ts" --include="*.tsx" app/admin/ components/admin/ lib/admin-auth.ts lib/actions/admin/ 2>/dev/null
  ```
  Expected: No results (all admin operations go through the backend).
