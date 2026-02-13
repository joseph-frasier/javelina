# Support Chat Backend API Requirements

## Document Overview

This document provides comprehensive requirements for implementing the support chat backend API. The backend team should use this as the single source of truth for implementing all 6 endpoints and supporting infrastructure.

**Status:** Ready for Implementation  
**Created:** January 27, 2026  
**Frontend Implementation:** Complete (see `components/chat/ChatWindow.tsx`)  
**Database Schema:** Complete (see `supabase/migrations/20260127000000_support_chat_system.sql`)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [API Endpoints](#api-endpoints)
3. [Backend Services](#backend-services)
4. [Database Requirements](#database-requirements)
5. [Authentication & Authorization](#authentication--authorization)
6. [Environment Variables](#environment-variables)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)
9. [Deployment Checklist](#deployment-checklist)
10. [Testing Recommendations](#testing-recommendations)

---

## System Architecture

### High-Level Flow

```
┌─────────────┐
│   Frontend  │
│  (Next.js)  │
└──────┬──────┘
       │ HTTPS + JWT
       ▼
┌─────────────────────────────────────────┐
│         Express API Backend             │
│  ┌──────────────────────────────────┐  │
│  │   /api/support/chat              │  │
│  │   /api/support/feedback          │  │
│  │   /api/support/log-bug           │  │
│  │   /api/support/admin/*           │  │
│  └──────────┬───────────────────────┘  │
│             │                            │
│  ┌──────────▼───────────────────────┐  │
│  │    Backend Services Layer        │  │
│  │  • Freshdesk Integration         │  │
│  │  • RAG Retrieval (pgvector)      │  │
│  │  • LLM Service (OpenAI/Anthropic)│  │
│  │  • Snapshot Sanitization         │  │
│  └──────────┬───────────────────────┘  │
└─────────────┼───────────────────────────┘
              │
     ┌────────┴─────────┬──────────────┬─────────────┐
     ▼                  ▼              ▼             ▼
┌─────────┐      ┌──────────┐   ┌──────────┐  ┌──────────┐
│Supabase │      │Freshdesk │   │  OpenAI  │  │Anthropic │
│PostgreSQL│      │   API    │   │   API    │  │   API    │
└─────────┘      └──────────┘   └──────────┘  └──────────┘
```

### Request Flow Example

**User sends message:**
1. Frontend calls `POST /api/support/chat` with JWT token
2. Backend validates JWT, extracts user context
3. Backend sanitizes app snapshot (removes PII)
4. Backend classifies intent using LLM
5. Backend performs RAG retrieval with pgvector similarity search
6. Backend generates response with citations
7. Backend stores conversation in PostgreSQL
8. Backend returns response to frontend

**Escalation to ticket:**
1. User clicks "Create Ticket" button
2. Frontend calls `POST /api/support/log-bug`
3. Backend retrieves conversation history
4. Backend creates Freshdesk contact (if not exists)
5. Backend creates Freshdesk ticket with conversation context
6. Backend stores ticket mapping in PostgreSQL
7. Backend returns success response

---

## API Endpoints

### 1. POST /api/support/chat

**Purpose:** Process a user's support chat message and return AI-generated response with citations.

**Authentication:** Required (JWT)

**Rate Limiting:** Tier-based (see [Rate Limiting](#rate-limiting))

#### Request

```typescript
interface ChatRequest {
  message: string;                    // User's message (max 2000 chars)
  conversationId?: string;            // Existing conversation UUID (optional for first message)
  entryPoint?: string;                // 'chat_widget' | 'help_button' | 'error_page'
  pageUrl?: string;                   // Current page URL for context
  userId: string;                     // Supabase auth user ID
  orgId?: string;                     // Organization ID (if in org context)
  tier?: string;                      // 'starter' | 'pro' | 'business'
  attemptCount?: number;              // Number of failed resolution attempts (default: 0)
  snapshot?: AppSnapshot;             // UI state snapshot (sanitized by backend)
}

interface AppSnapshot {
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
```

**Example Request:**

```typescript
POST /api/support/chat
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "message": "How do I add an A record to my zone?",
  "entryPoint": "chat_widget",
  "pageUrl": "https://app.javelina.com/zone/example.com",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "orgId": "650e8400-e29b-41d4-a716-446655440000",
  "tier": "pro",
  "attemptCount": 0,
  "snapshot": {
    "route": "/zone/example.com",
    "view": "ZoneDetails",
    "ui_state": {
      "tab": "records",
      "theme": "dark"
    },
    "entities_on_screen": {
      "org_id": "650e8400-e29b-41d4-a716-446655440000",
      "zone_id": "750e8400-e29b-41d4-a716-446655440000"
    }
  }
}
```

#### Response

```typescript
interface ChatResponse {
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

interface SupportCitation {
  title: string;                      // Article title
  articleId: string;                  // Freshdesk or internal article ID
  javelinaUrl: string;                // Proxied URL for tracking clicks
  confidence: number;                 // Relevance score (0.0 to 1.0)
  lastUpdated: string;                // ISO 8601 timestamp
}
```

**Example Response:**

```json
{
  "reply": "To add an A record to your zone:\n\n1. Navigate to your zone (example.com)\n2. Click 'Add Record' button\n3. Select 'A' as the record type\n4. Enter the hostname (e.g., 'www' or '@' for root)\n5. Enter the IPv4 address\n6. Set the TTL (default is 3600 seconds)\n7. Click 'Save'\n\nYour A record will be created immediately.",
  "citations": [
    {
      "title": "How to Add a New DNS Record",
      "articleId": "1003",
      "javelinaUrl": "https://app.javelina.com/kb/dns-records/add",
      "confidence": 0.92,
      "lastUpdated": "2024-01-15T11:00:00Z"
    },
    {
      "title": "Understanding DNS Record Types",
      "articleId": "1002",
      "javelinaUrl": "https://app.javelina.com/kb/dns-records/types",
      "confidence": 0.87,
      "lastUpdated": "2024-01-15T10:30:00Z"
    }
  ],
  "intent": "dns-records",
  "resolution": {
    "needsConfirmation": true
  },
  "nextAction": {
    "type": "none",
    "reason": "High confidence response with clear steps"
  },
  "conversationId": "850e8400-e29b-41d4-a716-446655440000"
}
```

#### Implementation Steps

1. **Validate Request:**
   - Check JWT token validity
   - Validate message length (1-2000 chars)
   - Check rate limits (tier-based)

2. **Sanitize Snapshot:**
   - Remove PII from snapshot (emails, API keys, tokens)
   - Keep only relevant UI state for context
   - Store sanitized snapshot in `app_snapshots` table

3. **Create/Retrieve Conversation:**
   - If no `conversationId`, create new `chat_sessions` record
   - If `conversationId` exists, validate user ownership
   - Update `last_message_at` timestamp

4. **Store User Message:**
   - Insert into `chat_messages` with role='user'
   - Link to session and snapshot

5. **Classify Intent:**
   - Use LLM to classify message intent (dns-zones, dns-records, billing, troubleshooting, etc.)
   - Store in `chat_messages.intent` field

6. **RAG Retrieval:**
   - Generate embedding for user message (OpenAI text-embedding-3-small)
   - Query `kb_chunks` with pgvector similarity search
   - Filter by user's org visibility permissions
   - Retrieve top 3-5 most relevant chunks (confidence > 0.7)

7. **Generate Response:**
   - Send prompt to LLM with:
     - User message
     - Retrieved KB chunks
     - Conversation history (last 5 messages)
     - User context (tier, org)
   - Parse LLM response
   - Determine if resolution confirmation is needed

8. **Store Assistant Message:**
   - Insert into `chat_messages` with role='assistant'
   - Store intent, confidence score, response_time_ms
   - Link citations via `chat_message_citations`

9. **Determine Next Action:**
   - If `attemptCount >= 2` → `offer_ticket`
   - If confidence < 0.6 → `ask_clarifying`
   - If message contains "bug", "error", "broken" → `log_bug`
   - Otherwise → `none`

10. **Return Response:**
    - Format citations with Javelina proxy URLs
    - Return structured response

#### Error Responses

```typescript
// 400 Bad Request
{
  "error": "Invalid request",
  "message": "Message cannot be empty",
  "code": "INVALID_MESSAGE"
}

// 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Invalid or expired JWT token",
  "code": "INVALID_TOKEN"
}

// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "You have reached your hourly limit of 50 chat messages. Please try again in 45 minutes.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 2700  // seconds
}

// 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "Failed to generate response",
  "code": "LLM_SERVICE_ERROR"
}
```

---

### 2. POST /api/support/feedback

**Purpose:** Submit user feedback on conversation quality.

**Authentication:** Required (JWT)

**Rate Limiting:** None (feedback is encouraged)

#### Request

```typescript
interface FeedbackRequest {
  conversationId: string;             // UUID of conversation
  resolved: boolean;                  // Whether issue was resolved
  rating?: number;                    // 1-5 star rating (optional)
  comment?: string;                   // User feedback text (optional, max 500 chars)
  userId: string;                     // Supabase auth user ID
  orgId?: string;                     // Organization ID
  tier?: string;                      // User's subscription tier
}
```

**Example Request:**

```typescript
POST /api/support/feedback
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "conversationId": "850e8400-e29b-41d4-a716-446655440000",
  "resolved": true,
  "rating": 5,
  "comment": "Very helpful! Solved my problem quickly.",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "orgId": "650e8400-e29b-41d4-a716-446655440000",
  "tier": "pro"
}
```

#### Response

```typescript
interface FeedbackResponse {
  success: boolean;
  message: string;
}
```

**Example Response:**

```json
{
  "success": true,
  "message": "Feedback submitted successfully"
}
```

#### Implementation Steps

1. **Validate Request:**
   - Check JWT token validity
   - Verify conversation exists and belongs to user
   - Validate rating (1-5 if provided)

2. **Store Feedback:**
   - Insert into `chat_feedback` table
   - Link to session_id and last message_id

3. **Update Session Status:**
   - Update `chat_sessions.resolution_status`:
     - If `resolved: true` → 'resolved'
     - If `resolved: false` → increment `attempt_count`
   - Update `last_message_at` timestamp

4. **Mark Failed Attempts:**
   - If not resolved, mark last assistant message as `failed_attempt: true`
   - Store failure_reason based on context

5. **Return Response:**
   - Simple success confirmation

#### Error Responses

```typescript
// 404 Not Found
{
  "error": "Conversation not found",
  "message": "No conversation found with ID 850e8400-e29b-41d4-a716-446655440000",
  "code": "CONVERSATION_NOT_FOUND"
}

// 403 Forbidden
{
  "error": "Access denied",
  "message": "You do not have permission to submit feedback for this conversation",
  "code": "FORBIDDEN"
}
```

---

### 3. POST /api/support/log-bug

**Purpose:** Create a Freshdesk support ticket (escalation path).

**Authentication:** Required (JWT)

**Rate Limiting:** 5 tickets per day per user (all tiers)

#### Request

```typescript
interface LogBugRequest {
  subject: string;                    // Ticket subject (max 200 chars)
  description: string;                // Ticket description (max 5000 chars)
  page_url: string;                   // URL where issue occurred
  user_id: string;                    // Supabase auth user ID
  conversationId?: string;            // Link to chat session (optional)
  priority?: 1 | 2 | 3 | 4;          // 1=low, 2=medium, 3=high, 4=urgent (default: 2)
}
```

**Example Request:**

```typescript
POST /api/support/log-bug
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "subject": "DNS records not saving",
  "description": "When I try to add a new A record, the form submits but the record doesn't appear in the list. I've tried refreshing and logging out/in but the issue persists.",
  "page_url": "https://app.javelina.com/zone/example.com",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "conversationId": "850e8400-e29b-41d4-a716-446655440000",
  "priority": 3
}
```

#### Response

```typescript
interface LogBugResponse {
  success: boolean;
  ticket_id: string;                  // Freshdesk ticket ID
  ticket_url?: string;                // Direct link to ticket
  message: string;
}
```

**Example Response:**

```json
{
  "success": true,
  "ticket_id": "10001",
  "ticket_url": "https://javelina.freshdesk.com/helpdesk/tickets/10001",
  "message": "Support ticket created successfully. Our team will respond within 24 hours."
}
```

#### Implementation Steps

1. **Validate Request:**
   - Check JWT token validity
   - Check rate limits (5 per day)
   - Validate subject and description lengths

2. **Get User Profile:**
   - Fetch user from Supabase auth
   - Get user's email, name, organization

3. **Retrieve Conversation (if provided):**
   - Query conversation with RLS policies
   - Get full message history using `get_conversation_summary()` function
   - Format conversation as ticket description context

4. **Get or Create Freshdesk Contact:**
   - Call `freshdeskService.getOrCreateContact()`
   - Map Javelina user to Freshdesk contact
   - Store/update in `freshdesk_contacts` table

5. **Create Freshdesk Ticket:**
   - Call `freshdeskService.createTicket()`
   - Include:
     - Subject
     - Description + conversation history (if available)
     - Priority
     - Custom fields: user_id, org_id, page_url
     - Tags: source='javelina-chat'

6. **Store Ticket Record:**
   - Insert into `support_tickets` table
   - Link to session_id (if from conversation)
   - Store Freshdesk ticket ID and URL

7. **Update Session Status:**
   - Update `chat_sessions`:
     - Set `ticket_created: true`
     - Set `ticket_id: <freshdesk_ticket_id>`
     - Set `resolution_status: 'escalated'`

8. **Return Response:**
   - Include ticket ID and tracking URL

#### Error Responses

```typescript
// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "message": "You have reached your daily limit of 5 support tickets. Please try again tomorrow.",
  "code": "TICKET_RATE_LIMIT_EXCEEDED",
  "retryAfter": 86400  // seconds until reset
}

// 503 Service Unavailable
{
  "error": "Service unavailable",
  "message": "Freshdesk service is temporarily unavailable. Please try again later.",
  "code": "FRESHDESK_UNAVAILABLE"
}
```

---

### 4. GET /api/support/admin/conversations

**Purpose:** Admin dashboard - list all support conversations with filters.

**Authentication:** Required (JWT + SuperAdmin role)

**Rate Limiting:** None for admins

#### Request

```typescript
interface GetConversationsRequest {
  days?: number;                      // Filter by last N days (default: 7)
  status?: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  orgId?: string;                     // Filter by organization
  page?: number;                      // Pagination (default: 1)
  limit?: number;                     // Results per page (default: 50, max: 100)
}
```

**Example Request:**

```
GET /api/support/admin/conversations?days=30&status=escalated&page=1&limit=20
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```typescript
interface GetConversationsResponse {
  conversations: SupportConversation[];
  total: number;
  page: number;
  limit: number;
}

interface SupportConversation {
  id: string;
  user_id: string;
  org_id: string;
  entry_point: string;
  page_url: string;
  resolution_status: 'pending' | 'resolved' | 'escalated' | 'abandoned';
  ticket_created: boolean;
  ticket_id: string | null;
  attempt_count: number;
  created_at: string;
  last_message_at: string;
  message_count: number;              // Computed from join
  user_email?: string;                // Joined from auth.users
  org_name?: string;                  // Joined from organizations
}
```

**Example Response:**

```json
{
  "conversations": [
    {
      "id": "850e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "org_id": "650e8400-e29b-41d4-a716-446655440000",
      "entry_point": "chat_widget",
      "page_url": "https://app.javelina.com/zone/example.com",
      "resolution_status": "escalated",
      "ticket_created": true,
      "ticket_id": "10001",
      "attempt_count": 2,
      "created_at": "2024-01-27T14:30:00Z",
      "last_message_at": "2024-01-27T14:45:00Z",
      "message_count": 6,
      "user_email": "john@example.com",
      "org_name": "Acme Inc"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

#### Implementation Steps

1. **Validate Admin Access:**
   - Check JWT token
   - Verify user has SuperAdmin role in `user_roles` table

2. **Build Query:**
   - Query `chat_sessions` with joins to:
     - `auth.users` (for email)
     - `organizations` (for name)
     - Aggregate `chat_messages` count
   - Apply filters (days, status, orgId)
   - Apply pagination

3. **Return Results:**
   - Include total count for pagination
   - Include page metadata

---

### 5. GET /api/support/admin/metrics

**Purpose:** Admin dashboard - support metrics and analytics.

**Authentication:** Required (JWT + SuperAdmin role)

**Rate Limiting:** None for admins

#### Request

```typescript
interface GetMetricsRequest {
  start_date?: string;                // ISO 8601 date (default: 30 days ago)
  end_date?: string;                  // ISO 8601 date (default: today)
  orgId?: string;                     // Filter by organization (optional)
}
```

**Example Request:**

```
GET /api/support/admin/metrics?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```typescript
interface MetricsResponse {
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
```

**Example Response:**

```json
{
  "period": {
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "days": 31
  },
  "totals": {
    "conversations": 1453,
    "messages": 5821,
    "unique_users": 876
  },
  "resolution": {
    "resolved": 1122,
    "escalated": 231,
    "abandoned": 78,
    "pending": 22,
    "resolution_rate": 77.2,
    "deflection_rate": 84.1
  },
  "feedback": {
    "total_ratings": 892,
    "avg_rating": 0.83,
    "thumbs_up": 742,
    "thumbs_down": 150,
    "thumbs_up_rate": 83.2
  },
  "performance": {
    "avg_response_time_ms": 1234,
    "avg_messages_per_conversation": 4.0,
    "avg_session_duration_seconds": 342
  },
  "top_intents": [
    { "intent": "dns-records", "count": 456, "percentage": 31.4 },
    { "intent": "troubleshooting", "count": 378, "percentage": 26.0 },
    { "intent": "billing", "count": 234, "percentage": 16.1 }
  ],
  "by_tier": {
    "starter": { "conversations": 623, "resolution_rate": 74.5 },
    "pro": { "conversations": 567, "resolution_rate": 79.2 },
    "business": { "conversations": 263, "resolution_rate": 81.4 }
  },
  "by_entry_point": {
    "chat_widget": 1124,
    "help_button": 267,
    "error_page": 62
  }
}
```

#### Implementation Steps

1. **Validate Admin Access:**
   - Check JWT token
   - Verify SuperAdmin role

2. **Query Analytics:**
   - Use `support_metrics` view for aggregated daily metrics
   - Use `knowledge_gaps` view for low-confidence topics
   - Query `chat_sessions`, `chat_messages`, `chat_feedback` with aggregations
   - Apply date range and org filters

3. **Calculate Derived Metrics:**
   - Resolution rate = resolved / total
   - Deflection rate = resolved without ticket / total
   - Thumbs up rate = thumbs up / total ratings

4. **Return Structured Response:**
   - Group metrics by category
   - Include percentages for easier interpretation

---

### 6. GET /api/support/admin/conversation/:id

**Purpose:** Admin dashboard - get full conversation details with messages.

**Authentication:** Required (JWT + SuperAdmin role)

**Rate Limiting:** None for admins

#### Request

```
GET /api/support/admin/conversation/850e8400-e29b-41d4-a716-446655440000
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Response

```typescript
interface ConversationDetailResponse {
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

interface SupportMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent: string | null;
  confidence: number | null;
  failed_attempt: boolean;
  failure_reason: string | null;
  response_time_ms: number | null;
  created_at: string;
  citations?: SupportCitation[];       // Joined from chat_message_citations
}

interface ChatFeedback {
  id: string;
  message_id: string;
  rating: 'thumbs_up' | 'thumbs_down';
  resolved: boolean;
  reason_code: string | null;
  comment: string | null;
  created_at: string;
}
```

**Example Response:**

```json
{
  "conversation": {
    "id": "850e8400-e29b-41d4-a716-446655440000",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "org_id": "650e8400-e29b-41d4-a716-446655440000",
    "entry_point": "chat_widget",
    "page_url": "https://app.javelina.com/zone/example.com",
    "resolution_status": "escalated",
    "ticket_created": true,
    "ticket_id": "10001",
    "attempt_count": 2,
    "created_at": "2024-01-27T14:30:00Z",
    "last_message_at": "2024-01-27T14:45:00Z",
    "message_count": 6,
    "user_email": "john@example.com",
    "org_name": "Acme Inc"
  },
  "messages": [
    {
      "id": "msg-1",
      "session_id": "850e8400-e29b-41d4-a716-446655440000",
      "role": "user",
      "content": "How do I add an A record?",
      "intent": "dns-records",
      "confidence": null,
      "failed_attempt": false,
      "failure_reason": null,
      "response_time_ms": null,
      "created_at": "2024-01-27T14:30:00Z"
    },
    {
      "id": "msg-2",
      "session_id": "850e8400-e29b-41d4-a716-446655440000",
      "role": "assistant",
      "content": "To add an A record...",
      "intent": "dns-records",
      "confidence": 0.92,
      "failed_attempt": false,
      "failure_reason": null,
      "response_time_ms": 1234,
      "created_at": "2024-01-27T14:30:15Z",
      "citations": [
        {
          "title": "How to Add a New DNS Record",
          "articleId": "1003",
          "javelinaUrl": "https://app.javelina.com/kb/dns-records/add",
          "confidence": 0.92,
          "lastUpdated": "2024-01-15T11:00:00Z"
        }
      ]
    }
  ],
  "feedback": [
    {
      "id": "fb-1",
      "message_id": "msg-2",
      "rating": "thumbs_down",
      "resolved": false,
      "reason_code": "not_resolved",
      "comment": "Still confused about the hostname field",
      "created_at": "2024-01-27T14:32:00Z"
    }
  ],
  "snapshot": {
    "route": "/zone/example.com",
    "view": "ZoneDetails",
    "ui_state": {
      "tab": "records",
      "theme": "dark"
    },
    "entities_on_screen": {
      "org_id": "650e8400-e29b-41d4-a716-446655440000",
      "zone_id": "750e8400-e29b-41d4-a716-446655440000"
    }
  },
  "ticket": {
    "id": "ticket-uuid-1",
    "freshdesk_ticket_id": "10001",
    "freshdesk_ticket_url": "https://javelina.freshdesk.com/helpdesk/tickets/10001",
    "status": "open",
    "created_at": "2024-01-27T14:45:00Z"
  }
}
```

#### Implementation Steps

1. **Validate Admin Access:**
   - Check JWT token
   - Verify SuperAdmin role

2. **Query Conversation:**
   - Get session from `chat_sessions`
   - Join with users and organizations for context

3. **Query Messages:**
   - Get all messages from `chat_messages`
   - Join with `chat_message_citations` for citations
   - Order by created_at ascending

4. **Query Feedback:**
   - Get all feedback from `chat_feedback`

5. **Query Snapshot:**
   - Get latest snapshot from `app_snapshots` linked to messages

6. **Query Ticket (if exists):**
   - Get ticket from `support_tickets`
   - Include Freshdesk details

7. **Return Structured Response:**
   - Include all related data for admin review

---

## Backend Services

### 1. Freshdesk Integration Service

**Purpose:** Sync knowledge base articles, manage contacts, create tickets.

**Reference Implementation:** `lib/support/freshdesk-service.ts`

#### Key Methods

```typescript
class FreshdeskService {
  // Knowledge Base
  syncArticles(): Promise<SyncArticlesResult>
  getArticle(articleId: number): Promise<GetArticleResult>
  
  // Contact Management
  getOrCreateContact(
    user: { id: string; email: string; full_name?: string },
    org?: { id: string; name: string }
  ): Promise<ContactResult>
  
  // Ticket Management
  createTicket(params: CreateTicketParams): Promise<TicketResult>
  getTicket(ticketId: number): Promise<TicketResult>
  
  // Configuration
  isEnabled(): boolean
  isConfigured(): boolean
}
```

#### Implementation Requirements

1. **Article Sync Job:**
   - Cron job runs every 6 hours
   - Fetches all published articles from Freshdesk
   - Updates `kb_documents` table
   - Generates embeddings for new/updated articles
   - Stores embeddings in `kb_chunks` table

2. **Contact Mapping:**
   - Search Freshdesk by email first
   - Create new contact if not found
   - Store mapping in `freshdesk_contacts` table
   - Include custom fields: `cf_javelina_user_id`, `cf_javelina_org_id`

3. **Ticket Creation:**
   - Set source = 9 (feedback_widget)
   - Include custom fields: page_url, user_id, org_id
   - Tag with 'javelina-chat'
   - Store ticket mapping in `support_tickets`

4. **Error Handling:**
   - Retry failed API calls (3 attempts with exponential backoff)
   - Log errors to monitoring service
   - Fallback to mock mode if service unavailable

#### Environment Variables

```bash
FRESHDESK_DOMAIN=javelina              # Subdomain (javelina.freshdesk.com)
FRESHDESK_API_KEY=your_api_key_here   # API key from Freshdesk admin
FRESHDESK_ENABLED=true                 # Enable/disable integration
```

---

### 2. RAG Retrieval Service (pgvector)

**Purpose:** Semantic search over knowledge base using vector embeddings.

#### Implementation Requirements

1. **Embedding Generation:**
   - Use OpenAI `text-embedding-3-small` model (1536 dimensions)
   - Generate embeddings for:
     - User messages (at query time)
     - KB article chunks (during sync)
   - Cache embeddings to reduce API calls

2. **Vector Search:**
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

3. **Chunking Strategy:**
   - Split articles into 500-word chunks
   - 100-word overlap between chunks
   - Preserve context boundaries (headers, paragraphs)
   - Store chunk_index for reconstruction

4. **Relevance Scoring:**
   - Cosine similarity score (0.0 to 1.0)
   - Confidence threshold: 0.7 for inclusion
   - Boost scores for:
     - Recently updated articles (+5%)
     - Articles with high thumbs_up count (+10%)
     - Exact title/tag matches (+15%)

#### PostgreSQL Configuration

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create IVFFlat index for fast similarity search
CREATE INDEX idx_kb_chunks_embedding 
ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Analyze table for query optimization
ANALYZE kb_chunks;
```

---

### 3. LLM Service

**Purpose:** Generate AI responses with citations and intent classification.

#### Provider Options

**Option A: OpenAI (Recommended)**
- Model: `gpt-4-turbo-preview` or `gpt-3.5-turbo`
- Pros: Best performance, function calling support
- Cons: Higher cost

**Option B: Anthropic Claude**
- Model: `claude-3-sonnet-20240229`
- Pros: Lower cost, excellent instruction following
- Cons: Different API structure

#### Prompt Template

```typescript
const systemPrompt = `You are Javi, a helpful Javelina support assistant. Your role is to help users with DNS management, zones, records, and troubleshooting.

## Guidelines:
- Be concise and actionable (max 200 words per response)
- Cite knowledge base articles when available
- If unsure, ask clarifying questions
- Escalate to human support if:
  - User has billing/payment issues
  - Bug reports that need investigation
  - Complex technical issues beyond documentation

## Knowledge Base Context:
${retrievedChunks.map(chunk => `### ${chunk.title}\n${chunk.text}`).join('\n\n')}

## User Context:
- Subscription Tier: ${tier}
- Current Page: ${pageUrl}
- Organization: ${orgName}

## Conversation History:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

## Current Request:
User: ${userMessage}

Respond in JSON format:
{
  "reply": "Your response here",
  "intent": "dns-records|dns-zones|billing|troubleshooting|general",
  "confidence": 0.0-1.0,
  "citations": ["article_id_1", "article_id_2"],
  "needsConfirmation": true|false,
  "nextAction": "none|ask_clarifying|offer_ticket|log_bug"
}`;
```

#### Response Generation

1. **Call LLM:**
   ```typescript
   const response = await openai.chat.completions.create({
     model: 'gpt-4-turbo-preview',
     messages: [
       { role: 'system', content: systemPrompt },
       { role: 'user', content: userMessage }
     ],
     response_format: { type: 'json_object' },
     temperature: 0.7,
     max_tokens: 500
   });
   ```

2. **Parse Response:**
   - Extract JSON from LLM response
   - Validate structure
   - Map article IDs to citations

3. **Format Citations:**
   - Look up article details from `kb_documents`
   - Generate Javelina proxy URLs
   - Include confidence scores

#### Error Handling

- Timeout after 30 seconds
- Retry failed requests (2 attempts)
- Fallback response if LLM unavailable:
  ```
  "I apologize, but I'm having trouble processing your request right now. 
   Please try again in a moment, or contact support directly at support@javelina.com."
  ```

---

### 4. Snapshot Sanitization Service

**Purpose:** Remove PII and sensitive data from app snapshots before storage.

#### Sanitization Rules

```typescript
function sanitizeSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    // Keep route and view
    route: snapshot.route,
    view: snapshot.view,
    
    // Sanitize UI state
    ui_state: {
      theme: snapshot.ui_state?.theme,
      modal_open: snapshot.ui_state?.modal_open,
      tab: snapshot.ui_state?.tab,
      filter: snapshot.ui_state?.filter,
      sort: snapshot.ui_state?.sort,
      // Remove search_query (may contain emails/domains)
    },
    
    // Keep entity IDs (UUIDs are safe)
    entities_on_screen: snapshot.entities_on_screen,
    
    // Sanitize user_action
    user_action: sanitizeUserAction(snapshot.user_action),
    
    // Sanitize errors
    errors: snapshot.errors?.map(err => ({
      code: err.code,
      field: err.field,
      // Remove error message if it contains email/IP/API key patterns
      message: containsPII(err.message) ? '[REDACTED]' : err.message
    })),
    
    // Sanitize network errors
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
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/,                         // IP address
    /\bsk_live_[a-zA-Z0-9]+/,                              // Stripe key
    /\bpk_live_[a-zA-Z0-9]+/,                              // Stripe publishable key
    /\b[A-Za-z0-9]{32,}\b/,                                // Long tokens/hashes
  ];
  return patterns.some(pattern => pattern.test(text));
}
```

#### Storage

- Store sanitized snapshots in `app_snapshots` table
- Link to chat messages via `snapshot_id` foreign key
- Auto-expire after 14 days (see migration)

---

## Database Requirements

### Schema Overview

**Reference:** `supabase/migrations/20260127000000_support_chat_system.sql`

### Key Tables

1. **chat_sessions** - Conversation tracking
2. **chat_messages** - Individual messages with role, content, citations
3. **chat_message_citations** - Links messages to KB documents
4. **chat_feedback** - User ratings and feedback
5. **app_snapshots** - UI state for debugging
6. **kb_documents** - Knowledge base articles
7. **kb_chunks** - Chunked content with embeddings (pgvector)
8. **support_tickets** - Escalated tickets
9. **freshdesk_contacts** - User-to-Freshdesk mapping

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- **Users:** Can view/edit their own data only
- **Admins:** Can view all data for their organization
- **SuperAdmins:** Can view all data (via admin endpoints)
- **Service Role:** Full access for backend operations

### Indexes

Performance-critical indexes:

```sql
-- Vector similarity search (IVFFlat)
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Session lookups
CREATE INDEX idx_chat_sessions_user_org ON chat_sessions(user_id, org_id);

-- Message queries
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);

-- Citation lookups
CREATE INDEX idx_chat_message_citations_message ON chat_message_citations(message_id);
```

### Helper Functions

```sql
-- Get conversation summary for ticket creation
get_conversation_summary(p_session_id uuid) RETURNS jsonb

-- Cleanup expired data (cron job)
cleanup_expired_support_data() RETURNS integer
```

### Data Retention

- **Chat sessions:** 30 days (configurable)
- **App snapshots:** 14 days (configurable)
- **Tickets:** Permanent (audit trail)
- **KB documents:** Permanent (updated via sync)

---

## Authentication & Authorization

### JWT Token Validation

All endpoints require valid Supabase JWT token:

```typescript
import { createClient } from '@supabase/supabase-js';

async function authenticateRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError('Missing or invalid Authorization header', 401);
  }

  const token = authHeader.substring(7);
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new ApiError('Invalid or expired token', 401);
  }

  return user;
}
```

### Role-Based Access Control (RBAC)

#### User Roles

- **User:** Access own conversations only
- **Admin:** Access organization conversations
- **SuperAdmin:** Access all conversations + admin endpoints

#### Permission Checks

```typescript
async function checkAdminAccess(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();
  
  return data?.role === 'SuperAdmin';
}

async function checkOrgAccess(userId: string, orgId: string): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .single();
  
  return data?.role in ['SuperAdmin', 'Admin'];
}
```

#### Endpoint Access Matrix

| Endpoint | User | Admin | SuperAdmin |
|----------|------|-------|------------|
| POST /chat | ✓ (own) | ✓ (org) | ✓ (all) |
| POST /feedback | ✓ (own) | ✓ (org) | ✓ (all) |
| POST /log-bug | ✓ (own) | ✓ (org) | ✓ (all) |
| GET /admin/conversations | ✗ | ✗ | ✓ |
| GET /admin/metrics | ✗ | ✗ | ✓ |
| GET /admin/conversation/:id | ✗ | ✗ | ✓ |

---

## Environment Variables

### Required Variables

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here

# Freshdesk Configuration
FRESHDESK_DOMAIN=javelina                    # Subdomain only
FRESHDESK_API_KEY=your_freshdesk_api_key
FRESHDESK_ENABLED=true                       # Set to 'false' for mock mode

# OpenAI Configuration (for embeddings + LLM)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORG_ID=org-your-openai-org           # Optional

# Anthropic Configuration (alternative to OpenAI)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key # Optional

# Application Configuration
NODE_ENV=production                          # production | development
API_PORT=3001                                # Express server port
FRONTEND_URL=https://app.javelina.com       # For CORS
LOG_LEVEL=info                               # debug | info | warn | error

# Rate Limiting (optional overrides)
RATE_LIMIT_CHAT_STARTER=20                  # Chats per hour for Starter tier
RATE_LIMIT_CHAT_PRO=50                      # Chats per hour for Pro tier
RATE_LIMIT_CHAT_BUSINESS=100                # Chats per hour for Business tier
RATE_LIMIT_TICKET_DAILY=5                   # Tickets per day (all tiers)

# Feature Flags
SUPPORT_CHAT_ENABLED=true                   # Master kill switch
MOCK_MODE=false                             # Use mock responses (dev only)

# Monitoring (optional)
SENTRY_DSN=https://your-sentry-dsn          # Error tracking
DATADOG_API_KEY=your-datadog-key            # Metrics
```

### Environment-Specific

#### Development (.env.development)
```bash
NODE_ENV=development
FRESHDESK_ENABLED=false                     # Use mock mode
MOCK_MODE=true
LOG_LEVEL=debug
```

#### Production (.env.production)
```bash
NODE_ENV=production
FRESHDESK_ENABLED=true
MOCK_MODE=false
LOG_LEVEL=info
```

---

## Rate Limiting

### Implementation

Use in-memory rate limiting with tier-based limits (see `lib/rate-limit.ts`):

```typescript
import { checkRateLimitWithTier, RATE_LIMITS } from '@/lib/rate-limit';

// In endpoint handler
const tier = req.body.tier || 'starter';
const { allowed, remaining, resetAt } = checkRateLimitWithTier(
  userId,
  tier as SubscriptionTier,
  'chat'
);

if (!allowed) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return res.status(429).json({
    error: 'Rate limit exceeded',
    message: `You have reached your hourly limit. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter
  });
}

// Include rate limit headers in response
res.setHeader('X-RateLimit-Limit', RATE_LIMITS.chat[tier].limit);
res.setHeader('X-RateLimit-Remaining', remaining);
res.setHeader('X-RateLimit-Reset', resetAt);
```

### Limits by Tier

| Resource | Starter | Pro | Business |
|----------|---------|-----|----------|
| Chat messages | 20/hour | 50/hour | 100/hour |
| Tickets | 5/day | 5/day | 5/day |
| Org requests | 100/hour | 200/hour | 500/hour |

### Storage

- **Development:** In-memory Map (resets on restart)
- **Production:** Redis recommended for multi-instance deployments

```typescript
// Redis implementation (optional)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(key: string, limit: number, window: number) {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, window);
  }
  const ttl = await redis.ttl(key);
  return {
    allowed: current <= limit,
    remaining: Math.max(0, limit - current),
    resetAt: Date.now() + (ttl * 1000)
  };
}
```

---

## Error Handling

### Standard Error Response Format

```typescript
interface ErrorResponse {
  error: string;              // Short error name
  message: string;            // Human-readable description
  code: string;               // Machine-readable error code
  details?: any;              // Additional context (optional)
  retryAfter?: number;        // Seconds until retry (for 429)
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| INVALID_TOKEN | 401 | JWT token is invalid or expired |
| UNAUTHORIZED | 401 | User not authenticated |
| FORBIDDEN | 403 | User lacks required permissions |
| RATE_LIMIT_EXCEEDED | 429 | Rate limit exceeded |
| INVALID_MESSAGE | 400 | Message validation failed |
| CONVERSATION_NOT_FOUND | 404 | Conversation ID not found |
| LLM_SERVICE_ERROR | 500 | LLM API call failed |
| FRESHDESK_UNAVAILABLE | 503 | Freshdesk API unavailable |
| DATABASE_ERROR | 500 | PostgreSQL query failed |
| EMBEDDING_ERROR | 500 | Vector embedding generation failed |

### Error Handler Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number, code: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }
}

function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Log error
  console.error('[API Error]', {
    message: err.message,
    stack: err.stack,
    code: err instanceof ApiError ? err.code : 'UNKNOWN_ERROR',
    path: req.path,
    method: req.method
  });

  // Send error to monitoring service (Sentry, Datadog, etc.)
  if (process.env.SENTRY_DSN) {
    // Sentry.captureException(err);
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      code: err.code,
      details: err.details
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  });
}

export { ApiError, errorHandler };
```

### Usage in Endpoints

```typescript
app.post('/api/support/chat', async (req, res, next) => {
  try {
    // Validate message
    if (!req.body.message || req.body.message.trim().length === 0) {
      throw new ApiError(
        'Message cannot be empty',
        400,
        'INVALID_MESSAGE'
      );
    }

    // Check rate limit
    const { allowed, remaining, resetAt } = checkRateLimitWithTier(
      userId, tier, 'chat'
    );
    
    if (!allowed) {
      throw new ApiError(
        `Rate limit exceeded. Try again in ${Math.ceil((resetAt - Date.now()) / 60000)} minutes.`,
        429,
        'RATE_LIMIT_EXCEEDED',
        { retryAfter: Math.ceil((resetAt - Date.now()) / 1000) }
      );
    }

    // Process request...
    const response = await processChat(req.body);
    
    res.json(response);
  } catch (error) {
    next(error); // Pass to error handler middleware
  }
});

// Register error handler (must be last)
app.use(errorHandler);
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Database Migration**
  - [ ] Apply migration: `supabase/migrations/20260127000000_support_chat_system.sql`
  - [ ] Verify all tables created
  - [ ] Verify RLS policies active
  - [ ] Verify indexes created
  - [ ] Test helper functions

- [ ] **Environment Variables**
  - [ ] Set all required variables in `.env.production`
  - [ ] Verify Supabase credentials
  - [ ] Verify Freshdesk credentials
  - [ ] Verify OpenAI API key
  - [ ] Set CORS allowed origins

- [ ] **Freshdesk Configuration**
  - [ ] Create custom fields: `cf_javelina_user_id`, `cf_javelina_org_id`, `cf_page_url`
  - [ ] Verify API key has required permissions
  - [ ] Test article sync manually

- [ ] **Knowledge Base Sync**
  - [ ] Run initial KB sync job
  - [ ] Verify articles imported to `kb_documents`
  - [ ] Verify embeddings generated in `kb_chunks`
  - [ ] Test vector similarity search

- [ ] **Backend Services**
  - [ ] Deploy Express API server
  - [ ] Test health endpoint: `GET /health`
  - [ ] Verify JWT authentication working
  - [ ] Test rate limiting

### Deployment Steps

1. **Deploy Database Migration**
   ```bash
   supabase db push
   supabase db reset --linked  # If starting fresh
   ```

2. **Deploy Backend API**
   ```bash
   npm run build
   npm run start:production
   ```

3. **Run KB Sync Job**
   ```bash
   npm run sync-kb
   ```

4. **Verify Endpoints**
   ```bash
   # Test chat endpoint
   curl -X POST https://api.javelina.com/api/support/chat \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message": "How do I add a DNS record?", "userId": "...", "tier": "pro"}'
   
   # Test admin metrics
   curl https://api.javelina.com/api/support/admin/metrics \
     -H "Authorization: Bearer $ADMIN_JWT_TOKEN"
   ```

5. **Configure Cron Jobs**
   ```bash
   # KB sync every 6 hours
   0 */6 * * * /usr/bin/node /app/scripts/sync-kb.js
   
   # Cleanup expired data daily at 2am
   0 2 * * * /usr/bin/node /app/scripts/cleanup-expired.js
   ```

### Post-Deployment

- [ ] **Monitoring**
  - [ ] Verify logs in Datadog/CloudWatch
  - [ ] Check error rate in Sentry
  - [ ] Monitor API latency
  - [ ] Set up alerts for high error rates

- [ ] **Testing**
  - [ ] Test chat flow end-to-end
  - [ ] Test ticket escalation
  - [ ] Test admin dashboard
  - [ ] Verify rate limiting works
  - [ ] Test with different tiers

- [ ] **Documentation**
  - [ ] Update API documentation
  - [ ] Update team runbook
  - [ ] Document rollback procedure

### Rollback Plan

If issues are detected:

1. **Disable Feature Flag**
   ```bash
   # Set environment variable
   SUPPORT_CHAT_ENABLED=false
   ```

2. **Revert Backend Deployment**
   ```bash
   # Deploy previous version
   git revert <commit-hash>
   npm run deploy
   ```

3. **Database Rollback (if needed)**
   ```sql
   -- Drop support tables
   DROP TABLE IF EXISTS chat_message_citations CASCADE;
   DROP TABLE IF EXISTS chat_messages CASCADE;
   DROP TABLE IF EXISTS chat_feedback CASCADE;
   DROP TABLE IF EXISTS chat_sessions CASCADE;
   -- etc.
   ```

---

## Testing Recommendations

### Unit Tests

#### Snapshot Sanitization
```typescript
describe('Snapshot Sanitization', () => {
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

  it('should preserve non-PII error messages', () => {
    const snapshot = {
      errors: [{
        code: 'VALIDATION_ERROR',
        message: 'Field is required'
      }]
    };
    
    const sanitized = sanitizeSnapshot(snapshot);
    expect(sanitized.errors[0].message).toBe('Field is required');
  });
});
```

#### Rate Limiting
```typescript
describe('Rate Limiting', () => {
  it('should allow requests within limit', () => {
    const result = checkRateLimitWithTier('user-123', 'starter', 'chat');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(19);
  });

  it('should block requests exceeding limit', () => {
    // Make 20 requests (starter limit)
    for (let i = 0; i < 20; i++) {
      checkRateLimitWithTier('user-123', 'starter', 'chat');
    }
    
    // 21st request should be blocked
    const result = checkRateLimitWithTier('user-123', 'starter', 'chat');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });
});
```

### Integration Tests

#### Chat Endpoint
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
    expect(response.body).toHaveProperty('conversationId');
    expect(response.body.citations.length).toBeGreaterThan(0);
  });

  it('should return 401 without JWT token', async () => {
    const response = await request(app)
      .post('/api/support/chat')
      .send({ message: 'Test message' });
    
    expect(response.status).toBe(401);
  });

  it('should return 429 when rate limit exceeded', async () => {
    // Make requests up to limit
    for (let i = 0; i < 20; i++) {
      await request(app)
        .post('/api/support/chat')
        .set('Authorization', `Bearer ${validJWT}`)
        .send({ message: `Test ${i}`, userId: testUserId, tier: 'starter' });
    }
    
    // Next request should be rate limited
    const response = await request(app)
      .post('/api/support/chat')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({ message: 'Test', userId: testUserId, tier: 'starter' });
    
    expect(response.status).toBe(429);
    expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
```

#### Ticket Creation
```typescript
describe('POST /api/support/log-bug', () => {
  it('should create Freshdesk ticket', async () => {
    const response = await request(app)
      .post('/api/support/log-bug')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        subject: 'Test bug report',
        description: 'This is a test ticket',
        page_url: 'https://app.javelina.com/test',
        user_id: testUserId
      });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('ticket_id');
    expect(response.body.success).toBe(true);
  });
});
```

### E2E Tests

#### Full Conversation Flow
```typescript
describe('Support Chat E2E', () => {
  it('should complete full conversation with escalation', async () => {
    // 1. Send initial message
    const msg1 = await request(app)
      .post('/api/support/chat')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        message: 'I need help with DNS',
        userId: testUserId,
        tier: 'pro'
      });
    
    const conversationId = msg1.body.conversationId;
    expect(msg1.status).toBe(200);
    
    // 2. Submit negative feedback
    await request(app)
      .post('/api/support/feedback')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        conversationId,
        resolved: false,
        userId: testUserId
      });
    
    // 3. Send follow-up message
    const msg2 = await request(app)
      .post('/api/support/chat')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        message: 'Still confused',
        conversationId,
        userId: testUserId,
        tier: 'pro',
        attemptCount: 1
      });
    
    expect(msg2.body.nextAction.type).toBe('ask_clarifying');
    
    // 4. Submit negative feedback again
    await request(app)
      .post('/api/support/feedback')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        conversationId,
        resolved: false,
        userId: testUserId
      });
    
    // 5. Send third message (should trigger escalation)
    const msg3 = await request(app)
      .post('/api/support/chat')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        message: 'This is not working',
        conversationId,
        userId: testUserId,
        tier: 'pro',
        attemptCount: 2
      });
    
    expect(msg3.body.nextAction.type).toBe('offer_ticket');
    
    // 6. Create ticket
    const ticket = await request(app)
      .post('/api/support/log-bug')
      .set('Authorization', `Bearer ${validJWT}`)
      .send({
        subject: 'Issue from chat',
        description: 'Escalated from conversation',
        page_url: 'https://app.javelina.com/test',
        user_id: testUserId,
        conversationId
      });
    
    expect(ticket.status).toBe(200);
    expect(ticket.body.success).toBe(true);
  });
});
```

### Load Tests

Use tools like k6 or Artillery to test:

```javascript
// k6 load test script
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Stay at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  },
};

export default function() {
  const url = 'https://api.javelina.com/api/support/chat';
  const payload = JSON.stringify({
    message: 'How do I add a DNS record?',
    userId: __VU,  // Virtual user ID
    tier: 'pro'
  });
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
    },
  };
  
  const res = http.post(url, payload, params);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has reply': (r) => r.json('reply') !== undefined,
    'has citations': (r) => r.json('citations').length > 0,
  });
  
  sleep(1);
}
```

---

## Additional Resources

### Related Documentation

- **Frontend Implementation:** `components/chat/ChatWindow.tsx`
- **Database Schema:** `supabase/migrations/20260127000000_support_chat_system.sql`
- **Freshdesk Service:** `lib/support/freshdesk-service.ts`
- **Freshdesk Guide:** `lib/support/FRESHDESK_SERVICE_GUIDE.md`
- **API Client:** `lib/api-client.ts`
- **Rate Limiting:** `lib/rate-limit.ts`
- **Chat Demo:** `CHAT_DEMO.md`

### External APIs

- [Freshdesk API Documentation](https://developers.freshdesk.com/api/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

### Support Contacts

- **Backend Lead:** [Your Name]
- **DevOps:** [DevOps Contact]
- **On-Call:** [On-Call Rotation]

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | 1.0.0 | Initial comprehensive requirements document |

---

**End of Document**
