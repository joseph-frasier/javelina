import { NextResponse, type NextRequest } from 'next/server'
import { resolveBrandFromHost } from '@/lib/brand/resolve'

/**
 * Middleware runs on every request before it reaches your app
 * This middleware:
 * 1. Resolves the brand from the request Host and stamps it as `x-brand`
 * 2. Checks for valid session cookie (set by Express backend after Auth0 login)
 * 3. Protects routes that require authentication
 * 4. Redirects unauthenticated users trying to access protected routes to root (/)
 * 5. Root (/) is accessible to all - shows login UI to unauthenticated, dashboard to authenticated
 * 6. Redirects authenticated users away from /login and /signup to root (/)
 *
 * Brand resolution lives here rather than in the root layout on purpose:
 * headers() is async and app/layout.tsx is synchronous, so reading the host
 * there would make the root layout dynamic and opt every route out of static
 * rendering. Stamping a request header keeps that cost confined to the
 * segments that actually read it.
 */
export async function middleware(request: NextRequest) {
  // Clone before mutating: NextRequest headers are immutable.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(
    'x-brand',
    resolveBrandFromHost(request.headers.get('host')).id
  )

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  try {
    // Check for session cookie (set by Express backend after Auth0 login)
    const sessionCookie = request.cookies.get('javelina_session')
    const isAuthenticated = !!sessionCookie

    // Public routes that don't require authentication
    // Root path '/' is accessible to all (shows login to unauthenticated, dashboard to authenticated)
    const publicRoutes = ['/', '/login', '/forgot-password', '/email-verified', '/invite/accept', '/admin/login', '/checkout', '/infrastructure', '/legal', '/terms']
    const isPublicRoute = publicRoutes.some((route) => {
      // Exact match for root path
      if (route === '/' && request.nextUrl.pathname === '/') {
        return true
      }
      // Prefix match for other routes
      return request.nextUrl.pathname.startsWith(route)
    })

    // Check if user just completed payment (allow dashboard access)
    const paymentComplete = request.nextUrl.searchParams.get('payment_complete') === 'true'

    // Admin routes require a valid session (same Auth0 session as main app).
    // The actual superadmin check happens server-side via /api/admin/me.
    // Middleware just checks the session cookie exists as a fast gate.
    if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
      const sessionCookie = request.cookies.get('javelina_session')
      if (!sessionCookie) {
        return NextResponse.redirect(new URL('/admin/login', request.url))
      }
    }

    // If user is not authenticated and trying to access a protected route (payment completion allowed)
    if (!isAuthenticated && !isPublicRoute && !request.nextUrl.pathname.startsWith('/admin') && !paymentComplete) {
      // Redirect to root (which shows login UI)
      return NextResponse.redirect(new URL('/', request.url))
    }

    // If user IS authenticated and trying to access the login page, redirect to dashboard
    // Note: Don't redirect from '/' since it handles both auth states
    if (isAuthenticated && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  } catch (error) {
    console.error('Middleware error:', error)
    // If there's an error (e.g., Supabase not configured), just continue
    // This allows the app to work even if Supabase isn't fully configured
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
