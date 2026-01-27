'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { supportApi } from '@/lib/api-client';
import { formatDateWithRelative } from '@/lib/utils/time';
import { useToastStore } from '@/lib/toast-store';

// StatusBadge component (same as parent page)
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

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToastStore();
  const conversationId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ['supportConversation', conversationId],
    queryFn: () => supportApi.getConversation(conversationId),
    retry: 1,
  });

  if (error) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </div>

            <Card className="p-8 text-center">
              <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Failed to Load Conversation
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {(error as any)?.message || 'An error occurred while loading the conversation.'}
              </p>
            </Card>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange"></div>
            <p className="text-gray-slate dark:text-gray-300 mt-4">Loading conversation...</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  const { conversation, messages } = data;
  const createdDate = formatDateWithRelative(conversation.created_at);
  const updatedDate = formatDateWithRelative(conversation.updated_at);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-dark dark:text-orange">
                  Conversation Details
                </h1>
                <p className="text-sm text-gray-slate dark:text-gray-300 mt-1">
                  ID: {conversationId}
                </p>
              </div>
            </div>
            <StatusBadge status={conversation.status as any} />
          </div>

          {/* Conversation Info Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conversation Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">User</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {conversation.user_email || 'Unknown User'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Organization</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {conversation.org_name || 'No Organization'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Tier</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {conversation.tier}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Entry Point</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {conversation.entry_point}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Page URL</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1 break-all">
                  {conversation.page_url || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Messages</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {conversation.message_count}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Created</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {createdDate.absolute}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {createdDate.relative}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Updated</label>
                <p className="text-sm text-gray-900 dark:text-white mt-1">
                  {updatedDate.absolute}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {updatedDate.relative}
                </p>
              </div>
            </div>
          </Card>

          {/* Feedback Card */}
          {(conversation.rating !== null || conversation.feedback_comment) && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                User Feedback
              </h2>
              <div className="space-y-4">
                {conversation.rating !== null && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Rating</label>
                    <div className="mt-2">
                      <span className={`inline-flex items-center gap-2 text-2xl ${
                        conversation.rating > 0 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {conversation.rating > 0 ? '👍' : '👎'}
                        <span className="text-base font-medium">
                          {conversation.rating > 0 ? 'Helpful' : 'Not Helpful'}
                        </span>
                      </span>
                    </div>
                  </div>
                )}
                {conversation.feedback_comment && (
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Comment</label>
                    <div className="mt-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-900 dark:text-white">
                        {conversation.feedback_comment}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Messages */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Conversation Messages
            </h2>
            <div className="space-y-4">
              {messages.map((message, index) => {
                const messageDate = formatDateWithRelative(message.created_at);
                const isUser = message.sender === 'user';
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                      {/* Message Header */}
                      <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {isUser ? 'User' : 'Assistant'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          {messageDate.relative}
                        </span>
                        {message.attempt_count > 1 && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                            Attempt {message.attempt_count}
                          </span>
                        )}
                      </div>

                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-3 rounded-lg ${
                          isUser
                            ? 'bg-orange text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {message.message}
                        </p>
                      </div>

                      {/* Intent & Citations */}
                      {!isUser && (
                        <div className="mt-2 space-y-2">
                          {message.intent && (
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              <span className="font-medium">Intent:</span> {message.intent}
                            </div>
                          )}
                          {message.citations && message.citations.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                Citations:
                              </p>
                              {message.citations.map((citation, idx) => (
                                <div
                                  key={idx}
                                  className="text-xs pl-3 border-l-2 border-gray-300 dark:border-gray-600"
                                >
                                  <a
                                    href={citation.javelinaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-orange hover:text-orange-dark dark:text-orange-light dark:hover:text-orange hover:underline"
                                  >
                                    {citation.title}
                                  </a>
                                  <span className="text-gray-500 dark:text-gray-500 ml-2">
                                    (confidence: {(citation.confidence * 100).toFixed(0)}%)
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-center">
            <Link href="/admin/support-review">
              <Button variant="secondary">
                Back to All Conversations
              </Button>
            </Link>
          </div>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
