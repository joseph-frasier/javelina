/**
 * Support Chat System Types
 * 
 * Shared TypeScript interfaces for the AI-powered support chat system.
 * These types are used across frontend components, API client, and backend.
 * 
 * Key Features:
 * - Chat sessions and messages with citations
 * - Knowledge base (KB) documents with RAG retrieval
 * - Support ticket escalation to Freshdesk
 * - App state snapshots for debugging
 * - Admin dashboard analytics
 * 
 * @see {@link /Users/andrewfrasier/Documents/GitHub/Javelina/SUPPORT_CHAT_BACKEND_REQUIREMENTS.md}
 * @see {@link /Users/andrewfrasier/Documents/GitHub/Javelina/supabase/migrations/20260127000000_support_chat_system.sql}
 */

// ============================================================================
// APP SNAPSHOT TYPES
// ============================================================================

/**
 * Captures UI state for debugging support escalations
 * Sanitized by backend to remove PII before storage
 */
export interface AppSnapshot {
  route: string;                      // Current route (e.g., '/zone/example.com')
  view: string;                       // Component name (e.g., 'ZoneDetails')
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
    invoice_id?: string;
  };
  user_action?: string;               // Last action (e.g., 'clicked_add_record')
  errors?: Array<{
    code: string;
    field?: string;
    message: string;
  }>;
  network_errors?: Array<{
    request_id?: string;
    endpoint?: string;
    status_code?: number;
    error_message?: string;
  }>;
}

/**
 * Stored app snapshot (includes metadata)
 */
export interface StoredAppSnapshot extends AppSnapshot {
  id: string;
  user_id: string;
  org_id: string | null;
  created_at: string;
  retention_expires_at: string | null;
}

// ============================================================================
// CHAT SESSION TYPES
// ============================================================================

/**
 * Support chat conversation
 */
export interface ChatSession {
  id: string;
  user_id: string;
  org_id: string | null;
  entry_point: 'chat_widget' | 'help_button' | 'error_page' | null;
  page_url: string | null;
  resolution_status: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  ticket_created: boolean;
  ticket_id: string | null;           // Freshdesk ticket ID if escalated
  attempt_count: number;
  created_at: string;
  last_message_at: string;
  retention_expires_at: string | null;
}

/**
 * Chat session with additional metadata (for admin dashboard)
 */
export interface SupportConversation extends ChatSession {
  message_count: number;              // Computed from join
  user_email?: string;                // Joined from auth.users
  org_name?: string;                  // Joined from organizations
}

// ============================================================================
// CHAT MESSAGE TYPES
// ============================================================================

/**
 * Individual message in a chat session
 */
export interface ChatMessage {
  id: string;
  session_id: string;
  user_id: string | null;
  org_id: string | null;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent: string | null;              // 'dns-zones', 'billing', 'troubleshooting', etc.
  confidence: number | null;          // 0.0 to 1.0
  failed_attempt: boolean;
  failure_reason: 'thumbs_down' | 'not_resolved' | 'low_confidence' | 'repeated_question' | 'timeout' | null;
  snapshot_id: string | null;
  response_time_ms: number | null;
  created_at: string;
}

/**
 * Chat message with citations (for admin dashboard)
 */
export interface SupportMessage extends ChatMessage {
  citations?: SupportCitation[];      // Joined from chat_message_citations
}

/**
 * Citation linking assistant response to KB document
 */
export interface ChatMessageCitation {
  id: string;
  message_id: string;
  kb_document_id: string;
  kb_chunk_id: string | null;
  confidence: number | null;          // Relevance score (0-1)
  created_at: string;
}

/**
 * Citation information returned in chat responses
 */
export interface SupportCitation {
  title: string;                      // Article title
  articleId: string;                  // Freshdesk or internal article ID
  javelinaUrl: string;                // Proxied URL for tracking clicks
  confidence: number;                 // Relevance score (0.0 to 1.0)
  lastUpdated: string;                // ISO 8601 timestamp
}

// ============================================================================
// CHAT FEEDBACK TYPES
// ============================================================================

/**
 * User feedback on chat response quality
 */
