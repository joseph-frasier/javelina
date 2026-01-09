'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import Button from '@/components/ui/Button';
import { generateTrendData } from '@/lib/mock-admin-data';

interface KPIData {
  totalUsers: number;
  totalOrganizations: number;
  flaggedZones: number;
}

interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  table_name: string;
  profiles: { name: string; email: string };
  metadata: Record<string, any>;
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
    flaggedZones: 0
  });
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Generate mock trend data
        const trendData = generateTrendData();
        setTrends(trendData);

        // Try to fetch real data first
        try {
          const { adminApi } = await import('@/lib/api-client');
          const data = await adminApi.getDashboard();
          setKpis({
            ...data.kpis,
            flaggedZones: data.kpis.flaggedZones || 0
          });
        } catch (apiError) {
          // Fallback to mock data if API fails
          console.warn('Using mock data for admin dashboard:', apiError);
          
          setKpis({
            totalUsers: 50,
            totalOrganizations: 18,
            flaggedZones: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set mock data on error
        setKpis({
          totalUsers: 50,
          totalOrganizations: 18,
          flaggedZones: 0
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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

            {/* Flagged Zones Card */}
            <Card className="p-4 sm:p-6 hover:shadow-lg transition-shadow">
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

        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
