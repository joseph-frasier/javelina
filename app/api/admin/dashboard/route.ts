import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Check admin session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('__Host-admin_session')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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
    console.error('Failed to fetch dashboard data:', error);
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
