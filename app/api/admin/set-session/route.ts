import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { token, expiresAt } = await request.json();

    const cookieStore = await cookies();
    cookieStore.set('__Host-admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(expiresAt),
      path: '/admin'
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to set admin session:', error);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
