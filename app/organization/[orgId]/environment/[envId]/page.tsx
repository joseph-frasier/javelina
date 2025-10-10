import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EnvironmentBadge } from '@/components/ui/EnvironmentBadge';
import { canCreateZone, getRoleBadgeColor, getRoleDisplayText } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';

export default async function EnvironmentPage({
  params
}: {
  params: Promise<{ orgId: string; envId: string }>
}) {
  const { orgId, envId } = await params;
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('id', envId)
    .single();

  // Fetch organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();

  if (envError || orgError || !environment || !organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist.</p>
      </div>
    );
  }

  // Get user's role in the organization
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', user?.id)
    .single();

  const userRole = member?.role || 'Viewer';

  // Fetch zones for this environment
  const { data: zones } = await supabase
    .from('zones')
    .select('*')
    .eq('environment_id', envId)
    .order('created_at', { ascending: false});

  const canAddZone = canCreateZone(userRole, userRole);

  const breadcrumbItems = [
    { label: organization.name, href: `/organization/${orgId}` },
    { label: environment.name }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-orange-dark">{environment.name}</h1>
              <EnvironmentBadge type={environment.environment_type} />
            </div>
            <div className="flex items-center space-x-3">
              <p className="text-gray-slate">Environment for {organization.name}</p>
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(userRole)}`}>
                {getRoleDisplayText(userRole)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {canAddZone && (
            <Button variant="secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Zone
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
        <Card title="Total Zones" className="p-6">
          <p className="text-3xl font-bold text-orange">{zones?.length || 0}</p>
          <p className="text-sm text-gray-slate mt-1">Active zones</p>
        </Card>
        <Card title="Total Records" className="p-6">
          <p className="text-3xl font-bold text-orange">—</p>
          <p className="text-sm text-gray-slate mt-1">Coming soon</p>
        </Card>
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">—</p>
          <p className="text-sm text-gray-slate mt-1">Coming soon</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">—</p>
          <p className="text-sm text-gray-slate mt-1">Coming soon</p>
        </Card>
      </div>

      {/* Zones Table */}
      <Card title="DNS Zones" className="p-6">
        {!zones || zones.length === 0 ? (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-slate"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-orange-dark">No zones</h3>
            <p className="mt-1 text-sm text-gray-slate">
              Get started by creating a new DNS zone.
            </p>
            {canAddZone && (
              <div className="mt-6">
                <Button variant="primary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Zone
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-light">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Zone Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Records
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Queries (24h)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-slate uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-light">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-gray-light transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/zone/${zone.id}`}
                        className="text-sm font-medium text-orange hover:text-orange-dark"
                      >
                        {zone.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      —
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      —
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          zone.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {zone.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      {new Date(zone.updated_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                      <Link
                        href={`/zone/${zone.id}`}
                        className="text-orange hover:text-orange-dark font-medium"
                      >
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

