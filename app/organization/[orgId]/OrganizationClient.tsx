'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { EnvironmentCard } from '@/components/hierarchy/EnvironmentCard';
import { canCreateEnvironment } from '@/lib/permissions';
import { AddEnvironmentModal } from '@/components/modals/AddEnvironmentModal';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { EditOrganizationModal } from '@/components/modals/EditOrganizationModal';
import { DeleteOrganizationModal } from '@/components/modals/DeleteOrganizationModal';
import { subscriptionsApi } from '@/lib/api-client';

interface Environment {
  id: string;
  name: string;
  organization_id: string;
  environment_type: 'production' | 'staging' | 'development';
  location: string | null;
  status: 'active' | 'disabled' | 'archived';
  description: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  zones_count?: number;
  total_records?: number;
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
  description: string | null;
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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNewestPlan, setIsNewestPlan] = useState(false);
  const [planName, setPlanName] = useState<string | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const canAddEnvironment = canCreateEnvironment(org.role);
  const canEditOrg = org.role === 'SuperAdmin' || org.role === 'Admin';
  const canDeleteOrg = org.role === 'SuperAdmin' || org.role === 'Admin';

  const handleEnvironmentSuccess = (environmentId: string) => {
    // Auto-expand and select the new environment
    selectAndExpand(org.id, environmentId);
    // Navigate to the new environment page
    router.push(`/organization/${org.id}/environment/${environmentId}`);
  };

  // Check if this is the newest plan and get plan name
  useEffect(() => {
    const checkPlan = async () => {
      setIsLoadingPlan(true);
      try {
        const orgsWithSubscriptions = await subscriptionsApi.getAllWithSubscriptions();
        
        if (orgsWithSubscriptions && orgsWithSubscriptions.length > 0) {
          // Get the most recent org (last in array)
          const mostRecentOrg = orgsWithSubscriptions[orgsWithSubscriptions.length - 1];
          // Check if current org matches the newest one
          const isNewest = mostRecentOrg.org_id === org.id;
          setIsNewestPlan(isNewest);
          
          // Get plan name for current org
          const currentOrgData = orgsWithSubscriptions.find(o => o.org_id === org.id);
          if (currentOrgData?.plan_name) {
            setPlanName(currentOrgData.plan_name);
          }
        }
      } catch (error) {
        console.error('Error checking plan:', error);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    checkPlan();
  }, [org.id]);

  return (
    <>
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange break-words">{org.name}</h1>
              {!isLoadingPlan && isNewestPlan && planName && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-orange text-white">
                  {planName}
                </span>
              )}
            </div>
            {org.description && <p className="text-sm sm:text-base text-gray-slate dark:text-gray-300">{org.description}</p>}
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
            {canAddEnvironment && (
              <Button variant="secondary" size="sm" onClick={() => setIsAddEnvModalOpen(true)} className="justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Environment
              </Button>
            )}
            {canEditOrg && (
              <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)} className="justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Button>
            )}
            {canDeleteOrg && (
              <Button variant="secondary" size="sm" onClick={() => setIsDeleteModalOpen(true)} className="!bg-red-600 hover:!bg-red-700 !text-white justify-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card title="Total Environments" className="p-4 sm:p-6">
            <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange">{org.environmentsCount}</p>
            <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">
              {org.environments.filter(e => e.status === 'active').length} active
            </p>
          </Card>
          <Card title="Total Zones" className="p-4 sm:p-6">
            <p className="text-2xl sm:text-3xl font-bold text-orange dark:text-orange">{org.zonesCount}</p>
            <p className="text-sm text-gray-slate dark:text-gray-400 mt-1">DNS zones managed</p>
          </Card>
        </div>

        {/* Environments Grid */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-orange-dark dark:text-orange mb-4">Environments</h2>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {org.environments.map((environment) => (
                <EnvironmentCard
                  key={environment.id}
                  environment={environment}
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

      {/* Edit Organization Modal */}
      <EditOrganizationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        organization={org}
      />

      {/* Delete Organization Modal */}
      <DeleteOrganizationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        organization={org}
      />
    </>
  );
}

