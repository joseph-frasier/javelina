'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import Button from '@/components/ui/Button';
import { generateTrendData, generateMockUsers } from '@/lib/mock-admin-data';

interface KPIData {
  totalUsers: number;
  totalOrganizations: number;
  deletedOrganizations: number;
  activeMembers: number;
}

interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  admin_users: { name: string; email: string };
  details: Record<string, any>;
}

interface TrendData {
  current: number;
  lastWeek: number;
  lastMonth: number;
  weeklyGrowth: string;
  monthlyGrowth: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [kpis, setKpis] = useState<KPIData>({
    totalUsers: 0,
    totalOrganizations: 0,
    deletedOrganizations: 0,
    activeMembers: 0
  });
  const [trends, setTrends] = useState<any>(null);
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Generate mock trend data
        const trendData = generateTrendData();
        setTrends(trendData);

        // Try to fetch real data first
        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setKpis(data.kpis);
          setRecentAudit(data.recentAudit);
        } else {
          // Fallback to mock data if API fails
          const mockUsers = generateMockUsers(50);
          const activeUsers = mockUsers.filter(u => {
            const daysSince = (Date.now() - new Date(u.last_login).getTime()) / (1000 * 60 * 60 * 24);
            return daysSince <= 7;
          });
          
          setKpis({
            totalUsers: 50,
            totalOrganizations: 18,
            deletedOrganizations: 2,
            activeMembers: activeUsers.length
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set mock data on error
        setKpis({
          totalUsers: 50,
          totalOrganizations: 18,
          deletedOrganizations: 2,
          activeMembers: 38
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTrend = (growth: string, isInverted: boolean = false) => {
    const growthNum = parseFloat(growth);
    const isPositive = growthNum > 0;
    const isGood = isInverted ? !isPositive : isPositive;
    
    if (growthNum === 0) {
      return (
        <span className="text-gray-500 text-xs flex items-center gap-1">
          <span>—</span>
          <span>No change</span>
        </span>
      );
    }

    return (
      <span className={`text-xs flex items-center gap-1 ${
        isGood ? 'text-green-600' : 'text-red-600'
      }`}>
        {isPositive ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className="font-semibold">{Math.abs(growthNum)}%</span>
        <span className="text-gray-500">vs last week</span>
      </span>
    );
  };

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Total Users Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
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
              {!loading && trends && renderTrend(trends.users.weeklyGrowth)}
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
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Organizations</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-dark dark:text-orange mb-2">
                {loading ? '—' : kpis.totalOrganizations.toLocaleString()}
              </p>
              {!loading && trends && renderTrend(trends.organizations.weeklyGrowth)}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/organizations')}
                className="mt-3 w-full !text-purple-600 dark:!text-purple-400 hover:!bg-purple-50 dark:hover:!bg-purple-900/20"
              >
                View All Orgs →
              </Button>
            </Card>

            {/* Deleted Organizations Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Deleted (30d)</p>
                </div>
                {!loading && kpis.deletedOrganizations > 5 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
                    High
                  </span>
                )}
              </div>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
                {loading ? '—' : kpis.deletedOrganizations.toLocaleString()}
              </p>
              {!loading && trends && renderTrend(trends.deletedOrgs.weeklyGrowth, true)}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/organizations')}
                className="mt-3 w-full !text-red-600 dark:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/20"
              >
                View Deleted →
              </Button>
            </Card>

            {/* Active Members Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-gray-slate dark:text-gray-400 text-sm font-medium">Active (7d)</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                {loading ? '—' : kpis.activeMembers.toLocaleString()}
              </p>
              {!loading && trends && renderTrend(trends.activeMembers.weeklyGrowth)}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => router.push('/admin/users')}
                className="mt-3 w-full !text-green-600 dark:!text-green-400 hover:!bg-green-50 dark:hover:!bg-green-900/20"
              >
                View Active →
              </Button>
            </Card>
          </div>

          {/* Recent Audit Log */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-orange-dark mb-4">Recent Activity</h2>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-slate">Loading...</p>
              </div>
            ) : recentAudit.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-slate">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentAudit.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.admin_users?.name || 'Unknown'} • <span className="text-gray-slate">{entry.action}</span>
                      </p>
                      <p className="text-xs text-gray-slate mt-1">
                        {entry.resource_type} • {formatDate(entry.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-orange-light text-orange-dark text-xs font-medium rounded-full">
                        {entry.resource_type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
