import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Logout API route - provides synchronous navigation for smooth logout flow
 * 
 * Flow:
 * 1. Frontend navigates to /api/logout (instant, same-origin)
 * 2. This route calls Express backend to clear app session
 * 3. Forwards Set-Cookie headers from Express to browser
 * 4. Redirects to Auth0 logout URL (clears Auth0 session)
 * 5. Auth0 redirects back to app root (/)
 * 
 * This eliminates choppy transitions by:
 * - No async fetch in frontend (immediate navigation)
 * - No React re-renders during logout
 * - Single smooth transition from user's perspective
 * - Clears BOTH app session and Auth0 session
 * 
 * CRITICAL: The Express backend must set returnTo to ${FRONTEND_URL}/ (root)
 * NOT ${FRONTEND_URL}/login, because:
 * - Root (/) shows landing page to unauthenticated users
 * - /login would cause an extra redirect via middleware
 * - The returnTo URL must be in Auth0's "Allowed Logout URLs"
 */
export async function GET(request: NextRequest) {
  try {
    // Forward cookies to backend for session clearing
    const cookies = request.headers.get('cookie') || '';
    
    console.log('[Logout API] Calling Express logout endpoint:', `${API_URL}/auth/logout`);
    
    // Call Express logout endpoint
    const backendResponse = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
    });
    
    if (!backendResponse.ok) {
      console.error('[Logout API] Backend logout failed:', backendResponse.status, backendResponse.statusText);
      const text = await backendResponse.text().catch(() => '');
      console.error('[Logout API] Backend response:', text);
      // Still try to clear frontend state and redirect
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Parse backend response to get Auth0 logout URL
    const data = await backendResponse.json();
    const auth0LogoutUrl = data.redirectUrl;
    
    console.log('[Logout API] Auth0 logout URL:', auth0LogoutUrl);
    
    if (!auth0LogoutUrl) {
      console.warn('[Logout API] No Auth0 logout URL provided by backend, redirecting to root');
      // Fallback if no redirect URL provided
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Redirect to Auth0 logout URL (this clears the Auth0 session)
    const redirectResponse = NextResponse.redirect(auth0LogoutUrl);
    
    // CRITICAL: Forward Set-Cookie headers from Express to browser
    // This ensures the session cookie actually gets cleared in the user's browser
    const setCookieHeaders = backendResponse.headers.get('set-cookie');
    if (setCookieHeaders) {
      console.log('[Logout API] Forwarding Set-Cookie headers to clear session');
      redirectResponse.headers.set('Set-Cookie', setCookieHeaders);
    } else {
      console.warn('[Logout API] No Set-Cookie headers received from backend');
    }
    
    return redirectResponse;
  } catch (error) {
    console.error('[Logout API] Logout API route error:', error);
    // Even on error, redirect to root to clear UI
    return NextResponse.redirect(new URL('/', request.url));
  }
}
