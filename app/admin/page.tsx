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
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
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
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 rounded-lg bg-purple-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
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
                <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
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
