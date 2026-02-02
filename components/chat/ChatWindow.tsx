'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { formatDistanceToNow } from 'date-fns';
import { useUser } from '@/lib/hooks/useUser';
import { supportApi, type SupportChatResponse, type SupportCitation, ApiError } from '@/lib/api-client';
import { isMockMode, mockChat, mockSubmitFeedback, mockLogBug } from '@/lib/support/mock-support-api';
import { TicketCreationModal } from '@/components/support/TicketCreationModal';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  orgId?: string;
  tier?: string;
  entryPoint?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  citations?: SupportCitation[];
  nextAction?: SupportChatResponse['nextAction'];
  resolutionNeeded?: boolean;
}

interface AppSnapshot {
  route: string;
  view: string;
  ui_state: {
    theme?: 'light' | 'dark';
    modal_open?: boolean;
    tab?: string;
    filter?: string;
    sort?: string;
    search_query?: string;
  };
  entities_on_screen: {
    org_id?: string;
    zone_id?: string;
    record_id?: string;
    user_id?: string;
  };
  user_action?: string;
  errors?: Array<{
    code: string;
    field?: string;
    message: string;
  }>;
}

export function ChatWindow({ isOpen, onClose, orgId, tier, entryPoint }: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [attemptCount, setAttemptCount] = useState(0);
  const [showEscalation, setShowEscalation] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const { user } = useUser();

  const captureSnapshot = (): AppSnapshot => {
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = typeof window !== 'undefined' ? 
      new URLSearchParams(window.location.search) : new URLSearchParams();

    // Detect theme correctly - check for theme-dark class or localStorage
    let theme: 'light' | 'dark' = 'light';
    if (typeof window !== 'undefined') {
      if (document.documentElement.classList.contains('theme-dark')) {
        theme = 'dark';
      } else if (document.documentElement.classList.contains('theme-light')) {
        theme = 'light';
      } else {
        // Fallback to localStorage if class not found
        try {
          const stored = localStorage.getItem('javelina:theme');
          if (stored === 'dark' || stored === 'light') {
            theme = stored as 'light' | 'dark';
          }
        } catch (e) {
          // localStorage might not be available
        }
      }
    }

    return {
      route: pathname,
      view: 'ChatWindow',
      ui_state: {
        theme,
        tab: searchParams.get('tab') || undefined,
        filter: searchParams.get('filter') || undefined,
      },
      entities_on_screen: {
        org_id: orgId,
        user_id: user?.id,
      },
    };
  };

  // Handle shouldRender state
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Add welcome message on first open
      if (messages.length === 0) {
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: "Hi! I'm Javi, your Javelina support assistant. I'm here to help you with DNS management, zones, records, and anything else related to Javelina. How can I assist you today?",
          timestamp: new Date(),
        }]);
      }
    }
  }, [isOpen, messages.length]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle click outside (but NOT when ticket modal is open)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Don't close if ticket modal is open
      if (isTicketModalOpen) return;
      
      if (windowRef.current && !windowRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, isTicketModalOpen]);

  // GSAP animations
  useGSAP(() => {
    if (!windowRef.current) return;

    if (isOpen && shouldRender) {
      // Animate in: slide up + fade + scale
      gsap.fromTo(
        windowRef.current,
        {
          y: 40,
          opacity: 0,
          scale: 0.9,
        },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.4,
          ease: 'power3.out',
        }
      );
    } else if (!isOpen && shouldRender) {
      // Animate out: slide down + fade + scale
      gsap.to(windowRef.current, {
        y: 20,
        opacity: 0,
        scale: 0.95,
        duration: 0.25,
        ease: 'power2.in',
        onComplete: () => setShouldRender(false),
      });
    }
  }, [isOpen, shouldRender]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    // Allow mock mode without user for testing
    if (!user && !isMockMode()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Capture current app state snapshot
      const snapshot = captureSnapshot();

      // Use mock API if enabled, otherwise use real API
      const response = isMockMode() 
        ? await mockChat({
            message: inputValue,
            conversationId,
            attemptCount,
          })
        : await supportApi.chat({
            message: inputValue,
            conversationId,
            entryPoint: entryPoint || 'chat_widget',
            pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
            userId: user!.id,
            orgId,
            tier,
            attemptCount,
            snapshot,
          });

      // Update conversation ID if provided
      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
        citations: response.citations,
        nextAction: response.nextAction,
        resolutionNeeded: response.resolution.needsConfirmation,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle escalation scenarios
      if (response.nextAction.type === 'log_bug' || response.nextAction.type === 'offer_ticket') {
        setShowEscalation(true);
      }

      // Increment attempt count if clarifying
      if (response.nextAction.type === 'ask_clarifying') {
        setAttemptCount(prev => prev + 1);
      } else {
        setAttemptCount(0); // Reset on successful resolution path
      }
    } catch (error) {
      // Handle rate limit errors specially
      let errorContent = "I'm sorry, I encountered an error. Please try again or contact support directly.";
      
      if (error instanceof ApiError && error.statusCode === 429) {
        const resetInSeconds = error.details?.resetInSeconds || error.details?.retryAfter || 60;
        const minutes = Math.ceil(resetInSeconds / 60);
        errorContent = `You've reached the rate limit for chat messages. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
      }
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleResolutionResponse = async (resolved: boolean) => {
    if (!conversationId) return;
    if (!user && !isMockMode()) return;

    try {
      // Use mock API if enabled, otherwise use real API
      if (isMockMode()) {
        await mockSubmitFeedback({
          conversationId,
          resolved,
        });
      } else {
        await supportApi.submitFeedback({
          conversationId,
          resolved,
          userId: user!.id,
          orgId,
          tier,
        });
      }

      if (resolved) {
        const thankYouMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Great! I'm glad I could help. Is there anything else you need assistance with?",
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, thankYouMessage]);
      } else {
        setAttemptCount(prev => prev + 1);
        if (attemptCount >= 1) {
          // After 2 attempts, escalate
          setShowEscalation(true);
          const escalationMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I understand this hasn't fully resolved your issue. Would you like me to create a support ticket so our team can help you directly?",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, escalationMessage]);
        } else {
          const clarifyMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: "I understand. Can you provide more details about what you're trying to do?",
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, clarifyMessage]);
        }
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const handleCreateTicket = () => {
    if (!user && !isMockMode()) return;

    // Generate conversation summary from messages
    const summary = messages
      .map(m => {
        const role = m.role === 'user' ? 'User' : 'Assistant';
        return `${role}: ${m.content}`;
      })
      .join('\n\n');

    setConversationSummary(summary);
    setIsTicketModalOpen(true);
    // DO NOT call onClose() - it would unmount the modal too!
  };

  const handleTicketModalClose = () => {
    setIsTicketModalOpen(false);
    setShowEscalation(false);
  };

  const handleTicketSuccess = () => {
    setIsTicketModalOpen(false);
    setShowEscalation(false);
    
    // Add confirmation message after successful ticket creation
    const confirmMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "I've created a support ticket for you. Our team will reach out shortly. In the meantime, is there anything else I can help you with?",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, confirmMessage]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!shouldRender) return null;

  return (
    <div
      ref={windowRef}
      className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-2rem)] sm:w-[380px] h-[550px] max-h-[calc(100vh-8rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-light dark:border-gray-600 flex flex-col z-50 transition-opacity duration-200 ${isTicketModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-light dark:border-gray-600">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">J</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Javi</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Support Assistant</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close chat"
        >
          <svg
            className="w-5 h-5 text-gray-500 dark:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">J</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
                    <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Sources:</p>
                        <div className="space-y-2">
                          {message.citations.map((citation, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <a
                                href={citation.javelinaUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange hover:text-orange-dark dark:text-orange-light dark:hover:text-orange underline"
                              >
                                {citation.title}
                              </a>
                              {citation.lastUpdated && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-500">
                                  Updated {formatDistanceToNow(new Date(citation.lastUpdated), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resolution Buttons */}
                  {message.resolutionNeeded && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleResolutionResponse(true)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      >
                        Yes, resolved
                      </button>
                      <button
                        onClick={() => handleResolutionResponse(false)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
                      >
                        Not yet
                      </button>
                    </div>
                  )}

                  {/* Escalation Options */}
                  {showEscalation && message.nextAction?.type === 'offer_ticket' && (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={handleCreateTicket}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-orange hover:bg-orange-dark rounded-lg transition-colors"
                      >
                        Create Ticket
                      </button>
                      <button
                        onClick={() => setShowEscalation(false)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg transition-colors"
                      >
                        Continue chatting
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 justify-end">
                <div className="flex-1 flex flex-col items-end">
                  <div className="bg-orange text-white rounded-2xl rounded-tr-none px-4 py-3 max-w-[85%]">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">J</span>
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-light dark:border-gray-600">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isMockMode() ? "Type a message... (DEMO MODE)" : "Type a message..."}
            className="flex-1 px-4 py-2.5 rounded-full border border-gray-light dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-all text-sm"
            disabled={loading || (!user && !isMockMode())}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim() || (!user && !isMockMode())}
            className="w-10 h-10 bg-orange hover:bg-orange-dark rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Ticket Creation Modal */}
      {user && (
        <TicketCreationModal
          isOpen={isTicketModalOpen}
          onClose={handleTicketModalClose}
          onSuccess={handleTicketSuccess}
          conversationSummary={conversationSummary}
          snapshot={captureSnapshot()}
          sessionId={conversationId}
          userId={user.id}
          orgId={orgId}
        />
      )}
    </div>
  );
}

