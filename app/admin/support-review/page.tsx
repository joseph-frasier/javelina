'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatCard, type AdminStatCardTone } from '@/components/admin/AdminStatCard';
import { AdminStatusBadge, type AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import { Pagination } from '@/components/admin/Pagination';
import { supportApi, type SupportConversation } from '@/lib/api-client';
import { formatDateWithRelative } from '@/lib/utils/time';

type SupportStatus = 'open' | 'resolved' | 'escalated' | 'failed' | 'abandoned';

const STATUS_VARIANT_MAP: Record<SupportStatus, AdminStatusBadgeVariant> = {
  open: 'info',
  resolved: 'success',
  escalated: 'accent',
  failed: 'danger',
  abandoned: 'neutral',
};

const STATUS_LABEL_MAP: Record<SupportStatus, string> = {
  open: 'Open',
  resolved: 'Resolved',
  escalated: 'Escalated',
  failed: 'Failed',
  abandoned: 'Abandoned',
};

function SupportStatusBadge({ status }: { status: SupportStatus }) {
  return (
    <AdminStatusBadge
      variant={STATUS_VARIANT_MAP[status] ?? 'neutral'}
      label={STATUS_LABEL_MAP[status] ?? status}
    />
  );
}

export default function SupportReviewPage() {
  const [daysFilter, setDaysFilter] = useState(7);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['supportMetrics', daysFilter],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysFilter);

      return supportApi.getMetrics({
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });
    },
    retry: 1,
  });

  const { data: conversationsData, isLoading: conversationsLoading } = useQuery({
    queryKey: ['supportConversations', daysFilter, statusFilter, currentPage],
    queryFn: async () => {
      return supportApi.getConversations({
        days: daysFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        page: currentPage,
        limit: itemsPerPage,
      });
    },
    retry: 1,
  });

  const metrics = metricsData || {
    total_conversations: 0,
    resolved_conversations: 0,
    escalated_conversations: 0,
    avg_rating: 0,
    resolution_rate: 0,
  };

  const conversations = conversationsData?.conversations || [];
  const totalConversations = conversationsData?.total || 0;
  const totalPages = Math.ceil(totalConversations / itemsPerPage);

  const deflectionRate =
    metrics.total_conversations > 0
      ? ((metrics.resolved_conversations / metrics.total_conversations) * 100).toFixed(1)
      : '0';

  const thumbsUpRate = metrics.avg_rating
    ? (metrics.avg_rating * 100).toFixed(1)
    : '0';

  const getMetricTone = (
    rate: number,
    threshold: { success: number; warning: number }
  ): AdminStatCardTone => {
    if (rate >= threshold.success) return 'success';
    if (rate >= threshold.warning) return 'warning';
    return 'accent';
  };

  const deflectionRateNum = parseFloat(deflectionRate);
  const thumbsUpRateNum = parseFloat(thumbsUpRate);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          title="Support Review Dashboard"
          subtitle="Monitor AI support assistant performance and user feedback"
        />

        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text mb-2">
                Time Period
              </label>
              <div className="flex gap-2">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    onClick={() => {
                      setDaysFilter(days);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      daysFilter === days
                        ? 'bg-accent text-white'
                        : 'bg-surface-alt text-text hover:bg-surface-hover'
                    }`}
                  >
                    {days} days
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-text mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 px-3 rounded-md border border-border bg-surface text-text text-sm transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:border-accent focus-visible:shadow-focus-ring"
              >
                <option value="all">All Conversations</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
                <option value="escalated">Escalated</option>
                <option value="failed">Failed</option>
                <option value="abandoned">Abandoned</option>
              </select>
            </div>
          </div>
        </Card>

        {!metricsLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <AdminStatCard
              label="Deflection Rate"
              tone={getMetricTone(deflectionRateNum, { success: 70, warning: 50 })}
              value={`${deflectionRate}%`}
              description="Self-service success"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Thumbs Up Rate"
              tone={getMetricTone(thumbsUpRateNum, { success: 80, warning: 60 })}
              value={`${thumbsUpRate}%`}
              description="User satisfaction"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              }
            />
            <AdminStatCard
              label="Total Conversations"
              tone="info"
              value={metrics.total_conversations}
              description={`Last ${daysFilter} days`}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              }
            />
            <AdminStatCard
              label="Escalated"
              tone={
                metrics.escalated_conversations >
                metrics.total_conversations * 0.2
                  ? 'warning'
                  : 'success'
              }
              value={metrics.escalated_conversations}
              description="Needs human review"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              }
            />
          </div>
        )}

        <Card title="Conversations" description="AI support assistant transcripts and outcomes">
          {totalPages > 1 && (
            <div className="flex justify-end mb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalConversations}
                itemsPerPage={itemsPerPage}
                position="top"
              />
            </div>
          )}

          {conversationsLoading ? (
            <div className="py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
              <p className="text-text-muted mt-4">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-12 flex items-center justify-center border border-border rounded-lg">
              <div className="text-center">
                <svg className="mx-auto h-12 w-12 text-text-faint mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-text font-medium">No conversations found</p>
                <p className="text-text-muted text-sm mt-1">
                  {statusFilter !== 'all'
                    ? 'Try adjusting your filters.'
                    : 'Conversations will appear here as users interact with the support assistant.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile card view */}
              <div className="sm:hidden space-y-3">
                {conversations.map((conv: SupportConversation) => {
                  const createdDate = formatDateWithRelative(conv.created_at);
                  return (
                    <div
                      key={conv.id}
                      className="rounded-lg border border-border bg-surface p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text truncate">
                            {conv.user_email || 'Unknown User'}
                          </p>
                          <p className="text-xs text-text-muted truncate">
                            {conv.org_name || 'No Organization'}
                          </p>
                        </div>
                        <SupportStatusBadge status={conv.status as SupportStatus} />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-text-muted">Messages:</span>
                          <span className="ml-1 font-medium text-text">
                            {conv.message_count}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted">Tier:</span>
                          <span className="ml-1 font-medium text-text">{conv.tier}</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Rating:</span>
                          <span className="ml-1 font-medium">
                            {conv.rating ? (
                              <span className={conv.rating > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                {conv.rating > 0 ? '👍' : '👎'}
                              </span>
                            ) : (
                              <span className="text-text-faint">—</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-text-muted">Date:</span>
                          <span className="ml-1 font-medium text-text">
                            {createdDate.relative}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/admin/support-review/${conv.id}`}
                        className="block w-full text-center px-3 py-2 text-sm font-medium text-accent hover:text-accent-hover bg-accent-soft rounded-md transition-colors"
                      >
                        View Details
                      </Link>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-border">
                <table className="w-full">
                  <thead className="bg-surface-alt border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Organization</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Status</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Messages</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Feedback</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide text-text-muted">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversations.map((conv: SupportConversation) => {
                      const createdDate = formatDateWithRelative(conv.created_at);
                      return (
                        <tr
                          key={conv.id}
                          className="border-b border-border last:border-b-0 hover:bg-surface-hover transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm text-text">{createdDate.relative}</p>
                            <p className="text-xs text-text-muted">
                              {new Date(conv.created_at).toLocaleDateString()}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-text truncate max-w-xs">
                              {conv.user_email || 'Unknown User'}
                            </p>
                            <p className="text-xs text-text-muted">{conv.tier}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-text truncate max-w-xs">
                              {conv.org_name || 'No Organization'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <SupportStatusBadge status={conv.status as SupportStatus} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-text">
                              {conv.message_count}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {conv.rating !== null ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-lg ${conv.rating > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  {conv.rating > 0 ? '👍' : '👎'}
                                </span>
                                {conv.feedback_comment && (
                                  <span className="text-xs text-text-muted" title={conv.feedback_comment}>
                                    Has comment
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-text-faint">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/admin/support-review/${conv.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-accent hover:text-accent-hover hover:bg-accent-soft rounded-md transition-colors"
                            >
                              View
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={totalConversations}
                    itemsPerPage={itemsPerPage}
                    position="bottom"
                  />
                </div>
              )}
            </>
          )}
        </Card>

        {!conversationsLoading && conversations.length > 0 && (
          <p className="text-sm text-text-muted mt-4">
            Showing {conversations.length} of {totalConversations} conversations
          </p>
        )}
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
