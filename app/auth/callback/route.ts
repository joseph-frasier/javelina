import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * OAuth Callback Handler
 * 
 * This route handles the callback from OAuth providers (Google, GitHub, etc.)
 * and email verification links.
 * 
 * Flow:
 * 1. User clicks "Sign in with Google" → redirects to Google
 * 2. User authorizes → Google redirects back to this route with a code
 * 3. We exchange the code for a session
 * 4. Redirect user to the app (or to where they were trying to go)
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error('Error exchanging code for session:', error)
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      )
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL(next, requestUrl.origin))
}