export interface ChatFeedback {
  id: string;
  message_id: string;
  session_id: string;
  user_id: string;
  org_id: string | null;
  rating: 'thumbs_up' | 'thumbs_down' | null;
  resolved: boolean | null;
  reason_code: 'irrelevant' | 'incorrect' | 'too_long' | 'missing_steps' | 'doc_link_broken' | 'helpful' | 'clear' | null;
  comment: string | null;
  created_at: string;
}

// ============================================================================
// KNOWLEDGE BASE TYPES
// ============================================================================

/**
 * Knowledge base document (article source)
 */
export interface KBDocument {
  id: string;
  org_id: string | null;              // NULL = global doc, non-NULL = org-specific
  source: 'freshdesk' | 'internal_markdown' | 'notion' | 'google_docs';
  external_id: string | null;         // Source system ID (e.g., Freshdesk article ID)
  title: string;
  url: string | null;                 // Original source URL
  javelina_url: string | null;        // Mapped Javelina proxy URL
  summary: string | null;
  content: string | null;             // Full article content
  visibility: 'all' | 'admin' | 'billing_contact';
  is_stale: boolean;                  // Auto-computed: true if not updated in 90 days
  last_updated_at: string;
  last_verified_at: string | null;    // Manual review timestamp
  created_at: string;
  updated_at: string;
}

/**
 * Document chunk with vector embedding for semantic search
 */
export interface KBChunk {
  id: string;
  document_id: string;
  org_id: string | null;              // Inherited from parent document
  chunk_index: number;                // Sequence number within document
  chunk_text: string;
  embedding: number[] | null;         // Vector embedding (1536 dimensions)
  tokens: number | null;              // Token count for the chunk
  created_at: string;
}

// ============================================================================
// SUPPORT TICKET TYPES
// ============================================================================

/**
 * Support ticket (escalated conversation)
 */
export interface SupportTicket {
  id: string;
  session_id: string | null;          // Originating chat session
  user_id: string;
  org_id: string;
  freshdesk_ticket_id: number | null; // Freshdesk ticket ID
  freshdesk_ticket_url: string | null; // Direct link to Freshdesk ticket
  subject: string;
  description: string;
  status: 'pending' | 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
}

/**
 * Freshdesk contact mapping
 */
