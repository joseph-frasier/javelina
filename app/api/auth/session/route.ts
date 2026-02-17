import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Auth Session Relay - Bridges cross-domain cookie gap
 *
 * Problem:
 *   Express backend (javelina-api-backend.vercel.app) sets the javelina_session
 *   cookie on its own domain after Auth0 login. The Next.js frontend
 *   (app.javelina.cloud) cannot read that cookie in server components because
 *   browsers scope cookies to the domain that set them.
 *
 * Solution:
 *   After Auth0 login, Express redirects to this route with the session token.
 *   This route sets the same cookie on the frontend domain so that:
 *   - Next.js middleware can check authentication
 *   - Server components can read the cookie via cookies()
 *   - Server-to-server API calls can forward the cookie to Express
 *
 * Flow:
 *   1. User logs in via Auth0 → Express /auth/callback
 *   2. Express sets cookie on its domain + redirects here with ?token=<jwt>
 *   3. This route sets the cookie on the frontend domain
 *   4. Redirects to dashboard (/)
 *
 * Security:
 *   - Token is a signed JWT (verified by Express on every API call)
 *   - HTTPS encrypts the token in transit
 *   - Redirect is immediate (token URL is transient)
 *   - Cookie is httpOnly + secure + sameSite=none (production) / sameSite=lax (development)
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  const redirectTo = request.nextUrl.searchParams.get('redirect') || '/';

  if (!token) {
    console.error('[Auth Session] No token provided in relay request');
    return NextResponse.redirect(new URL('/?error=missing_session', request.url));
  }

  // Basic JWT format validation (three base64url segments separated by dots)
  const jwtParts = token.split('.');
  if (jwtParts.length !== 3) {
    console.error('[Auth Session] Invalid token format');
    return NextResponse.redirect(new URL('/?error=invalid_session', request.url));
  }

  // Verify the token is valid by checking with Express backend
  try {
    const verifyResponse = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Cookie': `javelina_session=${token}`,
      },
    });

    if (!verifyResponse.ok) {
      console.error('[Auth Session] Token verification failed:', verifyResponse.status);
      return NextResponse.redirect(new URL('/?error=invalid_session', request.url));
    }
  } catch (error) {
    console.error('[Auth Session] Token verification error:', error);
    // Proceed anyway - Express will reject invalid tokens on subsequent API calls
  }

  // Set the cookie on the frontend domain and redirect to dashboard
  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.cookies.set('javelina_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: 86400, // 24 hours in seconds
    path: '/',
  });

  console.log('[Auth Session] Cookie set on frontend domain, redirecting to', redirectTo);
  return response;
}
