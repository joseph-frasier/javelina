# Admin Panel Setup

## Overview

The admin panel is a simple, hardcoded authentication system designed for development and initial testing. It does not use the database or require schema changes.

## Hardcoded Admin Credentials

**Email:** `admin@irongrove.com`
**Password:** `admin123`

These credentials are permanently hardcoded in `/lib/admin-auth.ts` and cannot be changed without modifying the source code.

## How It Works

### Authentication Flow

1. User navigates to `/admin/login`
2. User enters the hardcoded credentials
3. `loginAdmin()` validates credentials in memory (no database lookup)
4. On success:
   - A random UUID token is generated
   - Token is stored in an in-memory `Set`
   - Cookie `__Host-admin_session` is set (httpOnly, secure, sameSite: strict)
   - User is redirected to `/admin`

### Session Validation

1. When accessing protected routes, `AdminProtectedRoute` component calls `getAdminSession()`
2. The cookie is retrieved and checked against the in-memory token store
3. If valid, the user is allowed access
4. If invalid or missing, user is redirected to `/admin/login`

### Logout

1. Token is removed from in-memory store
2. Cookie is deleted
3. User is redirected to login

## Key Files

- **`/lib/admin-auth.ts`** - Main authentication logic
- **`/app/admin/login/page.tsx`** - Login page
- **`/components/admin/AdminProtectedRoute.tsx`** - Route protection component
- **`/app/admin/page.tsx`** - Admin dashboard (requires auth)

## Security Notes

⚠️ **This is a development implementation only.** 

- Credentials are hardcoded in source
- Tokens are stored in memory (lost on server restart)
- No password hashing or encryption
- No audit logging to database
- Suitable ONLY for development, testing, and UI building

For production, this will need to be replaced with:
- Proper user management in Supabase
- Password hashing (bcrypt, argon2, etc.)
- Database-backed sessions
- Audit logging
- Rate limiting on login attempts
- 2FA support

## No Backend Changes Required

This implementation **deliberately avoids**:
- ❌ Database schema changes
- ❌ Additional Supabase tables
- ❌ Service role client usage for auth
- ❌ Complex validation logic

All data needed for admin authentication is contained in `/lib/admin-auth.ts`.
