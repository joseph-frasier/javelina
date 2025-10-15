import { OrganizationClient } from './OrganizationClient';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleInOrganization } from '@/lib/api/roles';
import { getOrganizationAuditLogs, formatAuditLog } from '@/lib/api/audit';

// Force dynamic rendering - don't cache this page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Not Authenticated</h1>
        <p className="text-gray-slate">Please log in to view this organization.</p>
      </div>
    );
  }

  // Fetch organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (orgError || !org) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization does not exist or you don&apos;t have access to it.</p>
      </div>
    );
  }

  // Fetch user's role in this organization
  const userRole = await getUserRoleInOrganization(orgId);
  
  if (!userRole) {
    return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-6 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Access Denied</h1>
        <p className="text-gray-slate">You don&apos;t have access to this organization.</p>
      </div>
    );
  }

  // Fetch environments for this organization
  const { data: environments, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch zones count for each environment
  const environmentsWithCounts = await Promise.all(
    (environments || []).map(async (env) => {
      const { count: zonesCount } = await supabase
        .from('zones')
        .select('id', { count: 'exact', head: true })
        .eq('environment_id', env.id);
      
      return {
        ...env,
        zones_count: zonesCount || 0,
        total_records: 0 // Placeholder for future DNS records
      };
    })
  );

  // Fetch total zones count for this organization (through environments)
  const { count: zonesCount } = await supabase
    .from('zones')
    .select('id', { count: 'exact', head: true })
    .in('environment_id', environments?.map(e => e.id) || []);

  // Fetch recent activity from audit logs
  const auditLogs = await getOrganizationAuditLogs(orgId, 10);
  const recentActivity = await Promise.all(auditLogs.map(log => formatAuditLog(log)));

  // Prepare organization data for client component
  const orgData = {
    id: org.id,
    name: org.name,
    description: org.description,
    role: userRole,
    environments: environmentsWithCounts,
    environmentsCount: environmentsWithCounts.length,
    zonesCount: zonesCount || 0,
    recentActivity: recentActivity,
    created_at: org.created_at,
    updated_at: org.updated_at,
  };

  return <OrganizationClient org={orgData} />;
}
