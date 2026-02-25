'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/lib/auth-store';
import { supportApi, zonesApi, type SupportChatResponse, type SupportCitation, ApiError } from '@/lib/api-client';
import { TicketCreationModal } from '@/components/support/TicketCreationModal';
import { isJavelinaDomainUrl } from '@/lib/support/citation-mapper';
import type { AppSnapshot } from '@/types/support';

const MAX_MESSAGE_LENGTH = 2000;

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

const INLINE_MARKDOWN_REGEX = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
const CODE_BLOCK_REGEX = /```([\w-]+)?\n?([\s\S]*?)```/g;

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const parts = text.split(INLINE_MARKDOWN_REGEX);
  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code key={key} className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-xs font-mono">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (
      ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) &&
      part.length >= 4
    ) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (
      ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) &&
      part.length >= 2
    ) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <span key={key}>{part}</span>;
  });
}

function renderMarkdownText(text: string, keyPrefix: string): ReactNode[] {
  return text.split('\n').map((line, idx) => {
    const key = `${keyPrefix}-line-${idx}`;
    if (!line.trim()) return <div key={key} className="h-2" />;

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      return (
        <p key={key} className="font-semibold">
          {renderInlineMarkdown(headingMatch[2], `${key}-heading`)}
        </p>
      );
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      return (
        <p key={key} className="pl-4">
          <span aria-hidden="true">• </span>
          {renderInlineMarkdown(unorderedMatch[1], `${key}-ul`)}
        </p>
      );
    }

    const orderedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (orderedMatch) {
      return (
        <p key={key} className="pl-4">
          <span>{orderedMatch[1]}. </span>
          {renderInlineMarkdown(orderedMatch[2], `${key}-ol`)}
        </p>
      );
    }

    return <p key={key}>{renderInlineMarkdown(line, `${key}-p`)}</p>;
  });
}

function renderAssistantMessage(content: string): ReactNode {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let blockIndex = 0;
  CODE_BLOCK_REGEX.lastIndex = 0;

  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index);
      nodes.push(
        <div key={`text-${blockIndex}`} className="space-y-1">
          {renderMarkdownText(text, `text-${blockIndex}`)}
        </div>
      );
    }

    const code = match[2] || '';
    nodes.push(
      <pre
        key={`code-${blockIndex}`}
        className="overflow-x-auto rounded-lg bg-gray-900 text-gray-100 p-3 text-xs font-mono"
      >
        <code>{code}</code>
      </pre>
    );

    lastIndex = CODE_BLOCK_REGEX.lastIndex;
    blockIndex += 1;
  }

  if (lastIndex < content.length) {
    nodes.push(
      <div key={`text-tail-${blockIndex}`} className="space-y-1">
        {renderMarkdownText(content.slice(lastIndex), `text-tail-${blockIndex}`)}
      </div>
    );
  }

  return <div className="text-sm text-gray-900 dark:text-white">{nodes}</div>;
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    ((error as { name?: string } | null)?.name === 'AbortError')
  );
}

