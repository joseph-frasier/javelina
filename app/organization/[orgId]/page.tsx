import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EnvironmentCard } from '@/components/hierarchy/EnvironmentCard';
import { canCreateEnvironment } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

export default async function OrganizationPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

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
        <p className="text-gray-slate">The organization &quot;{orgId}&quot; does not exist.</p>
      </div>
    );
  }

  // Get user's role in this organization
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user?.id)
    .single();

  const userRole = member?.role || 'Viewer';

  // Fetch environments for this organization
  const { data: environments } = await supabase
    .from('environments')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false });

  // Fetch zones count for stats
  const { data: zones } = await supabase
    .from('zones')
    .select('id, environment_id')
    .in('environment_id', environments?.map(e => e.id) || []);

  // Calculate stats
  const stats = {
    totalEnvironments: environments?.length || 0,
    totalZones: zones?.length || 0,
    totalRecords: 0, // TODO: Implement when records table exists
    queries24h: 0, // TODO: Implement with analytics
    successRate: 0, // TODO: Implement with analytics
    avgResponseTime: 0, // TODO: Implement with analytics
  };

  const canAddEnvironment = canCreateEnvironment(userRole);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-dark mb-2">{org.name}</h1>
          <p className="text-gray-slate">{org.description}</p>
        </div>
        <div className="flex items-center space-x-3">
          {canAddEnvironment && (
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Environment
            </Button>
          )}
          <Button variant="primary">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card title="Total Environments" className="p-6">
          <p className="text-3xl font-bold text-orange">{stats.totalEnvironments}</p>
          <p className="text-sm text-gray-slate mt-1">Active environments</p>
        </Card>
        <Card title="Total Zones" className="p-6">
          <p className="text-3xl font-bold text-orange">{stats.totalZones}</p>
          <p className="text-sm text-gray-slate mt-1">{stats.totalRecords} DNS records</p>
        </Card>
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">{stats.queries24h > 0 ? stats.queries24h.toLocaleString() : '—'}</p>
          <p className="text-sm text-gray-slate mt-1">{stats.successRate > 0 ? `${stats.successRate}% success rate` : 'Coming soon'}</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">{stats.avgResponseTime > 0 ? `${stats.avgResponseTime}ms` : '—'}</p>
          <p className="text-sm text-gray-slate mt-1">Response time</p>
        </Card>
      </div>

      {/* Environments Grid */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-orange-dark mb-4">Environments</h2>
        {environments && environments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {environments.map((environment) => (
              <EnvironmentCard
                key={environment.id}
                environment={{
                  ...environment,
                  type: environment.environment_type, // Map database field to component prop
                  role: userRole,
                  zones_count: zones?.filter(z => z.environment_id === environment.id).length || 0,
                }}
                orgId={org.id}
                showRole={true}
              />
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-gray-slate">No environments yet. Create your first environment to get started.</p>
          </Card>
        )}
      </div>

      {/* Recent Activity - Placeholder */}
      <Card title="Recent Activity" className="p-6">
        <div className="text-center py-8 text-gray-slate">
          <p className="mb-2">Activity logging coming soon</p>
          <p className="text-sm">Track changes, deployments, and updates to your DNS infrastructure</p>
        </div>
      </Card>
    </div>
  );
}
