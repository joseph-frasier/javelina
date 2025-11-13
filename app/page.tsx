'use client';

import Link from 'next/link';
import { StatCard, Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PerformanceChart } from '@/components/dashboard/PerformanceChart';
import { useAuthStore } from '@/lib/auth-store';
import { environmentsApi, zonesApi } from '@/lib/api-client';
import { useEffect, useState } from 'react';
import { formatDateWithRelative } from '@/lib/utils/time';
import { createClient } from '@/lib/supabase/client';

interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  record_id: string;
  old_data?: any;
  new_data?: any;
  created_at: string;
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const organizations = user?.organizations || [];
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [aggregateStats, setAggregateStats] = useState({
    totalOrgs: organizations.length,
    totalEnvironments: 0,
    totalZones: 0,
    zonesThisMonth: 0
  });
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  
  useEffect(() => {
    const fetchCounts = async () => {
      if (organizations.length === 0) {
        setIsLoadingStats(false);
        return;
      }
      
      setIsLoadingStats(true);
      try {
        // Fetch all environments ONCE (backend already filters by user access)
        const allEnvironments = await environmentsApi.list();
        
        // Fetch all zones ONCE (backend already filters by user access)
        const allZones = await zonesApi.list();
        
        // Filter out deleted zones
        const activeZones = allZones.filter((zone: any) => !zone.deleted_at);
        
        // Count zones created this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const zonesThisMonth = activeZones.filter((zone: any) => 
          new Date(zone.created_at) >= startOfMonth
        ).length;
        
        setAggregateStats({
          totalOrgs: organizations.length,
          totalEnvironments: allEnvironments.length,
          totalZones: activeZones.length,
          zonesThisMonth: zonesThisMonth
        });
      } catch (error) {
        console.error('Error fetching dashboard counts:', error);
        // Keep default stats on error
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchCounts();
  }, [organizations]);

  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (organizations.length === 0) {
        setLoadingActivity(false);
        return;
      }
      
      const supabase = createClient();
      const orgIds = organizations.map(org => org.id);
      
      // Get environment IDs for the user's organizations
      const { data: environments } = await supabase
        .from('environments')
        .select('id')
        .in('organization_id', orgIds);
      
      const envIds = environments?.map(env => env.id) || [];
      
      if (envIds.length === 0) {
        setLoadingActivity(false);
        return;
      }
      
      // Fetch recent audit logs for zones and zone_records
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .in('table_name', ['zones', 'zone_records', 'dns_records', 'environments', 'organizations'])
        .order('created_at', { ascending: false })
        .limit(20);
      
      // Filter out environment updates (they're just timestamp changes) but keep meaningful actions
      // Keep chronological order for everything else
      const meaningfulLogs = auditLogs?.filter(log => {
        // Keep all non-environment actions
        if (log.table_name !== 'environments') return true;
        // For environments, only keep creates/deletes, not updates
        return log.action === 'INSERT' || log.action === 'DELETE';
      }) || [];
      
      // Take top 4 most recent meaningful activities
      setRecentActivity(meaningfulLogs.slice(0, 4));
      setLoadingActivity(false);
    };
    
    fetchRecentActivity();
  }, [organizations]);

  // Format audit log into human-readable activity
  const formatActivity = (log: AuditLog) => {
    const name = log.new_data?.name || log.old_data?.name || 'Unknown';
    const recordType = log.new_data?.type || log.old_data?.type;
    
    switch (log.table_name) {
      case 'zones':
        if (log.action === 'INSERT') return `Zone created: ${name}`;
        if (log.action === 'UPDATE') return `Zone updated: ${name}`;
        if (log.action === 'DELETE') return `Zone deleted: ${name}`;
        break;
      case 'zone_records':
      case 'dns_records':
        if (log.action === 'INSERT') return `DNS record added: ${recordType} record`;
        if (log.action === 'UPDATE') return `DNS record updated: ${recordType} record`;
        if (log.action === 'DELETE') return `DNS record deleted: ${recordType} record`;
        break;
      case 'environments':
        if (log.action === 'INSERT') return `Environment created: ${name}`;
        if (log.action === 'UPDATE') return `Environment updated: ${name}`;
        if (log.action === 'DELETE') return `Environment deleted: ${name}`;
        break;
      case 'organizations':
        if (log.action === 'INSERT') return `Organization created: ${name}`;
        if (log.action === 'UPDATE') return `Organization updated: ${name}`;
        if (log.action === 'DELETE') return `Organization deleted: ${name}`;
        break;
    }
    return `${log.table_name} ${log.action.toLowerCase()}`;
  };

  return (
    <ProtectedRoute>
      <div className="max-w-[1600px] 2xl:max-w-[1900px] 3xl:max-w-full mx-auto px-4 sm:px-6 lg:px-6 py-4 sm:py-6 md:py-8">
      {/* Hero Section */}
      <div className="mb-8">
        <h1 className="font-black font-sans text-4xl text-orange-dark mb-2">
          Innovate. Connect. Empower.
        </h1>
        <p className="font-light text-gray-slate text-lg">
          Welcome back to your Javelina dashboard
        </p>
      </div>

      {/* Stats Grid - Updated for new hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
            title="Total Organizations"
            value={isLoadingStats ? "..." : aggregateStats.totalOrgs.toString()}
            change="Your organizations"
            changeType="neutral"
            icon={
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            }
          />

          <StatCard
            title="Total Environments"
            value={isLoadingStats ? "..." : aggregateStats.totalEnvironments.toString()}
            change="Across all orgs"
            changeType="neutral"
            icon={
              <svg
                className="w-6 h-6"
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

          <StatCard
            title="Total DNS Zones"
            value={isLoadingStats ? "..." : aggregateStats.totalZones.toString()}
            change="+12 this month"
            changeType="positive"
            icon={
              <svg
                className="w-6 h-6"
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

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <Card
          title="Quick Actions"
          description="Common tasks and shortcuts"
          className="lg:col-span-1"
        >
          <div className="space-y-6 mt-4">
            <Link href="/organization/org_company" className="block">
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
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                View Organizations
              </Button>
            </Link>
            <Link href="/analytics" className="block">
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
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                View Analytics
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

        <Card
          title="Recent Activity"
          description="Latest updates and changes"
          className="lg:col-span-2"
        >
          <div className="space-y-4 mt-4">
            {loadingActivity ? (
              <div className="text-center py-8">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-slate dark:text-gray-400 text-base font-medium mb-2">No recent activity</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm">
                  Get started by creating an organization, environment, or DNS zone
                </p>
              </div>
            ) : (
              recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between py-3 border-b border-gray-light dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-orange rounded-full"></div>
                    <span className="font-regular text-orange-dark dark:text-orange">
                      {formatActivity(log)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-slate dark:text-gray-400 font-light">
                    {formatDateWithRelative(log.created_at).relative}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bottom Section - Performance Chart (Commented out - Server metrics not implemented yet) */}
      {/* <Card
        title="System Performance"
        description="Monitor your application metrics"
      >
        <PerformanceChart />
      </Card> */}
    </div>
    </ProtectedRoute>
  );
}
