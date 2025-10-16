'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';

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

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<KPIData>({
    totalUsers: 0,
    totalOrganizations: 0,
    deletedOrganizations: 0,
    activeMembers: 0
  });
  const [recentAudit, setRecentAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include', // Ensure cookies are sent
        });
        
        console.log('Dashboard API response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Dashboard API error:', errorData);
          throw new Error(`Failed to fetch dashboard data: ${response.status}`);
        }
        
        const data = await response.json();
        setKpis(data.kpis);
        setRecentAudit(data.recentAudit);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-slate text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-orange-dark mt-2">
                    {loading ? '—' : kpis.totalUsers}
                  </p>
                </div>
                <div className="text-4xl">👥</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-slate text-sm">Organizations</p>
                  <p className="text-3xl font-bold text-orange-dark mt-2">
                    {loading ? '—' : kpis.totalOrganizations}
                  </p>
                </div>
                <div className="text-4xl">🏢</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-slate text-sm">Deleted (30d)</p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {loading ? '—' : kpis.deletedOrganizations}
                  </p>
                </div>
                <div className="text-4xl">🗑️</div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-slate text-sm">Active (7d)</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {loading ? '—' : kpis.activeMembers}
                  </p>
                </div>
                <div className="text-4xl">⚡</div>
              </div>
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
