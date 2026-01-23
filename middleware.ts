import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware runs on every request before it reaches your app
 * This middleware:
 * 1. Checks for valid session cookie (set by Express backend)
 * 2. Protects routes that require authentication
 * 3. Redirects unauthenticated users to /login
 * 4. Redirects authenticated users away from /login and /signup
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
        sameSite: 'lax',
        maxAge: 0,
        path: '/'
      })
    }

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password', '/email-verified', '/admin/login', '/pricing', '/checkout']
    const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    // Check if user just completed payment (allow dashboard access)
    const paymentComplete = request.nextUrl.searchParams.get('payment_complete') === 'true'

    // Disabled users are blocked by Supabase ban - they can't authenticate
    // No need to check status here

    // If user is not authenticated and trying to access a protected route (but allow /admin/* routes and payment completion)
    if (!isAuthenticated && !isPublicRoute && !request.nextUrl.pathname.startsWith('/admin') && !paymentComplete) {
      const redirectUrl = new URL('/login', request.url)
      // Add the current URL as a redirect parameter so we can send them back after login
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user IS authenticated and trying to access login/signup pages, redirect to dashboard
    // Dashboard will handle onboarding check if needed
    if (isAuthenticated && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
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
