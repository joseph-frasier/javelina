import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET() {
  try {
    const client = createServiceRoleClient();

    let userCount = 0;
    let orgCount = 0;
    let deletedOrgCount = 0;
    let activeMembersCount = 0;
    let auditData: any[] = [];

    // Fetch total users
    try {
      const { count } = await client
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      userCount = count || 0;
    } catch (error) {
      console.error('Failed to fetch user count:', error);
    }

    // Fetch total organizations
    try {
      const { count } = await client
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);
      orgCount = count || 0;
    } catch (error) {
      console.error('Failed to fetch organization count:', error);
    }

    // Fetch soft-deleted organizations (last 30 days)
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await client
        .from('organizations')
        .select('*', { count: 'exact', head: true })
        .not('deleted_at', 'is', null)
        .gte('deleted_at', thirtyDaysAgo);
      deletedOrgCount = count || 0;
    } catch (error) {
      console.error('Failed to fetch deleted organization count:', error);
    }

    // Fetch active members (last 7 days)
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: activeMembersData } = await client
        .from('organization_members')
        .select('user_id')
        .gte('created_at', sevenDaysAgo);
      activeMembersCount = new Set(activeMembersData?.map((m: any) => m.user_id)).size || 0;
    } catch (error) {
      console.error('Failed to fetch active members:', error);
    }

    // Fetch recent audit entries (gracefully handle if table doesn't exist)
    try {
      const { data } = await client
        .from('admin_audit_logs')
        .select('*, admin_users(name, email)')
        .order('created_at', { ascending: false })
        .limit(10);
      auditData = data || [];
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      // Silently fail - admin_audit_logs table may not exist yet
      auditData = [];
    }

    const kpis = {
      totalUsers: userCount,
      totalOrganizations: orgCount,
      deletedOrganizations: deletedOrgCount,
      activeMembers: activeMembersCount
    };

    return NextResponse.json({
      kpis,
      recentAudit: auditData
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
