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
      className={`fixed bottom-20 right-4 sm:bottom-24 sm:right-6 w-[calc(100vw-2rem)] sm:w-[400px] h-[580px] max-h-[calc(100vh-8rem)] overflow-hidden rounded-[24px] border border-gray-light bg-white text-orange-dark shadow-[0_24px_60px_rgba(15,23,42,0.16)] dark:border-white/10 dark:bg-[#0b0f14] dark:text-white dark:shadow-[0_30px_90px_rgba(0,0,0,0.45)] flex flex-col z-50 transition-opacity duration-200 ${isTicketModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,114,21,0.08),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,176,255,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(239,114,21,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(0,176,255,0.14),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent dark:via-white/40" />

      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-gray-light px-5 py-4 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange/20 bg-orange/10 dark:bg-orange/15">
            <span className="text-sm font-bold text-orange">J</span>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-blue-electric/90">
              Support Assistant
            </p>
            <h3 className="mt-1 text-[1.1rem] font-semibold tracking-tight text-orange-dark dark:text-[#fff3ea]">Javi</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-light bg-white/80 text-gray-slate transition-colors hover:border-gray-slate/30 hover:bg-gray-50 hover:text-orange-dark dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-white/20 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Close chat"
        >
          <svg
            className="h-5 w-5"
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
      <div ref={messagesContainerRef} className="relative flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,rgba(239,114,21,0.03),rgba(255,255,255,0))] p-5 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
        {messages.map((message) => (
          <div key={message.id}>
            {message.role === 'assistant' ? (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-orange/20 bg-orange/10 dark:bg-orange/15">
                  <span className="text-sm font-bold text-orange">J</span>
                </div>
                <div className="flex-1">
                  <div className="rounded-[20px] rounded-tl-[6px] border border-gray-light bg-white px-4 py-3 text-gray-slate shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-white/85 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    {renderAssistantMessage(message.content)}
                    
                    {/* Citations */}
                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 border-t border-gray-light pt-3 dark:border-white/10">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-slate dark:text-white/45">Sources</p>
                        <div className="space-y-2">
                          {message.citations.map((citation, idx) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              {isJavelinaDomainUrl(citation.javelinaUrl) ? (
                                <a
                                  href={citation.javelinaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-orange underline hover:text-[#ff9b54]"
                                >
                                  {citation.title}
                                </a>
                              ) : (
                                <span className="text-xs text-gray-slate dark:text-white/55">
                                  {citation.title}
                                </span>
                              )}
                              {citation.lastUpdated && (
                                <span className="text-[10px] text-gray-slate/70 dark:text-white/35">
                                  Updated {formatDistanceToNow(new Date(citation.lastUpdated), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ticket escalation button */}
                  {showEscalation && (message.nextAction?.type === 'offer_ticket' || message.nextAction?.type === 'log_bug') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={handleCreateTicket}
                        className="rounded-full border border-orange/30 bg-orange px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-dark"
                      >
                        Create Ticket
                      </button>
                    </div>
                  )}

                  <p className="mt-1 ml-1 text-xs text-gray-slate/70 dark:text-white/35">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 justify-end">
                <div className="flex-1 flex flex-col items-end">
                  <div className="max-w-[85%] rounded-[20px] rounded-tr-[6px] bg-gradient-to-br from-orange to-[#c65d10] px-4 py-3 text-white shadow-[0_18px_40px_rgba(239,114,21,0.28)]">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  <p className="mt-1 mr-1 text-xs text-gray-slate/70 dark:text-white/35">
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
      <div className="relative border-t border-gray-light bg-gray-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            maxLength={MAX_MESSAGE_LENGTH}
            rows={2}
            className="min-h-[4.75rem] w-full resize-none overflow-y-auto rounded-[22px] border border-gray-light bg-white px-4 py-4 pr-14 text-sm text-orange-dark placeholder:text-gray-slate/50 transition-all focus:outline-none focus:ring-2 focus:ring-orange dark:border-blue-electric/20 dark:bg-[#071633] dark:text-white dark:placeholder:text-white/30"
            style={{ maxHeight: '11rem' }}
            disabled={loading || !isAuthenticated || !user}
          />
          <button
            onClick={handleSend}
            disabled={loading || !inputValue.trim() || inputValue.length > MAX_MESSAGE_LENGTH || !isAuthenticated || !user}
            className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange transition-colors hover:bg-orange-dark focus:outline-none focus:ring-2 focus:ring-orange focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-[#071633]"
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
        <p className={`mt-2 text-right text-xs ${inputValue.length >= MAX_MESSAGE_LENGTH ? 'font-medium text-orange' : 'text-gray-slate/70 dark:text-white/35'}`}>
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
