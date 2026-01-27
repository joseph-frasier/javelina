import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Logout API route - provides synchronous navigation for smooth logout flow
 * 
 * Flow:
 * 1. Frontend navigates to /api/logout (instant, same-origin)
 * 2. This route calls Express backend to clear session
 * 3. Redirects to root (which will redirect to Auth0 login)
 * 
 * This eliminates choppy transitions by:
 * - No async fetch in frontend (immediate navigation)
 * - No React re-renders during logout
 * - Single smooth transition from user's perspective
 */
export async function GET(request: NextRequest) {
  try {
    // Forward cookies to backend for session clearing
    const cookies = request.headers.get('cookie') || '';
    
    // Call Express logout endpoint
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookies,
      },
    });
    
    // Session cleared, redirect to root
    // Root will detect unauthenticated user and redirect to Auth0 login
    return NextResponse.redirect(new URL('/', request.url));
  } catch (error) {
    console.error('Logout API route error:', error);
    // Even on error, redirect to root to clear UI
    return NextResponse.redirect(new URL('/', request.url));
  }
}
