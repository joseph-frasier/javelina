import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  const adminCookie = cookieStore.get('__Host-admin_session');

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

