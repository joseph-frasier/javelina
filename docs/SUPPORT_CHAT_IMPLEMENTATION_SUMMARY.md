# Support Chat Implementation Summary

## Document Overview

**Status:** ✅ Frontend Complete - Backend Pending  
**Created:** January 27, 2026  
**Last Updated:** January 27, 2026

This document provides a comprehensive overview of the AI-powered support chat system implementation for Javelina. The system includes knowledge base integration, RAG retrieval, ticket escalation, and admin analytics dashboard.

---

## Table of Contents

1. [What Was Implemented](#what-was-implemented)
2. [Files Created/Modified](#files-createdmodified)
3. [How to Use the System](#how-to-use-the-system)
4. [How to Test](#how-to-test)
5. [Configuration](#configuration)
6. [Next Steps for Backend Team](#next-steps-for-backend-team)
7. [Migration Instructions](#migration-instructions)
8. [Troubleshooting](#troubleshooting)
9. [Architecture Diagram](#architecture-diagram)

---

## What Was Implemented

### Overview

A complete AI-powered support chat system with:
- Real-time chat widget with animated UI (GSAP animations)
- Knowledge base article citations with RAG retrieval
- Ticket escalation to Freshdesk
- Admin dashboard for conversation review
- Complete database schema with RLS policies
- Mock mode for development without backend

### Key Features

#### 1. **Chat Widget** (`components/chat/ChatWindow.tsx`)
- Floating chat window with GSAP animations (slide, fade, scale)
- Real-time message streaming
- Markdown support in responses
- Citation links to knowledge base articles
- Resolution confirmation buttons
- Ticket creation flow
- Auto-scroll to latest messages
- Keyboard shortcuts (Enter to send)
- Dark mode support
- Mobile responsive design

#### 2. **Knowledge Base Integration**
- Freshdesk article syncing
- Mock KB articles for development
- Citation tracking with confidence scores
- Article age indicators
- Clickable citation links

#### 3. **Ticket Escalation**
- Automatic escalation after 2 failed resolution attempts
- Manual ticket creation button
- Conversation context included in tickets
- App state snapshot capture
- Freshdesk contact mapping

#### 4. **Admin Dashboard** (`app/admin/support-review/`)
- Conversation list with filtering
- Detailed conversation view
- Message history with citations
- User feedback tracking
- Metrics and analytics (ready for backend)

#### 5. **Database Schema** (`supabase/migrations/20260127000000_support_chat_system.sql`)
- `chat_sessions` - Conversation tracking
- `chat_messages` - Individual messages with citations
- `chat_message_citations` - KB article references
- `chat_feedback` - User ratings and feedback
- `app_snapshots` - UI state for debugging
- `kb_documents` - Knowledge base articles
- `kb_chunks` - Document chunks with embeddings (pgvector)
- `support_tickets` - Escalated tickets
- `freshdesk_contacts` - User-to-Freshdesk mapping

#### 6. **Mock Mode**
- Complete mock API implementation
- Simulated network delays
- Realistic conversation flows
- Sample KB articles
- No backend required for testing

---

## Files Created/Modified

### Created Files

#### Frontend Components
```
components/
├── chat/
│   └── ChatWindow.tsx              # Main chat widget with animations
└── support/
    └── TicketCreationModal.tsx     # Ticket creation dialog
```

#### Admin Pages
```
app/admin/support-review/
├── page.tsx                        # Conversation list dashboard
└── [id]/page.tsx                   # Individual conversation detail view
```

#### Backend Services & Types
```
lib/support/
├── freshdesk-service.ts            # Freshdesk API integration
├── FRESHDESK_SERVICE_GUIDE.md      # Usage documentation
├── FRESHDESK_INTEGRATION_EXAMPLE.ts # Code examples
└── mock-support-api.ts             # Mock API for development

types/
└── support.ts                      # TypeScript interfaces
```

#### Database
```
supabase/migrations/
└── 20260127000000_support_chat_system.sql  # Complete schema
```

#### Documentation
```
SUPPORT_CHAT_BACKEND_REQUIREMENTS.md      # Backend API specification
FRESHDESK_SERVICE_IMPLEMENTATION.md       # Service implementation guide
SUPPORT_CHAT_IMPLEMENTATION_SUMMARY.md    # This document
```

### Modified Files

#### API Client
- `lib/api-client.ts` - Added `supportApi` namespace with chat, feedback, and log-bug methods

#### Rate Limiting
- `lib/rate-limit.ts` - Added tier-based rate limits for chat and ticket creation

#### Environment Config
- `.env.local.example` - Added Freshdesk and mock mode variables

#### Admin Layout
- `components/admin/AdminLayout.tsx` - Added "Support Review" navigation link

#### Package Dependencies
- `package.json` - Added `date-fns` for timestamp formatting

---

## How to Use the System

### For End Users

#### Opening the Chat

The chat widget can be opened from anywhere in the application via:
1. **Chat Button** - Click the floating chat button (typically bottom-right)
2. **Help Button** - Click help icon in navigation
3. **Error Page** - Automatically suggested on error pages

#### Having a Conversation

1. **Type your message** in the input field at the bottom
2. **Press Enter** or click the send button
3. **Wait for Javi** (the AI assistant) to respond
4. **Review citations** - Click on article links to learn more
5. **Confirm resolution** - Click "Yes, resolved" or "Not yet" buttons

Example conversation flow:
```
User: "How do I add an A record?"

Javi: "To add an A record to your zone:

1. Navigate to your zone (example.com)
2. Click 'Add Record' button
3. Select 'A' as the record type
4. Enter the hostname (e.g., 'www' or '@' for root)
5. Enter the IPv4 address
6. Set the TTL (default is 3600 seconds)
7. Click 'Save'

Your A record will be created immediately."

[Sources: How to Add a New DNS Record, Understanding DNS Record Types]

[Yes, resolved] [Not yet]
```

#### Creating a Ticket

**Automatic Escalation:**
- After 2 failed resolution attempts, Javi will offer to create a ticket
- Click "Create Ticket" to open the ticket form

**Manual Creation:**
- At any point, you can request to create a ticket
- Say "I need to create a ticket" or similar

**Ticket Form:**
1. **Subject** - Auto-populated or edit as needed
2. **Description** - Auto-includes conversation context
3. **Priority** - Select Low/Medium/High/Urgent
4. Click "Submit Ticket"
5. You'll receive a ticket ID and tracking link

### For Administrators

#### Accessing the Admin Dashboard

Navigate to: `/admin/support-review`

**Requirements:**
- SuperAdmin role
- Authenticated session

#### Viewing Conversations

**Conversation List:**
- View all support conversations across all organizations
- Filter by:
  - Date range (last 7, 30, 90 days)
  - Status (pending, resolved, escalated, abandoned)
  - Organization
- Sort by:
  - Most recent
  - Most messages
  - Escalated tickets

**Conversation Details:**
- Click any conversation to view full details
- See complete message history
- Review citations used
- Check user feedback
- View app state snapshots
- Access linked Freshdesk ticket (if escalated)

#### Key Metrics (When Backend Complete)

The dashboard will display:
- **Total conversations** - Volume over time
- **Resolution rate** - % resolved without ticket
- **Deflection rate** - % solved by AI vs escalated
- **Average response time** - LLM latency
- **Top intents** - Most common user questions
- **Feedback scores** - Thumbs up/down rates
- **By tier** - Usage patterns across subscription levels

---

## How to Test

### Testing with Mock Mode (No Backend Required)

Mock mode allows complete testing of the frontend without any backend API.

#### 1. Enable Mock Mode

Add to `.env.local`:
```bash
NEXT_PUBLIC_MOCK_SUPPORT_API=true
NEXT_PUBLIC_FRESHDESK_ENABLED=false
```

#### 2. Start the Application

```bash
npm run dev
```

#### 3. Test Chat Widget

**Basic Conversation:**
1. Click the chat button (bottom-right)
2. Type: "How do I add a DNS record?"
3. Observe:
   - Smooth GSAP animations (slide up, fade in)
   - AI response with step-by-step instructions
   - Citation links appear
   - Resolution buttons ("Yes, resolved" / "Not yet")

**Expected Mock Response:**
```
To add a DNS record:

1. Navigate to your zone
2. Click 'Add Record' button
3. Select the record type (A, AAAA, CNAME, MX, TXT, etc.)
4. Enter the record name (hostname)
5. Enter the record value
6. Set TTL (optional, default is 3600 seconds)
7. Click 'Save'

[Sources: How to Add a New DNS Record, Understanding DNS Record Types]
```

#### 4. Test Resolution Flow

**Positive Resolution:**
1. Click "Yes, resolved"
2. Observe: Thank you message appears
3. Conversation status updates to "resolved"

**Negative Resolution (Escalation Path):**
1. Click "Not yet"
2. Type another question
3. Click "Not yet" again
4. Observe: Escalation offer appears
5. Click "Create Ticket"
6. Fill out ticket form
7. Submit and verify confirmation

#### 5. Test Ticket Creation

**Via Escalation:**
- Follow negative resolution flow above

**Direct Request:**
1. Type: "I need to report a bug"
2. Observe: Automatic ticket offer
3. Click "Create Ticket"
4. Verify conversation history is included
5. Submit and check mock ticket ID (10001+)

#### 6. Test Admin Dashboard (Mock Data)

**Note:** Mock admin data is limited. For full testing, use real backend.

Navigate to: `/admin/support-review`

**View Conversations:**
- Should see placeholder data or empty state
- UI should be fully functional
- Filters and sorting should work

### Testing with Real Backend (When Available)

#### Prerequisites

1. Backend API is deployed
2. Environment variables configured (see [Configuration](#configuration))
3. Database migration applied
4. Freshdesk credentials configured

#### Disable Mock Mode

Update `.env.local`:
```bash
NEXT_PUBLIC_MOCK_SUPPORT_API=false
NEXT_PUBLIC_FRESHDESK_ENABLED=true
NEXT_PUBLIC_API_URL=https://api.javelina.com
```

#### Test Real API Calls

**Chat Endpoint:**
```bash
curl -X POST https://api.javelina.com/api/support/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "How do I add an A record?",
    "userId": "your-user-id",
    "tier": "pro"
  }'
```

**Expected Response:**
```json
{
  "reply": "To add an A record...",
  "citations": [
    {
      "title": "How to Add a New DNS Record",
      "articleId": "1003",
      "javelinaUrl": "https://app.javelina.com/kb/dns-records/add",
      "confidence": 0.92,
      "lastUpdated": "2024-01-15T11:00:00Z"
    }
  ],
  "intent": "dns-records",
  "resolution": {
    "needsConfirmation": true
  },
  "nextAction": {
    "type": "none",
    "reason": "High confidence response"
  },
  "conversationId": "uuid-here"
}
```

#### Rate Limit Testing

Test tier-based rate limits:

**Starter Tier:** 20 messages/hour
```bash
# Send 21 messages rapidly
# 21st should return 429 Too Many Requests
```

**Pro Tier:** 50 messages/hour  
**Business Tier:** 100 messages/hour

**Ticket Creation:** 5 tickets/day (all tiers)

### End-to-End Testing Scenarios

#### Scenario 1: Happy Path (Resolved)
1. User opens chat
2. Asks: "How do I add an A record?"
3. Reviews AI response and citations
4. Clicks "Yes, resolved"
5. Closes chat
6. ✅ **Expected:** Conversation marked as resolved

#### Scenario 2: Escalation Path
1. User opens chat
2. Asks: "My DNS isn't working"
3. Clicks "Not yet" (attempt 1)
4. Provides more details
5. Clicks "Not yet" (attempt 2)
6. Offered ticket creation
7. Clicks "Create Ticket"
8. Submits ticket form
9. ✅ **Expected:** 
   - Conversation marked as escalated
   - Freshdesk ticket created
   - User receives ticket ID

#### Scenario 3: Multiple Conversations
1. User opens chat, asks question A, resolves
2. Closes chat
3. Later: Opens chat again, asks question B
4. ✅ **Expected:** New conversation session created

#### Scenario 4: Admin Review
1. Admin navigates to `/admin/support-review`
2. Views list of conversations
3. Filters by "escalated" status
4. Clicks conversation to view details
5. Reviews messages, citations, and feedback
6. ✅ **Expected:** Complete conversation history visible

---

## Configuration

### Environment Variables

#### Required for Mock Mode (Development)

```bash
# .env.local

# Enable mock support API (no backend needed)
NEXT_PUBLIC_MOCK_SUPPORT_API=true

# Disable Freshdesk API calls (use mock data)
NEXT_PUBLIC_FRESHDESK_ENABLED=false

# Supabase (still needed for auth/user data)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

#### Required for Production (Real Backend)

```bash
# .env.local or .env.production

# Disable mock mode
NEXT_PUBLIC_MOCK_SUPPORT_API=false

# Backend API URL
NEXT_PUBLIC_API_URL=https://api.javelina.com

# Freshdesk Configuration
NEXT_PUBLIC_FRESHDESK_DOMAIN=javelina  # Your subdomain
FRESHDESK_API_KEY=your_freshdesk_api_key  # Server-side only!
NEXT_PUBLIC_FRESHDESK_ENABLED=true

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional: OpenAI (for embeddings/LLM - backend only)
OPENAI_API_KEY=sk-your-openai-key

# Optional: Anthropic (alternative LLM - backend only)
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Backend Environment Variables

The backend team will need these additional variables:

```bash
# Backend .env

# Supabase Service Role (for RLS bypass)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM Configuration
OPENAI_API_KEY=sk-your-openai-key
OPENAI_ORG_ID=org-your-org  # Optional

# Freshdesk
FRESHDESK_DOMAIN=javelina
FRESHDESK_API_KEY=your_api_key

# Rate Limiting (optional overrides)
RATE_LIMIT_CHAT_STARTER=20
RATE_LIMIT_CHAT_PRO=50
RATE_LIMIT_CHAT_BUSINESS=100
RATE_LIMIT_TICKET_DAILY=5

# Feature Flags
SUPPORT_CHAT_ENABLED=true
MOCK_MODE=false

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
DATADOG_API_KEY=your_datadog_key

# Server Configuration
NODE_ENV=production
API_PORT=3001
LOG_LEVEL=info
```

### Freshdesk Custom Fields

Configure these custom fields in Freshdesk admin:

**Contact Fields:**
- `cf_javelina_user_id` (Text)
- `cf_javelina_org_id` (Text)
- `cf_javelina_org_name` (Text)

**Ticket Fields:**
- `cf_page_url` (Text)
- `cf_conversation_id` (Text)
- `cf_feedback_category` (Dropdown)

### Feature Flags (LaunchDarkly)

Recommended feature flags:

```json
{
  "support-chat-enabled": {
    "type": "boolean",
    "default": false,
    "variations": {
      "prod": true,
      "staging": true,
      "dev": true
    }
  },
  "support-chat-escalation-threshold": {
    "type": "number",
    "default": 2,
    "description": "Number of failed attempts before escalation"
  },
  "support-chat-rate-limit-override": {
    "type": "json",
    "default": null,
    "description": "Override rate limits per tier"
  }
}
```

---

## Next Steps for Backend Team

The backend team needs to implement 6 API endpoints. Complete specifications are in [`SUPPORT_CHAT_BACKEND_REQUIREMENTS.md`](./SUPPORT_CHAT_BACKEND_REQUIREMENTS.md).

### Priority 1: Core Chat Functionality

#### 1. **POST /api/support/chat**
**Purpose:** Process user messages and return AI responses with citations

**Key Tasks:**
- [ ] JWT authentication middleware
- [ ] Tier-based rate limiting
- [ ] Snapshot sanitization (remove PII)
- [ ] Intent classification using LLM
- [ ] RAG retrieval with pgvector similarity search
- [ ] Generate response with OpenAI/Anthropic
- [ ] Store messages and citations in database
- [ ] Return structured response with nextAction logic

**Request Example:**
```typescript
{
  message: "How do I add an A record?",
  userId: "uuid",
  orgId: "uuid",
  tier: "pro",
  attemptCount: 0,
  snapshot: { /* app state */ }
}
```

**Response Example:**
```typescript
{
  reply: "To add an A record...",
  citations: [...],
  intent: "dns-records",
  resolution: { needsConfirmation: true },
  nextAction: { type: "none", reason: "..." },
  conversationId: "uuid"
}
```

#### 2. **POST /api/support/feedback**
**Purpose:** Submit user feedback on conversation quality

**Key Tasks:**
- [ ] Validate conversation ownership
- [ ] Store feedback in `chat_feedback` table
- [ ] Update session resolution status
- [ ] Mark failed attempts
- [ ] Increment attempt_count if not resolved

**Request Example:**
```typescript
{
  conversationId: "uuid",
  resolved: false,
  userId: "uuid",
  orgId: "uuid"
}
```

#### 3. **POST /api/support/log-bug**
**Purpose:** Create Freshdesk ticket (escalation path)

**Key Tasks:**
- [ ] Rate limit: 5 tickets per day per user
- [ ] Get or create Freshdesk contact
- [ ] Retrieve conversation history
- [ ] Create Freshdesk ticket with context
- [ ] Store ticket mapping in `support_tickets`
- [ ] Update session status to 'escalated'

**Request Example:**
```typescript
{
  subject: "DNS records not saving",
  description: "When I try to add...",
  page_url: "https://app.javelina.com/zone/example.com",
  user_id: "uuid",
  conversationId: "uuid",
  priority: 3
}
```

### Priority 2: Admin Dashboard

#### 4. **GET /api/support/admin/conversations**
**Purpose:** List all conversations with filters

**Key Tasks:**
- [ ] Verify SuperAdmin role
- [ ] Build query with filters (days, status, orgId)
- [ ] Join with users and organizations
- [ ] Aggregate message counts
- [ ] Implement pagination

**Query Parameters:**
```
?days=30&status=escalated&page=1&limit=20
```

#### 5. **GET /api/support/admin/metrics**
**Purpose:** Support metrics and analytics

**Key Tasks:**
- [ ] Query analytics views
- [ ] Calculate resolution rate, deflection rate
- [ ] Aggregate by tier and entry point
- [ ] Top intents analysis
- [ ] Performance metrics (response time, session duration)

**Response Example:**
```typescript
{
  totals: { conversations: 1453, messages: 5821, unique_users: 876 },
  resolution: { resolved: 1122, escalated: 231, resolution_rate: 77.2 },
  feedback: { avg_rating: 0.83, thumbs_up_rate: 83.2 },
  performance: { avg_response_time_ms: 1234, avg_messages_per_conversation: 4.0 },
  top_intents: [...]
}
```

#### 6. **GET /api/support/admin/conversation/:id**
**Purpose:** Get full conversation details

**Key Tasks:**
- [ ] Fetch conversation with messages
- [ ] Join citations
- [ ] Include feedback
- [ ] Include app snapshot
- [ ] Include ticket details if escalated

### Priority 3: Backend Services

#### A. **Freshdesk Integration Service**
- [ ] Article sync job (runs every 6 hours)
- [ ] Contact management (get or create)
- [ ] Ticket creation with custom fields
- [ ] Error handling with retry logic

**Reference:** `lib/support/freshdesk-service.ts`

#### B. **RAG Retrieval Service**
- [ ] Generate embeddings (OpenAI text-embedding-3-small)
- [ ] Vector similarity search with pgvector
- [ ] Permission filtering (org-based visibility)
- [ ] Confidence thresholding (>0.7)
- [ ] Relevance scoring with boosts

**SQL Example:**
```sql
SELECT 
  kbc.chunk_text,
  kbd.title,
  1 - (kbc.embedding <=> $1::vector) AS confidence
FROM kb_chunks kbc
JOIN kb_documents kbd ON kbd.id = kbc.document_id
WHERE (kbd.org_id IS NULL OR kbd.org_id = $2)
  AND 1 - (kbc.embedding <=> $1::vector) > 0.7
ORDER BY kbc.embedding <=> $1::vector
LIMIT 5;
```

#### C. **LLM Service**
- [ ] Choose provider (OpenAI or Anthropic)
- [ ] Implement prompt template
- [ ] Intent classification
- [ ] Response generation with citations
- [ ] Timeout handling (30s)
- [ ] Retry logic

**Prompt Template:**
```
You are Javi, a helpful Javelina support assistant.

## Knowledge Base Context:
{retrieved_chunks}

## User Context:
- Tier: {tier}
- Page: {page_url}

## Conversation History:
{history}

## Current Request:
{user_message}

Respond in JSON format: { reply, intent, confidence, citations, nextAction }
```

#### D. **Snapshot Sanitization Service**
- [ ] Remove PII patterns (emails, IPs, API keys)
- [ ] Preserve entity IDs (UUIDs safe)
- [ ] Sanitize error messages
- [ ] Remove query parameters from URLs

### Priority 4: Deployment Tasks

- [ ] Apply database migration
- [ ] Deploy backend API
- [ ] Run initial KB sync job
- [ ] Configure Freshdesk custom fields
- [ ] Set up cron jobs:
  - [ ] KB sync every 6 hours
  - [ ] Cleanup expired data daily
- [ ] Enable monitoring (Sentry, Datadog)
- [ ] Load testing
- [ ] Documentation review

### Timeline Estimate

**Week 1:** Core chat endpoint + database setup  
**Week 2:** Feedback + ticket creation endpoints  
**Week 3:** Admin endpoints + services  
**Week 4:** Testing, deployment, monitoring

---

## Migration Instructions

### Development Database

#### 1. Review the Migration File

Location: `supabase/migrations/20260127000000_support_chat_system.sql`

**What it creates:**
- 9 tables with RLS policies
- 20+ indexes (including pgvector index)
- 2 analytics views
- 2 helper functions
- Storage bucket for attachments
- Audit triggers
- Grants for authenticated users

#### 2. Apply Migration to Dev

**Option A: Using Supabase CLI (Recommended)**

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push migration
supabase db push
```

**Option B: Using psql**

```bash
# Connect to your dev database
psql -U postgres -h your-db-host.supabase.co -d postgres

# Run migration file
\i supabase/migrations/20260127000000_support_chat_system.sql

# Verify tables created
\dt

# Check indexes
\di
```

**Option C: Via Supabase Dashboard**

1. Go to: https://app.supabase.com/project/your-project/sql
2. Copy contents of `20260127000000_support_chat_system.sql`
3. Paste into SQL editor
4. Click "Run"
5. Verify success in Table Editor

#### 3. Verify Migration

**Check Tables:**
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%chat%' OR table_name LIKE '%support%' OR table_name LIKE '%kb%';
```

**Expected Output:**
```
chat_sessions
chat_messages
chat_message_citations
chat_feedback
app_snapshots
kb_documents
kb_chunks
support_tickets
freshdesk_contacts
```

**Check RLS Policies:**
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('chat_sessions', 'chat_messages');
```

**Check Indexes:**
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename LIKE '%chat%' OR tablename LIKE '%kb%';
```

**Check pgvector Extension:**
```sql
SELECT extname, extversion 
FROM pg_extension 
WHERE extname = 'vector';
```

**Expected:** `vector | 0.5.0` (or later)

#### 4. Test with Sample Data (Optional)

Insert test chat session:
```sql
-- Insert test session
INSERT INTO chat_sessions (user_id, org_id, entry_point, page_url)
VALUES (
  auth.uid(),  -- Your user ID
  'your-org-id',
  'chat_widget',
  'https://app.javelina.com/test'
)
RETURNING id;

-- Insert test message
INSERT INTO chat_messages (session_id, user_id, role, content, intent)
VALUES (
  'session-id-from-above',
  auth.uid(),
  'user',
  'How do I add a DNS record?',
  'dns-records'
);
```

Query test data:
```sql
SELECT * FROM chat_sessions WHERE user_id = auth.uid();
SELECT * FROM chat_messages WHERE session_id = 'session-id';
```

### Staging Database

Same process as dev, but:
1. Use staging project ref
2. Test with production-like data
3. Verify RLS policies work correctly
4. Run load tests

### Production Database

**⚠️ Important Pre-deployment Checklist:**

- [ ] Migration tested in dev and staging
- [ ] Backup current production database
- [ ] Schedule maintenance window
- [ ] Notify team of deployment
- [ ] Prepare rollback plan

**Deployment Steps:**

```bash
# 1. Backup production database
supabase db dump --project-ref prod-ref > backup-$(date +%Y%m%d).sql

# 2. Apply migration
supabase db push --project-ref prod-ref

# 3. Verify immediately
supabase db remote --project-ref prod-ref

# Check tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%chat%';

# Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE tablename IN ('chat_sessions', 'chat_messages');
```

**Post-deployment:**

1. Monitor error logs
2. Check database performance
3. Verify RLS policies working
4. Test with real user account
5. Monitor query performance

**Rollback Plan (if issues detected):**

```sql
-- Drop all support chat tables (cascades to related tables)
DROP TABLE IF EXISTS chat_message_citations CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_feedback CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS app_snapshots CASCADE;
DROP TABLE IF EXISTS kb_chunks CASCADE;
DROP TABLE IF EXISTS kb_documents CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS freshdesk_contacts CASCADE;

-- Drop views
DROP VIEW IF EXISTS support_metrics;
DROP VIEW IF EXISTS knowledge_gaps;

-- Drop functions
DROP FUNCTION IF EXISTS cleanup_expired_support_data();
DROP FUNCTION IF EXISTS get_conversation_summary(uuid);

-- Restore from backup
\i backup-YYYYMMDD.sql
```

---

## Troubleshooting

### Frontend Issues

#### Chat Widget Not Appearing

**Symptoms:** Chat button visible but window doesn't open

**Causes & Solutions:**

1. **JavaScript Error**
   - Check browser console for errors
   - Look for GSAP animation errors
   - Verify all imports are correct

2. **State Issue**
   ```typescript
   // Add debug logging
   console.log('isOpen:', isOpen);
   console.log('shouldRender:', shouldRender);
   ```

3. **CSS/Tailwind Issue**
   - Check if `z-50` is being overridden
   - Verify dark mode classes
   - Check responsive classes

**Fix:**
```typescript
// In ChatWindow.tsx
useEffect(() => {
  console.log('[ChatWindow] isOpen changed:', isOpen);
  if (isOpen) {
    setShouldRender(true);
  }
}, [isOpen]);
```

#### Messages Not Sending

**Symptoms:** Click send button, nothing happens

**Causes & Solutions:**

1. **No User Session**
   ```typescript
   // Check user exists
   console.log('User:', user);
   // In mock mode, this should not block
   ```

2. **API Error**
   - Check network tab in browser DevTools
   - Look for 401 (auth), 429 (rate limit), or 500 errors
   - Enable mock mode to isolate issue

3. **Rate Limit Exceeded**
   ```
   Error: Rate limit exceeded
   ```
   - Wait for rate limit window to reset
   - Check tier in database
   - Verify rate limit configuration

**Fix:**
```typescript
// Add error handling
try {
  const response = await supportApi.chat({ ... });
} catch (error) {
  console.error('[Chat] Send failed:', error);
  // Show user-friendly error
}
```

#### Citations Not Appearing

**Symptoms:** Response shows but no citation links

**Causes & Solutions:**

1. **Mock Mode - Expected**
   - Mock responses include citations
   - Check `mockChat` in `mock-support-api.ts`

2. **Backend Not Returning Citations**
   ```typescript
   // Check response structure
   console.log('Citations:', response.citations);
   ```

3. **Rendering Issue**
   - Check CSS classes on citation links
   - Verify dark mode colors

**Fix:**
```typescript
// In ChatWindow.tsx, add null check
{message.citations && message.citations.length > 0 && (
  <div className="mt-3">
    {message.citations.map((citation, idx) => (
      <a key={idx} href={citation.javelinaUrl}>
        {citation.title}
      </a>
    ))}
  </div>
)}
```

#### Animation Not Working

**Symptoms:** Chat window appears instantly without animation

**Causes:**

1. GSAP not loaded
2. `useGSAP` hook issue
3. `shouldRender` state issue

**Fix:**
```bash
# Verify GSAP installed
npm list gsap @gsap/react

# Reinstall if needed
npm install gsap @gsap/react
```

### Backend Issues

#### Database Connection Errors

**Error:**
```
Error: Connection to database failed
```

**Solutions:**

1. **Check Supabase URL**
   ```bash
   echo $SUPABASE_URL
   # Should be: https://your-project.supabase.co
   ```

2. **Check Service Role Key**
   ```bash
   # Should start with: eyJ...
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

3. **Network Issue**
   - Check if Supabase dashboard accessible
   - Verify API is running
   - Check firewall rules

#### RLS Policy Blocking Queries

**Error:**
```
Error: new row violates row-level security policy
```

**Causes:**
- User not authenticated
- User doesn't have permission for org
- Service role key not being used

**Solutions:**

1. **Use Service Role for Backend**
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
     process.env.SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!  // Not anon key!
   );
   ```

2. **Check User's Org Membership**
   ```sql
   SELECT * FROM organization_members 
   WHERE user_id = 'user-uuid' AND organization_id = 'org-uuid';
   ```

3. **Temporarily Disable RLS for Testing**
   ```sql
   -- DEV ONLY - NOT FOR PRODUCTION
   ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
   ```

#### Vector Index Not Working

**Error:**
```
Error: operator does not exist: vector <=>
```

**Causes:**
- pgvector extension not installed
- Wrong operator syntax

**Solutions:**

1. **Install pgvector**
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Check Extension Version**
   ```sql
   SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
   ```

3. **Verify Index Exists**
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'kb_chunks';
   -- Should see: idx_kb_chunks_embedding
   ```

4. **Rebuild Index if Needed**
   ```sql
   DROP INDEX IF EXISTS idx_kb_chunks_embedding;
   CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
   ANALYZE kb_chunks;
   ```

#### Freshdesk API Errors

**Error:**
```
Error: Freshdesk API error: 401 Unauthorized
```

**Solutions:**

1. **Check API Key**
   - Go to Freshdesk Profile Settings
   - Copy API key (starts with a long string)
   - Verify in `.env`

2. **Check Domain**
   ```bash
   # Should be subdomain only, not full URL
   FRESHDESK_DOMAIN=javelina  # ✓ Correct
   FRESHDESK_DOMAIN=javelina.freshdesk.com  # ✗ Wrong
   ```

3. **Test with curl**
   ```bash
   curl -u "YOUR_API_KEY:X" \
     https://javelina.freshdesk.com/api/v2/solutions/articles
   ```

4. **Enable Mock Mode for Development**
   ```bash
   NEXT_PUBLIC_FRESHDESK_ENABLED=false
   ```

#### Rate Limit Issues

**Error:**
```
Error: Rate limit exceeded
```

**Solutions:**

1. **Check Rate Limit Config**
   ```typescript
   // lib/rate-limit.ts
   export const RATE_LIMITS = {
     chat: {
       starter: { limit: 20, window: 3600000 },
       pro: { limit: 50, window: 3600000 },
       business: { limit: 100, window: 3600000 },
     }
   };
   ```

2. **Clear Rate Limit (Dev Only)**
   ```typescript
   // In rate-limit.ts
   rateLimitStore.clear();
   ```

3. **Increase Limits for Testing**
   ```bash
   RATE_LIMIT_CHAT_STARTER=1000
   RATE_LIMIT_CHAT_PRO=1000
   ```

#### OpenAI/LLM Errors

**Error:**
```
Error: OpenAI API error: 429 Too Many Requests
```

**Solutions:**

1. **Check API Key**
   ```bash
   echo $OPENAI_API_KEY
   # Should start with: sk-...
   ```

2. **Check Rate Limits**
   - Go to OpenAI dashboard
   - Check usage and limits
   - Upgrade tier if needed

3. **Implement Retry Logic**
   ```typescript
   async function callLLM(prompt: string, retries = 3): Promise<string> {
     try {
       return await openai.chat.completions.create({ ... });
     } catch (error) {
       if (retries > 0 && error.status === 429) {
         await delay(1000);
         return callLLM(prompt, retries - 1);
       }
       throw error;
     }
   }
   ```

### Admin Dashboard Issues

#### Can't Access `/admin/support-review`

**Symptoms:** 403 Forbidden or redirect to home

**Causes:**
- User is not SuperAdmin
- Auth session expired

**Solutions:**

1. **Check User Role**
   ```sql
   SELECT role FROM user_roles WHERE user_id = 'your-user-id';
   -- Should return: SuperAdmin
   ```

2. **Grant SuperAdmin Role**
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-user-id', 'SuperAdmin')
   ON CONFLICT (user_id) DO UPDATE SET role = 'SuperAdmin';
   ```

3. **Check Auth Middleware**
   ```typescript
   // In admin route
   const { data: { user } } = await supabase.auth.getUser();
   console.log('User:', user);
   ```

#### No Conversations Showing

**Symptoms:** Empty state in conversation list

**Causes:**
- No conversations in database
- RLS blocking queries
- Backend not deployed

**Solutions:**

1. **Insert Test Data**
   ```sql
   INSERT INTO chat_sessions (user_id, org_id, entry_point)
   VALUES (auth.uid(), 'org-id', 'chat_widget');
   ```

2. **Check Query**
   ```typescript
   const { data, error } = await supabase
     .from('chat_sessions')
     .select('*');
   
   console.log('Data:', data);
   console.log('Error:', error);
   ```

3. **Enable Mock Mode**
   - Admin dashboard should show placeholder UI
   - Verify components render correctly

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│                                                                     │
│  ┌─────────────────┐        ┌──────────────────┐                  │
│  │  Chat Widget    │        │  Admin Dashboard │                  │
│  │  (ChatWindow)   │        │  (Support Review)│                  │
│  │                 │        │                  │                  │
│  │  - GSAP anims   │        │  - Conversation  │                  │
│  │  - Citations    │        │    list          │                  │
│  │  - Tickets      │        │  - Metrics       │                  │
│  └────────┬────────┘        └────────┬─────────┘                  │
│           │                          │                             │
└───────────┼──────────────────────────┼─────────────────────────────┘
            │                          │
            │ HTTPS + JWT              │ HTTPS + JWT (SuperAdmin)
            │                          │
┌───────────▼──────────────────────────▼─────────────────────────────┐
│                     EXPRESS API BACKEND                            │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │                    API ENDPOINTS                             │ │
│  │                                                              │ │
│  │  /api/support/chat              (POST)  - Main chat         │ │
│  │  /api/support/feedback          (POST)  - Thumbs up/down    │ │
│  │  /api/support/log-bug           (POST)  - Create ticket     │ │
│  │  /api/support/admin/conversations (GET) - List conversations│ │
│  │  /api/support/admin/metrics     (GET)   - Analytics         │ │
│  │  /api/support/admin/conversation/:id (GET) - Details        │ │
│  └──────────────────────────┬───────────────────────────────────┘ │
│                             │                                      │
│  ┌──────────────────────────▼───────────────────────────────────┐ │
│  │                  BACKEND SERVICES                            │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌────────────┐  ┌──────────────────┐   │ │
│  │  │  Freshdesk   │  │ LLM        │  │  RAG Retrieval   │   │ │
│  │  │  Integration │  │ Service    │  │  (pgvector)      │   │ │
│  │  │              │  │            │  │                  │   │ │
│  │  │ - Sync KB    │  │ - OpenAI   │  │ - Embeddings     │   │ │
│  │  │ - Contacts   │  │ - Anthropic│  │ - Similarity     │   │ │
│  │  │ - Tickets    │  │ - Prompts  │  │ - Chunks         │   │ │
│  │  └──────────────┘  └────────────┘  └──────────────────┘   │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌────────────┐                          │ │
│  │  │  Snapshot    │  │ Rate       │                          │ │
│  │  │  Sanitizer   │  │ Limiter    │                          │ │
│  │  │              │  │            │                          │ │
│  │  │ - Remove PII │  │ - Tier-    │                          │ │
│  │  │ - Redact     │  │   based    │                          │ │
│  │  └──────────────┘  └────────────┘                          │ │
│  └──────────────────────────────────────────────────────────────┘ │
└───────────────────────┬──────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬─────────────────────┐
        │               │               │                     │
        ▼               ▼               ▼                     ▼
┌───────────────┐ ┌─────────────┐ ┌──────────┐     ┌────────────────┐
│   Supabase    │ │  Freshdesk  │ │  OpenAI  │     │   Anthropic    │
│  PostgreSQL   │ │     API     │ │   API    │     │      API       │
│               │ │             │ │          │     │                │
│ - chat_*      │ │ - Articles  │ │ - GPT-4  │     │ - Claude 3     │
│ - kb_*        │ │ - Contacts  │ │ - Embed  │     │                │
│ - support_*   │ │ - Tickets   │ │          │     │                │
│ - pgvector    │ │             │ │          │     │                │
└───────────────┘ └─────────────┘ └──────────┘     └────────────────┘
```

### Data Flow Examples

#### Chat Message Flow
```
1. User types message → ChatWindow.tsx
2. Capture app snapshot (route, UI state, entities)
3. POST /api/support/chat
4. Backend authenticates JWT
5. Backend sanitizes snapshot (remove PII)
6. Backend classifies intent (LLM)
7. Backend generates embedding (OpenAI)
8. Backend queries kb_chunks (pgvector similarity)
9. Backend generates response (LLM + KB context)
10. Backend stores message + citations
11. Backend returns response
12. Frontend displays message with citations
13. Frontend shows resolution buttons
```

#### Ticket Creation Flow
```
1. User clicks "Create Ticket"
2. TicketCreationModal opens
3. Auto-populate conversation context
4. User fills subject, description, priority
5. POST /api/support/log-bug
6. Backend gets/creates Freshdesk contact
7. Backend retrieves conversation history
8. Backend creates Freshdesk ticket
9. Backend stores in support_tickets table
10. Backend updates chat_sessions (escalated)
11. Frontend shows ticket ID + link
12. User receives email from Freshdesk
```

#### Admin Review Flow
```
1. Admin navigates to /admin/support-review
2. Middleware checks SuperAdmin role
3. GET /api/support/admin/conversations?days=30
4. Backend queries chat_sessions with joins
5. Backend applies RLS (SuperAdmin can see all)
6. Frontend displays conversation list
7. Admin clicks conversation
8. GET /api/support/admin/conversation/:id
9. Backend fetches messages + citations + feedback
10. Frontend displays full conversation
11. Admin reviews and takes action
```

---

## References

### Related Documentation
- **Backend Requirements:** [`SUPPORT_CHAT_BACKEND_REQUIREMENTS.md`](./SUPPORT_CHAT_BACKEND_REQUIREMENTS.md)
- **Freshdesk Service:** [`FRESHDESK_SERVICE_IMPLEMENTATION.md`](./FRESHDESK_SERVICE_IMPLEMENTATION.md)
- **Freshdesk Guide:** [`lib/support/FRESHDESK_SERVICE_GUIDE.md`](./lib/support/FRESHDESK_SERVICE_GUIDE.md)
- **Database Schema:** [`supabase/migrations/20260127000000_support_chat_system.sql`](./supabase/migrations/20260127000000_support_chat_system.sql)

### Code References
- **Chat Widget:** `components/chat/ChatWindow.tsx`
- **Ticket Modal:** `components/support/TicketCreationModal.tsx`
- **Admin Dashboard:** `app/admin/support-review/page.tsx`
- **API Client:** `lib/api-client.ts`
- **Mock API:** `lib/support/mock-support-api.ts`
- **Types:** `types/support.ts`

### External APIs
- [Freshdesk API Documentation](https://developers.freshdesk.com/api/)
- [OpenAI API Documentation](https://platform.openai.com/docs/api-reference)
- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-27 | 1.0.0 | Initial implementation summary created |

---

**Status:** ✅ Frontend complete and ready for backend integration

**Next Action:** Backend team to implement 6 API endpoints per requirements document

**Questions?** Contact the frontend team or refer to the detailed backend requirements document.
