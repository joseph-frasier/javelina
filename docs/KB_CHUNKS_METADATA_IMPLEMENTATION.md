# KB Chunks Metadata Implementation - Backend Handoff

**Document Version:** 1.0  
**Created:** February 10, 2026  
**Frontend Status:** ✅ Complete  
**Backend Status:** 🚧 Pending Implementation  
**Migration File:** `supabase/migrations/20260130000000_add_metadata_to_kb_chunks.sql`

---

## Executive Summary

This document describes the frontend implementation for adding a `metadata` column to the `kb_chunks` table and specifies the **required backend changes** to fully support this feature.

**What Was Done (Frontend):**
- Created migration file to add `metadata jsonb` column to `kb_chunks`
- Updated `KBChunk` TypeScript interface with optional `metadata` field
- Created test fixtures for 3 metadata states (undefined, null, populated)
- Ensured backwards compatibility (no breaking changes)

**What's Needed (Backend):**
- Apply the migration to the dev database
- Update article sync scripts to populate `metadata` when inserting chunks
- Optionally update RAG search function to return `metadata` in results
- Optionally expose `metadata` fields in API responses (citations)

---

## Table of Contents

1. [Migration Application](#migration-application)
2. [Backend Requirements](#backend-requirements)
3. [Frontend Changes Summary](#frontend-changes-summary)
4. [Expected Metadata Schema](#expected-metadata-schema)
5. [API Response Examples](#api-response-examples)
6. [Testing Guidance](#testing-guidance)
7. [Rollback Plan](#rollback-plan)

---

## Migration Application

### Step 1: Apply Migration to Dev Database

**Migration File:** `supabase/migrations/20260130000000_add_metadata_to_kb_chunks.sql`

**Option A: Via Supabase CLI**

```bash
cd /Users/andrewfrasier/Documents/GitHub/Javelina
supabase db push --linked
```

**Option B: Via SQL Editor**

1. Go to: https://supabase.com/dashboard/project/ipfsrbxjgewhdcvonrbo/sql/new
2. Copy the contents of `20260130000000_add_metadata_to_kb_chunks.sql`
3. Paste and click "Run"

### Step 2: Verify Migration

```sql
-- Verify column exists
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'kb_chunks' 
  AND column_name = 'metadata';

-- Expected output:
-- column_name | data_type | is_nullable | column_default
-- metadata    | jsonb     | YES         | NULL
```

### Step 3: Test with Sample Data

```sql
-- Insert a test chunk with metadata
INSERT INTO public.kb_chunks (
  id, document_id, org_id, chunk_index, chunk_text, tokens, metadata
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM public.kb_documents LIMIT 1), -- Use existing doc
  NULL,
  999,
  'Test chunk with metadata',
  10,
  '{"source": "support", "articleId": "test_123", "locale": "en-US"}'::jsonb
);

-- Query to verify
SELECT id, chunk_text, metadata 
FROM public.kb_chunks 
WHERE chunk_index = 999;

-- Clean up test data
DELETE FROM public.kb_chunks WHERE chunk_index = 999;
```

---

## Backend Requirements

### 1. Article Sync Script Updates

**Files to Update:**
- Backend article sync service (location TBD - likely in Express API)
- Freshdesk KB sync script
- Any other document ingestion pipelines

**Required Changes:**

When inserting or updating `kb_chunks`, populate the `metadata` column with source information:

```typescript
// Example: Node.js/TypeScript article sync
interface ChunkMetadata {
  source: 'support' | 'internal_markdown' | 'notion' | 'google_docs';
  articleId: string;
  locale?: string;
  sectionTitle?: string;
  tags?: string[];
}

async function insertChunk(chunk: {
  document_id: string;
  chunk_index: number;
  chunk_text: string;
  embedding: number[];
  tokens: number;
  metadata: ChunkMetadata;  // NEW
}) {
  const { error } = await supabase
    .from('kb_chunks')
    .insert({
      document_id: chunk.document_id,
      chunk_index: chunk.chunk_index,
      chunk_text: chunk.chunk_text,
      embedding: chunk.embedding,
      tokens: chunk.tokens,
      metadata: chunk.metadata,  // NEW: Pass metadata object
    });
  
  if (error) throw error;
}

// Example usage for Freshdesk article sync
await insertChunk({
  document_id: freshdeskDoc.id,
  chunk_index: 0,
  chunk_text: 'How to reset your password...',
  embedding: [0.123, 0.456, ...],  // 1536 dimensions
  tokens: 50,
  metadata: {
    source: 'support',
    articleId: freshdeskArticle.id.toString(),
    locale: freshdeskArticle.language || 'en-US',
    sectionTitle: freshdeskArticle.category_name,
    tags: freshdeskArticle.tags || [],
  },
});
```

**Python Example:**

```python
# Example: Python article sync
def insert_chunk(supabase_client, chunk_data):
    metadata = {
        "source": "support",
        "articleId": chunk_data["article_id"],
        "locale": chunk_data.get("locale", "en-US"),
        "sectionTitle": chunk_data.get("section_title"),
        "tags": chunk_data.get("tags", [])
    }
    
    supabase_client.table("kb_chunks").insert({
        "document_id": chunk_data["document_id"],
        "chunk_index": chunk_data["chunk_index"],
        "chunk_text": chunk_data["chunk_text"],
        "embedding": chunk_data["embedding"],
        "tokens": chunk_data["tokens"],
        "metadata": metadata  # NEW
    }).execute()
```

### 2. RAG Search Function Updates (Optional)

**File:** `supabase/migrations/20260128000002_support_chat_missing_objects.sql` (lines 128-172)

**Current Implementation:**

```sql
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding vector(1536),
  match_org_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  chunk_text text,
  chunk_index integer,
  external_id text,
  title text,
  url text,
  similarity float
)
```

**Recommended Update:**

Add `metadata` to the return type and SELECT clause:

```sql
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding vector(1536),
  match_org_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  chunk_text text,
  chunk_index integer,
  external_id text,
  title text,
  url text,
  metadata jsonb,  -- NEW
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.chunk_text,
    kc.chunk_index,
    kd.external_id,
    kd.title,
    kd.url,
    kc.metadata,  -- NEW
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks kc
  INNER JOIN public.kb_documents kd ON kc.document_id = kd.id
  WHERE 
    -- ... existing WHERE clause
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

**Migration for Function Update:**

Create a new migration file `20260130000001_update_search_kb_chunks_metadata.sql` if you want to update the function:

```sql
-- Update search_kb_chunks to return metadata
-- This allows backend API to access chunk metadata for citations

DROP FUNCTION IF EXISTS public.search_kb_chunks(vector(1536), uuid, float, int);

CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding vector(1536),
  match_org_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  chunk_text text,
  chunk_index integer,
  external_id text,
  title text,
  url text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.chunk_text,
    kc.chunk_index,
    kd.external_id,
    kd.title,
    kd.url,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks kc
  INNER JOIN public.kb_documents kd ON kc.document_id = kd.id
  WHERE 
    (match_org_id IS NULL OR kc.org_id = match_org_id OR kc.org_id IS NULL)
    AND (kc.embedding IS NOT NULL)
    AND (1 - (kc.embedding <=> query_embedding)) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.search_kb_chunks(vector(1536), uuid, float, int) IS 
  'Performs vector similarity search over knowledge base chunks (returns metadata for citation enrichment)';
```

### 3. Backend API Response Updates (Optional)

**Files to Update:**
- Express API support chat endpoint (POST `/api/support/chat`)
- Citation builder/serializer logic

**Current Citation Type (Frontend):**

```typescript
// lib/api-client.ts
export interface SupportCitation {
  title: string;
  articleId: string;
  javelinaUrl: string;
  confidence: number;
  lastUpdated: string;
}
```

**Recommended Extended Citation Type:**

If you want to expose chunk metadata to the frontend (for badges, filters, etc.):

```typescript
export interface SupportCitation {
  title: string;
  articleId: string;
  javelinaUrl: string;
  confidence: number;
  lastUpdated: string;
  // NEW: Optional metadata fields
  source?: 'support' | 'internal_markdown' | 'notion' | 'google_docs';
  locale?: string;
  sectionTitle?: string;
  tags?: string[];
}
```

**Backend Implementation Example:**

```typescript
// Backend: Build citations from RAG search results
function buildCitations(ragResults: RagSearchResult[]): SupportCitation[] {
  return ragResults.map(result => ({
    title: result.title,
    articleId: result.external_id,
    javelinaUrl: buildJavelinaUrl(result.external_id),
    confidence: result.similarity,
    lastUpdated: result.last_updated_at,
    // NEW: Extract from metadata if available
    source: result.metadata?.source as string | undefined,
    locale: result.metadata?.locale as string | undefined,
    sectionTitle: result.metadata?.sectionTitle as string | undefined,
    tags: result.metadata?.tags as string[] | undefined,
  }));
}
```

---

## Frontend Changes Summary

### 1. Type Updates

**File:** `types/support.ts` (line 209)

```typescript
export interface KBChunk {
  id: string;
  document_id: string;
  org_id: string | null;
  chunk_index: number;
  chunk_text: string;
  embedding: number[] | null;
  tokens: number | null;
  created_at: string;
  metadata?: Record<string, unknown> | null;  // NEW: Optional for rollout safety
}
```

### 2. Test Fixtures

**File:** `tests/fixtures/kbChunks.ts`

Created fixtures for 3 metadata states:
- `noMetadata`: metadata field missing (pre-migration)
- `nullMetadata`: metadata explicitly null
- `supportMetadata`: metadata populated with source info
- `extendedMetadata`: metadata with additional optional fields

Also includes helper function `getChunkMetadataValue<T>()` for type-safe access.

### 3. Backwards Compatibility

All frontend code is already backwards compatible:
- ✅ No runtime errors if `metadata` is undefined
- ✅ No runtime errors if `metadata` is null
- ✅ Safe optional chaining for all metadata access
- ✅ No UI changes required (metadata is optional)

**Safe Access Pattern:**

```typescript
// Example: Safe metadata access in frontend code
const source = chunk.metadata?.source;
const articleId = chunk.metadata?.articleId;

if (source === 'support') {
  // Show support badge
}
```

---

## Expected Metadata Schema

### Standard Metadata Fields

All chunks should include these fields when populated:

```json
{
  "source": "support",
  "articleId": "support_456",
  "locale": "en-US"
}
```

### Extended Metadata (Optional)

Additional fields for enhanced features:

```json
{
  "source": "support",
  "articleId": "support_456",
  "locale": "en-US",
  "sectionTitle": "Getting Started",
  "tags": ["dns", "troubleshooting", "records"],
  "authorId": "user_123",
  "publishedAt": "2026-01-15T00:00:00Z",
  "viewCount": 1234
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `source` | `string` | Yes | Source system: `support`, `internal_markdown`, `notion`, `google_docs` |
| `articleId` | `string` | Yes | Unique ID in source system (e.g., Freshdesk article ID) |
| `locale` | `string` | No | ISO language code (e.g., `en-US`, `es-ES`) |
| `sectionTitle` | `string` | No | Category or section name |
| `tags` | `string[]` | No | Article tags for filtering |
| `authorId` | `string` | No | Author ID in source system |
| `publishedAt` | `string` | No | ISO 8601 timestamp |
| `viewCount` | `number` | No | Article view count (if available) |

---

## API Response Examples

### Current Response (No Metadata)

```json
{
  "reply": "To reset your password, follow these steps:\n1. Click Settings\n2. Navigate to Security\n3. Click Reset Password\n4. Check your email for the reset link",
  "citations": [
    {
      "title": "Password Reset Guide",
      "articleId": "support_456",
      "javelinaUrl": "https://javelina.com/support/456",
      "confidence": 0.92,
      "lastUpdated": "2026-01-15T00:00:00Z"
    }
  ],
  "intent": "account",
  "resolution": {
    "needsConfirmation": true
  },
  "nextAction": {
    "type": "none",
    "reason": "High confidence answer with clear steps"
  },
  "conversationId": "conv_abc123"
}
```

### Enhanced Response (With Metadata)

If backend chooses to expose chunk metadata in citations:

```json
{
  "reply": "To reset your password, follow these steps:\n1. Click Settings\n2. Navigate to Security\n3. Click Reset Password\n4. Check your email for the reset link",
  "citations": [
    {
      "title": "Password Reset Guide",
      "articleId": "support_456",
      "javelinaUrl": "https://javelina.com/support/456",
      "confidence": 0.92,
      "lastUpdated": "2026-01-15T00:00:00Z",
      "source": "support",
      "locale": "en-US",
      "sectionTitle": "Account Management",
      "tags": ["account", "security", "password"]
    }
  ],
  "intent": "account",
  "resolution": {
    "needsConfirmation": true
  },
  "nextAction": {
    "type": "none",
    "reason": "High confidence answer with clear steps"
  },
  "conversationId": "conv_abc123"
}
```

### Frontend UI Enhancement Example

If backend exposes `source` in citations, frontend can show badges:

```tsx
// components/chat/ChatWindow.tsx
{message.citations.map((citation, idx) => (
  <div key={idx} className="flex flex-col gap-1">
    {/* Source badge */}
    {citation.source === 'support' && (
      <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full w-fit">
        Support Article
      </span>
    )}
    
    {/* Article link */}
    <a
      href={citation.javelinaUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-orange hover:text-orange-dark underline"
    >
      {citation.title}
    </a>
    
    {/* Tags (if available) */}
    {citation.tags && citation.tags.length > 0 && (
      <div className="flex gap-1 flex-wrap">
        {citation.tags.map(tag => (
          <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
            {tag}
          </span>
        ))}
      </div>
    )}
  </div>
))}
```

---

## Testing Guidance

### Backend Testing

**1. Test Metadata Insertion**

```typescript
// Test: Insert chunk with metadata
describe('KB Chunks Metadata', () => {
  it('should insert chunk with metadata', async () => {
    const testChunk = {
      document_id: testDocId,
      chunk_index: 0,
      chunk_text: 'Test content',
      embedding: new Array(1536).fill(0.1),
      tokens: 10,
      metadata: {
        source: 'support',
        articleId: 'test_123',
        locale: 'en-US',
      },
    };
    
    const { data, error } = await supabase
      .from('kb_chunks')
      .insert(testChunk)
      .select()
      .single();
    
    expect(error).toBeNull();
    expect(data.metadata).toEqual(testChunk.metadata);
  });
});
```

**2. Test RAG Search with Metadata**

```typescript
// Test: RAG search returns metadata
it('should return metadata in search results', async () => {
  const queryEmbedding = new Array(1536).fill(0.1);
  
  const { data, error } = await supabase.rpc('search_kb_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.5,
    match_count: 5,
  });
  
  expect(error).toBeNull();
  expect(data[0]).toHaveProperty('metadata');
  expect(data[0].metadata?.source).toBeDefined();
});
```

### Frontend Testing

**1. Test Fixtures Usage**

```typescript
// tests/components/ChatWindow.test.tsx
import { kbChunkFixtures } from '@/tests/fixtures/kbChunks';

describe('ChatWindow - Citations', () => {
  it('renders citations without errors when metadata is missing', () => {
    const chunk = kbChunkFixtures.noMetadata;
    expect(chunk.metadata).toBeUndefined();
    // Test UI rendering with this chunk
  });
  
  it('renders citations without errors when metadata is null', () => {
    const chunk = kbChunkFixtures.nullMetadata;
    expect(chunk.metadata).toBeNull();
    // Test UI rendering with this chunk
  });
  
  it('shows source badge when metadata.source is "support"', () => {
    const chunk = kbChunkFixtures.supportMetadata;
    expect(chunk.metadata?.source).toBe('support');
    // Test UI shows badge
  });
});
```

**2. Type Safety Tests**

```typescript
// Test: Type-safe metadata access
import { getChunkMetadataValue } from '@/tests/fixtures/kbChunks';

it('safely accesses metadata with type safety', () => {
  const chunk = kbChunkFixtures.supportMetadata;
  
  const source = getChunkMetadataValue<string>(chunk, 'source');
  expect(source).toBe('support');
  
  const tags = getChunkMetadataValue<string[]>(chunk, 'tags');
  expect(tags).toBeUndefined(); // Not present in supportMetadata fixture
});
```

---

## Rollback Plan

If the migration needs to be rolled back:

### Step 1: Create Rollback Migration

**File:** `supabase/migrations/20260130999999_rollback_kb_chunks_metadata.sql`

```sql
-- Rollback: Remove metadata column from kb_chunks
-- WARNING: This will permanently delete all metadata stored in the column

ALTER TABLE public.kb_chunks DROP COLUMN IF EXISTS metadata;

COMMENT ON TABLE public.kb_chunks IS 'Document chunks with vector embeddings for semantic search (metadata column removed)';
```

### Step 2: Apply Rollback

```bash
# Via Supabase CLI
supabase db push --linked

# Or via SQL Editor
# https://supabase.com/dashboard/project/ipfsrbxjgewhdcvonrbo/sql/new
```

### Step 3: Verify Rollback

```sql
-- Should return no rows
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'kb_chunks' AND column_name = 'metadata';
```

### Step 4: Frontend Cleanup (Optional)

If you want to remove the `metadata` field from TypeScript types:

```typescript
// types/support.ts
export interface KBChunk {
  id: string;
  document_id: string;
  org_id: string | null;
  chunk_index: number;
  chunk_text: string;
  embedding: number[] | null;
  tokens: number | null;
  created_at: string;
  // metadata field removed
}
```

**Note:** Frontend is designed to be backwards compatible, so removing the type is optional.

---

## Summary Checklist

### Backend Team Action Items

- [ ] **Apply migration** to dev database (`20260130000000_add_metadata_to_kb_chunks.sql`)
- [ ] **Update article sync scripts** to populate `metadata` when inserting chunks
- [ ] **Test metadata insertion** with sample Freshdesk articles
- [ ] **Optionally update `search_kb_chunks` function** to return metadata
- [ ] **Optionally expose metadata** in API citation responses
- [ ] **Update backend tests** to cover metadata scenarios
- [ ] **Document metadata schema** in backend API docs
- [ ] **Apply migration to production** after dev testing

### Frontend Team (Already Complete)

- [x] Created migration file
- [x] Updated `KBChunk` interface with optional `metadata`
- [x] Created test fixtures for 3 metadata states
- [x] Ensured backwards compatibility
- [x] Created post-implementation documentation

---

## Questions or Issues?

**For Backend Questions:**
- Slack: #backend-support or #ai-chat-support
- Email: backend-team@javelina.com

**For Frontend Questions:**
- Slack: #frontend-support or #ai-chat-support
- Email: frontend-team@javelina.com

**Migration Issues:**
- Check Supabase dashboard logs: https://supabase.com/dashboard/project/ipfsrbxjgewhdcvonrbo/logs
- Review migration file for syntax errors
- Verify dev database connection: `supabase status --linked`
