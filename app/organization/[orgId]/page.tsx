import { OrganizationClient } from './OrganizationClient';
import { createClient } from '@/lib/supabase/server';
import { getUserRoleInOrganization } from '@/lib/api/roles';
import { getOrganizationAuditLogs, formatAuditLog } from '@/lib/api/audit';

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Organization Not Found</h1>
        <p className="text-gray-slate">The organization does not exist or you don&apos;t have access to it.</p>
      </div>
    );
  }

  // Fetch user's role in this organization
  const userRole = await getUserRoleInOrganization(orgId);
  
  if (!userRole) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  // Fetch zones count for this organization
  const { count: zonesCount } = await supabase
    .from('zones')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  // Fetch recent activity from audit logs
  const auditLogs = await getOrganizationAuditLogs(orgId, 10);
  const recentActivity = await Promise.all(auditLogs.map(log => formatAuditLog(log)));

  // Prepare organization data for client component
  const orgData = {
    id: org.id,
    name: org.name,
    description: org.description || '',
    role: userRole,
    environments: environments || [],
    environmentsCount: environments?.length || 0,
    zonesCount: zonesCount || 0,
    recentActivity: recentActivity,
    created_at: org.created_at,
    updated_at: org.updated_at,
  };

  return <OrganizationClient org={orgData} />;
}
