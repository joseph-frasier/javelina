# Backend Fix: Admin JWT — Write Operations Return 403

**Date:** February 16, 2026
**Priority:** High — all admin write actions (create, update, delete, disable) return 403 Forbidden
**Related:** BACKEND_ADMIN_JWT_CHANGES.md

## Problem

Admin panel **data fetching** (GET requests) works correctly with the admin JWT. But all **write operations** (POST, PUT, DELETE) return **403 Forbidden** — including routes under `/api/admin/*` that already have the JWT fallback.

**Working (GETs):**
- `GET /api/admin/users` ✅
- `GET /api/admin/organizations` ✅
- `GET /api/admin/dashboard` ✅

**Broken (writes):**
- `PUT /api/admin/users/:id/disable` ❌ 403
- `PUT /api/admin/organizations/:id/disable` ❌ 403
- `POST /api/discounts` ❌ 403
- `DELETE /api/discounts/:id` ❌ 403

## Root Cause — Two Issues

### Issue 1: `req.user` property mismatch in `isSuperAdmin()`

Write endpoints likely call an `isSuperAdmin()` function that queries `profiles.superadmin` by user ID. The function may read a **different property** than what the admin JWT middleware sets.

**Check your `isSuperAdmin()` function.** It probably does something like:

```typescript
// If it reads req.user.userId:
const userId = req.user.userId;  // ← works for javelina_session, UNDEFINED for admin JWT

// The admin JWT middleware sets req.user.id, NOT req.user.userId
```

**Fix:** Ensure `req.user` set by the admin JWT fallback matches the shape that `isSuperAdmin()` expects. Check what property name the `javelina_session` flow uses and match it:

```typescript
// In the admin JWT fallback, set req.user to match the javelina_session shape:
if (decoded.isSuperAdmin === true && decoded.userId) {
  req.user = {
    // Match EXACTLY what javelina_session decoding sets
    // If javelina_session sets req.user.userId, use userId here too
    userId: decoded.userId,     // ← match the property name
    id: decoded.userId,         // ← include both to be safe
    email: decoded.email,
    name: decoded.name,
    isAdminSession: true,
  };
}
```

**How to verify:** Search your codebase for `isSuperAdmin` and check which property it reads from `req.user`. Then search for where `javelina_session` is decoded and check what properties are set on `req.user`. The admin JWT fallback must set the same properties.

### Issue 2: Admin JWT fallback not applied to all routes

The admin JWT fallback is currently scoped to `/api/admin/*` routes only. The admin panel also calls endpoints under `/api/discounts/*` and `/api/support/admin/*` that don't have the fallback.

**Fix:** Move the admin JWT fallback into the **global auth middleware** (`authenticateSession`) so it runs on ALL `/api/*` routes.

```typescript
// In your global authenticateSession middleware (runs on ALL /api/* routes)
// AFTER the existing javelina_session check:

if (!req.user) {
  const adminToken =
    req.cookies["__Host-admin_session"] || req.cookies["admin_session"];

  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, process.env.ADMIN_JWT_SECRET!, {
        issuer: "javelina-admin",
        algorithms: ["HS256"],
      }) as {
        userId: string;
        email: string;
        name: string | null;
        isSuperAdmin: boolean;
      };

      if (decoded.isSuperAdmin === true && decoded.userId) {
        req.user = {
          // Use the SAME property names as javelina_session decoding
          userId: decoded.userId,
          id: decoded.userId,
          email: decoded.email,
          name: decoded.name,
          isAdminSession: true,
        };
      }
    } catch (err) {
      // Invalid or expired admin token — ignore
    }
  }
}
```

If this block currently lives inside a middleware specific to `/api/admin/*` routes, move it into the shared `authenticateSession` function that ALL routes use.

## Affected Routes

These routes are called from the admin panel but live outside `/api/admin/*`:

### Discount Code Management (`/api/discounts/*`)

| Method | Route | Admin Action |
|--------|-------|-------------|
| GET | `/api/discounts` | List all promotion codes |
| POST | `/api/discounts` | Create a new promotion code |
| DELETE | `/api/discounts/:id` | Deactivate a promotion code |
| GET | `/api/discounts/redemptions` | View redemption history |

### Support Review (`/api/support/admin/*`)

| Method | Route | Admin Action |
|--------|-------|-------------|
| GET | `/api/support/admin/conversations` | List support conversations |
| GET | `/api/support/admin/metrics` | View support metrics |
| GET | `/api/support/admin/conversation/:id` | View specific conversation |

### Routes Already Working (`/api/admin/*`)

These are listed for reference — they already have the admin JWT fallback:

| Method | Route | Admin Action |
|--------|-------|-------------|
| GET | `/api/admin/dashboard` | Dashboard KPIs |
| GET | `/api/admin/stats` | System stats |
| GET | `/api/admin/users` | List users |
| GET | `/api/admin/users/:id` | User details |
| PUT | `/api/admin/users/:id/disable` | Disable user |
| PUT | `/api/admin/users/:id/enable` | Enable user |
| PUT | `/api/admin/users/:id/role` | Update user role |
| GET | `/api/admin/organizations` | List organizations |
| POST | `/api/admin/organizations` | Create organization |
| GET | `/api/admin/organizations/:id` | Organization details |
| GET | `/api/admin/organizations/:id/members` | Organization members |
| PUT | `/api/admin/organizations/:id/soft-delete` | Soft delete org |
| PUT | `/api/admin/organizations/:id/disable` | Disable org |
| PUT | `/api/admin/organizations/:id/enable` | Enable org |
| GET | `/api/admin/audit-logs` | Audit logs |

## Verification

After applying the fix, test from the admin panel:

- [ ] Create a discount code (POST `/api/discounts`)
- [ ] Deactivate a discount code (DELETE `/api/discounts/:id`)
- [ ] View discount redemptions (GET `/api/discounts/redemptions`)
- [ ] View support conversations (GET `/api/support/admin/conversations`)
- [ ] View support metrics (GET `/api/support/admin/metrics`)
- [ ] Confirm existing admin data fetching still works (GET `/api/admin/*`)
- [ ] Confirm regular Auth0 users are unaffected
