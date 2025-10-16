import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken } from '@/lib/admin-auth';

export async function GET(request: Request) {
  try {
    // Check admin session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('__Host-admin_session')?.value;
    
    console.log('[Dashboard API] Cookie token:', token ? 'present' : 'missing');
    
    if (!token) {
      console.log('[Dashboard API] No token found, returning 401');
      return NextResponse.json(
        { error: 'Unauthorized - No token' },
        { status: 401 }
      );
    }

    // Validate token against in-memory store
    if (!isValidAdminToken(token)) {
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
