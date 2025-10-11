'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EnvironmentCard } from '@/components/hierarchy/EnvironmentCard';
import { OrganizationDetail } from '@/lib/mock-hierarchy-data';
import { canCreateEnvironment } from '@/lib/permissions';
import { AddEnvironmentModal } from '@/components/modals/AddEnvironmentModal';
import { useHierarchyStore } from '@/lib/hierarchy-store';

interface OrganizationClientProps {
  org: OrganizationDetail;
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
            <p className="text-3xl font-bold text-orange">{org.stats.totalEnvironments}</p>
            <p className="text-sm text-gray-slate mt-1">Active environments</p>
          </Card>
          <Card title="Total Zones" className="p-6">
            <p className="text-3xl font-bold text-orange">{org.stats.totalZones}</p>
            <p className="text-sm text-gray-slate mt-1">{org.stats.totalRecords} DNS records</p>
          </Card>
          <Card title="Queries (24h)" className="p-6">
            <p className="text-3xl font-bold text-orange">{org.stats.queries24h.toLocaleString()}</p>
            <p className="text-sm text-gray-slate mt-1">{org.stats.successRate}% success rate</p>
          </Card>
          <Card title="Avg Response" className="p-6">
            <p className="text-3xl font-bold text-orange">{org.stats.avgResponseTime}ms</p>
            <p className="text-sm text-gray-slate mt-1">Response time</p>
          </Card>
        </div>

        {/* Environments Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-orange-dark mb-4">Environments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {org.environments.map((environment) => (
              <EnvironmentCard
                key={environment.id}
                environment={environment}
                orgId={org.id}
                showRole={true}
              />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
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

