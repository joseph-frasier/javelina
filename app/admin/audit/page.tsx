'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Tooltip, InfoIcon } from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Dropdown from '@/components/ui/Dropdown';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { ExportButton } from '@/components/admin/ExportButton';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';

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

export default function AdminAuditPage() {
  const { addToast } = useToastStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // Search across all columns
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Sorting
  const [sortKey, setSortKey] = useState<string | null>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');

  // Handle column sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      // Same column: cycle through asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortKey(null);
        setSortDirection(null);
      }
    } else {
      // New column: start with asc
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const fetchAuditLogs = useCallback(async () => {
    try {
      // Only fetch admin actions (actor_type = 'admin')
      const data = await adminApi.getAuditLogs({ actor_type: 'admin' });
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      addToast('error', 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const filterLogs = useCallback(() => {
    let filtered = logs;

    // Search across all columns
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((log) => {
        return (
          log.action?.toLowerCase().includes(query) ||
          log.table_name?.toLowerCase().includes(query) ||
          log.record_id?.toLowerCase().includes(query) ||
          log.profiles?.name?.toLowerCase().includes(query) ||
          log.profiles?.email?.toLowerCase().includes(query) ||
          log.ip_address?.toLowerCase().includes(query) ||
          JSON.stringify(log.metadata).toLowerCase().includes(query)
        );
      });
    }

    // Apply sorting
    if (sortKey && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        if (sortKey === 'profiles') {
          aValue = a.profiles?.name || '';
          bValue = b.profiles?.name || '';
        } else {
          aValue = a[sortKey as keyof AuditLog];
          bValue = b[sortKey as keyof AuditLog];
        }

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Handle dates
        if (sortKey === 'created_at') {
          const aDate = new Date(aValue);
          const bDate = new Date(bValue);
          return sortDirection === 'asc'
            ? aDate.getTime() - bDate.getTime()
            : bDate.getTime() - aDate.getTime();
        }

        // Handle strings
        const aStr = String(aValue).toLowerCase();
        const bStr = String(bValue).toLowerCase();
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        }
        return bStr.localeCompare(aStr);
      });
    }

    setFilteredLogs(filtered);
  }, [logs, searchQuery, sortKey, sortDirection]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    filterLogs();
  }, [filterLogs]);

  // Delay showing skeleton to avoid flash for quick loads
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange">Audit Log</h1>
              <p className="text-sm sm:text-base text-gray-slate dark:text-gray-300 mt-1 sm:mt-2">View all admin actions</p>
            </div>
            <div className="flex-shrink-0">
              <ExportButton data={filteredLogs} filename="audit-log" />
            </div>
          </div>

          {/* Stat Cards */}
          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Audit Log Table */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">Audit Entries</h2>
              <Tooltip content="Admin action log">
                <InfoIcon />
              </Tooltip>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search across all fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 pl-10 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>

            {showSkeleton ? (
              <div className="space-y-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Timeline dot placeholder */}
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-3 h-3 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                          </div>
                          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 animate-pulse" />
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-4">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28 animate-pulse" />
                        </div>

                        {/* Details box */}
                        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-slate text-lg font-medium">No audit entries found</p>
                <p className="text-gray-400 text-sm mt-2">
                  {searchQuery ? 'Try adjusting your search query.' : 'No administrative actions have been recorded yet.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 animate-fadeIn">
                {filteredLogs.map((log) => {
                  const logDate = formatDateWithRelative(log.created_at);
                  const description = getActionDescription(log);
                  
                  return (
                    <div key={log.id}>
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="w-full text-left p-4 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
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
                          <div className="text-gray-400 dark:text-gray-500 ml-4">
                            {expandedId === log.id ? '▼' : '▶'}
                          </div>
                        </div>
                      </button>

                      {expandedId === log.id && (
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/30 rounded-b-lg mt-1">
                          <div className="space-y-4 text-sm">
                            {/* Admin Info */}
                            <div>
                              <p className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase mb-1">Admin</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {log.profiles?.name || 'Unknown'} 
                                {log.profiles?.email && (
                                  <span className="text-gray-slate dark:text-gray-400"> ({log.profiles.email})</span>
                                )}
                              </p>
                            </div>

                            {/* Action */}
                            <div>
                              <p className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase mb-1">Action</p>
                              <p className="text-gray-900 dark:text-gray-100 capitalize">{description.action}</p>
                            </div>

                            {/* Target */}
                            <div>
                              <p className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase mb-1">Target</p>
                              <p className="text-gray-900 dark:text-gray-100">
                                {description.targetName}
                                {description.targetEmail && (
                                  <span className="text-gray-slate dark:text-gray-400"> ({description.targetEmail})</span>
                                )}
                              </p>
                            </div>

                            {/* Changes */}
                            <div>
                              <p className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase mb-1">Changes</p>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-light dark:border-gray-600">
                                <p className="text-gray-900 dark:text-gray-100">{description.details}</p>
                              </div>
                            </div>

                            {/* Technical Details */}
                            <div className="pt-3">
                              <p className="text-xs font-semibold text-gray-slate dark:text-gray-400 uppercase mb-2">Technical Details</p>
                              <div className="space-y-2">
                                {log.record_id && (
                                  <div>
                                    <p className="text-xs text-gray-slate dark:text-gray-400">Record ID</p>
                                    <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                                      {log.record_id}
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs text-gray-slate dark:text-gray-400">Table</p>
                                  <p className="text-xs text-gray-900 dark:text-gray-100">{log.table_name}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-slate dark:text-gray-400">Timestamp</p>
                                  <p className="text-xs text-gray-900 dark:text-gray-100">{logDate.absolute}</p>
                                </div>
                                {log.ip_address && (
                                  <div>
                                    <p className="text-xs text-gray-slate dark:text-gray-400">IP Address</p>
                                    <p className="text-xs text-gray-900 dark:text-gray-100">{log.ip_address}</p>
                                  </div>
                                )}
                              </div>
                            </div>
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
