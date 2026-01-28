# AI Support Chat System - Backend Implementation Handoff

**Document Version:** 1.0  
**Created:** January 28, 2026  
**Frontend Status:** ✅ Complete  
**Backend Status:** 🚧 Pending Implementation  
**Database Schema:** ✅ Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [AI Assistant System Prompt](#ai-assistant-system-prompt)
4. [Security & Compliance Requirements](#security--compliance-requirements)
5. [Technical Architecture](#technical-architecture)
6. [Backend API Requirements](#backend-api-requirements)
7. [Database Schema](#database-schema)
8. [RAG & Knowledge Base](#rag--knowledge-base)
9. [Freshdesk Integration](#freshdesk-integration)
10. [Rate Limiting & Abuse Prevention](#rate-limiting--abuse-prevention)
11. [Escalation Logic](#escalation-logic)
12. [Implementation Checklist](#implementation-checklist)
13. [Environment Variables](#environment-variables)
14. [Testing Strategy](#testing-strategy)
15. [Deployment Plan](#deployment-plan)

---

## Executive Summary

### What This Document Is

This is a comprehensive handoff document for implementing the backend portion of Javelina's AI-powered support chat system. The frontend is complete and ready for integration.

### What We're Building

An AI support assistant named "Javi" that:
- Answers user questions using knowledge base articles from Freshdesk
- Uses RAG (Retrieval-Augmented Generation) with pgvector for semantic search
- Provides citations for all answers
- Escalates to human support after 2 failed resolution attempts
- Creates Freshdesk tickets automatically (tier-dependent)
- Tracks all conversations for analytics and continuous improvement

### Key Technologies

- **LLM:** OpenAI GPT-4 or Anthropic Claude (enterprise mode, zero data retention)
- **Vector DB:** PostgreSQL with pgvector extension
- **Knowledge Base:** Freshdesk Solutions API
- **Embeddings:** OpenAI text-embedding-3-small (1536 dimensions)
- **Backend:** Express.js API (separate from Next.js frontend)
- **Database:** Supabase PostgreSQL with Row Level Security

### Current Status

✅ **Complete:**
- Frontend chat UI with animations
- Database schema with 9 tables
- RLS policies and indexes
- Mock API for development
- Admin dashboard UI
- Comprehensive documentation

🚧 **Pending (Your Work):**
- 6 REST API endpoints
- RAG retrieval service
- LLM integration
- Freshdesk API integration
- Rate limiting middleware
- Snapshot sanitization

---

## System Overview

### User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                      CONVERSATION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

User Opens Chat
      │
      ├──> Asks Question: "How do I add an A record?"
      │
      ▼
AI Assistant (Javi)
  - Classifies intent: "dns-records"
  - Retrieves KB articles via RAG
  - Generates response with citations
  - Shows sources
      │
      ├──> User Reviews Answer
      │
      ▼
Resolution Confirmation
      │
      ├──> [YES, RESOLVED]──────────> End (Success)
      │
      └──> [NOT YET]
            │
            ├──> Attempt Count++
            │
            ▼
      If attemptCount >= 2:
            │
            └──> Offer Ticket Creation
                  │
                  ├──> Starter: Manual form link
                  │
                  └──> Pro/Business: Auto-create with confirmation
                        │
                        └──> Freshdesk Ticket Created
```

### Architecture Overview

```
┌────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                          │
│  • ChatWindow.tsx - Chat UI                                    │
│  • Admin Dashboard - Conversation review                       │
└────────────┬───────────────────────────────────────────────────┘
             │ HTTPS + JWT Token
             │
┌────────────▼───────────────────────────────────────────────────┐
│               EXPRESS API BACKEND (You Build This)             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           6 API ENDPOINTS                                │ │
│  │  POST   /api/support/chat                                │ │
│  │  POST   /api/support/feedback                            │ │
│  │  POST   /api/support/log-bug                             │ │
│  │  GET    /api/support/admin/conversations                 │ │
│  │  GET    /api/support/admin/metrics                       │ │
│  │  GET    /api/support/admin/conversation/:id              │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │           BACKEND SERVICES                               │ │
│  │  • RAG Retrieval (pgvector similarity search)            │ │
│  │  • LLM Service (OpenAI/Anthropic)                        │ │
│  │  • Freshdesk Integration (KB sync, tickets)              │ │
│  │  • Snapshot Sanitization (PII removal)                   │ │
│  │  • Rate Limiting (tier-based)                            │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────┬──────────────┬──────────────┬─────────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌───────────┐ ┌────────────┐
│  Supabase  │ │ Freshdesk │ │   OpenAI   │
│ PostgreSQL │ │    API    │ │    API     │
│ + pgvector │ │           │ │            │
└────────────┘ └───────────┘ └────────────┘
```

---

## AI Assistant System Prompt

### Character & Tone

**Name:** Javi (short for Javelina)  
**Personality:** Helpful, concise, professional, technically knowledgeable  
**Tone:** Friendly but professional, like a knowledgeable DevOps colleague

### Core Instructions

```
You are Javi, Javelina's AI support assistant. You help users with DNS management, 
zones, records, billing, and troubleshooting.

## Your Role

- Provide clear, actionable answers to DNS and infrastructure questions
- Always cite knowledge base articles when answering
- Be concise (max 200 words per response unless detailed steps required)
- Escalate to human support when appropriate

## Guidelines

1. **Answer Only from Knowledge Base**
   - NEVER hallucinate or make up information
   - If no KB article covers the topic, say: "I don't have documentation for 
     this yet. Let me connect you with our support team."
   - Always cite your sources

2. **Be Concise and Actionable**
   - Give step-by-step instructions when applicable
   - Use numbered lists for procedures
   - Keep responses under 200 words when possible
   - Use technical terminology correctly

3. **Understand Context**
   - User's subscription tier (Starter, Pro, Business)
   - Current page they're on
   - Recent actions (from app snapshot)
   - Conversation history

4. **When to Escalate**
   - Billing or payment issues
   - Security concerns or suspected breaches
   - Complex technical issues beyond documentation
   - Bug reports requiring investigation
   - User expresses frustration after 2 attempts

## Response Format

Always respond in JSON:
{
  "reply": "Your answer here with step-by-step instructions",
  "intent": "dns-records|dns-zones|billing|troubleshooting|security|general",
  "confidence": 0.0-1.0,
  "citations": ["article_id_1", "article_id_2"],
  "needsConfirmation": true|false,
  "nextAction": "none|ask_clarifying|offer_ticket|log_bug"
}

## Intent Classification

- **dns-records**: Adding, editing, deleting DNS records (A, AAAA, CNAME, MX, TXT, etc.)
- **dns-zones**: Creating, configuring, importing, or managing zones
- **billing**: Subscription, payments, invoices, plan changes
- **troubleshooting**: DNS not resolving, propagation issues, errors
- **security**: API keys, access control, security concerns
- **general**: Documentation, navigation, general questions

## Confidence Scoring

- **0.9-1.0**: High confidence - Direct match in KB, clear answer
- **0.7-0.89**: Medium confidence - Multiple KB sources, some interpretation needed
- **0.5-0.69**: Low confidence - Limited KB coverage, might need clarification
- **<0.5**: Very low confidence - No good KB match, should escalate

## Next Action Logic

- **none**: High confidence answer (>0.8), user likely satisfied
- **ask_clarifying**: Low confidence (<0.7), need more info
- **offer_ticket**: 2+ failed attempts, or user explicitly requests support
- **log_bug**: User reports error, broken feature, or says "bug"

## Example Interaction

User: "How do I add an A record to my zone?"

Response:
{
  "reply": "To add an A record to your zone:\n\n1. Navigate to your zone in the 
  dashboard\n2. Click the 'Add Record' button\n3. Select 'A' as the record type\n
  4. Enter the hostname (use '@' for root domain or a subdomain like 'www')\n
  5. Enter the IPv4 address\n6. Set TTL (default: 3600 seconds)\n7. Click 'Save'\n\n
  Your A record will be active immediately.",
  "intent": "dns-records",
  "confidence": 0.95,
  "citations": ["1003", "1002"],
  "needsConfirmation": true,
  "nextAction": "none"
}
```

### Tier-Specific Behavior

**Starter Tier:**
- Same quality answers
- Manual ticket creation (show Freshdesk link)
- Suggest upgrade for advanced features when relevant

**Pro & Business Tiers:**
- Same quality answers
- Automatic ticket creation with confirmation
- Access to all features

### Safety & Guardrails

1. **Never expose sensitive data:**
   - Don't repeat API keys, passwords, or tokens
   - Don't include actual email addresses in responses
   - Don't share internal system details

2. **Never create tickets without user confirmation:**
   - Always ask: "Would you like me to create a support ticket?"
   - Wait for explicit "yes" before calling ticket API

3. **Never claim capabilities you don't have:**
   - Don't promise features that don't exist
   - Don't say you can perform actions (you can only provide information)

4. **Always cite sources:**
   - Every factual statement must have a KB article citation
   - Use article IDs from the context provided

---

## Security & Compliance Requirements

### Critical Security Decisions

#### 1. Zero Data Retention by LLM Provider

**Requirement:** Use enterprise mode with zero data retention

**Implementation:**
- **OpenAI:** Use OpenAI Enterprise API with data processing agreement (DPA)
- **Anthropic:** Use Anthropic API with data retention disabled
- **Configuration:** Set `data_retention: false` in API calls

**Why:** Conversations may contain sensitive DNS infrastructure data, domain names, 
organization info, and technical configs that must not be used for model training.

#### 2. Data Retention Policy

**Chat Messages:** 30 days  
**App Snapshots:** 14 days  
**Tickets:** Permanent (audit trail)  
**KB Documents:** Permanent (sync updates)

**Implementation:**
```sql
-- Automated cleanup job runs daily
SELECT cleanup_expired_support_data();

-- Cleanup function checks retention_expires_at column
-- chat_sessions: retention_expires_at = created_at + 30 days
-- app_snapshots: retention_expires_at = created_at + 14 days
```

#### 3. Audit Logging

**Requirement:** Extend existing audit logging to support chat

**What to Log:**
- Chat session creation (user_id, org_id, entry_point, timestamp)
- Ticket creation from chat (conversation_id → ticket_id)
- Admin access to chat history (admin_id, conversation_id)
- Feedback submissions (message_id, rating, resolved)

**Implementation:**
```sql
-- Reuse existing audit_logs table and handle_audit_log() trigger
CREATE TRIGGER audit_chat_sessions
  AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

-- Add actor_type field to distinguish 'user' vs 'admin' access
```

#### 4. Authorization Model

**Rule:** Strictly by org_id

**RLS Policies:**
- Users see only their own conversations
- Admins see conversations for their org
- SuperAdmins see all conversations (via admin endpoints)
- Service role bypasses RLS for backend operations

**Global vs Org-Specific Documents:**
```sql
-- KB documents can be global (org_id IS NULL) or org-specific
CREATE POLICY "Users can view allowed KB documents"
  ON kb_documents FOR SELECT
  USING (
    org_id IS NULL  -- Global docs visible to all
    OR org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

**Cross-Org Leakage Prevention:**
1. RAG retrieval filters by: `WHERE (org_id IS NULL OR org_id = $user_org_id)`
2. Server-side enforcement before passing context to LLM
3. LLM never sees raw org_id values
4. Sanitization layer strips PII before constructing prompts

#### 5. PII & Snapshot Sanitization

**What to Remove:**
- Email addresses
- IP addresses
- API keys (sk_live_*, pk_live_*, etc.)
- Long tokens/hashes (>32 chars)
- User passwords (should never be in snapshots anyway)

**What to Keep:**
- UUIDs (safe, non-reversible identifiers)
- Route paths
- UI state (tabs, filters, etc.)
- Error codes (not full messages if they contain PII)

**Implementation:**
```typescript
function sanitizeSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    route: snapshot.route,
    view: snapshot.view,
    ui_state: {
      theme: snapshot.ui_state?.theme,
      tab: snapshot.ui_state?.tab,
      filter: snapshot.ui_state?.filter,
      // Remove search_query (may contain emails/domains)
    },
    entities_on_screen: snapshot.entities_on_screen, // UUIDs are safe
    user_action: sanitizeUserAction(snapshot.user_action),
    errors: snapshot.errors?.map(err => ({
      code: err.code,
      field: err.field,
      message: containsPII(err.message) ? '[REDACTED]' : err.message
    })),
    network_errors: snapshot.network_errors?.map(err => ({
      request_id: err.request_id,
      endpoint: sanitizeEndpoint(err.endpoint), // Remove query params
      status_code: err.status_code,
      // Remove error_message (may contain sensitive data)
    }))
  };
}

function containsPII(text: string): boolean {
  const patterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,                         // IP
    /\bsk_live_[a-zA-Z0-9]+/,                              // Stripe key
    /\b[A-Za-z0-9]{32,}\b/,                                // Long tokens
  ];
  return patterns.some(pattern => pattern.test(text));
}
```

#### 6. Authentication & Authorization

**JWT Validation:**
```typescript
async function authenticateRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role bypasses RLS
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new ApiError('Invalid or expired token', 401);
  }

  return user;
}
```

**Role Checks:**
```typescript
async function checkAdminAccess(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  return data?.role === 'SuperAdmin';
}
```

**Endpoint Access Matrix:**

| Endpoint | User | Admin | SuperAdmin |
|----------|------|-------|------------|
| POST /chat | ✓ (own) | ✓ (org) | ✓ (all) |
| POST /feedback | ✓ (own) | ✓ (org) | ✓ (all) |
| POST /log-bug | ✓ (own) | ✓ (org) | ✓ (all) |
| GET /admin/conversations | ✗ | ✗ | ✓ |
| GET /admin/metrics | ✗ | ✗ | ✓ |

---

## Technical Architecture

### Technology Stack

**Backend:**
- Runtime: Node.js 18+
- Framework: Express.js
- Language: TypeScript
- Database: PostgreSQL (via Supabase)
- Vector DB: pgvector extension

**AI & ML:**
- LLM: OpenAI GPT-4 Turbo or Anthropic Claude 3
- Embeddings: OpenAI text-embedding-3-small (1536 dimensions)
- Vector Search: pgvector with IVFFlat index

**External Services:**
- Freshdesk API (knowledge base, tickets, contacts)
- Supabase (database, auth, storage)

### RAG Retrieval Pipeline

```
┌─────────────────────────────────────────────────────────────┐
│                 RAG RETRIEVAL FLOW                          │
└─────────────────────────────────────────────────────────────┘

User Query: "How do I add an A record?"
       │
       ▼
1. Generate Embedding
   │ OpenAI text-embedding-3-small
   │ Input: "How do I add an A record?"
   │ Output: [0.023, -0.145, 0.678, ...] (1536 dims)
       │
       ▼
2. Vector Similarity Search
   │ SQL Query with pgvector:
   │
   │ SELECT 
   │   kbc.chunk_text,
   │   kbd.title,
   │   1 - (kbc.embedding <=> $1::vector) AS confidence,
   │   kbd.last_updated_at
   │ FROM kb_chunks kbc
   │ JOIN kb_documents kbd ON kbd.id = kbc.document_id
   │ WHERE 
   │   (kbd.org_id IS NULL OR kbd.org_id = $2)
   │   AND 1 - (kbc.embedding <=> $1::vector) > 0.7
   │ ORDER BY kbc.embedding <=> $1::vector
   │ LIMIT 5;
       │
       ▼
3. Retrieved Chunks (Top 5)
   │ 1. "How to Add a New DNS Record" (confidence: 0.92)
   │ 2. "Understanding DNS Record Types" (confidence: 0.87)
   │ 3. "DNS Zone Management Guide" (confidence: 0.75)
       │
       ▼
4. Construct LLM Prompt
   │ System: "You are Javi, a helpful assistant..."
   │ Context: [Retrieved chunks]
   │ User Query: "How do I add an A record?"
   │ History: [Last 5 messages]
       │
       ▼
5. Generate Response
   │ LLM Output:
   │ {
   │   "reply": "To add an A record...",
   │   "citations": ["1003", "1002"],
   │   "confidence": 0.95
   │ }
       │
       ▼
6. Store & Return
   │ Store in chat_messages
   │ Store citations in chat_message_citations
   │ Return to frontend with Javelina proxy URLs
```

### Knowledge Base Sync Job

```
┌─────────────────────────────────────────────────────────────┐
│             FRESHDESK KB SYNC (Runs every 6 hours)          │
└─────────────────────────────────────────────────────────────┘

1. Fetch Articles from Freshdesk
   │ GET /api/v2/solutions/articles
   │ Filter: status=published
       │
       ▼
2. For Each Article:
   │ a. Upsert kb_documents (by external_id)
   │ b. Chunk article content
   │    - 500 words per chunk
   │    - 100 word overlap
   │    - Preserve headers/structure
   │ c. Generate embeddings for chunks
   │    - OpenAI text-embedding-3-small
   │    - Batch API calls (max 100 per request)
   │ d. Upsert kb_chunks with embeddings
       │
       ▼
3. Cleanup
   │ - Delete chunks for articles no longer published
   │ - Update last_synced_at timestamp
       │
       ▼
4. Rebuild Vector Index (if needed)
   │ ANALYZE kb_chunks;
```

---

## Backend API Requirements

### Endpoint Summary

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | /api/support/chat | Main chat with RAG | JWT | Tier-based |
| POST | /api/support/feedback | Submit feedback | JWT | None |
| POST | /api/support/log-bug | Create ticket | JWT | 5/day |
| GET | /api/support/admin/conversations | List conversations | SuperAdmin | None |
| GET | /api/support/admin/metrics | Analytics | SuperAdmin | None |
| GET | /api/support/admin/conversation/:id | Get details | SuperAdmin | None |

### 1. POST /api/support/chat

**Purpose:** Process user message and return AI response with citations

**Request:**
```typescript
interface ChatRequest {
  message: string;              // User message (max 2000 chars)
  conversationId?: string;      // Session UUID (undefined for new)
  entryPoint?: string;          // 'chat_widget' | 'help_button' | 'error_page'
  pageUrl?: string;             // Current page URL
  userId: string;               // From JWT
  orgId?: string;               // Current org context
  tier?: string;                // 'starter' | 'pro' | 'business'
  attemptCount?: number;        // Failed resolution attempts (default: 0)
  snapshot?: AppSnapshot;       // UI state (sanitize before storage)
}
```

**Response:**
```typescript
interface ChatResponse {
  reply: string;                // AI-generated response
  citations: SupportCitation[]; // KB articles used
  intent: string;               // Classified intent
  resolution: {
    needsConfirmation: boolean; // Show "Was this solved?" buttons
  };
  nextAction: {
    type: 'none' | 'ask_clarifying' | 'offer_ticket' | 'log_bug';
    reason: string;
  };
  conversationId: string;       // Session UUID
}
```

**Implementation Steps:**
1. Validate JWT and rate limits
2. Sanitize snapshot (remove PII)
3. Create/retrieve chat_session
4. Store user message
5. Generate embedding for query
6. Query kb_chunks with vector similarity (pgvector)
7. Filter by org permissions
8. Retrieve top 5 chunks (confidence > 0.7)
9. Construct LLM prompt with context
10. Call OpenAI/Anthropic
11. Parse response and extract citations
12. Store assistant message + citations
13. Update session attempt_count
14. Determine nextAction based on attemptCount and confidence
15. Return structured response

**Rate Limits:**
- Starter: 20 requests/hour
- Pro: 50 requests/hour
- Business: 100 requests/hour

### 2. POST /api/support/feedback

**Purpose:** Submit user feedback on conversation quality

**Request:**
```typescript
interface FeedbackRequest {
  conversationId: string;
  resolved: boolean;
  rating?: number;              // 1-5 stars (optional)
  comment?: string;             // Max 500 chars (optional)
  userId: string;
  orgId?: string;
  tier?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Implementation Steps:**
1. Validate conversation ownership
2. Store in chat_feedback table
3. Update chat_sessions.resolution_status:
   - If resolved: 'resolved'
   - If not resolved: increment attempt_count
4. Mark last assistant message as failed_attempt if not resolved
5. Log to audit_logs

### 3. POST /api/support/log-bug

**Purpose:** Create Freshdesk ticket (escalation path)

**Request:**
```typescript
interface LogBugRequest {
  subject: string;              // Max 200 chars
  description: string;          // Max 5000 chars
  page_url: string;
  user_id: string;
  conversationId?: string;      // Link to chat session
  priority?: 1 | 2 | 3 | 4;    // 1=low, 2=medium, 3=high, 4=urgent
}
```

**Response:**
```typescript
{
  success: boolean;
  ticket_id: string;            // Freshdesk ticket ID
  ticket_url?: string;
  message: string;
}
```

**Implementation Steps:**
1. Check rate limit (5 tickets/day per user)
2. Get user profile from auth
3. Retrieve conversation history (if conversationId provided)
4. Get or create Freshdesk contact:
   - Check freshdesk_contacts table
   - If not exists, call Freshdesk API to create
   - Store mapping
5. Create Freshdesk ticket:
   - Include conversation context in description
   - Set custom fields: user_id, org_id, page_url
   - Tag with 'javelina-chat'
6. Store in support_tickets table
7. Update chat_sessions:
   - Set ticket_created: true
   - Set ticket_id
   - Set resolution_status: 'escalated'
8. Return ticket details

**Rate Limit:** 5 tickets per day (all tiers)

### 4. GET /api/support/admin/conversations

**Purpose:** List all conversations with filters (admin dashboard)

**Query Parameters:**
```typescript
{
  days?: number;                // 7, 30, 90 (default: 7)
  status?: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  orgId?: string;
  page?: number;                // Default: 1
  limit?: number;               // Default: 50, max: 100
}
```

**Response:**
```typescript
{
  conversations: SupportConversation[];
  total: number;
  page: number;
  limit: number;
}
```

**Implementation Steps:**
1. Verify SuperAdmin role
2. Build query with filters
3. Join with auth.users and organizations
4. Aggregate message counts
5. Apply pagination
6. Return results

### 5. GET /api/support/admin/metrics

**Purpose:** Support metrics and analytics

**Query Parameters:**
```typescript
{
  start_date?: string;          // ISO 8601 (default: 30 days ago)
  end_date?: string;            // ISO 8601 (default: today)
  orgId?: string;
}
```

**Response:**
```typescript
{
  period: { start_date, end_date, days },
  totals: { conversations, messages, unique_users },
  resolution: {
    resolved,
    escalated,
    abandoned,
    pending,
    resolution_rate,            // %
    deflection_rate             // %
  },
  feedback: {
    total_ratings,
    avg_rating,                 // 0.0-1.0
    thumbs_up_rate              // %
  },
  performance: {
    avg_response_time_ms,
    avg_messages_per_conversation,
    avg_session_duration_seconds
  },
  top_intents: [{ intent, count, percentage }],
  by_tier: { starter: {...}, pro: {...}, business: {...} }
}
```

**Implementation Steps:**
1. Verify SuperAdmin role
2. Query support_metrics view
3. Query knowledge_gaps view
4. Calculate derived metrics:
   - Resolution rate = resolved / total
   - Deflection rate = resolved without ticket / total
5. Group by tier, entry point, intent
6. Return structured metrics

### 6. GET /api/support/admin/conversation/:id

**Purpose:** Get full conversation details with messages

**Response:**
```typescript
{
  conversation: SupportConversation,
  messages: SupportMessage[],
  feedback: ChatFeedback[],
  snapshot?: AppSnapshot,
  ticket?: TicketDetails
}
```

**Implementation Steps:**
1. Verify SuperAdmin role
2. Get session from chat_sessions
3. Get all messages with citations (join chat_message_citations)
4. Get all feedback from chat_feedback
5. Get latest snapshot from app_snapshots
6. Get ticket details from support_tickets (if exists)
7. Return complete conversation data

---

## Database Schema

### Overview

The database schema consists of 9 tables with Row Level Security policies:

```
chat_sessions (conversation tracking)
    │
    ├── chat_messages (individual messages)
    │       │
    │       ├── chat_message_citations (KB article references)
    │       │
    │       └── chat_feedback (thumbs up/down)
    │
    ├── app_snapshots (UI state for debugging)
    │
    └── support_tickets (escalated tickets)
            │
            └── freshdesk_contacts (user-to-Freshdesk mapping)

kb_documents (knowledge base articles)
    │
    └── kb_chunks (chunked content with embeddings)
```

### Key Tables

#### chat_sessions
```sql
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations,
  entry_point text,               -- 'chat_widget', 'help_button', 'error_page'
  page_url text,
  resolution_status text,         -- 'pending', 'resolved', 'escalated', 'abandoned'
  ticket_created boolean DEFAULT false,
  ticket_id text,                 -- Freshdesk ticket ID if escalated
  attempt_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_message_at timestamptz DEFAULT now(),
  retention_expires_at timestamptz DEFAULT (now() + interval '30 days')
);
```

#### chat_messages
```sql
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users,
  org_id uuid REFERENCES organizations,
  role text NOT NULL,             -- 'user', 'assistant', 'system'
  content text NOT NULL,
  intent text,                    -- 'dns-zones', 'dns-records', 'billing', etc.
  confidence numeric,             -- 0.0 to 1.0
  failed_attempt boolean DEFAULT false,
  failure_reason text,
  snapshot_id uuid REFERENCES app_snapshots,
  response_time_ms integer,       -- LLM latency
  created_at timestamptz DEFAULT now()
);
```

#### kb_chunks (Vector Store)
```sql
CREATE TABLE kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES kb_documents ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(1536),         -- OpenAI text-embedding-3-small
  tokens integer,
  created_at timestamptz DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

-- Vector index for fast similarity search
CREATE INDEX idx_kb_chunks_embedding 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

### Critical Indexes

```sql
-- Vector similarity search (most important!)
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Session lookups
CREATE INDEX idx_chat_sessions_user_org ON chat_sessions(user_id, org_id);

-- Message queries
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- Citation lookups
CREATE INDEX idx_chat_message_citations_message ON chat_message_citations(message_id);

-- Retention cleanup
CREATE INDEX idx_chat_sessions_retention ON chat_sessions(retention_expires_at) 
WHERE retention_expires_at IS NOT NULL;
```

### Helper Functions

```sql
-- Get conversation summary for ticket creation
CREATE FUNCTION get_conversation_summary(p_session_id uuid)
RETURNS jsonb AS $$
  SELECT jsonb_build_object(
    'session', row_to_json(cs.*),
    'messages', (
      SELECT jsonb_agg(row_to_json(cm.*) ORDER BY cm.created_at)
      FROM chat_messages cm
      WHERE cm.session_id = p_session_id
    )
  )
  FROM chat_sessions cs
  WHERE cs.id = p_session_id;
$$ LANGUAGE sql;

-- Cleanup expired data (cron job runs daily)
CREATE FUNCTION cleanup_expired_support_data()
RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete expired chat sessions (cascades to messages)
  DELETE FROM chat_sessions WHERE retention_expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Delete expired snapshots
  DELETE FROM app_snapshots WHERE retention_expires_at < now();
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
```

### Views for Analytics

```sql
-- Support metrics view (daily aggregates)
CREATE VIEW support_metrics AS
SELECT
  DATE_TRUNC('day', cs.created_at) as date,
  COUNT(DISTINCT cs.id) as total_conversations,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.resolution_status = 'resolved') as resolved_count,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.ticket_created = true) as escalated_count,
  AVG(cs.attempt_count) as avg_attempts,
  AVG(EXTRACT(EPOCH FROM (cs.last_message_at - cs.created_at))) as avg_session_duration_seconds,
  (COUNT(DISTINCT cs.id) FILTER (WHERE cs.resolution_status = 'resolved')::float / 
    NULLIF(COUNT(DISTINCT cs.id), 0)) * 100 as deflection_rate
FROM chat_sessions cs
LEFT JOIN chat_feedback cf ON cf.session_id = cs.id
GROUP BY 1
ORDER BY 1 DESC;

-- Knowledge gap analysis (low confidence queries)
CREATE VIEW knowledge_gaps AS
SELECT
  cm.intent,
  COUNT(*) as occurrences,
  AVG(cm.confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE cm.failed_attempt = true) as failed_attempts,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.ticket_created = true) as escalations
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cm.role = 'assistant' AND cm.confidence < 0.7
GROUP BY cm.intent
ORDER BY failed_attempts DESC, occurrences DESC
LIMIT 50;
```

---

## RAG & Knowledge Base

### Chunking Strategy

**Article Processing:**
1. Fetch article from Freshdesk
2. Split into chunks:
   - **Size:** 500 words per chunk
   - **Overlap:** 100 words between chunks
   - **Boundaries:** Preserve headers and paragraphs
3. Generate chunk metadata:
   - chunk_index (sequential)
   - tokens (approximate count)
   - parent document_id

**Example:**
```
Article: "How to Add DNS Records" (1200 words)

Chunk 0: Words 0-499
Chunk 1: Words 400-899  (100 word overlap with chunk 0)
Chunk 2: Words 800-1199 (100 word overlap with chunk 1)
```

### Embedding Generation

**Model:** OpenAI text-embedding-3-small  
**Dimensions:** 1536  
**API Call:**
```typescript
const response = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunkText
});

const embedding = response.data[0].embedding; // Array<number> (1536 dims)
```

**Batch Processing:**
```typescript
// Process up to 100 chunks at once
const embeddings = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.chunk_text)
});
```

### Vector Similarity Search

**Query:**
```sql
SELECT 
  kbc.id,
  kbc.document_id,
  kbc.chunk_text,
  kbc.embedding <=> $1::vector AS distance,
  1 - (kbc.embedding <=> $1::vector) AS confidence,
  kbd.title,
  kbd.url,
  kbd.last_updated_at
FROM kb_chunks kbc
JOIN kb_documents kbd ON kbd.id = kbc.document_id
WHERE 
  -- Permission check: global docs or user's org docs
  (kbd.org_id IS NULL OR kbd.org_id = $2)
  -- Confidence threshold
  AND 1 - (kbc.embedding <=> $1::vector) > 0.7
ORDER BY kbc.embedding <=> $1::vector
LIMIT 5;
```

**Parameters:**
- `$1`: Query embedding (vector(1536))
- `$2`: User's org_id (uuid)

**Operator:** `<=>` is cosine distance (lower = more similar)  
**Confidence:** `1 - distance` (higher = more similar)

### Relevance Boosting

Apply boosts to confidence scores:

```typescript
function applyRelevanceBoosts(chunk: Chunk, query: string): number {
  let confidence = chunk.confidence;
  
  // Recently updated articles (+5%)
  const daysSinceUpdate = (Date.now() - chunk.last_updated_at) / 86400000;
  if (daysSinceUpdate < 30) {
    confidence *= 1.05;
  }
  
  // Exact title match (+15%)
  if (chunk.title.toLowerCase().includes(query.toLowerCase())) {
    confidence *= 1.15;
  }
  
  // High feedback score (+10%)
  if (chunk.thumbs_up_count > 10 && chunk.thumbs_up_rate > 0.8) {
    confidence *= 1.10;
  }
  
  return Math.min(confidence, 1.0); // Cap at 1.0
}
```

---

## Freshdesk Integration

### API Configuration

**Base URL:** `https://{domain}.freshdesk.com/api/v2/`  
**Authentication:** Basic Auth (API Key as username, "X" as password)  
**Headers:** 
```
Authorization: Basic {base64(api_key:X)}
Content-Type: application/json
```

### Key Endpoints

#### 1. List Articles (for KB sync)
```
GET /api/v2/solutions/articles
Query: ?per_page=100&page=1
```

**Response:**
```json
[
  {
    "id": 1003,
    "title": "How to Add a New DNS Record",
    "description": "Step-by-step guide...",
    "status": 2,  // 1=draft, 2=published
    "updated_at": "2024-01-15T11:00:00Z",
    "created_at": "2024-01-01T10:00:00Z"
  }
]
```

#### 2. Get Article Details
```
GET /api/v2/solutions/articles/{id}
```

#### 3. Create Contact
```
POST /api/v2/contacts
Body: {
  "name": "John Doe",
  "email": "john@example.com",
  "custom_fields": {
    "cf_javelina_user_id": "uuid",
    "cf_javelina_org_id": "uuid",
    "cf_javelina_org_name": "Acme Inc"
  }
}
```

**Response:**
```json
{
  "id": 43001234567,
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 4. Create Ticket
```
POST /api/v2/tickets
Body: {
  "subject": "DNS records not saving",
  "description": "User report: ...\n\nConversation:\n...",
  "email": "john@example.com",
  "priority": 2,  // 1=low, 2=medium, 3=high, 4=urgent
  "status": 2,    // 2=open
  "source": 9,    // 9=feedback_widget
  "tags": ["javelina-chat"],
  "custom_fields": {
    "cf_page_url": "https://app.javelina.com/zone/example.com",
    "cf_conversation_id": "uuid"
  }
}
```

**Response:**
```json
{
  "id": 10001,
  "subject": "DNS records not saving",
  "status": 2,
  "created_at": "2024-01-27T14:45:00Z"
}
```

### Sync Job Implementation

```typescript
class FreshdeskSyncJob {
  async run(): Promise<void> {
    console.log('[KB Sync] Starting Freshdesk article sync...');
    
    const articles = await this.fetchAllArticles();
    console.log(`[KB Sync] Fetched ${articles.length} articles`);
    
    for (const article of articles) {
      if (article.status !== 2) continue; // Skip non-published
      
      // Upsert document
      await this.upsertKbDocument(article);
      
      // Chunk content
      const chunks = this.chunkArticle(article);
      
      // Generate embeddings (batch)
      const embeddings = await this.generateEmbeddings(
        chunks.map(c => c.chunk_text)
      );
      
      // Upsert chunks with embeddings
      await this.upsertKbChunks(article.id, chunks, embeddings);
    }
    
    // Cleanup deleted articles
    await this.cleanupDeletedArticles(articles.map(a => a.id));
    
    console.log('[KB Sync] Sync complete');
  }
  
  async fetchAllArticles(): Promise<Article[]> {
    const articles: Article[] = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await fetch(
        `https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2/solutions/articles?per_page=100&page=${page}`,
        {
          headers: {
            'Authorization': `Basic ${btoa(process.env.FRESHDESK_API_KEY + ':X')}`
          }
        }
      );
      
      const data = await response.json();
      articles.push(...data);
      hasMore = data.length === 100;
      page++;
    }
    
    return articles;
  }
}

// Run every 6 hours via cron
// 0 */6 * * * /usr/bin/node /app/scripts/sync-kb.js
```

### Contact Mapping

```typescript
async function getOrCreateFreshdeskContact(
  user: { id: string; email: string; name?: string },
  org?: { id: string; name: string }
): Promise<FreshdeskContact> {
  
  // Check if mapping exists
  const { data: existingContact } = await supabase
    .from('freshdesk_contacts')
    .select('*')
    .eq('user_id', user.id)
    .eq('org_id', org?.id)
    .single();
  
  if (existingContact) {
    return existingContact;
  }
  
  // Search Freshdesk by email
  const searchResponse = await fetch(
    `https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2/search/contacts?query=email:${user.email}`,
    {
      headers: {
        'Authorization': `Basic ${btoa(process.env.FRESHDESK_API_KEY + ':X')}`
      }
    }
  );
  
  const searchResults = await searchResponse.json();
  
  let freshdeskContactId;
  
  if (searchResults.results.length > 0) {
    // Contact exists
    freshdeskContactId = searchResults.results[0].id;
  } else {
    // Create new contact
    const createResponse = await fetch(
      `https://${process.env.FRESHDESK_DOMAIN}.freshdesk.com/api/v2/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(process.env.FRESHDESK_API_KEY + ':X')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: user.name || user.email,
          email: user.email,
          custom_fields: {
            cf_javelina_user_id: user.id,
            cf_javelina_org_id: org?.id,
            cf_javelina_org_name: org?.name
          }
        })
      }
    );
    
    const newContact = await createResponse.json();
    freshdeskContactId = newContact.id;
  }
  
  // Store mapping
  const { data: mapping } = await supabase
    .from('freshdesk_contacts')
    .insert({
      user_id: user.id,
      org_id: org?.id,
      freshdesk_contact_id: freshdeskContactId,
      email: user.email
    })
    .select()
    .single();
  
  return mapping;
}
```

---

## Rate Limiting & Abuse Prevention

### Multi-Layer Strategy

```
Layer 1: Per-User Rate Limit
  ├── Chat: 20/hour (Starter), 50/hour (Pro), 100/hour (Business)
  └── Tickets: 5/day (all tiers)

Layer 2: Per-Org Rate Limit
  ├── 100/hour (Starter)
  ├── 200/hour (Pro)
  └── 500/hour (Business)

Layer 3: Semantic Deduplication
  └── Reject if >95% similar to last message

Layer 4: Length Limits
  └── Max 2000 chars per message

Layer 5: Captcha (Optional)
  └── Trigger if user hits 80% of rate limit
```

### Implementation

```typescript
// In-memory rate limiting (dev/staging)
const rateLimitStore = new Map<string, { attempts: number; resetAt: number }>();

function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);
  
  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitStore.set(identifier, {
      attempts: 1,
      resetAt: now + windowMs
    });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  
  if (entry.attempts >= limit) {
    // Limit exceeded
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }
  
  // Increment
  entry.attempts++;
  return { allowed: true, remaining: limit - entry.attempts, resetAt: entry.resetAt };
}

// Usage in endpoint
const { allowed, remaining, resetAt } = checkRateLimit(
  `chat:${userId}:${tier}`,
  RATE_LIMITS.chat[tier].limit,
  RATE_LIMITS.chat[tier].windowMs
);

if (!allowed) {
  return res.status(429).json({
    error: 'Rate limit exceeded',
    message: `Try again in ${Math.ceil((resetAt - Date.now()) / 60000)} minutes`,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: Math.ceil((resetAt - Date.now()) / 1000)
  });
}

// Add headers
res.setHeader('X-RateLimit-Limit', RATE_LIMITS.chat[tier].limit);
res.setHeader('X-RateLimit-Remaining', remaining);
res.setHeader('X-RateLimit-Reset', resetAt);
```

### Redis Implementation (Production)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimitRedis(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  
  const ttl = await redis.ttl(key);
  const resetAt = Date.now() + (ttl * 1000);
  
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt
  };
}
```

### Abuse Detection

```typescript
// Semantic deduplication
async function checkDuplicateMessage(
  userId: string,
  newMessage: string
): Promise<boolean> {
  const { data: lastMessage } = await supabase
    .from('chat_messages')
    .select('content')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  
  if (!lastMessage) return false;
  
  // Calculate similarity (Levenshtein distance)
  const similarity = calculateSimilarity(newMessage, lastMessage.content);
  
  return similarity > 0.95; // >95% similar = likely spam
}

// Length validation
function validateMessageLength(message: string): boolean {
  return message.length > 0 && message.length <= 2000;
}

// Middleware
async function validateChatRequest(req: ChatRequest): Promise<void> {
  if (!validateMessageLength(req.message)) {
    throw new ApiError('Message must be 1-2000 characters', 400, 'INVALID_MESSAGE_LENGTH');
  }
  
  if (await checkDuplicateMessage(req.userId, req.message)) {
    throw new ApiError('Duplicate message detected', 429, 'DUPLICATE_MESSAGE');
  }
}
```

---

## Escalation Logic

### Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│              ESCALATION DECISION LOGIC                      │
└─────────────────────────────────────────────────────────────┘

1. Check Attempt Count
   │
   ├──> attemptCount >= 2?
   │    │
   │    ├──> YES ──> nextAction = 'offer_ticket'
   │    │
   │    └──> NO ──> Continue to step 2
   │
2. Check Confidence Score
   │
   ├──> confidence < 0.6?
   │    │
   │    ├──> YES ──> nextAction = 'ask_clarifying'
   │    │
   │    └──> NO ──> Continue to step 3
   │
3. Check Message Keywords
   │
   ├──> message contains "bug", "error", "broken", "not working"?
   │    │
   │    ├──> YES ──> nextAction = 'log_bug'
   │    │
   │    └──> NO ──> Continue to step 4
   │
4. Check Intent
   │
   ├──> intent === 'billing'?
   │    │
   │    ├──> YES ──> nextAction = 'offer_ticket'
   │    │            reason = 'Billing issues require human support'
   │    │
   │    └──> NO ──> nextAction = 'none'
```

### Threshold Configuration

**Base Threshold:** 2 attempts

**Route-Specific Overrides:**
```typescript
const ESCALATION_THRESHOLDS: Record<string, number> = {
  '/dashboard': 2,
  '/zones': 2,
  '/zones/[id]/records': 3,     // DNS troubleshooting allows more attempts
  '/settings/billing': 2,        // Billing needs fast human help
  '/admin': 1,                   // Admin issues escalate immediately
};

function getEscalationThreshold(route: string): number {
  return ESCALATION_THRESHOLDS[route] || 2;
}
```

### Implementation

```typescript
function determineNextAction(
  attemptCount: number,
  confidence: number,
  intent: string,
  message: string,
  route: string
): NextAction {
  const threshold = getEscalationThreshold(route);
  
  // Check attempt count
  if (attemptCount >= threshold) {
    return {
      type: 'offer_ticket',
      reason: `Unable to resolve after ${attemptCount} attempts`
    };
  }
  
  // Check confidence
  if (confidence < 0.6) {
    return {
      type: 'ask_clarifying',
      reason: 'Low confidence, need more information'
    };
  }
  
  // Check for bug reports
  const bugKeywords = ['bug', 'error', 'broken', 'not working', 'crash'];
  if (bugKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
    return {
      type: 'log_bug',
      reason: 'Potential bug report detected'
    };
  }
  
  // Check intent
  if (intent === 'billing' || intent === 'security') {
    return {
      type: 'offer_ticket',
      reason: `${intent} issues require human support`
    };
  }
  
  // High confidence, no escalation needed
  return {
    type: 'none',
    reason: 'High confidence response'
  };
}
```

### Tier-Specific Behavior

**Starter Tier:**
```typescript
// Frontend shows manual ticket creation link
if (nextAction.type === 'offer_ticket' && tier === 'starter') {
  return (
    <div>
      <p>I recommend creating a support ticket for further assistance.</p>
      <a href="https://javelina.freshdesk.com/support/tickets/new">
        Create Ticket
      </a>
      <p className="text-sm text-gray-500">
        Or upgrade to Pro for automatic ticket creation
      </p>
    </div>
  );
}
```

**Pro & Business Tiers:**
```typescript
// Frontend shows auto-ticket creation with confirmation
if (nextAction.type === 'offer_ticket' && ['pro', 'business'].includes(tier)) {
  return (
    <div>
      <p>Would you like me to create a support ticket for you?</p>
      <button onClick={handleCreateTicket}>Create Ticket</button>
      <p className="text-xs text-gray-500">
        I'll include our conversation history
      </p>
    </div>
  );
}
```

---

## Implementation Checklist

### Week 1: Core Infrastructure

#### Database Setup
- [ ] Apply migration: `supabase/migrations/20260127000000_support_chat_system.sql`
- [ ] Verify pgvector extension installed
- [ ] Verify all tables created
- [ ] Verify RLS policies active
- [ ] Verify indexes created (especially vector index)
- [ ] Test helper functions

#### Express API Setup
- [ ] Initialize Express.js project
- [ ] Set up TypeScript configuration
- [ ] Install dependencies:
  - `express`, `cors`, `helmet`
  - `@supabase/supabase-js`
  - `openai` or `@anthropic-ai/sdk`
  - `dotenv`
- [ ] Set up environment variables
- [ ] Create error handling middleware
- [ ] Set up logging (Winston/Pino)
- [ ] Create health check endpoint: `GET /health`

#### Authentication Middleware
- [ ] Implement JWT validation with Supabase
- [ ] Create user context extraction
- [ ] Create role checking functions
- [ ] Test with valid/invalid tokens

### Week 2: Core Chat Endpoint

#### POST /api/support/chat Implementation
- [ ] Request validation (message length, required fields)
- [ ] JWT authentication
- [ ] Tier-based rate limiting
- [ ] Snapshot sanitization service
- [ ] Create/retrieve chat session
- [ ] Store user message in database

#### RAG Retrieval Service
- [ ] Implement embedding generation (OpenAI API)
- [ ] Implement vector similarity search (pgvector)
- [ ] Apply org permission filters
- [ ] Apply confidence threshold filtering
- [ ] Return top 5 relevant chunks
- [ ] Test with sample queries

#### LLM Integration
- [ ] Implement OpenAI or Anthropic client
- [ ] Create system prompt template
- [ ] Construct prompt with KB context
- [ ] Parse JSON response
- [ ] Extract citations
- [ ] Handle timeouts and errors
- [ ] Test with various query types

#### Store Results
- [ ] Store assistant message
- [ ] Store citations (chat_message_citations)
- [ ] Update session metadata
- [ ] Determine nextAction logic
- [ ] Return structured response

### Week 3: Feedback & Escalation

#### POST /api/support/feedback
- [ ] Validate conversation ownership
- [ ] Store feedback in database
- [ ] Update session status
- [ ] Mark failed attempts
- [ ] Increment attempt count
- [ ] Test feedback flow

#### POST /api/support/log-bug
- [ ] Implement daily rate limiting (5 tickets/day)
- [ ] Get user profile from auth
- [ ] Retrieve conversation history
- [ ] Implement Freshdesk contact service
- [ ] Implement Freshdesk ticket creation
- [ ] Store ticket mapping
- [ ] Update session status
- [ ] Test ticket creation

#### Freshdesk Integration
- [ ] Implement article sync job
- [ ] Implement contact get/create
- [ ] Implement ticket creation
- [ ] Set up custom fields in Freshdesk:
  - `cf_javelina_user_id`
  - `cf_javelina_org_id`
  - `cf_page_url`
  - `cf_conversation_id`
- [ ] Test all Freshdesk API calls

### Week 4: Admin Endpoints & Testing

#### GET /api/support/admin/conversations
- [ ] Implement SuperAdmin check
- [ ] Build query with filters
- [ ] Implement pagination
- [ ] Join with users and orgs
- [ ] Test with various filters

#### GET /api/support/admin/metrics
- [ ] Query support_metrics view
- [ ] Calculate derived metrics
- [ ] Group by tier and intent
- [ ] Test metric calculations

#### GET /api/support/admin/conversation/:id
- [ ] Get conversation details
- [ ] Get all messages with citations
- [ ] Get feedback
- [ ] Get snapshot
- [ ] Get ticket details
- [ ] Test full conversation retrieval

#### Knowledge Base Sync
- [ ] Implement article fetching from Freshdesk
- [ ] Implement chunking algorithm
- [ ] Implement batch embedding generation
- [ ] Implement chunk storage with embeddings
- [ ] Implement cleanup of deleted articles
- [ ] Set up cron job (every 6 hours)
- [ ] Run initial sync manually
- [ ] Verify KB populated correctly

#### Testing
- [ ] Unit tests for sanitization
- [ ] Unit tests for rate limiting
- [ ] Integration tests for all endpoints
- [ ] E2E test: Full conversation flow
- [ ] E2E test: Ticket creation flow
- [ ] E2E test: Admin dashboard
- [ ] Load testing with k6 or Artillery

#### Deployment
- [ ] Deploy to staging
- [ ] Smoke tests in staging
- [ ] Performance monitoring setup
- [ ] Error tracking (Sentry)
- [ ] Deploy to production
- [ ] Monitor for 24 hours
- [ ] Set up automated cleanup cron job

---

## Environment Variables

### Backend .env File

```bash
# ============================================================
# JAVELINA AI SUPPORT - BACKEND ENVIRONMENT VARIABLES
# ============================================================

# -------------------------
# Node Environment
# -------------------------
NODE_ENV=production                    # production | development | test
API_PORT=3001                          # Express server port
LOG_LEVEL=info                         # debug | info | warn | error

# -------------------------
# Supabase Configuration
# -------------------------
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# -------------------------
# OpenAI Configuration
# -------------------------
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_ORG_ID=org-your-org-id          # Optional

# Model selection
OPENAI_CHAT_MODEL=gpt-4-turbo-preview  # gpt-4-turbo-preview | gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# -------------------------
# Anthropic Configuration (Alternative to OpenAI)
# -------------------------
ANTHROPIC_API_KEY=sk-ant-your-key-here # Optional
ANTHROPIC_MODEL=claude-3-sonnet-20240229

# -------------------------
# Freshdesk Configuration
# -------------------------
FRESHDESK_DOMAIN=javelina              # Subdomain only (not full URL)
FRESHDESK_API_KEY=your_api_key_here
FRESHDESK_ENABLED=true                 # Set to 'false' for mock mode

# -------------------------
# Rate Limiting
# -------------------------
RATE_LIMIT_CHAT_STARTER=20             # Messages per hour for Starter
RATE_LIMIT_CHAT_PRO=50                 # Messages per hour for Pro
RATE_LIMIT_CHAT_BUSINESS=100           # Messages per hour for Business
RATE_LIMIT_TICKET_DAILY=5              # Tickets per day (all tiers)

# Redis for distributed rate limiting (production)
REDIS_URL=redis://localhost:6379       # Optional, for multi-instance

# -------------------------
# CORS & Frontend
# -------------------------
FRONTEND_URL=https://app.javelina.com  # For CORS allowed origins
ALLOWED_ORIGINS=https://app.javelina.com,https://staging.javelina.com

# -------------------------
# Feature Flags
# -------------------------
SUPPORT_CHAT_ENABLED=true              # Master kill switch
MOCK_MODE=false                        # Use mock responses (dev only)

# -------------------------
# Monitoring & Logging
# -------------------------
SENTRY_DSN=https://your-sentry-dsn     # Error tracking
DATADOG_API_KEY=your-datadog-key       # Metrics (optional)

# -------------------------
# Data Retention (days)
# -------------------------
CHAT_RETENTION_DAYS=30
SNAPSHOT_RETENTION_DAYS=14
```

### Frontend .env.local

```bash
# ============================================================
# JAVELINA AI SUPPORT - FRONTEND ENVIRONMENT VARIABLES
# ============================================================

# -------------------------
# Backend API
# -------------------------
NEXT_PUBLIC_API_URL=https://api.javelina.com

# -------------------------
# Mock Mode (Development)
# -------------------------
NEXT_PUBLIC_MOCK_SUPPORT_API=false     # Set to 'true' for mock mode
NEXT_PUBLIC_FRESHDESK_ENABLED=true

# -------------------------
# Supabase (for auth)
# -------------------------
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# -------------------------
# Freshdesk
# -------------------------
NEXT_PUBLIC_FRESHDESK_DOMAIN=javelina
```

---

## Testing Strategy

### Unit Tests

**Snapshot Sanitization:**
```typescript
describe('sanitizeSnapshot', () => {
  it('should remove email addresses from error messages', () => {
    const snapshot = {
      errors: [{
        code: 'VALIDATION_ERROR',
        message: 'Invalid email: john@example.com'
      }]
    };
    const sanitized = sanitizeSnapshot(snapshot);
    expect(sanitized.errors[0].message).toBe('[REDACTED]');
  });
  
  it('should preserve UUIDs', () => {
    const snapshot = {
      entities_on_screen: {
        org_id: '550e8400-e29b-41d4-a716-446655440000'
      }
    };
    const sanitized = sanitizeSnapshot(snapshot);
    expect(sanitized.entities_on_screen.org_id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });
});
```

**Rate Limiting:**
```typescript
describe('checkRateLimit', () => {
  it('should allow requests within limit', () => {
    const result = checkRateLimit('user-123', 20, 3600000);
    expect(result.allowed).toBe(true);
  });
  
  it('should block requests exceeding limit', () => {
    for (let i = 0; i < 20; i++) {
      checkRateLimit('user-123', 20, 3600000);
    }
    const result = checkRateLimit('user-123', 20, 3600000);
    expect(result.allowed).toBe(false);
  });
});
```

### Integration Tests

**Chat Endpoint:**
```typescript
describe('POST /api/support/chat', () => {
  it('should return AI response with citations', async () => {
    const response = await request(app)
      .post('/api/support/chat')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        message: 'How do I add an A record?',
        userId: testUserId,
        tier: 'pro'
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('reply');
    expect(response.body).toHaveProperty('citations');
    expect(response.body.citations.length).toBeGreaterThan(0);
  });
});
```

### E2E Tests

**Full Conversation Flow:**
```typescript
describe('Support Chat E2E', () => {
  it('should complete conversation with escalation', async () => {
    // 1. Send initial message
    const msg1 = await chat({ message: 'I need help with DNS' });
    const conversationId = msg1.body.conversationId;
    
    // 2. Submit negative feedback
    await feedback({ conversationId, resolved: false });
    
    // 3. Send follow-up (attempt 2)
    const msg2 = await chat({ message: 'Still confused', conversationId, attemptCount: 1 });
    
    // 4. Submit negative feedback again
    await feedback({ conversationId, resolved: false });
    
    // 5. Send third message (should trigger escalation)
    const msg3 = await chat({ message: 'Not working', conversationId, attemptCount: 2 });
    expect(msg3.body.nextAction.type).toBe('offer_ticket');
    
    // 6. Create ticket
    const ticket = await logBug({ conversationId, subject: 'Issue from chat' });
    expect(ticket.body.success).toBe(true);
  });
});
```

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All environment variables set in production
- [ ] Supabase credentials verified
- [ ] Freshdesk API key verified
- [ ] OpenAI API key verified
- [ ] Database migration applied
- [ ] pgvector extension installed
- [ ] Freshdesk custom fields configured
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Staging deployment successful
- [ ] Load testing completed
- [ ] Monitoring configured (Sentry, Datadog)

### Deployment Steps

1. **Apply Database Migration**
   ```bash
   supabase db push --linked
   ```

2. **Run Initial KB Sync**
   ```bash
   npm run sync-kb
   ```

3. **Deploy Backend API**
   ```bash
   npm run build
   npm run start:production
   ```

4. **Verify Endpoints**
   ```bash
   # Health check
   curl https://api.javelina.com/health
   
   # Chat endpoint (with JWT)
   curl -X POST https://api.javelina.com/api/support/chat \
     -H "Authorization: Bearer $JWT" \
     -d '{"message":"test"}'
   ```

5. **Set Up Cron Jobs**
   ```bash
   # KB sync every 6 hours
   0 */6 * * * node /app/scripts/sync-kb.js
   
   # Cleanup expired data daily at 2am
   0 2 * * * node /app/scripts/cleanup-expired.js
   ```

6. **Enable Feature Flag**
   ```bash
   SUPPORT_CHAT_ENABLED=true
   ```

7. **Monitor for 24 Hours**
   - Check error rates in Sentry
   - Monitor API latency
   - Check database performance
   - Review first conversations

### Rollback Plan

If critical issues are detected:

1. **Disable feature flag:**
   ```bash
   SUPPORT_CHAT_ENABLED=false
   ```

2. **Revert backend deployment**

3. **Database rollback (if needed):**
   ```sql
   DROP TABLE IF EXISTS chat_message_citations CASCADE;
   DROP TABLE IF EXISTS chat_messages CASCADE;
   DROP TABLE IF EXISTS chat_feedback CASCADE;
   DROP TABLE IF EXISTS chat_sessions CASCADE;
   -- ... etc
   ```

---

## Summary

### What You're Building

6 REST API endpoints that power an AI support chat system with:
- RAG-based knowledge retrieval using pgvector
- OpenAI/Anthropic LLM integration
- Freshdesk ticket escalation
- Comprehensive analytics

### What's Already Done

✅ Frontend chat UI (complete)  
✅ Database schema (9 tables with RLS)  
✅ Admin dashboard UI (ready for data)  
✅ Mock API for testing  
✅ Documentation

### Your Work

🚧 6 API endpoints (detailed specs above)  
🚧 RAG retrieval service  
🚧 LLM integration  
🚧 Freshdesk integration  
🚧 Rate limiting  
🚧 Snapshot sanitization

### Estimated Timeline

- **Week 1:** Core infrastructure + auth
- **Week 2:** Chat endpoint + RAG
- **Week 3:** Feedback + tickets + Freshdesk
- **Week 4:** Admin endpoints + testing + deployment

### Key Resources

- **This Document:** Complete backend specification
- **Database Schema:** `supabase/migrations/20260127000000_support_chat_system.sql`
- **Frontend Code:** `components/chat/ChatWindow.tsx`
- **API Client:** `lib/api-client.ts`
- **Types:** `types/support.ts`

### Questions?

Contact the frontend team or refer to:
- `SUPPORT_CHAT_BACKEND_REQUIREMENTS.md` (detailed API specs)
- `SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md` (frontend implementation)

---

**Document Version:** 1.0  
**Last Updated:** January 28, 2026  
**Status:** Ready for Backend Implementation 🚀
