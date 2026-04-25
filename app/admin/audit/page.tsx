'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Tooltip } from '@/components/ui/Tooltip';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import { AdminDataTable, type AdminDataTableColumn } from '@/components/admin/AdminDataTable';
import { ExportButton } from '@/components/admin/ExportButton';
import { adminApi } from '@/lib/api-client';
import { useToastStore } from '@/lib/toast-store';
import { formatDateWithRelative } from '@/lib/utils/time';
import { type AuditLog, getActionDescription } from '@/lib/utils/audit';

function AdminAuditPageContent() {
  const searchParams = useSearchParams();
  const { addToast } = useToastStore();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const data = await adminApi.getAuditLogs({ actor_type: 'admin' });
      setLogs((data || []) as AuditLog[]);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
      addToast('error', 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  // Apply search filter — preserves the original cross-column matching semantics
  const applyFilter = useCallback(() => {
    if (!searchQuery.trim()) {
      setFilteredLogs(logs);
      return;
    }
    const query = searchQuery.toLowerCase();
    setFilteredLogs(
      logs.filter((log) => {
        return (
          log.action?.toLowerCase().includes(query) ||
          log.table_name?.toLowerCase().includes(query) ||
          log.record_id?.toLowerCase().includes(query) ||
          log.profiles?.name?.toLowerCase().includes(query) ||
          log.profiles?.email?.toLowerCase().includes(query) ||
          log.ip_address?.toLowerCase().includes(query) ||
          JSON.stringify(log.metadata).toLowerCase().includes(query)
        );
      })
    );
  }, [logs, searchQuery]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  useEffect(() => {
    const search = searchParams.get('search');
    if (search !== null) {
      setSearchQuery(search);
    }
  }, [searchParams]);

  useEffect(() => {
    applyFilter();
  }, [applyFilter]);

  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setShowSkeleton(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(false);
    }
  }, [loading]);

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

  const columns: AdminDataTableColumn<AuditLog>[] = useMemo(
    () => [
      {
        key: 'admin',
        header: 'Admin',
        sortValue: (log) => (log.profiles?.name ?? '').toLowerCase(),
        render: (log) => (
          <span className="font-medium text-text">
            {log.profiles?.name || 'Unknown Admin'}
          </span>
        ),
      },
      {
        key: 'action',
        header: 'Action',
        sortable: false,
        render: (log) => {
          const description = getActionDescription(log);
          return (
            <div>
              <span className="text-text">{description.action} </span>
              <span className="font-semibold text-accent">
                {description.targetName}
              </span>
              {description.targetEmail && (
                <span className="text-text-muted text-xs"> ({description.targetEmail})</span>
              )}
            </div>
          );
        },
      },
      {
        key: 'table_name',
        header: 'Table',
        sortValue: (log) => (log.table_name ?? '').toLowerCase(),
        render: (log) => (
          <AdminStatusBadge variant="accent" label={log.table_name} dot={false} />
        ),
      },
      {
        key: 'created_at',
        header: 'When',
        sortValue: (log) => (log.created_at ? new Date(log.created_at) : null),
        render: (log) => {
          const d = formatDateWithRelative(log.created_at);
          return (
            <Tooltip content={d.absolute}>
              <span className="text-sm text-text-muted cursor-help">{d.relative}</span>
            </Tooltip>
          );
        },
      },
      {
        key: 'detail',
        header: '',
        align: 'right',
        sortable: false,
        render: () => (
          <span className="text-text-faint text-xs">View →</span>
        ),
      },
    ],
    []
  );

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Audit Log"
          subtitle="View all admin actions"
          actions={<ExportButton data={filteredLogs} filename="audit-log" />}
        />

        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <AdminStatCard
              label="Total Events"
              tone="info"
              value={stats.total}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Today"
              tone="accent"
              value={stats.today}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="This Week"
              tone="success"
              value={stats.thisWeek}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
          </div>
        )}

        <Card title="Audit Entries" description="Admin action log">
          <div className="mb-4">
            <div className="relative">
              <input
                type="search"
                placeholder="Search across all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-3 rounded-md border border-border bg-surface-alt text-sm text-text placeholder:text-text-faint transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus-ring"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-faint pointer-events-none"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          <AdminDataTable<AuditLog>
            data={filteredLogs}
            columns={columns}
            getRowId={(l) => l.id}
            onRowClick={(log) => setDetailLog(log)}
            defaultSort={{ key: 'created_at', direction: 'desc' }}
            pageSize={25}
            loading={showSkeleton}
            loadingRows={8}
            emptyState={
              <div className="py-12 flex items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-12 w-12 text-text-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-text font-medium">No audit entries found</p>
                  <p className="text-text-muted text-sm mt-1">
                    {searchQuery ? 'Try adjusting your search query.' : 'No administrative actions have been recorded yet.'}
                  </p>
                </div>
              </div>
            }
          />
        </Card>

        {!loading && (
          <p className="text-sm text-text-muted mt-4">
            Showing {filteredLogs.length} of {logs.length} audit entries
          </p>
        )}

        <AuditLogDetailModal log={detailLog} onClose={() => setDetailLog(null)} />
      </AdminLayout>
    </AdminProtectedRoute>
  );
}

interface AuditLogDetailModalProps {
  log: AuditLog | null;
  onClose: () => void;
}

function AuditLogDetailModal({ log, onClose }: AuditLogDetailModalProps) {
  // Keep last log in state so closing animation has data to render
  const [displayLog, setDisplayLog] = useState<AuditLog | null>(null);
  useEffect(() => {
    if (log) setDisplayLog(log);
  }, [log]);

  if (!displayLog) return null;
  const description = getActionDescription(displayLog);
  const logDate = formatDateWithRelative(displayLog.created_at);

  return (
    <Modal
      isOpen={!!log}
      onClose={onClose}
      title="Audit Entry"
      eyebrow={displayLog.table_name}
      size="medium"
    >
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Admin</p>
          <p className="text-text">
            {displayLog.profiles?.name || 'Unknown'}
            {displayLog.profiles?.email && (
              <span className="text-text-muted"> ({displayLog.profiles.email})</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Action</p>
          <p className="text-text capitalize">{description.action}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Target</p>
          <p className="text-text">
            {description.targetName}
            {description.targetEmail && (
              <span className="text-text-muted"> ({description.targetEmail})</span>
            )}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Changes</p>
          <div className="bg-surface-alt p-3 rounded border border-border">
            <p className="text-text">{description.details}</p>
          </div>
        </div>

        <div className="pt-3 border-t border-border">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Technical Details</p>
          <div className="space-y-2">
            {displayLog.record_id && (
              <div>
                <p className="text-xs text-text-muted">Record ID</p>
                <p className="font-mono text-xs text-text break-all">{displayLog.record_id}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted">Table</p>
              <p className="text-xs text-text">{displayLog.table_name}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Timestamp</p>
              <p className="text-xs text-text">{logDate.absolute}</p>
            </div>
            {displayLog.ip_address && (
              <div>
                <p className="text-xs text-text-muted">IP Address</p>
                <p className="text-xs text-text">{displayLog.ip_address}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={null}>
      <AdminAuditPageContent />
    </Suspense>
  );
}
