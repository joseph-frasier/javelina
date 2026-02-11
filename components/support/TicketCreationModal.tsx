'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { supportApi, ApiError } from '@/lib/api-client';

interface TicketCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  conversationSummary: string;
  initialSubject?: string;
  snapshot?: any;
  sessionId?: string;
  userId: string;
  orgId?: string;
}

const DEFAULT_SUBJECT = 'Support Request from Chat';

function formatDescription(conversationSummary: string) {
  return `Conversation Summary:\n\n${conversationSummary}\n\n---\n\nPlease provide additional details about your issue below:`;
}

export function TicketCreationModal({
  isOpen,
  onClose,
  onSuccess,
  conversationSummary,
  initialSubject,
  snapshot,
  sessionId,
  userId,
  orgId,
}: TicketCreationModalProps) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [description, setDescription] = useState(formatDescription(conversationSummary));

  // Pre-populate form when modal opens with chat context
  useEffect(() => {
    if (isOpen) {
      setSubject(initialSubject?.trim() || DEFAULT_SUBJECT);
      setDescription(formatDescription(conversationSummary));
    }
  }, [isOpen, conversationSummary, initialSubject]);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Build the full description with technical details if available
      let fullDescription = description;

      if (snapshot || sessionId || orgId) {
        fullDescription += '\n\n--- Technical Details ---\n';
        
        if (sessionId) {
          fullDescription += `\nSession ID: ${sessionId}`;
        }
        
        if (orgId) {
          fullDescription += `\nOrganization ID: ${orgId}`;
        }
        
        if (snapshot) {
          fullDescription += `\n\nApp Snapshot:\n${JSON.stringify(snapshot, null, 2)}`;
        }
      }

      await supportApi.logBug({
        subject,
        description: fullDescription,
        page_url: typeof window !== 'undefined' ? window.location.href : '',
        user_id: userId,
        org_id: orgId,
        session_id: sessionId,
      });

      setSuccess(true);
      
      // Close modal after a short delay to show success state
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();  // Call success callback instead of onClose
        } else {
          onClose();
        }
        // Reset form state after close animation completes
        setTimeout(() => {
          setSubject(DEFAULT_SUBJECT);
          setDescription(formatDescription(conversationSummary));
          setSuccess(false);
          setError(null);
        }, 300);
      }, 1500);
    } catch (err) {
      console.error('Failed to create ticket:', err);
      
      // Handle rate limit errors specially
      if (err instanceof ApiError && err.statusCode === 429) {
        const resetInSeconds = err.details?.resetInSeconds || err.details?.retryAfter || 86400;
        const hours = Math.ceil(resetInSeconds / 3600);
        setError(`Daily ticket creation limit reached (5 tickets per day). Please try again in ${hours} hour${hours !== 1 ? 's' : ''}.`);
      } else {
        setError(
          err instanceof Error 
            ? err.message 
            : 'Failed to create ticket. Please try again or contact support@javelina.com.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    // Reset form state after close animation completes
    setTimeout(() => {
      setSubject(DEFAULT_SUBJECT);
      setDescription(formatDescription(conversationSummary));
      setError(null);
      setSuccess(false);
    }, 300);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Create Support Ticket"
      subtitle="Our team will review your request and get back to you shortly"
      size="large"
    >
      {success ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ticket Created Successfully
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Our support team has received your request and will reach out shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Subject Field */}
          <div>
            <label
              htmlFor="ticket-subject"
              className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
            >
              Subject
            </label>
            <input
              id="ticket-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange transition-all"
              placeholder="Enter a brief subject for your ticket"
              required
              disabled={loading}
            />
          </div>

          {/* Description Field */}
          <div>
            <label
              htmlFor="ticket-description"
              className="block text-sm font-medium text-gray-900 dark:text-white mb-2"
            >
              Description
            </label>
            <textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-light dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange transition-all resize-y"
              placeholder="Provide details about your issue"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Please provide as much detail as possible to help us assist you better.
            </p>
          </div>

          {/* Technical Details (Collapsible) */}
          {(snapshot || sessionId || orgId) && (
            <div className="border border-gray-light dark:border-gray-600 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Technical Details
                </span>
                <svg
                  className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform ${
                    showTechnicalDetails ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showTechnicalDetails && (
                <div className="p-4 bg-white dark:bg-gray-900">
                  <div className="space-y-3">
                    {sessionId && (
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Session ID
                        </span>
                        <p className="text-sm text-gray-900 dark:text-white font-mono mt-1">
                          {sessionId}
                        </p>
                      </div>
                    )}

                    {orgId && (
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          Organization ID
                        </span>
                        <p className="text-sm text-gray-900 dark:text-white font-mono mt-1">
                          {orgId}
                        </p>
                      </div>
                    )}

                    {snapshot && (
                      <div>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                          App Snapshot
                        </span>
                        <pre className="text-xs text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-800 p-3 rounded-lg mt-1 overflow-x-auto max-h-48 overflow-y-auto">
                          {JSON.stringify(snapshot, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                    These technical details will be automatically included with your ticket to help our team diagnose issues faster.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-red-800 dark:text-red-300">
                    Error Creating Ticket
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-electric hover:bg-blue-teal focus:ring-blue-electric rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-sm font-medium text-white bg-orange hover:bg-orange-dark rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Creating Ticket...</span>
                </>
              ) : (
                <span>Create Ticket</span>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
