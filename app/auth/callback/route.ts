import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Handler
 * 
 * This route handles the callback from OAuth providers (Google, GitHub, etc.),
 * email verification links, and password reset links.
 * 
 * Flow for Email Verification (NEW):
 * 1. User clicks verification link from email
 * 2. We exchange the code for a session (user is now logged in!)
 * 3. Check if user has organizations (completed onboarding)
 * 4. If NO organizations → redirect to /pricing (first-time user)
 * 5. If HAS organizations → redirect to / (returning user)
 * 
 * Flow for OAuth:
 * 1. User clicks "Sign in with Google" → redirects to Google
 * 2. User authorizes → Google redirects back to this route with a code
 * 3. We exchange the code for a session
 * 4. Same organization check as email verification
 * 
 * Flow for Password Reset:
 * 1. User clicks reset link from email
 * 2. Supabase redirects here with code and type=recovery
 * 3. We exchange the code for a session
 * 4. Redirect to /reset-password with token in hash for password update
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next')
  const type = requestUrl.searchParams.get('type')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }

    // User is now authenticated! 
    if (data.user) {
      // Handle password reset flow (type=recovery)
      // User IS authenticated but we redirect them to reset-password page
      // Set a flag so middleware knows to restrict access
      if (type === 'recovery') {
        const resetUrl = new URL('/reset-password', requestUrl.origin)
        resetUrl.searchParams.set('recovery', 'true')
        
        // Set a cookie to indicate password reset is required
        const response = NextResponse.redirect(resetUrl)
        response.cookies.set('password_reset_required', 'true', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 3600 // 1 hour
        })
        return response
      }

      // Check if user has any organizations
      const { data: memberships, error: memberError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', data.user.id)
        .limit(1)

      const hasOrganizations = memberships && memberships.length > 0

      // If they have a specific destination (OAuth with redirect), honor it
      if (next) {
        return NextResponse.redirect(new URL(next, requestUrl.origin))
      }

      // First-time user: send to dashboard with welcome guidance
      if (!hasOrganizations) {
        return NextResponse.redirect(new URL('/', requestUrl.origin))
      }

      // Returning user with organizations: send to dashboard
      return NextResponse.redirect(new URL('/', requestUrl.origin))
    }
  }

  // Fallback: redirect to login if something went wrong
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

