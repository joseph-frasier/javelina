# Safari Authentication Fix — Frontend Implementation Guide

## Problem

Safari's Intelligent Tracking Prevention (ITP) blocks third-party cookies between different registrable domains. Because the frontend (`app-javelina-cloud-dev.vercel.app`) and backend (`javelina-api-backend-dev.vercel.app`) are on separate `*.vercel.app` subdomains — and `vercel.app` is on the Public Suffix List — the browser treats them as completely unrelated sites.

After login, the Express backend sets the `javelina_session` cookie on its own domain and redirects to the frontend session relay. The relay sets a copy of the cookie on the frontend domain. Everything works up to this point.

The break happens on the **next step**: when the frontend makes `fetch()` calls to the backend API with `credentials: 'include'`, Safari refuses to send the backend-domain cookie because it's a third-party cookie. The backend returns 401, the frontend sees the user as unauthenticated, and redirects to the landing page.

This affects Safari today and will affect Chrome once it finishes rolling out cookie partitioning.

## Solution

The backend now accepts the session JWT as an `Authorization: Bearer <token>` header in addition to the `javelina_session` cookie. The frontend needs to:

1. Make the session token accessible to client-side JavaScript
2. Send it as a Bearer header on every API request to the backend

Cookies continue to work as a fallback for browsers that still allow cross-site cookies.

---

## Backend Changes (Already Done)

The following backend middleware functions now fall back to `Authorization: Bearer <token>` when the session cookie is missing:

- `authenticate` in `src/middleware/auth.ts`
- `optionalAuthenticate` in `src/middleware/auth.ts`
- `authenticateSession` in `src/routes/auth.ts`

No changes to cookie behavior, CORS, or session creation. The `Authorization` header is already in the CORS `allowedHeaders` list.

---

## Frontend Changes Required

### 1. Store the session token so client-side JS can read it

**File:** `app/api/auth/session/route.ts`

The session relay currently sets a single `httpOnly` cookie. Since `httpOnly` cookies can't be read by client-side JavaScript, add a **second, non-httpOnly cookie** that the browser JS can read for use as a Bearer token.

**Current code (around line 68):**
```typescript
response.cookies.set('javelina_session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 86400,
  path: '/',
});
```

**Change to:**
```typescript
// httpOnly cookie — sent automatically by the browser when cookies work (Chrome, Firefox)
response.cookies.set('javelina_session', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 86400,
  path: '/',
});

// Non-httpOnly cookie — readable by client-side JS for Bearer token auth (Safari)
response.cookies.set('javelina_session_token', token, {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 86400,
  path: '/',
});
```

**Why a second cookie instead of localStorage/sessionStorage?**
- Survives page reloads (unlike in-memory state)
- Available immediately on the first client-side render (unlike sessionStorage which requires hydration timing)
- Automatically cleared when it expires
- `sameSite: 'lax'` is fine here — this cookie is only read by JS on the frontend domain, never sent cross-site

**Security note:** The JWT is signed and tamper-proof. Exposing it to client-side JS is the same security model as Bearer token auth in SPAs. The `httpOnly` cookie is kept as a belt-and-suspenders fallback.

---

### 2. Create a helper to read the token

**New file:** `lib/session-token.ts`

```typescript
/**
 * Read the session JWT from the client-readable cookie.
 * Returns null if not present (user not authenticated).
 */
export function getSessionToken(): string | null {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith('javelina_session_token='));

  return match ? match.split('=')[1] : null;
}
```

---

### 3. Send Bearer header on all backend API calls

**File:** `lib/api-client.ts`

Update `apiRequest` to always attach the session token as a Bearer header when available. This runs alongside `credentials: 'include'` — whichever auth method the backend sees first wins.

**Current code (around lines 37-64):**
```typescript
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach admin JWT as Authorization header for admin-panel endpoints only
  if (!headers['Authorization'] && isAdminEndpoint(endpoint)) {
    const adminToken = getAdminSessionToken();
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
  }

  const url = `${API_BASE_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
  // ...
}
```

**Change to:**
```typescript
import { getSessionToken } from './session-token';

