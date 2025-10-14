'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EnvironmentCard } from '@/components/hierarchy/EnvironmentCard';
import { canCreateEnvironment } from '@/lib/permissions';
import { AddEnvironmentModal } from '@/components/modals/AddEnvironmentModal';
import { useHierarchyStore } from '@/lib/hierarchy-store';

interface Environment {
  id: string;
  name: string;
  organization_id: string;
  environment_type: 'production' | 'staging' | 'development';
  location?: string;
  status: 'active' | 'disabled' | 'archived';
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

interface ActivityLog {
  action: string;
  target: string;
  user: string;
  timestamp: string;
}

interface OrganizationData {
  id: string;
  name: string;
  description: string;
  role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';
  environments: Environment[];
  environmentsCount: number;
  zonesCount: number;
  recentActivity: ActivityLog[];
  created_at: string;
  updated_at: string;
}

interface OrganizationClientProps {
  org: OrganizationData;
}

export function OrganizationClient({ org }: OrganizationClientProps) {
  const router = useRouter();
  const { selectAndExpand } = useHierarchyStore();
  const [isAddEnvModalOpen, setIsAddEnvModalOpen] = useState(false);
  const canAddEnvironment = canCreateEnvironment(org.role);

  const handleEnvironmentSuccess = (environmentId: string) => {
    // Auto-expand and select the new environment
    selectAndExpand(org.id, environmentId);
    // Navigate to the new environment page
    router.push(`/organization/${org.id}/environment/${environmentId}`);
  };

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-orange-dark mb-2">{org.name}</h1>
            <p className="text-gray-slate">{org.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            {canAddEnvironment && (
              <Button variant="secondary" onClick={() => setIsAddEnvModalOpen(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Environment
              </Button>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card title="Total Environments" className="p-6">
            <p className="text-3xl font-bold text-orange">{org.environmentsCount}</p>
            <p className="text-sm text-gray-slate mt-1">
              {org.environments.filter(e => e.status === 'active').length} active
            </p>
          </Card>
          <Card title="Total Zones" className="p-6">
            <p className="text-3xl font-bold text-orange">{org.zonesCount}</p>
            <p className="text-sm text-gray-slate mt-1">DNS zones managed</p>
          </Card>
        </div>

        {/* Environments Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-orange-dark mb-4">Environments</h2>
          {org.environments.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-slate mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                  />
                </svg>
                <h3 className="text-lg font-medium text-orange-dark mb-2">No environments yet</h3>
                <p className="text-gray-slate mb-6">
                  Get started by creating your first environment.
                </p>
                {canAddEnvironment && (
                  <Button variant="primary" onClick={() => setIsAddEnvModalOpen(true)}>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Environment
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {org.environments.map((environment) => (
                <EnvironmentCard
                  key={environment.id}
                  environment={{
                    ...environment,
                    type: environment.environment_type,
                  }}
                  orgId={org.id}
                  showRole={false}
                />
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {org.recentActivity.length > 0 && (
          <Card title="Recent Activity" className="p-6">
            <div className="space-y-4">
              {org.recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 py-3 border-b border-gray-light last:border-0">
                  <div className="flex-shrink-0 w-2 h-2 bg-orange rounded-full mt-2"></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-orange-dark">{activity.action}</span>
                      <span className="text-xs text-gray-slate">{activity.timestamp}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-gray-slate">
                      <span className="font-mono">{activity.target}</span>
                      <span>•</span>
                      <span>{activity.user}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Add Environment Modal */}
      <AddEnvironmentModal
        isOpen={isAddEnvModalOpen}
        onClose={() => setIsAddEnvModalOpen(false)}
        organizationId={org.id}
        organizationName={org.name}
        onSuccess={handleEnvironmentSuccess}
      />
    </>
  );
}

