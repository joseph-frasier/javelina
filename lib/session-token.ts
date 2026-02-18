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
