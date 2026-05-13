'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminProtectedRoute } from '@/components/admin/AdminProtectedRoute';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminStatusBadge, type AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import { supportApi, type SupportMessage } from '@/lib/api-client';
import { isJavelinaDomainUrl } from '@/lib/support/citation-mapper';
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

interface FieldRowProps {
  label: string;
  children: React.ReactNode;
  helper?: React.ReactNode;
}

function FieldRow({ label, children, helper }: FieldRowProps) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted mb-1">
        {label}
      </p>
      <div className="text-sm text-text">{children}</div>
      {helper && <p className="text-xs text-text-muted mt-0.5">{helper}</p>}
    </div>
  );
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
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
          <AdminPageHeader
            breadcrumb={[
              { label: 'Support Review', href: '/admin/support-review' },
              { label: 'Conversation' },
            ]}
            title="Conversation Details"
            actions={
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            }
          />

          <Card className="p-8 text-center">
            <svg className="w-16 h-16 mx-auto text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-xl font-bold text-text mb-2">
              Failed to Load Conversation
            </h2>
            <p className="text-text-muted">
              {(error as any)?.message || 'An error occurred while loading the conversation.'}
            </p>
          </Card>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <AdminLayout>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
            <p className="text-text-muted mt-4">Loading conversation...</p>
          </div>
        </AdminLayout>
      </AdminProtectedRoute>
    );
  }

  const { conversation, messages } = data;
  const status = conversation.status as SupportStatus;
  const createdDate = formatDateWithRelative(conversation.created_at);
  const updatedDate = formatDateWithRelative(conversation.updated_at);

  return (
    <AdminProtectedRoute>
      <AdminLayout>
        <AdminPageHeader
          breadcrumb={[
            { label: 'Support Review', href: '/admin/support-review' },
            { label: 'Conversation' },
          ]}
          title="Conversation Details"
          subtitle={`ID: ${conversationId}`}
          actions={
            <div className="flex items-center gap-3">
              <AdminStatusBadge
                variant={STATUS_VARIANT_MAP[status] ?? 'neutral'}
                label={STATUS_LABEL_MAP[status] ?? status}
              />
              <Button variant="ghost" size="sm" onClick={() => router.back()}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </div>
          }
        />

        <Card title="Conversation Information" className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FieldRow label="User">
              {conversation.user_email || 'Unknown User'}
            </FieldRow>
            <FieldRow label="Organization">
              {conversation.org_name || 'No Organization'}
            </FieldRow>
            <FieldRow label="Tier">{conversation.tier}</FieldRow>
            <FieldRow label="Entry Point">{conversation.entry_point}</FieldRow>
            <FieldRow label="Page URL">
              <span className="break-all">{conversation.page_url || 'N/A'}</span>
            </FieldRow>
            <FieldRow label="Messages">{conversation.message_count}</FieldRow>
            <FieldRow label="Created" helper={createdDate.relative}>
              {createdDate.absolute}
            </FieldRow>
            <FieldRow label="Last Updated" helper={updatedDate.relative}>
              {updatedDate.absolute}
            </FieldRow>
          </div>
        </Card>

        {(conversation.rating !== null || conversation.feedback_comment) && (
          <Card title="User Feedback" className="mb-6">
            <div className="space-y-4">
              {conversation.rating !== null && (
                <FieldRow label="Rating">
                  <span
                    className={`inline-flex items-center gap-2 text-2xl ${
                      conversation.rating > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {conversation.rating > 0 ? '👍' : '👎'}
                    <span className="text-base font-medium">
                      {conversation.rating > 0 ? 'Helpful' : 'Not Helpful'}
                    </span>
                  </span>
                </FieldRow>
              )}
              {conversation.feedback_comment && (
                <FieldRow label="Comment">
                  <div className="mt-2 p-4 bg-surface-alt rounded-lg border border-border">
                    <p className="text-sm text-text">{conversation.feedback_comment}</p>
                  </div>
                </FieldRow>
              )}
            </div>
          </Card>
        )}

        <Card title="Conversation Messages" className="mb-6">
          <div className="space-y-4">
            {messages.map((message: SupportMessage) => {
              const messageDate = formatDateWithRelative(message.created_at);
              const isUser = message.sender === 'user';

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
                    <div
                      className={`flex items-center gap-2 mb-1 ${
                        isUser ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span className="text-xs font-medium text-text-muted">
                        {isUser ? 'User' : 'Assistant'}
                      </span>
                      <span className="text-xs text-text-faint">
                        {messageDate.relative}
                      </span>
                      {message.attempt_count > 1 && (
                        <AdminStatusBadge
                          variant="warning"
                          label={`Attempt ${message.attempt_count}`}
                          dot={false}
                        />
                      )}
                    </div>

                    <div
                      className={`px-4 py-3 rounded-lg ${
                        isUser
                          ? 'bg-accent text-white'
                          : 'bg-surface-alt text-text border border-border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.message}
                      </p>
                    </div>

                    {!isUser && (
                      <div className="mt-2 space-y-2">
                        {message.intent && (
                          <div className="text-xs text-text-muted">
                            <span className="font-medium">Intent:</span> {message.intent}
                          </div>
                        )}
                        {message.citations && message.citations.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-text-muted">Citations:</p>
                            {message.citations.map((citation, idx) => (
                              <div
                                key={idx}
                                className="text-xs pl-3 border-l-2 border-border"
                              >
                                {isJavelinaDomainUrl(citation.javelinaUrl) ? (
                                  <a
                                    href={citation.javelinaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:text-accent-hover hover:underline"
                                  >
                                    {citation.title}
                                  </a>
                                ) : (
                                  <span className="text-text-muted">{citation.title}</span>
                                )}
                                <span className="text-text-faint ml-2">
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

        <div className="flex justify-center">
          <Link href="/admin/support-review">
            <Button variant="secondary">Back to All Conversations</Button>
          </Link>
        </div>
      </AdminLayout>
    </AdminProtectedRoute>
  );
}
