'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { canCreateEnvironment } from '@/lib/permissions';
import { AddEnvironmentModal } from '@/components/modals/AddEnvironmentModal';
import { useHierarchyStore } from '@/lib/hierarchy-store';
import { EditOrganizationModal } from '@/components/modals/EditOrganizationModal';
import { DeleteOrganizationModal } from '@/components/modals/DeleteOrganizationModal';
import { subscriptionsApi } from '@/lib/api-client';
import { CompactStatCard } from '@/components/dashboard/CompactStatCard';
import { EnvironmentsList } from '@/components/organization/EnvironmentsList';
import { InviteUsersBox } from '@/components/organization/InviteUsersBox';
import { useAuthStore } from '@/lib/auth-store';

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
  const { user } = useAuthStore();
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
          const currentOrgData = orgsWithSubscriptions.find((o: any) => o.org_id === org.id);
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
        {/* Hero Section - Custom Greeting */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
              Welcome back, {user?.name || 'User'}
            </h1>
            <p className="font-light text-gray-slate text-lg">{org.name}</p>
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
            <Button variant="secondary" size="sm" onClick={() => console.log('Upgrade Plan - TODO')} className="justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Upgrade Plan
            </Button>
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

        {/* Compact Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <CompactStatCard
            title="Total Environments"
            value={org.environmentsCount}
            subtitle={`${org.environments.filter(e => e.status === 'active').length} active`}
            icon={
              <svg
                className="w-6 h-6 text-orange"
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
            }
          />
          <CompactStatCard
            title="Total Zones"
            value={org.zonesCount}
            subtitle="DNS zones managed"
            icon={
              <svg
                className="w-6 h-6 text-blue-electric"
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
            }
          />
        </div>

        {/* Content Grid - Org View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Quick Actions */}
          <div className="lg:col-span-1 space-y-4">
            <Card
              title="Quick Actions"
              description="Common tasks and shortcuts"
            >
              <div className="space-y-4 mt-4">
                <Link href="/pricing" className="block">
                  <Button variant="primary" className="w-full justify-start">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Buy Organization
                  </Button>
                </Link>
                <Link href="/profile" className="block">
                  <Button variant="secondary" className="w-full justify-start">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Your Profile
                  </Button>
                </Link>
                <Link href="/settings" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Settings
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Org Content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Environments List */}
            <div>
              <h2 className="text-xl font-bold text-orange-dark dark:text-orange mb-4">
                Environments
              </h2>
              <EnvironmentsList
                organizationId={org.id}
                environments={org.environments}
              />
            </div>

            {/* Invite Users Box */}
            <InviteUsersBox
              organizationId={org.id}
              organizationName={org.name}
            />
          </div>
        </div>
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
