/**
 * Get the site URL dynamically based on environment
 * Works in local dev, Vercel preview, and production
 */

export function getURL() {
  // 1. Check for explicit NEXT_PUBLIC_SITE_URL (highest priority)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // 2. Check for Vercel automatic URL (preview deployments)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // 3. Client-side: use window.location.origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // 4. Fallback to localhost for local development
  return 'http://localhost:3000'
}

/**
 * Get the base URL for the application
 * Same as getURL() but more descriptive name
 */
export function getBaseURL() {
  return getURL()
}

/**
 * Get the full callback URL for OAuth
 */
export function getAuthCallbackURL() {
  return `${getURL()}/auth/callback`
}

