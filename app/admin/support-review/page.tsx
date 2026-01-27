'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { Pagination } from '@/components/admin/Pagination';
import { supportApi, type SupportConversation } from '@/lib/api-client';
import { formatDateWithRelative } from '@/lib/utils/time';
import { useToastStore } from '@/lib/toast-store';

// MetricCard component with success/warning status indicators
interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  status?: 'success' | 'warning' | 'neutral';
  subtitle?: string;
}

function MetricCard({ label, value, icon, status = 'neutral', subtitle }: MetricCardProps) {
  const statusColors = {
    success: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    neutral: 'bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-slate dark:text-gray-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-orange-dark dark:text-gray-100">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${statusColors[status]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// StatusBadge component with color coding
interface StatusBadgeProps {
  status: 'open' | 'resolved' | 'escalated' | 'failed' | 'abandoned';
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    open: {
      label: 'Open',
      classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      dotClasses: 'bg-blue-600 dark:bg-blue-400',
    },
    resolved: {
      label: 'Resolved',
      classes: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      dotClasses: 'bg-green-600 dark:bg-green-400',
    },
    escalated: {
      label: 'Escalated',
      classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      dotClasses: 'bg-orange-600 dark:bg-orange-400',
    },
    failed: {
      label: 'Failed',
      classes: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      dotClasses: 'bg-red-600 dark:bg-red-400',
    },
    abandoned: {
      label: 'Abandoned',
      classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      dotClasses: 'bg-gray-600 dark:bg-gray-400',
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClasses}`} />
      {config.label}
    </span>
  );
}

export default function SupportReviewPage() {
  const { addToast } = useToastStore();
  const [daysFilter, setDaysFilter] = useState(7);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Fetch metrics
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

  // Fetch conversations
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

  // Calculate derived metrics
  const deflectionRate = metrics.total_conversations > 0
    ? ((metrics.resolved_conversations / metrics.total_conversations) * 100).toFixed(1)
    : '0';
  
  const thumbsUpRate = metrics.avg_rating
    ? (metrics.avg_rating * 100).toFixed(1)
    : '0';

  const getMetricStatus = (rate: number, threshold: { success: number; warning: number }) => {
    if (rate >= threshold.success) return 'success';
    if (rate >= threshold.warning) return 'warning';
    return 'neutral';
  };

  const deflectionRateNum = parseFloat(deflectionRate);
  const thumbsUpRateNum = parseFloat(thumbsUpRate);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange">
              Support Review Dashboard
            </h1>
            <p className="text-sm sm:text-base text-gray-slate dark:text-gray-300 mt-1 sm:mt-2">
              Monitor AI support assistant performance and user feedback
            </p>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Days Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                          ? 'bg-orange text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                      }`}
                    >
                      {days} days
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Filter */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-4 py-2 rounded-md border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange transition-colors"
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

          {/* Metrics Cards */}
          {!metricsLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Deflection Rate"
                value={`${deflectionRate}%`}
                status={getMetricStatus(deflectionRateNum, { success: 70, warning: 50 })}
                subtitle="Self-service success"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <MetricCard
                label="Thumbs Up Rate"
                value={`${thumbsUpRate}%`}
                status={getMetricStatus(thumbsUpRateNum, { success: 80, warning: 60 })}
                subtitle="User satisfaction"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                }
              />
              <MetricCard
                label="Total Conversations"
                value={metrics.total_conversations}
                status="neutral"
                subtitle={`Last ${daysFilter} days`}
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                }
              />
              <MetricCard
                label="Escalated"
                value={metrics.escalated_conversations}
                status={metrics.escalated_conversations > metrics.total_conversations * 0.2 ? 'warning' : 'success'}
                subtitle="Needs human review"
                icon={
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
            </div>
          )}

          {/* Conversations Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold text-orange-dark dark:text-orange">
                Conversations
              </h2>
              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalConversations}
                  itemsPerPage={itemsPerPage}
                  position="top"
                />
              )}
            </div>

            {conversationsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange"></div>
                <p className="text-gray-slate dark:text-gray-300 mt-4">Loading conversations...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-slate dark:text-gray-300 text-lg font-medium">No conversations found</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  {statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Conversations will appear here as users interact with the support assistant.'}
                </p>
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="sm:hidden space-y-3">
                  {conversations.map((conv) => {
                    const createdDate = formatDateWithRelative(conv.created_at);
                    return (
                      <Card key={conv.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {conv.user_email || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                {conv.org_name || 'No Organization'}
                              </p>
                            </div>
                            <StatusBadge status={conv.status as any} />
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Messages:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                {conv.message_count}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Tier:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                {conv.tier}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Rating:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                {conv.rating ? (
                                  <span className={conv.rating > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                                    {conv.rating > 0 ? '👍' : '👎'}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600 dark:text-gray-400">Date:</span>
                              <span className="ml-1 font-medium text-gray-900 dark:text-gray-100">
                                {createdDate.relative}
                              </span>
                            </div>
                          </div>

                          <Link
                            href={`/admin/support-review/${conv.id}`}
                            className="block w-full text-center px-3 py-2 text-sm font-medium text-orange hover:text-orange-dark dark:text-orange dark:hover:text-orange-light bg-orange-light dark:bg-orange-900/30 rounded-md transition-colors"
                          >
                            View Details
                          </Link>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-light dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Date</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">User</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Organization</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Status</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Messages</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Feedback</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversations.map((conv) => {
                        const createdDate = formatDateWithRelative(conv.created_at);
                        return (
                          <tr key={conv.id} className="border-b border-gray-light dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-900 dark:text-white">
                                {createdDate.relative}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(conv.created_at).toLocaleDateString()}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                                {conv.user_email || 'Unknown User'}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {conv.tier}
                              </p>
                            </td>
                            <td className="py-3 px-4">
                              <p className="text-sm text-gray-900 dark:text-white truncate max-w-xs">
                                {conv.org_name || 'No Organization'}
                              </p>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <StatusBadge status={conv.status as any} />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {conv.message_count}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {conv.rating !== null ? (
                                <div className="flex flex-col items-center gap-1">
                                  <span className={`text-lg ${conv.rating > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                    {conv.rating > 0 ? '👍' : '👎'}
                                  </span>
                                  {conv.feedback_comment && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400" title={conv.feedback_comment}>
                                      Has comment
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Link
                                href={`/admin/support-review/${conv.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-orange hover:text-orange-dark dark:text-orange dark:hover:text-orange-light hover:bg-orange-light dark:hover:bg-orange-900/30 rounded-md transition-colors"
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

                {/* Bottom Pagination */}
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

          {/* Summary */}
          {!conversationsLoading && conversations.length > 0 && (
            <p className="text-sm text-gray-slate dark:text-gray-400">
              Showing {conversations.length} of {totalConversations} conversations
            </p>
          )}
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
