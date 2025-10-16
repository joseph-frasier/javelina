import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken } from '@/lib/admin-auth';

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';

export async function GET(request: Request) {
  try {
    // Check admin session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    
    console.log('[Dashboard API] Cookie token:', token ? 'present' : 'missing');
    
    if (!token) {
      console.log('[Dashboard API] No token found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    // Validate token against in-memory store
    const isValid = await isValidAdminToken(token);
    if (!isValid) {
      console.log('[Dashboard API] Token invalid, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    console.log('[Dashboard API] Token valid, returning data');
    
    // Return mock data for development
    return NextResponse.json({
      kpis: {
        totalUsers: 42,
        totalOrganizations: 8,
        deletedOrganizations: 1,
        activeMembers: 156
      },
      recentAudit: []
    });
  } catch (error) {
    console.error('[Dashboard API] Error:', error);
    // Return default empty data instead of erroring
    return NextResponse.json({
      kpis: {
        totalUsers: 0,
        totalOrganizations: 0,
        deletedOrganizations: 0,
        activeMembers: 0
      },
      recentAudit: []
    });
  }
}
