import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';

export async function POST(request: Request) {
  try {
    const { token, expiresAt } = await request.json();

    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(expiresAt),
      path: '/' // Allow cookie to be sent to all routes including /api
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to set admin session:', error);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
