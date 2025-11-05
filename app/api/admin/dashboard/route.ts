import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { isValidAdminToken } from '@/lib/admin-auth';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';

export async function GET(request: Request) {
  try {
    // Check admin session cookie
    const cookieStore = await cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate token against in-memory store
    const isValid = await isValidAdminToken(token);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch real data from database
    const supabase = createServiceRoleClient();
    
    // Get total users
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    // Get total organizations
    const { count: totalOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });
    
    // Get deleted organizations (within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: deletedOrganizations } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'deleted')
      .gte('deleted_at', thirtyDaysAgo.toISOString());
    
    // Get active members (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: activeMembers } = await supabase
      .from('organization_members')
      .select('*', { count: 'exact', head: true })
      .gte('last_accessed_at', sevenDaysAgo.toISOString());
    
    // Get flagged zones (live = false and not deleted)
    const { count: flaggedZones } = await supabase
      .from('zones')
      .select('*', { count: 'exact', head: true })
      .eq('live', false)
      .is('deleted_at', null);
    
    return NextResponse.json({
      kpis: {
        totalUsers: totalUsers || 0,
        totalOrganizations: totalOrganizations || 0,
        deletedOrganizations: deletedOrganizations || 0,
        activeMembers: activeMembers || 0,
        flaggedZones: flaggedZones || 0
      },
      recentAudit: []
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    // Return default empty data instead of erroring
    return NextResponse.json({
      kpis: {
        totalUsers: 0,
        totalOrganizations: 0,
        deletedOrganizations: 0,
        activeMembers: 0,
        flaggedZones: 0
      },
      recentAudit: []
    });
  }
}