export function ChatWindow({ isOpen, onClose, orgId, tier, entryPoint }: ChatWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [shouldRender, setShouldRender] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [attemptCount, setAttemptCount] = useState(0);
  const [showEscalation, setShowEscalation] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [zoneContext, setZoneContext] = useState<{ zoneId: string; zoneName: string } | null>(null);
  const pathname = usePathname();
  const { user, isAuthenticated } = useAuthStore();

  // Fetch zone name when on a zone page so AI can use domain (e.g., arrakis.com) instead of ID
  useEffect(() => {
    if (!pathname) return;
    const zoneMatch = pathname.match(/\/zone\/([^\/]+)/);
    if (!zoneMatch) {
      setZoneContext(null);
      return;
    }
    const zoneId = zoneMatch[1];
    zonesApi
      .get(zoneId)
      .then((zone: { id: string; name: string }) => {
        setZoneContext({ zoneId: zone.id, zoneName: zone.name });
      })
      .catch(() => setZoneContext({ zoneId, zoneName: zoneId })); // Fallback to ID if fetch fails
  }, [pathname]);

  const captureSnapshot = (): AppSnapshot => {
    const route = typeof window !== 'undefined' ? window.location.pathname : '';
    const searchParams = typeof window !== 'undefined' ?
      new URLSearchParams(window.location.search) : new URLSearchParams();

    // Derive view from route so AI accurately describes the page
    let view = 'ChatWindow';
    if (route.match(/^\/(?:org|organization)\/[^/]+$/)) view = 'OrgDashboard';
    else if (route.match(/^\/zone\/[^/]+/)) view = 'ZoneDetail';
    else if (route.startsWith('/settings')) view = 'Settings';
    else if (route.startsWith('/profile')) view = 'Profile';
    else if (route.startsWith('/admin')) view = 'Admin';

    // Detect theme correctly - check for theme-dark class or localStorage
    let theme: 'light' | 'dark' = 'light';
    if (typeof window !== 'undefined') {
      if (document.documentElement.classList.contains('theme-dark')) {
        theme = 'dark';
      } else if (document.documentElement.classList.contains('theme-light')) {
        theme = 'light';
      } else {
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
      route,
      view,
      ui_state: {
        theme,
        tab: searchParams.get('tab') || undefined,
        filter: searchParams.get('filter') || undefined,
      },
      entities_on_screen: {
        org_id: orgId ?? undefined,
        zone_id: zoneContext?.zoneId ?? null,
        zone_name: zoneContext?.zoneName ?? null,
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

  // Auto-scroll to bottom when new messages arrive (only if user is already near bottom)
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is at bottom before auto-scrolling
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 100; // 100px threshold

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }
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

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isOpen && abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
    }

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!user) return;
    if (loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    const assistantMsgId = (Date.now() + 1).toString();

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');

    // Prepare a placeholder assistant message for progressive streaming
    // Note: We don't set loading=true here because the placeholder itself
    // indicates Javi is responding. The loading state would show a duplicate bubble.
    const placeholderMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, placeholderMsg]);
    setLoading(true);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const snapshot = captureSnapshot();

      await supportApi.chatStream(
        {
          message: inputValue,
          conversationId,
          entryPoint: entryPoint || 'chat_widget',
          pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          userId: user.id,
          orgId,
          tier,
          attemptCount,
          snapshot,
        },
        // onDelta: progressively append text to the placeholder message
        (text) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId ? { ...m, content: m.content + text } : m
            )
          );
        },
        // onMetadata: attach citations, intent, nextAction to the message
        (metadata) => {
          const nextAction = {
            type: (metadata.nextAction || 'none') as SupportChatResponse['nextAction']['type'],
            reason: '',
          };

          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? {
                    ...m,
                    citations: metadata.citations,
                    nextAction,
                    resolutionNeeded: metadata.confidence < 0.9,
                  }
                : m
            )
          );

          if (nextAction.type === 'log_bug' || nextAction.type === 'offer_ticket') {
            setShowEscalation(true);
          }
          if (nextAction.type === 'ask_clarifying') {
            setAttemptCount(prev => prev + 1);
          } else {
            setAttemptCount(0);
          }
        },
        // onDone: update conversationId
        (info) => {
          if (info.conversationId) {
            setConversationId(info.conversationId);
          }
        },
        // onError
        (err) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMsgId
                ? { ...m, content: err.message || "I'm sorry, something went wrong." }
                : m
            )
          );
        },
        abortController.signal,
      );
    } catch (error) {
      if (isAbortError(error)) {
        setMessages(prev =>
          prev.filter(m => !(m.id === assistantMsgId && !m.content))
        );
        return;
      }

      let errorContent = "I'm sorry, I encountered an error. Please try again or contact support directly.";

      if (error instanceof ApiError) {
        if (error.statusCode === 429) {
          const resetInSeconds = error.details?.resetInSeconds || error.details?.retryAfter || 60;
          const minutes = Math.ceil(resetInSeconds / 60);
          errorContent = `You've reached the rate limit for chat messages. Please try again in ${minutes} minute${minutes !== 1 ? 's' : ''}.`;
        } else {
          // Surface backend/auth errors so we can debug (e.g. 401, 500)
          errorContent = error.message || errorContent;
        }
      }
      if (process.env.NODE_ENV === 'development' && error) {
        console.error('[ChatWindow] support chat stream error:', error);
      }

      // Update the placeholder message with the error
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId ? { ...m, content: m.content || errorContent } : m
        )
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleCreateTicket = () => {
    if (!user) return;

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea as user types
  useEffect(() => {
    const textarea = inputRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 176)}px`;
  }, [inputValue]);

  const lastUserMessage = messages.filter((m) => m.role === 'user').pop()?.content;
  const initialSubject = lastUserMessage?.substring(0, 60).trim() || 'Support Request from Chat';

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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-sm">J</span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-none px-4 py-3">
                    {renderAssistantMessage(message.content)}
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Sources:</p>
                        <div className="space-y-2">
                          {message.citations.map((citation, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              {isJavelinaDomainUrl(citation.javelinaUrl) ? (
                                <a
                                  href={citation.javelinaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange hover:text-orange-dark dark:text-orange-light dark:hover:text-orange underline"
                                >
                                  {citation.title}
                                </a>
                              ) : (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {citation.title}
                                </span>
                              )}
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

                  {/* Create Ticket button only - feedback buttons removed for now */}
                  {showEscalation && message.nextAction?.type === 'offer_ticket' && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={handleCreateTicket}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-orange hover:bg-orange-dark rounded-lg transition-colors"
                      >
                        Create Ticket
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

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-light dark:border-gray-600">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            className="w-full resize-none pr-12 px-4 py-4 min-h-[4.5rem] rounded-2xl border border-gray-light dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-orange transition-all text-sm overflow-y-auto"
            style={{ maxHeight: '11rem' }}
            disabled={loading || !isAuthenticated || !user}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim() || inputValue.length > MAX_MESSAGE_LENGTH || !isAuthenticated || !user}
            className="absolute bottom-4 right-3 w-8 h-8 bg-orange hover:bg-orange-dark rounded-full flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Send message"
          >
            <svg
              className="w-4 h-4 text-white"
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
        <p className={`mt-1.5 text-right text-xs ${inputValue.length >= MAX_MESSAGE_LENGTH ? 'text-orange font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
          {inputValue.length} / {MAX_MESSAGE_LENGTH}
        </p>
      </div>

      {/* Ticket Creation Modal */}
      {user && (
        <TicketCreationModal
          isOpen={isTicketModalOpen}
          onClose={handleTicketModalClose}
          onSuccess={handleTicketSuccess}
          conversationSummary={conversationSummary}
          initialSubject={initialSubject}
          snapshot={captureSnapshot()}
          sessionId={conversationId}
          userId={user.id}
          orgId={orgId}
        />
      )}
    </div>
  );
}
