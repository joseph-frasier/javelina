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

    // Public routes that don't require authentication
    const publicRoutes = ['/login', '/signup', '/auth/callback', '/forgot-password', '/reset-password', '/admin/login']
    const isPublicRoute = publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))

    // If user is not authenticated and trying to access a protected route (but allow /admin/* routes)
    if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/admin')) {
      const redirectUrl = new URL('/login', request.url)
      // Add the current URL as a redirect parameter so we can send them back after login
      redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If user IS authenticated and trying to access login/signup pages
    if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
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
