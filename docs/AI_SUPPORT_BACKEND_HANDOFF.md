# AI Support Chat System - Backend Implementation Handoff

**Document Version:** 1.1 (Streamlined)  
**Created:** January 28, 2026  
**Frontend Status:** ✅ Complete  
**Backend Status:** 🚧 Pending Implementation  
**Database Schema:** ✅ Complete (see `supabase/migrations/20260127000000_support_chat_system.sql`)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [AI Assistant Guidelines](#ai-assistant-guidelines)
4. [Security Requirements](#security-requirements)
5. [Backend API Specifications](#backend-api-specifications)
6. [Database Schema](#database-schema)
7. [RAG & Vector Search](#rag--vector-search)
8. [Freshdesk Integration](#freshdesk-integration)
9. [Implementation Checklist](#implementation-checklist)
10. [Environment Variables](#environment-variables)

---

## Executive Summary

**What We're Building:** An AI support assistant ("Javi") that answers user questions using Freshdesk KB articles via RAG (pgvector), escalates to human support after 2 failed attempts, and tracks conversations for analytics.

**Key Technologies:**
- LLM: OpenAI GPT-4 or Anthropic Claude (enterprise mode, zero data retention)
- Vector DB: PostgreSQL + pgvector extension
- Knowledge Base: Freshdesk Solutions API
- Embeddings: OpenAI text-embedding-3-small (1536 dims)
- Backend: Express.js API

**Status:**
- ✅ Frontend UI, database schema (9 tables), RLS policies, admin dashboard
- 🚧 **Your Work:** 6 REST API endpoints, RAG service, LLM integration, Freshdesk integration, rate limiting

---

## System Overview

**Conversation Flow:**
1. User asks question → AI classifies intent → Retrieves KB articles via RAG → Generates response with citations
2. User confirms: "Resolved" (end) or "Not yet" (increment attempt count)
3. After 2 failed attempts: Offer ticket creation (Starter: manual, Pro/Business: auto with confirmation)

**Architecture:**
```
Frontend (Next.js) 
    ↓ HTTPS + JWT
Express API Backend (6 endpoints)
    ├── RAG Retrieval (pgvector)
    ├── LLM Service (OpenAI/Anthropic)
    ├── Freshdesk Integration
    ├── Snapshot Sanitization
    └── Rate Limiting
    ↓
Supabase PostgreSQL + Freshdesk API + OpenAI API
```

---

## AI Assistant Guidelines

**Character:** "Javi" - Helpful, concise, technically knowledgeable DNS support assistant

**Core Rules:**
1. Answer ONLY from knowledge base (never hallucinate)
2. Always cite KB article sources
3. Keep responses under 200 words
4. Use step-by-step instructions for procedures
5. Escalate billing, security, bugs, and >2 failed attempts

**Response Format (JSON):**
```json
{
  "reply": "Step-by-step answer...",
  "intent": "dns-records|dns-zones|billing|troubleshooting|security|general",
  "confidence": 0.0-1.0,
  "citations": ["article_id_1", "article_id_2"],
  "needsConfirmation": true|false,
  "nextAction": "none|ask_clarifying|offer_ticket|log_bug"
}
```

**Confidence Levels:**
- 0.9-1.0: Direct KB match, clear answer
- 0.7-0.89: Multiple sources, interpretation needed
- 0.5-0.69: Limited coverage, need clarification
- <0.5: No good match, escalate

**Next Action Logic:**
- `none`: High confidence (>0.8)
- `ask_clarifying`: Low confidence (<0.7)
- `offer_ticket`: 2+ failed attempts or explicit request
- `log_bug`: User reports error/broken feature

**Safety Guardrails:**
- Never expose API keys, passwords, tokens, or emails
- Always require user confirmation before creating tickets
- Never claim capabilities beyond providing information

---

## Security Requirements

**1. Zero Data Retention**
- Use OpenAI Enterprise or Anthropic with `data_retention: false`
- Conversations contain sensitive DNS data that must not train models

**2. Data Retention Policy**
- Chat messages: 30 days
- App snapshots: 14 days
- Tickets: Permanent
- Auto-cleanup: `SELECT cleanup_expired_support_data();` (daily cron)

**3. Audit Logging**
- Log: session creation, ticket creation, admin access, feedback
- Reuse existing `audit_logs` table with `handle_audit_log()` trigger

**4. Authorization**
- Strictly org_id-based RLS policies
- Users see own conversations, Admins see org conversations, SuperAdmins see all
- KB documents: `org_id IS NULL` (global) or matches user's org
- RAG filter: `WHERE (org_id IS NULL OR org_id = $user_org_id)`

**5. PII Sanitization**
```typescript
// Remove: emails, IPs, API keys, tokens (>32 chars)
// Keep: UUIDs, routes, UI state, error codes
function containsPII(text: string): boolean {
  const patterns = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,                         // IP
    /\bsk_live_[a-zA-Z0-9]+/,                              // API keys
    /\b[A-Za-z0-9]{32,}\b/,                                // Long tokens
  ];
  return patterns.some(pattern => pattern.test(text));
}
```

**6. Authentication**
- JWT validation via Supabase auth
- Service role key for backend operations (bypasses RLS)
- Role checks for admin endpoints (SuperAdmin only)


---

## Backend API Specifications

**6 REST Endpoints:**

| Method | Endpoint | Purpose | Auth | Rate Limit |
|--------|----------|---------|------|------------|
| POST | /api/support/chat | Main chat with RAG | JWT | Tier-based |
| POST | /api/support/feedback | Submit feedback | JWT | None |
| POST | /api/support/log-bug | Create ticket | JWT | 5/day |
| GET | /api/support/admin/conversations | List conversations | SuperAdmin | None |
| GET | /api/support/admin/metrics | Analytics | SuperAdmin | None |
| GET | /api/support/admin/conversation/:id | Get details | SuperAdmin | None |

### 1. POST /api/support/chat

**Request:**
```typescript
{
  message: string;              // max 2000 chars
  conversationId?: string;      // session UUID
  userId: string;               // from JWT
  orgId?: string;
  tier?: string;                // 'starter'|'pro'|'business'
  attemptCount?: number;
  snapshot?: AppSnapshot;       // sanitize before storage
}
```

**Response:**
```typescript
{
  reply: string;
  citations: SupportCitation[];
  intent: string;
  resolution: { needsConfirmation: boolean };
  nextAction: { type: 'none'|'ask_clarifying'|'offer_ticket'|'log_bug', reason: string };
  conversationId: string;
}
```

**Processing:**
1. Validate JWT + rate limits (Starter: 20/hr, Pro: 50/hr, Business: 100/hr)
2. Sanitize snapshot (remove PII)
3. Create/get chat_session, store user message
4. Generate embedding → vector similarity search (top 5, confidence >0.7)
5. Construct LLM prompt + call OpenAI/Anthropic
6. Store assistant message + citations
7. Determine nextAction (attemptCount ≥2 → offer_ticket)
8. Return response

### 2. POST /api/support/feedback

**Request:** `{ conversationId, resolved: boolean, rating?, comment?, userId }`  
**Response:** `{ success: boolean, message: string }`  
**Processing:** Store feedback, update session status, increment attempt_count if not resolved

### 3. POST /api/support/log-bug

**Request:** `{ subject, description, page_url, user_id, conversationId?, priority? }`  
**Response:** `{ success: boolean, ticket_id: string, ticket_url?: string }`  
**Processing:** Check rate limit (5/day) → get/create Freshdesk contact → create ticket → store mapping → update session

### 4. GET /api/support/admin/conversations

**Query:** `?days=30&status=escalated&page=1&limit=50`  
**Response:** `{ conversations: [], total, page, limit }`  
**Processing:** Verify SuperAdmin → query with filters + joins → paginate

### 5. GET /api/support/admin/metrics

**Query:** `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`  
**Response:** Aggregated metrics (totals, resolution rates, feedback, performance, top intents, by tier)  
**Processing:** Query support_metrics + knowledge_gaps views → calculate derived metrics

### 6. GET /api/support/admin/conversation/:id

**Response:** `{ conversation, messages, feedback, snapshot?, ticket? }`  
**Processing:** Get session + messages + citations + feedback + snapshot + ticket details

---

## Database Schema

**Complete schema:** See `supabase/migrations/20260127000000_support_chat_system.sql` (761 lines)

**9 Tables:**
- `chat_sessions` - Conversation tracking
- `chat_messages` - Individual messages with role, content, intent, confidence
- `chat_message_citations` - Links messages to KB articles
- `chat_feedback` - User ratings (thumbs up/down)
- `app_snapshots` - UI state for debugging (14-day retention)
- `kb_documents` - Knowledge base articles from Freshdesk
- `kb_chunks` - Chunked content with vector embeddings (1536 dims)
- `support_tickets` - Escalated tickets
- `freshdesk_contacts` - User-to-Freshdesk ID mapping

**Critical Vector Index:**
```sql
CREATE INDEX idx_kb_chunks_embedding 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

**Vector Search Query:**
```sql
SELECT chunk_text, title, 1 - (embedding <=> $1::vector) AS confidence
FROM kb_chunks kbc
JOIN kb_documents kbd ON kbd.id = kbc.document_id
WHERE (kbd.org_id IS NULL OR kbd.org_id = $2)
  AND 1 - (embedding <=> $1::vector) > 0.7
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

**Helper Functions:**
- `get_conversation_summary(session_id)` - Returns JSON of session + messages for ticket creation
- `cleanup_expired_support_data()` - Deletes expired chats (>30 days) and snapshots (>14 days)

**Views:**
- `support_metrics` - Daily aggregates (conversations, resolution rate, deflection rate)
- `knowledge_gaps` - Low confidence queries needing KB improvement

---

## RAG & Vector Search

**Chunking Strategy:**
- **Size:** 500 words per chunk
- **Overlap:** 100 words between chunks
- **Preserve:** Headers and paragraph boundaries

**Embeddings:**
- **Model:** OpenAI text-embedding-3-small (1536 dimensions)
- **Batch:** Up to 100 chunks per API call

```typescript
const embeddings = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: chunks.map(c => c.chunk_text)
});
```

**Vector Search:**
```sql
SELECT chunk_text, 1 - (embedding <=> $1::vector) AS confidence
FROM kb_chunks
WHERE (org_id IS NULL OR org_id = $2) 
  AND 1 - (embedding <=> $1::vector) > 0.7
ORDER BY embedding <=> $1::vector
LIMIT 5;
```
- `<=>` = cosine distance (lower = more similar)
- Return top 5 chunks with confidence >0.7

**Relevance Boosting (optional):**
- Recently updated (<30 days): +5%
- Exact title match: +15%
- High feedback (>10 thumbs up, >80% rate): +10%

---

## Freshdesk Integration

**Authentication:** Basic Auth with `Base64(api_key:X)`

**Required Custom Fields (configure in Freshdesk):**
- Contact: `cf_javelina_user_id`, `cf_javelina_org_id`, `cf_javelina_org_name`
- Ticket: `cf_page_url`, `cf_conversation_id`

**Key API Calls:**

1. **List Articles** (KB sync every 6 hours)
   ```
   GET /api/v2/solutions/articles?per_page=100&page=1
   ```
   - Filter status=2 (published only)
   - Chunk content (500 words, 100 overlap)
   - Generate embeddings, store in kb_chunks

2. **Create Contact** (if not exists)
   ```
   POST /api/v2/contacts
   { name, email, custom_fields: { cf_javelina_user_id, cf_javelina_org_id } }
   ```
   - Search by email first
   - Store mapping in freshdesk_contacts table

3. **Create Ticket**
   ```
   POST /api/v2/tickets
   { 
     subject, 
     description,  // Include conversation history
     email, 
     priority: 2,  // 1=low, 2=medium, 3=high, 4=urgent
     source: 9,    // feedback_widget
     tags: ["javelina-chat"],
     custom_fields: { cf_page_url, cf_conversation_id }
   }
   ```

**Sync Job (cron: `0 */6 * * *`):**
1. Fetch all published articles
2. Upsert kb_documents
3. Chunk + generate embeddings (batch 100)
4. Upsert kb_chunks
5. Cleanup deleted articles


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

## Summary

**What You're Building:** 6 REST API endpoints for AI support chat with RAG (pgvector), LLM (OpenAI/Anthropic), and Freshdesk integration.

**Already Complete:** Frontend UI, database schema (9 tables), admin dashboard, mock API

**Your Work:** 6 endpoints + RAG service + LLM integration + Freshdesk sync + rate limiting

**Timeline:** 4 weeks (infrastructure → chat+RAG → feedback+tickets → admin+deployment)

**Key Files:**
- This document (complete spec)
- `supabase/migrations/20260127000000_support_chat_system.sql` (database)
- `SUPPORT_CHAT_BACKEND_REQUIREMENTS.md` (detailed API docs)
- `SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md` (frontend implementation)

---

**Document Version:** 1.1 (Streamlined)  
**Last Updated:** January 28, 2026  
**Status:** Ready for Backend Implementation 🚀