async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Attach admin JWT for admin-panel endpoints
  if (!headers['Authorization'] && isAdminEndpoint(endpoint)) {
    const adminToken = getAdminSessionToken();
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
  }

  // Attach session JWT as Bearer token for regular endpoints.
  // This is the primary auth method on Safari (where cross-site cookies are blocked).
  // On Chrome/Firefox the cookie also works, but the header takes no effect since
  // the backend checks cookies first.
  if (!headers['Authorization']) {
    const sessionToken = getSessionToken();
    if (sessionToken) {
      headers['Authorization'] = `Bearer ${sessionToken}`;
    }
  }

  const url = `${API_BASE_URL}/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // keep for browsers where cookies still work
  });
  // ...
}
```

**Priority logic:** Admin token takes precedence (checked first), then session token. This preserves the existing admin auth behavior.

---

### 4. Send Bearer header on auth-store direct fetch calls

**File:** `lib/auth-store.ts`

The auth store makes direct `fetch()` calls to the backend (not through `apiRequest`). These also need the Bearer header.

**`initializeAuth` (around line 194):**
```typescript
// BEFORE
const response = await fetch(`${API_URL}/auth/me`, {
  credentials: 'include',
})

// AFTER
import { getSessionToken } from './session-token';

const token = getSessionToken();
const response = await fetch(`${API_URL}/auth/me`, {
  credentials: 'include',
  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
})
```

**`fetchProfile` (around line 223):**
```typescript
// BEFORE
const response = await fetch(`${API_URL}/api/users/profile`, {
  credentials: 'include',
})

// AFTER
const token = getSessionToken();
const response = await fetch(`${API_URL}/api/users/profile`, {
  credentials: 'include',
  headers: token ? { 'Authorization': `Bearer ${token}` } : {},
})
```

**Tip:** If there are other direct `fetch()` calls to the backend outside of `apiRequest`, search for `credentials: 'include'` across the codebase and add the Bearer header to each one. Files to check:
- `app/analytics/page.tsx` (lines 47, 79, 97)
- Any other files making direct API calls

---

### 5. Clear the token cookie on logout

**File:** `app/api/logout/route.ts`

Add a `clearCookie` for `javelina_session_token` alongside the existing `javelina_session` clear.

**In the cookie clearing section (around line 95):**
```typescript
// Clear both session cookies
redirectResponse.cookies.set('javelina_session', '', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  path: '/',
  maxAge: 0,
});

redirectResponse.cookies.set('javelina_session_token', '', {
  httpOnly: false,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: 0,
});
```

---

### 6. No changes needed to Next.js middleware

**File:** `middleware.ts`

The middleware checks `request.cookies.get('javelina_session')` to decide if a user is authenticated. This reads the **httpOnly** cookie set on the frontend domain, which is a first-party cookie and works fine on all browsers. No change needed here.

---

## Summary of Files to Change

| File | Change |
|------|--------|
| `app/api/auth/session/route.ts` | Add `javelina_session_token` non-httpOnly cookie |
| `lib/session-token.ts` | **New file** — helper to read token from cookie |
| `lib/api-client.ts` | Attach Bearer header for non-admin endpoints |
| `lib/auth-store.ts` | Add Bearer header to direct `fetch()` calls |
| `app/api/logout/route.ts` | Clear `javelina_session_token` cookie on logout |
| `app/analytics/page.tsx` | Add Bearer header to direct `fetch()` calls (if any) |

## Deployment Order

1. Deploy **backend** first (already accepts Bearer tokens, cookies still work as fallback)
2. Deploy **frontend** second (starts sending Bearer headers)

The backend change is backwards-compatible. The frontend change is also backwards-compatible (Bearer header is ignored by the backend if the cookie is already present and valid).

## Testing

1. **Safari** — Log in, verify you land on the dashboard (not redirected back to landing page). Open Safari Web Inspector > Network tab and confirm API requests include the `Authorization: Bearer` header.
2. **Chrome/Firefox** — Verify login still works. Both the cookie and the Bearer header will be present; the backend uses the cookie.
3. **Logout** — Verify both cookies are cleared and the user is redirected to the landing page.
4. **Session expiry** — Wait for inactivity timeout (1 hour), verify the user is logged out on the next API call.
