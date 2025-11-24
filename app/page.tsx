'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/lib/auth-store';
import { environmentsApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { CompactStatCard } from '@/components/dashboard/CompactStatCard';
import { WelcomeGuidance } from '@/components/dashboard/WelcomeGuidance';
import { EnvironmentsList } from '@/components/organization/EnvironmentsList';
import { InviteUsersBox } from '@/components/organization/InviteUsersBox';

interface Environment {
  id: string;
  name: string;
  organization_id: string;
  environment_type?: 'production' | 'staging' | 'development';
  status?: 'active' | 'disabled' | 'archived';
  zones_count?: number;
  total_records?: number;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const organizations = user?.organizations || [];
  
  // State for org view
  const [mostRecentOrg, setMostRecentOrg] = useState<any>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [isLoadingOrgData, setIsLoadingOrgData] = useState(false);
  const [totalZones, setTotalZones] = useState(0);

  // Fetch most recent org data
  useEffect(() => {
    const fetchOrgData = async () => {
      if (organizations.length === 0) {
        return;
      }

      setIsLoadingOrgData(true);
      try {
        // Get most recent org (last in array = newest)
        const recentOrg = organizations[organizations.length - 1];
        setMostRecentOrg(recentOrg);

        // Fetch environments for this org
        const allEnvironments = await environmentsApi.list();
        const orgEnvironments = allEnvironments.filter(
          (env: any) => env.organization_id === recentOrg.id
        );

        // Calculate total zones across environments
        const zonesCount = orgEnvironments.reduce(
          (sum: number, env: any) => sum + (env.zones_count || 0),
          0
        );

        setEnvironments(orgEnvironments);
        setTotalZones(zonesCount);
      } catch (error) {
        console.error('Error fetching org data:', error);
      } finally {
        setIsLoadingOrgData(false);
      }
    };

    fetchOrgData();
  }, [organizations]);

  // Render welcome view for users without orgs
  if (organizations.length === 0) {
    return (
      <ProtectedRoute>
        <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
          {/* Hero Section - Welcome */}
          <div className="mb-8">
            <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
              Welcome to Javelina
            </h1>
            <p className="font-light text-gray-slate text-lg">
              Get started with DNS management in just a few simple steps
            </p>
          </div>

          {/* Content Grid - Welcome View */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Quick Actions */}
            <Card
              title="Quick Actions"
              description="Common tasks and shortcuts"
              className="lg:col-span-1 h-fit"
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

            {/* Welcome Guidance */}
            <Card
              title="Getting Started with Javelina"
              description="Follow these steps to set up your DNS infrastructure"
              className="lg:col-span-2"
            >
              <WelcomeGuidance />
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Render org view for users with orgs
  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
        {/* Hero Section - Custom Greeting */}
        <div className="mb-8">
          <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
            Welcome back, {user?.name || 'User'}
          </h1>
          <p className="font-light text-gray-slate text-lg">
            {mostRecentOrg?.name || 'Loading...'}
          </p>
        </div>

        {/* Compact Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <CompactStatCard
            title="Total Environments"
            value={isLoadingOrgData ? '...' : environments.length}
            subtitle={`${environments.length === 1 ? 'environment' : 'environments'} active`}
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
            value={isLoadingOrgData ? '...' : totalZones}
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
              {isLoadingOrgData ? (
                <Card>
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
                    <p className="mt-4 text-sm text-gray-slate dark:text-gray-light">
                      Loading environments...
                    </p>
                  </div>
                </Card>
              ) : (
                <EnvironmentsList
                  organizationId={mostRecentOrg?.id || ''}
                  environments={environments}
                />
              )}
            </div>

            {/* Invite Users Box */}
            {mostRecentOrg && (
              <InviteUsersBox
                organizationId={mostRecentOrg.id}
                organizationName={mostRecentOrg.name}
              />
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
