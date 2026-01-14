import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware runs on every request before it reaches your app
 * This middleware:
 * 1. Refreshes the Supabase session (important for keeping users logged in)
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
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            // Set cookie on request for this middleware execution
            request.cookies.set({
              name,
              value,
              ...options,
            })
            // Also set on response to persist for future requests
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            // Remove from request
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            // Also remove from response
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    // This will check if the user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Check if user is in password reset flow (must complete password reset before accessing anything else)
    // BUT allow navigation to login page (user can abandon reset and login normally)
    const passwordResetRequired = request.cookies.get('password_reset_required')?.value === 'true'
    const isLoginPage = request.nextUrl.pathname === '/login'
    
    if (passwordResetRequired && !isLoginPage && request.nextUrl.pathname !== '/reset-password') {
      console.log('[Middleware] Password reset required - redirecting to reset-password page')
      return NextResponse.redirect(new URL('/reset-password?recovery=true', request.url))
    }
    
    // If user navigates to login during password reset, clear the reset cookie
    if (passwordResetRequired && isLoginPage) {
      console.log('[Middleware] User navigated to login during password reset - clearing cookie')
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
    if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/admin') && !paymentComplete) {
      const redirectUrl = new URL('/login', request.url)
      // Add the current URL as a redirect parameter so we can send them back after login
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user IS authenticated and trying to access login/signup pages
    // Check if they have completed onboarding (have organizations)
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
      // Check if user has organizations
      const { data: memberships } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .limit(1)

      const hasOrganizations = memberships && memberships.length > 0

      if (hasOrganizations) {
        // User has completed onboarding, send to dashboard
        return NextResponse.redirect(new URL('/', request.url))
      } else {
        // First-time user, send to pricing to complete onboarding
        return NextResponse.redirect(new URL('/pricing?onboarding=true', request.url))
      }
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
