import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware runs on every request before it reaches your app
 * This middleware:
 * 1. Checks for valid session cookie (set by Express backend after Auth0 login)
 * 2. Protects routes that require authentication
 * 3. Redirects unauthenticated users trying to access protected routes to root (/)
 * 4. Root (/) is accessible to all - shows login UI to unauthenticated, dashboard to authenticated
 * 5. Redirects authenticated users away from /login and /signup to root (/)
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  try {
    // Check for session cookie (set by Express backend after Auth0 login)
    const sessionCookie = request.cookies.get('javelina_session')
    const isAuthenticated = !!sessionCookie

    // Check if user is in password reset flow (must complete password reset before accessing anything else)
    // BUT allow navigation to login page (user can abandon reset and login normally)
    const passwordResetRequired = request.cookies.get('password_reset_required')?.value === 'true'
    const isLoginPage = request.nextUrl.pathname === '/login'
    
    if (passwordResetRequired && !isLoginPage && request.nextUrl.pathname !== '/reset-password') {
      return NextResponse.redirect(new URL('/reset-password?recovery=true', request.url))
    }
    
    // If user navigates to login during password reset, clear the reset cookie
    if (passwordResetRequired && isLoginPage) {
      response.cookies.set('password_reset_required', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
        maxAge: 0,
        path: '/'
      })
    }

    // Public routes that don't require authentication
    // Root path '/' is accessible to all (shows login to unauthenticated, dashboard to authenticated)
    const publicRoutes = ['/', '/login', '/auth/callback', '/forgot-password', '/reset-password', '/email-verified', '/admin/login', '/pricing', '/checkout', '/infrastructure']
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

    // Protect /admin/* routes: require admin session cookie (except /admin/login which is public)
    if (request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/admin/login')) {
      const adminCookie = request.cookies.get(
        process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session'
      )
      if (!adminCookie) {
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
