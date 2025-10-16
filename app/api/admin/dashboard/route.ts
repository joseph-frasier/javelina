import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET() {
  try {
    const client = createServiceRoleClient();

    // Fetch total users
    const { count: userCount } = await client
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Fetch total organizations
    const { count: orgCount } = await client
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    // Fetch soft-deleted organizations (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { count: deletedOrgCount } = await client
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null)
      .gte('deleted_at', thirtyDaysAgo);

    // Fetch active members (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: activeMembersData } = await client
      .from('organization_members')
      .select('user_id')
      .gte('created_at', sevenDaysAgo);

    // Fetch recent audit entries
    const { data: auditData } = await client
      .from('admin_audit_logs')
      .select('*, admin_users(name, email)')
      .order('created_at', { ascending: false })
      .limit(10);

    const kpis = {
      totalUsers: userCount || 0,
      totalOrganizations: orgCount || 0,
      deletedOrganizations: deletedOrgCount || 0,
      activeMembers: new Set(activeMembersData?.map((m: any) => m.user_id)).size || 0
    };

    return NextResponse.json({
      kpis,
      recentAudit: auditData || []
    });
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
