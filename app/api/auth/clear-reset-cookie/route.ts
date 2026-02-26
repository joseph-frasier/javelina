import { NextResponse } from 'next/server'

/**
 * API route to clear the password_reset_required cookie
 * Called after successful password reset
 */
export async function POST() {
  const response = NextResponse.json({ success: true })
  
  // Clear the cookie by setting it to expire immediately
  response.cookies.set('password_reset_required', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/'
  })
  
  return response
}

