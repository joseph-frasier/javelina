'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { canCreateZone, getRoleBadgeColor, getRoleDisplayText } from '@/lib/permissions';
import { AddZoneModal } from '@/components/modals/AddZoneModal';
import { EditEnvironmentModal } from '@/components/modals/EditEnvironmentModal';
import { DeleteEnvironmentModal } from '@/components/modals/DeleteEnvironmentModal';
import { useHierarchyStore } from '@/lib/hierarchy-store';

interface Environment {
  id: string;
  name: string;
  type: 'production' | 'staging' | 'development';
  status: 'active' | 'disabled' | 'archived';
  description: string;
  location: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface Organization {
  id: string;
  name: string;
  description: string;
  role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';
}

interface Zone {
  id: string;
  name: string;
  environment_id: string;
  zone_type: 'primary' | 'secondary' | 'redirect';
  description?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface EnvironmentClientProps {
  environment: Environment;
  organization: Organization;
  zones: Zone[];
  orgId: string;
  envId: string;
}

export function EnvironmentClient({ 
  environment, 
  organization, 
  zones, 
  orgId, 
  envId 
}: EnvironmentClientProps) {
  const router = useRouter();
  const { selectAndExpand } = useHierarchyStore();
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const canAddZone = canCreateZone(organization.role, organization.role);
  const canEditEnvironment = ['SuperAdmin', 'Admin', 'Editor'].includes(organization.role);
  const canDeleteEnvironment = ['SuperAdmin', 'Admin'].includes(organization.role);

  const breadcrumbItems = [
    { label: organization.name, href: `/organization/${orgId}` },
    { label: environment.name }
  ];

  const handleZoneSuccess = (zoneId: string) => {
    // Auto-expand and select
    selectAndExpand(orgId, envId);
    // Navigate to the new zone page
    router.push(`/zone/${zoneId}`);
  };

  return (
    <>
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto lg:px-6 py-8">
        {/* Breadcrumb */}
        <Breadcrumb items={breadcrumbItems} className="mb-6" />

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-orange-dark">{environment.name}</h1>
              </div>
              <div className="flex items-center space-x-3">
                <p className="text-gray-slate">Environment for {organization.name}</p>
                <span className={`inline-block px-2 py-0.5 text-xs rounded-full border ${getRoleBadgeColor(organization.role)}`}>
                  {getRoleDisplayText(organization.role)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {canAddZone && (
              <Button variant="secondary" onClick={() => setIsAddZoneModalOpen(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Zone
              </Button>
            )}
            {canEditEnvironment && (
              <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}
            {canDeleteEnvironment && (
              <Button variant="secondary" onClick={() => setIsDeleteModalOpen(true)} className="!bg-red-600 hover:!bg-red-700 !text-white">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card title="Total Zones" className="p-6">
            <p className="text-3xl font-bold text-orange">{zones.length}</p>
            <p className="text-sm text-gray-slate mt-1">
              {zones.filter(z => z.active).length} active
            </p>
          </Card>
          <Card title="Environment Status" className="p-6">
            <p className="text-3xl font-bold text-orange capitalize">{environment.status}</p>
            <p className="text-sm text-gray-slate mt-1">
              {environment.location || 'No location set'}
            </p>
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
                  <Button variant="primary" onClick={() => setIsAddZoneModalOpen(true)}>
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
                      Type
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
                    <tr key={zone.id} className="hover:bg-gray-light/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <Link
                          href={`/zone/${zone.id}`}
                          className="text-sm font-medium text-orange hover:text-orange-dark"
                        >
                          {zone.name}
                        </Link>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-slate capitalize">
                        {zone.zone_type}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            zone.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
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

      {/* Add Zone Modal */}
      <AddZoneModal
        isOpen={isAddZoneModalOpen}
        onClose={() => setIsAddZoneModalOpen(false)}
        environmentId={envId}
        environmentName={environment.name}
        organizationId={orgId}
        onSuccess={handleZoneSuccess}
      />

      {/* Edit Environment Modal */}
      <EditEnvironmentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        environment={{
          id: environment.id,
          name: environment.name,
          environment_type: environment.type,
          location: environment.location,
          description: environment.description,
          status: environment.status,
          organization_id: environment.organization_id
        }}
      />

      {/* Delete Environment Modal */}
      <DeleteEnvironmentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        environment={{
          id: environment.id,
          name: environment.name,
          organization_id: environment.organization_id
        }}
        organizationId={orgId}
        zonesCount={zones.length}
      />
    </>
  );
}

