/**
 * Client-side admin session token management
 *
 * The admin JWT is stored in localStorage so the API client can attach it
 * as an Authorization header on cross-domain requests to the Express backend.
 * The httpOnly cookie still handles server-side auth (Next.js middleware, etc.).
 */

const STORAGE_KEY = 'admin_session_token';

/**
 * Retrieve the admin JWT from localStorage.
 * Returns null if not present or if running on the server.
 */
export function getAdminSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Store the admin JWT in localStorage after a successful login.
 */
export function setAdminSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage may be unavailable (private browsing, quota exceeded, etc.)
  }
}

/**
 * Remove the admin JWT from localStorage (called on logout).
 */
export function clearAdminSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore errors during cleanup
  }
}
