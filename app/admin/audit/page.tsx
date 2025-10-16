'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { useToastStore } from '@/lib/toast-store';

interface AuditLog {
  id: string;
  created_at: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
  admin_users: { name: string; email: string };
}

export default function AdminAuditPage() {
  const { addToast } = useToastStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchActor, setSearchActor] = useState('');
  const [searchAction, setSearchAction] = useState('');
  const [searchResource, setSearchResource] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('all');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchActor, searchAction, searchResource, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      const client = createServiceRoleClient();
      const { data, error } = await client
        .from('admin_audit_logs')
        .select('*, admin_users(name, email)')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) throw error;
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      addToast('error', 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    if (searchActor) {
      filtered = filtered.filter(
        (log) =>
          log.admin_users?.name.toLowerCase().includes(searchActor.toLowerCase()) ||
          log.admin_users?.email.toLowerCase().includes(searchActor.toLowerCase())
      );
    }

    if (searchAction) {
      filtered = filtered.filter((log) =>
        log.action.toLowerCase().includes(searchAction.toLowerCase())
      );
    }

    if (searchResource) {
      filtered = filtered.filter((log) =>
        log.resource_type.toLowerCase().includes(searchResource.toLowerCase())
      );
    }

    if (dateRange !== 'all') {
      const now = Date.now();
      const days = {
        '1d': 1,
        '7d': 7,
        '30d': 30
      }[dateRange as keyof typeof days] || 1;

      const cutoffTime = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((log) => new Date(log.created_at).getTime() > cutoffTime);
    }

    setFilteredLogs(filtered);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-orange-dark">Audit Log</h1>
            <p className="text-gray-slate mt-2">View all admin actions</p>
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Input
                type="text"
                placeholder="Search by actor name/email..."
                value={searchActor}
                onChange={(e) => setSearchActor(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Search by action..."
                value={searchAction}
                onChange={(e) => setSearchAction(e.target.value)}
              />
              <Input
                type="text"
                placeholder="Search by resource type..."
                value={searchResource}
                onChange={(e) => setSearchResource(e.target.value)}
              />
              <Dropdown
                label="Date Range"
                value={dateRange}
                onChange={setDateRange}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: '1d', label: 'Last 24 Hours' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' }
                ]}
              />
            </div>
          </Card>

          {/* Audit Log Table */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-orange-dark mb-4">Audit Entries</h2>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-slate">No audit entries found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div key={log.id}>
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-medium text-gray-900">
                              {log.admin_users?.name || 'Unknown'}
                            </span>
                            <span className="text-sm text-gray-slate">
                              {log.admin_users?.email}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-gray-900">{log.action}</span>
                            <span className="text-gray-slate">•</span>
                            <span className="px-2 py-0.5 bg-orange-light text-orange-dark text-xs rounded">
                              {log.resource_type}
                            </span>
                            <span className="text-gray-slate">•</span>
                            <span className="text-gray-slate">{formatDate(log.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-gray-400">
                          {expandedId === log.id ? '▼' : '▶'}
                        </div>
                      </div>
                    </button>

                    {expandedId === log.id && (
                      <div className="p-4 bg-orange-50 border-t border-orange-100 rounded-b-lg mt-1">
                        <div className="space-y-3 text-sm">
                          {log.resource_id && (
                            <div>
                              <p className="text-gray-slate">Resource ID</p>
                              <p className="font-mono text-xs text-gray-900 break-all">
                                {log.resource_id}
                              </p>
                            </div>
                          )}
                          {log.ip_address && (
                            <div>
                              <p className="text-gray-slate">IP Address</p>
                              <p className="text-gray-900">{log.ip_address}</p>
                            </div>
                          )}
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div>
                              <p className="text-gray-slate mb-2">Details</p>
                              <pre className="bg-white p-3 rounded text-xs overflow-x-auto border border-gray-light">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-gray-slate">
              Showing {filteredLogs.length} of {logs.length} audit entries
            </p>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
