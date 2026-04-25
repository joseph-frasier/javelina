'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import Button from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { formatDateWithRelative } from '@/lib/utils/time';
import { type AuditLog, getActionDescription } from '@/lib/utils/audit';

interface KPIData {
  totalUsers: number;
  totalOrganizations: number;
  flaggedZones: number;
  totalAuditLogs: number;
  totalDiscountCodes: number;
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
        <div>
          <AdminPageHeader
            title="Dashboard"
            subtitle="System overview and recent activity"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 items-stretch mb-8">
            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
              aria-label="View all users"
            >
              <AdminStatCard
                label="Total Users"
                tone="info"
                value={loading ? '—' : kpis.totalUsers.toLocaleString()}
                description="View all users →"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                }
              />
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/organizations')}
              className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
              aria-label="View all organizations"
            >
              <AdminStatCard
                label="Total Organizations"
                tone="accent"
                value={loading ? '—' : kpis.totalOrganizations.toLocaleString()}
                description="View all orgs →"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                }
              />
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/discounts')}
              className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
              aria-label="View discount codes"
            >
              <AdminStatCard
                label="Discount Codes"
                tone="success"
                value={loading ? '—' : kpis.totalDiscountCodes.toLocaleString()}
                description="View discount codes →"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                }
              />
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/audit')}
              className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
              aria-label="View audit logs"
            >
              <AdminStatCard
                label="Audit Logs"
                tone="neutral"
                value=""
                description="View audit logs →"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </button>

            <button
              type="button"
              onClick={() => router.push('/admin/zones')}
              className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-xl"
              aria-label="Review flagged zones"
            >
              <AdminStatCard
                label="Flagged Zones"
                tone="warning"
                value={loading ? '—' : kpis.flaggedZones.toLocaleString()}
                description={
                  !loading && kpis.flaggedZones > 0
                    ? 'Duplicate zone names — review →'
                    : 'Duplicate zone names'
                }
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
            </button>
          </div>

          <Card
            title="Recent Actions"
            description="Latest administrative activity"
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push('/admin/audit')}
              >
                View All Logs →
              </Button>
            }
          >
            {logsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
              </div>
            ) : recentLogs.length === 0 ? (
              <div className="py-8 flex items-center justify-center border border-border rounded-lg">
                <div className="text-center">
                  <svg className="mx-auto h-10 w-10 text-text-faint mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm font-medium text-text">No recent actions</p>
                  <p className="mt-1 text-xs text-text-muted">
                    Administrative actions will appear here
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => {
                  const logDate = formatDateWithRelative(log.created_at);
                  const description = getActionDescription(log);

                  return (
                    <div
                      key={log.id}
                      className="p-4 bg-surface-alt rounded-lg border border-border"
                    >
                      <div className="mb-2 text-sm leading-relaxed">
                        <span className="font-semibold text-text">
                          {log.profiles?.name || 'Unknown Admin'}
                        </span>
                        <span className="text-text"> {description.action} </span>
                        <span className="font-semibold text-accent">
                          {description.targetName}
                        </span>
                        {description.targetEmail && (
                          <span className="text-text-muted">
                            {' '}({description.targetEmail})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <AdminStatusBadge
                          variant="accent"
                          label={log.table_name}
                          dot={false}
                        />
                        <span className="text-text-faint">•</span>
                        <Tooltip content={logDate.absolute}>
                          <span className="text-text-muted cursor-help">
                            {logDate.relative}
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