export interface FreshdeskContact {
  id: string;
  user_id: string;
  org_id: string;
  freshdesk_contact_id: number;       // Freshdesk contact ID
  email: string;
  synced_at: string;                  // Last sync with Freshdesk
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request payload for POST /api/support/chat
 */
export interface ChatRequest {
  message: string;                    // User's message (max 2000 chars)
  conversationId?: string;            // Existing conversation UUID (optional for first message)
  entryPoint?: 'chat_widget' | 'help_button' | 'error_page';
  pageUrl?: string;                   // Current page URL for context
  userId: string;                     // Supabase auth user ID
  orgId?: string;                     // Organization ID (if in org context)
  tier?: 'starter' | 'pro' | 'business';
  attemptCount?: number;              // Number of failed resolution attempts (default: 0)
  snapshot?: AppSnapshot;             // UI state snapshot (sanitized by backend)
}

/**
 * Response payload for POST /api/support/chat
 */
export interface ChatResponse {
  reply: string;                      // AI-generated response (plain text, max 1000 chars)
  citations: SupportCitation[];       // KB articles used for response
  intent: string;                     // Classified intent (e.g., 'dns-records', 'billing')
  resolution: {
    needsConfirmation: boolean;       // Whether to show "Was this solved?" buttons
  };
  nextAction: {
    type: 'none' | 'ask_clarifying' | 'offer_ticket' | 'log_bug';
    reason: string;                   // Explanation for the action type
  };
  conversationId: string;             // UUID of conversation (new or existing)
}

/**
 * Request payload for POST /api/support/feedback
 */
export interface FeedbackRequest {
  conversationId: string;             // UUID of conversation
  resolved: boolean;                  // Whether issue was resolved
  rating?: number;                    // 1-5 star rating (optional)
  comment?: string;                   // User feedback text (optional, max 500 chars)
  userId: string;                     // Supabase auth user ID
  orgId?: string;                     // Organization ID
  tier?: string;                      // User's subscription tier
}

/**
 * Response payload for POST /api/support/feedback
 */
export interface FeedbackResponse {
  success: boolean;
  message: string;
}

/**
 * Request payload for POST /api/support/log-bug
 */
export interface LogBugRequest {
  subject: string;                    // Ticket subject (max 200 chars)
  description: string;                // Ticket description (max 5000 chars)
  page_url: string;                   // URL where issue occurred
  user_id: string;                    // Supabase auth user ID
  conversationId?: string;            // Link to chat session (optional)
  priority?: 1 | 2 | 3 | 4;          // 1=low, 2=medium, 3=high, 4=urgent (default: 2)
}

/**
 * Response payload for POST /api/support/log-bug
 */
export interface LogBugResponse {
  success: boolean;
  ticket_id: string;                  // Freshdesk ticket ID
  ticket_url?: string;                // Direct link to ticket
  message: string;
}

// ============================================================================
// ADMIN DASHBOARD TYPES
// ============================================================================

/**
 * Request parameters for GET /api/support/admin/conversations
 */
export interface GetConversationsRequest {
  days?: number;                      // Filter by last N days (default: 7)
  status?: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  orgId?: string;                     // Filter by organization
  page?: number;                      // Pagination (default: 1)
  limit?: number;                     // Results per page (default: 50, max: 100)
}

/**
 * Response payload for GET /api/support/admin/conversations
 */
export interface ConversationsResponse {
  conversations: SupportConversation[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Request parameters for GET /api/support/admin/metrics
 */
export interface GetMetricsRequest {
  start_date?: string;                // ISO 8601 date (default: 30 days ago)
  end_date?: string;                  // ISO 8601 date (default: today)
  orgId?: string;                     // Filter by organization (optional)
}

/**
 * Response payload for GET /api/support/admin/metrics
 */
export interface MetricsResponse {
  period: {
    start_date: string;
    end_date: string;
    days: number;
  };
  totals: {
    conversations: number;
    messages: number;
    unique_users: number;
  };
  resolution: {
    resolved: number;
    escalated: number;
    abandoned: number;
    pending: number;
    resolution_rate: number;          // Percentage (0-100)
    deflection_rate: number;          // Resolved without ticket %
  };
  feedback: {
    total_ratings: number;
    avg_rating: number;               // 0.0 to 1.0
    thumbs_up: number;
    thumbs_down: number;
    thumbs_up_rate: number;           // Percentage
  };
  performance: {
    avg_response_time_ms: number;
    avg_messages_per_conversation: number;
    avg_session_duration_seconds: number;
  };
  top_intents: Array<{
    intent: string;
    count: number;
    percentage: number;
  }>;
  by_tier: Record<string, {
    conversations: number;
    resolution_rate: number;
  }>;
  by_entry_point: Record<string, number>;
}

/**
 * Response payload for GET /api/support/admin/conversation/:id
 */
export interface ConversationDetailResponse {
  conversation: SupportConversation;  // Same as in /conversations
  messages: SupportMessage[];
  feedback: ChatFeedback[];
  snapshot?: AppSnapshot;              // Latest snapshot if available
  ticket?: {
    id: string;
    freshdesk_ticket_id: string;
    freshdesk_ticket_url: string;
    status: string;
    created_at: string;
  };
}

// ============================================================================
// ERROR RESPONSE TYPES
// ============================================================================

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: string;                      // Short error name
  message: string;                    // Human-readable description
  code: string;                       // Machine-readable error code
  details?: any;                      // Additional context (optional)
  retryAfter?: number;                // Seconds until retry (for 429)
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Subscription tier types
 */
export type SubscriptionTier = 'starter' | 'pro' | 'business';

/**
 * Chat intent categories
 */
export type ChatIntent = 
  | 'dns-zones' 
  | 'dns-records' 
  | 'billing' 
  | 'troubleshooting' 
  | 'general' 
  | 'account' 
  | 'organization' 
  | 'team-management';

/**
 * Entry point for support chat
 */
export type ChatEntryPoint = 'chat_widget' | 'help_button' | 'error_page';

/**
 * Resolution status for chat sessions
 */
export type ResolutionStatus = 'pending' | 'resolved' | 'escalated' | 'abandoned';

/**
 * Ticket status
 */
export type TicketStatus = 'pending' | 'open' | 'in_progress' | 'resolved' | 'closed';

/**
 * Ticket priority
 */
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
