'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import Button from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDateWithRelative } from '@/lib/utils/time';

interface KPIData {
  totalUsers: number;
  totalOrganizations: number;
  flaggedZones: number;
  totalAuditLogs: number;
  totalDiscountCodes: number;
}

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  record_id?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  old_data?: Record<string, any>;
  new_data?: Record<string, any>;
  profiles: { name: string; email: string } | null;
  target_name?: string | null;
  target_email?: string | null;
}

interface TrendData {
  current: number;
  lastWeek: number;
  lastMonth: number;
  weeklyGrowth: string;
  monthlyGrowth: string;
}

// Helper function to interpret admin actions
function getActionDescription(log: AuditLog): {
  action: string;
  targetName: string;
  targetEmail?: string;
  details: string;
} {
  const targetName = log.target_name || 'Unknown';
  const targetEmail = log.target_email || undefined;
  
  // Interpret based on table and old_data/new_data
  if (log.table_name === 'profiles') {
    const oldStatus = log.old_data?.status;
    const newStatus = log.new_data?.status;
    
    if (oldStatus === 'active' && newStatus === 'disabled') {
      return { 
        action: 'disabled user', 
        targetName, 
        targetEmail,
        details: `Status changed from active to disabled`
      };
    }
    if (oldStatus === 'disabled' && newStatus === 'active') {
      return { 
        action: 'enabled user', 
        targetName, 
        targetEmail,
        details: `Status changed from disabled to active`
      };
    }
  }
  
  if (log.table_name === 'organizations') {
    const oldActive = log.old_data?.is_active;
    const newActive = log.new_data?.is_active;
    
    if (oldActive === true && newActive === false) {
      return { 
        action: 'disabled organization', 
        targetName,
        details: `Organization disabled (is_active: true → false)`
      };
    }
    if (oldActive === false && newActive === true) {
      return { 
        action: 'enabled organization', 
        targetName,
        details: `Organization enabled (is_active: false → true)`
      };
    }
  }
  
  if (log.table_name === 'promotion_codes') {
    // For discount codes, the name is stored in metadata.code
    const codeName = log.metadata?.code || log.new_data?.code || log.old_data?.code || 'Unknown';
    
    if (log.action === 'INSERT') {
      return {
        action: 'created discount code',
        targetName: codeName,
        details: `Discount code "${codeName}" created`
      };
    }
    
    const oldActive = log.old_data?.is_active;
    const newActive = log.new_data?.is_active;
    
    if (oldActive === true && newActive === false) {
      return {
        action: 'deactivated discount code',
        targetName: codeName,
        details: `Discount code "${codeName}" deactivated`
      };
    }
    
    // Fallback for other promotion_codes actions
    return {
      action: 'updated discount code',
      targetName: codeName,
      details: `Discount code "${codeName}" modified`
    };
  }
  
  // Fallback
  return { 
    action: `updated ${log.table_name}`, 
    targetName,
    targetEmail,
    details: `${log.action} operation on ${log.table_name}`
  };
}

