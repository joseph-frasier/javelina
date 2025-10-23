'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { ExportButton } from '@/components/admin/ExportButton';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

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

  // Quick filter presets
  const quickFilters = [
    { label: 'All', action: '', resource: '', date: 'all' },
    { label: 'Critical Actions', action: 'delete', resource: '', date: 'all' },
    { label: 'User Changes', action: '', resource: 'user', date: 'all' },
    { label: 'Org Changes', action: '', resource: 'organization', date: 'all' },
    { label: 'Recent (24h)', action: '', resource: '', date: '1d' },
    { label: 'This Week', action: '', resource: '', date: '7d' },
  ];

  const applyQuickFilter = (filter: typeof quickFilters[0]) => {
    setSearchAction(filter.action);
    setSearchResource(filter.resource);
    setDateRange(filter.date);
    setSearchActor('');
  };

  const clearFilters = () => {
    setSearchActor('');
    setSearchAction('');
    setSearchResource('');
    setDateRange('all');
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchActor, searchAction, searchResource, dateRange]);

  const fetchAuditLogs = async () => {
    try {
      const client = createServiceRoleClient();
      
      // If no client (development mode without backend), just show empty data
      if (!client) {
        setLogs([]);
        setLoading(false);
        return;
      }
      
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
      const daysMap = {
        '1d': 1,
        '7d': 7,
        '30d': 30
      } as const;
      const days = daysMap[dateRange as keyof typeof daysMap] || 1;

      const cutoffTime = now - days * 24 * 60 * 60 * 1000;
      filtered = filtered.filter((log) => new Date(log.created_at).getTime() > cutoffTime);
    }

    setFilteredLogs(filtered);
  };

  // Calculate stats
  const stats = {
    total: logs.length,
    today: logs.filter((log) => {
      const logDate = new Date(log.created_at);
      const today = new Date();
      return logDate.toDateString() === today.toDateString();
    }).length,
    thisWeek: logs.filter((log) => {
      const logDate = new Date(log.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return logDate >= weekAgo;
    }).length,
  };

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-dark dark:text-orange">Audit Log</h1>
              <p className="text-gray-slate mt-2">View all admin actions</p>
            </div>
            <ExportButton data={filteredLogs} filename="audit-log" />
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard
                label="Total Events"
                value={stats.total}
                color="blue"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
              <StatCard
                label="Today"
                value={stats.today}
                color="orange"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <StatCard
                label="This Week"
                value={stats.thisWeek}
                color="green"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            {quickFilters.map((filter, index) => (
              <button
                key={index}
                onClick={() => applyQuickFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchAction === filter.action &&
                  searchResource === filter.resource &&
                  dateRange === filter.date
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <Card className="p-6">
            <div className="space-y-4">
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

              {(searchActor || searchAction || searchResource || dateRange !== 'all') && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-slate dark:text-gray-400">
                    {filteredLogs.length} of {logs.length} entries match your filters
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={clearFilters}
                    className="!text-orange-600 dark:!text-orange-400"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Audit Log Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Audit Entries</h2>
              <Tooltip content="Admin action log">
                <InfoIcon />
              </Tooltip>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
                </div>
                <p className="text-gray-slate mt-4">Loading audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-slate text-lg font-medium">No audit entries found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchActor || searchAction || searchResource || dateRange !== 'all'
                    ? 'Try adjusting your filters to see more results.'
                    : 'No administrative actions have been recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredLogs.map((log) => {
                  const logDate = formatDateWithRelative(log.created_at);
                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {log.admin_users?.name || 'Unknown'}
                              </span>
                              <span className="text-sm text-gray-slate dark:text-gray-400">
                                {log.admin_users?.email}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="font-medium text-gray-900 dark:text-gray-100">{log.action}</span>
                              <span className="text-gray-slate dark:text-gray-400">•</span>
                              <span className="px-2 py-0.5 bg-orange-light dark:bg-orange-900/30 text-orange-dark dark:text-orange-400 text-xs rounded">
                                {log.resource_type}
                              </span>
                              <span className="text-gray-slate dark:text-gray-400">•</span>
                              <Tooltip content={logDate.absolute}>
                                <span className="text-gray-slate dark:text-gray-400 cursor-help">{logDate.relative}</span>
                              </Tooltip>
                            </div>
                          </div>
                          <div className="text-gray-400 dark:text-gray-500 ml-4">
                            {expandedId === log.id ? '▼' : '▶'}
                          </div>
                        </div>
                      </button>

                      {expandedId === log.id && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/30 rounded-b-lg mt-1">
                          <div className="space-y-3 text-sm">
                            {log.resource_id && (
                              <div>
                                <p className="text-gray-slate dark:text-gray-400">Resource ID</p>
                                <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                                  {log.resource_id}
                                </p>
                              </div>
                            )}
                            {log.ip_address && (
                              <div>
                                <p className="text-gray-slate dark:text-gray-400">IP Address</p>
                                <p className="text-gray-900 dark:text-gray-100">{log.ip_address}</p>
                              </div>
                            )}
                            {log.details && Object.keys(log.details).length > 0 && (
                              <div>
                                <p className="text-gray-slate dark:text-gray-400 mb-2">Details</p>
                                <pre className="bg-white dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto border border-gray-light dark:border-gray-600 text-gray-900 dark:text-gray-100">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Summary */}
          {!loading && (
            <p className="text-sm text-gray-slate dark:text-gray-400">
              Showing {filteredLogs.length} of {logs.length} audit entries
            </p>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
