import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { EnvironmentBadge } from '@/components/ui/EnvironmentBadge';
import { getEnvironmentById, getOrganizationById, getZonesByEnvironment } from '@/lib/mock-hierarchy-data';
import { canCreateZone, getRoleBadgeColor, getRoleDisplayText } from '@/lib/permissions';

export default async function EnvironmentPage({
  params
}: {
  params: Promise<{ orgId: string; envId: string }>
}) {
  const { orgId, envId } = await params;
  const environment = getEnvironmentById(envId);
  const organization = getOrganizationById(orgId);
  const zones = getZonesByEnvironment(envId);

  if (!environment || !organization) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Environment Not Found</h1>
        <p className="text-gray-slate">The requested environment does not exist.</p>
      </div>
    );
  }

  const canAddZone = canCreateZone(organization.role, environment.role);

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
              <EnvironmentBadge type={environment.type} />
            </div>
            <div className="flex items-center space-x-3">
              <p className="text-gray-slate">Environment for {organization.name}</p>
              <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(environment.role)}`}>
                {getRoleDisplayText(environment.role)}
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
          <p className="text-3xl font-bold text-orange">{environment.zones_count}</p>
          <p className="text-sm text-gray-slate mt-1">Active zones</p>
        </Card>
        <Card title="Total Records" className="p-6">
          <p className="text-3xl font-bold text-orange">{environment.total_records}</p>
          <p className="text-sm text-gray-slate mt-1">DNS records</p>
        </Card>
        <Card title="Queries (24h)" className="p-6">
          <p className="text-3xl font-bold text-orange">{environment.queries_24h.toLocaleString()}</p>
          <p className="text-sm text-gray-slate mt-1">{environment.success_rate}% success</p>
        </Card>
        <Card title="Avg Response" className="p-6">
          <p className="text-3xl font-bold text-orange">{environment.avg_response_time}ms</p>
          <p className="text-sm text-gray-slate mt-1">Response time</p>
        </Card>
      </div>

      {/* Zones Table */}
      <Card title="DNS Zones" className="p-6">
        {zones.length === 0 ? (
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
                  <tr key={zone.id}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/zone/${zone.id}`}
                        className="text-sm font-medium text-orange hover:text-orange-dark"
                      >
                        {zone.name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      {zone.records}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      {zone.queries_24h.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          zone.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : zone.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {zone.status.charAt(0).toUpperCase() + zone.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate">
                      {new Date(zone.last_modified).toLocaleDateString()}
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

