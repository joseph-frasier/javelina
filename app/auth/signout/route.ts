import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Sign Out Route Handler
 * 
 * This route handles signing out the user.
 * Can be called as a POST request from the client or redirected to as a GET.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const requestUrl = new URL(request.url)
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

// Also support GET for simple link-based logout
export async function GET(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  const requestUrl = new URL(request.url)
  return NextResponse.redirect(new URL('/login', requestUrl.origin))
}

