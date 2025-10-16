import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const adminCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  return NextResponse.json({
    message: 'Debug endpoint',
    adminCookie: adminCookie ? {
      name: adminCookie.name,
      value: adminCookie.value.substring(0, 8) + '...',
      fullValue: adminCookie.value
    } : null,
    allCookies: allCookies.map(c => ({
      name: c.name,
      value: c.value.substring(0, 8) + '...'
    })),
    timestamp: new Date().toISOString()
  });
}