export default function AdminDashboard() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KPIData>({
    totalUsers: 0,
    totalOrganizations: 0,
    flaggedZones: 0,
    totalAuditLogs: 0,
    totalDiscountCodes: 0
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch real data from API
        try {
          const { adminApi } = await import('@/lib/api-client');
          const data = await adminApi.getDashboard();
          setKpis({
            ...data.kpis,
            flaggedZones: data.kpis.flaggedZones || 0,
            totalAuditLogs: data.kpis.totalAuditLogs || 0,
            totalDiscountCodes: data.kpis.totalDiscountCodes || 0
          });
        } catch (apiError) {
          // Fallback to mock data if API fails
          console.warn('Using mock data for admin dashboard:', apiError);
          
          setKpis({
            totalUsers: 50,
            totalOrganizations: 18,
            flaggedZones: 0,
            totalAuditLogs: 0,
            totalDiscountCodes: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set mock data on error
        setKpis({
          totalUsers: 50,
          totalOrganizations: 18,
          flaggedZones: 0,
          totalAuditLogs: 0,
          totalDiscountCodes: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const fetchRecentLogs = async () => {
      try {
        const { adminApi } = await import('@/lib/api-client');
        const logs = await adminApi.getAuditLogs({ actor_type: 'admin', limit: 4 });
        // Ensure we only show 4 logs max
        setRecentLogs(((logs || []) as AuditLog[]).slice(0, 4));
      } catch (error) {
        console.error('Failed to fetch recent audit logs:', error);
      } finally {
        setLogsLoading(false);
      }
    };

    fetchRecentLogs();
  }, []);


  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-orange-dark">Dashboard</h1>
            <p className="text-gray-slate mt-2">System overview and recent activity</p>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch">
            {/* Total Users Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Total Users</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-dark dark:text-orange mb-2">
                {loading ? '—' : kpis.totalUsers.toLocaleString()}
              </p>
              {/* Placeholder to match subtitle */}
              <p className="text-xs mb-3 opacity-0">.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/users')}
                className="mt-3 w-full !text-blue-600 dark:!text-blue-400 hover:!bg-blue-50 dark:hover:!bg-blue-900/20"
              >
                View All Users →
              </Button>
            </Card>

            {/* Organizations Card */}
            <Card className="p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Total Organizations</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-dark dark:text-orange mb-2">
                {loading ? '—' : kpis.totalOrganizations.toLocaleString()}
              </p>
              {/* Placeholder to match subtitle */}
              <p className="text-xs mb-3 opacity-0">.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/organizations')}
                className="mt-3 w-full !text-purple-600 dark:!text-purple-400 hover:!bg-purple-50 dark:hover:!bg-purple-900/20"
              >
                View All Orgs →
              </Button>
            </Card>

            {/* Discount Codes Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Discount Codes</p>
                </div>
              </div>
              {/* Placeholder to match height of cards with counts */}
              <p className="text-3xl font-bold mb-2 opacity-0">0</p>
              <p className="text-xs text-gray-500 mb-3 opacity-0">.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/discounts')}
                className="mt-3 w-full !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20"
              >
                View Discount Codes →
              </Button>
            </Card>

            {/* Audit Logs Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Audit Logs</p>
                </div>
              </div>
              {/* Placeholder to match height of cards with counts */}
              <p className="text-3xl font-bold mb-2 opacity-0">0</p>
              <p className="text-xs text-gray-500 mb-3 opacity-0">.</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/audit')}
                className="mt-3 w-full !text-gray-600 dark:!text-gray-400 hover:!bg-gray-50 dark:hover:!bg-gray-800"
              >
                View Audit Logs →
              </Button>
            </Card>

            {/* Flagged Zones Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow flex flex-col h-full">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Flagged Zones</p>
                </div>
                {!loading && kpis.flaggedZones > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 text-xs font-semibold rounded-full">
                    Review
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
                {loading ? '—' : kpis.flaggedZones.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mb-3">Duplicate zone names</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/zones')}
                className="mt-3 w-full !text-yellow-600 dark:!text-yellow-400 hover:!bg-yellow-50 dark:hover:!bg-yellow-900/20"
              >
                Review Zones →
              </Button>
            </Card>
          </div>

          {/* Recent Actions Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-orange-dark dark:text-orange">Recent Actions</h2>
                <p className="text-gray-slate dark:text-gray-400 text-sm mt-1">Latest administrative activity</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/admin/audit')}
              >
                View All Logs →
              </Button>
            </div>

            <Card className="p-4">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-dark"></div>
                </div>
              ) : recentLogs.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-slate" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-orange-dark dark:text-orange">No recent actions</h3>
                  <p className="mt-1 text-sm text-gray-slate dark:text-gray-400">
                    Administrative actions will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => {
                    const logDate = formatDateWithRelative(log.created_at);
                    const description = getActionDescription(log);
                    
                    return (
                      <div
                        key={log.id}
                        className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            {/* Main action description */}
                            <div className="mb-2">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {log.profiles?.name || 'Unknown Admin'}
                              </span>
                              <span className="text-gray-900 dark:text-gray-100"> {description.action} </span>
                              <span className="font-semibold text-orange-600 dark:text-orange-400">
                                {description.targetName}
                              </span>
                              {description.targetEmail && (
                                <span className="text-sm text-gray-slate dark:text-gray-400">
                                  {' '}({description.targetEmail})
                                </span>
                              )}
                            </div>
                            
                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="px-2 py-0.5 bg-orange-light dark:bg-orange-900/30 text-orange-dark dark:text-orange-400 text-xs rounded">
                                {log.table_name}
                              </span>
                              <span className="text-gray-slate dark:text-gray-400">•</span>
                              <Tooltip content={logDate.absolute}>
                                <span className="text-gray-slate dark:text-gray-400 cursor-help">{logDate.relative}</span>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
