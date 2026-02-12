# search_kb_chunks Function Fix - Implementation Guide

**Migration File:** `supabase/migrations/20260212000000_fix_search_kb_chunks_function.sql`  
**Project:** Javelina (Dev Database Branch: `ipfsrbxjgewhdcvonrbo`)  
**Status:** Pending Manual Application  
**Created:** 2026-02-12

---

## Overview

This migration updates the `search_kb_chunks` PostgreSQL function to:
1. Accept `text` input for `query_embedding` instead of `vector` type
2. Use `javelina_url` instead of `url` from `kb_documents`
3. Use `last_updated_at` instead of `updated_at`
4. Prioritize `metadata->>'external_id'` over `kb_documents.external_id` for citation mapping

---

## Database Changes

### Current Function Signature

```sql
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding public.vector,  -- ❌ Vector type
  user_org_id uuid DEFAULT NULL::uuid,
  similarity_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index integer,
  external_id text,
  title text,
  url text,              -- ❌ Uses url instead of javelina_url
  last_updated timestamp with time zone,
  metadata jsonb,
  similarity double precision
)
```

### New Function Signature

```sql
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding text,  -- ✅ Text input, converted to vector inside function
  user_org_id uuid DEFAULT NULL::uuid,
  similarity_threshold double precision DEFAULT 0.3,  -- ✅ Lower default threshold
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  similarity double precision,  -- ✅ Moved up for clearer ordering
  title text,
  url text,              -- ✅ Now uses javelina_url from kb_documents
  last_updated timestamptz,
  external_id text,      -- ✅ Prioritizes metadata->>'external_id'
  metadata jsonb
)
```

### Key Changes

1. **Text Input Conversion**
   - Function now accepts `text` and converts to `vector(1536)` internally
   - Allows passing embeddings as string arrays from backend/frontend

2. **URL Field**
   - Changed from `kd.url` → `kd.javelina_url`
   - Ensures proxied URLs are returned for click tracking

3. **External ID Priority**
   - Changed from `kd.external_id` → `COALESCE(kc.metadata->>'external_id', kd.external_id::text)`
   - Prioritizes chunk-level metadata for article-specific IDs

4. **Similarity Threshold**
   - Default lowered from `0.5` → `0.3` for broader matches

5. **Return Columns Reordered**
   - Removed `chunk_index` (not needed for citations)
   - `similarity` moved earlier for easier debugging

---

## Backend Changes Required

### 1. Update Express API Endpoint

**File:** `backend/routes/support.js` (or wherever RAG/search is implemented)

**Current Code (Hypothetical):**
```javascript
// POST /api/support/search-kb
app.post('/api/support/search-kb', async (req, res) => {
  const { query, orgId } = req.body;
  
  // Generate embedding (OpenAI/similar)
  const embedding = await generateEmbedding(query);
  
  // Call Supabase function with vector type
  const { data, error } = await supabase.rpc('search_kb_chunks', {
    query_embedding: embedding,  // ❌ Passed as array/vector
    user_org_id: orgId,
    similarity_threshold: 0.5,
    match_count: 5
  });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ results: data });
});
```

**Updated Code:**
```javascript
// POST /api/support/search-kb
app.post('/api/support/search-kb', async (req, res) => {
  const { query, orgId } = req.body;
  
  // Generate embedding (OpenAI/similar)
  const embeddingArray = await generateEmbedding(query);  // e.g., [0.123, -0.456, ...]
  
  // Convert to PostgreSQL vector format string: '[0.123,-0.456,...]'
  const embeddingText = `[${embeddingArray.join(',')}]`;
  
  // Call Supabase function with text input
  const { data, error } = await supabase.rpc('search_kb_chunks', {
    query_embedding: embeddingText,  // ✅ Passed as text string
    user_org_id: orgId,
    similarity_threshold: 0.3,  // ✅ Updated default
    match_count: 5
  });
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Map results to frontend citation format
  const citations = data.map(chunk => ({
    title: chunk.title,
    articleId: chunk.external_id,        // ✅ Now from metadata if available
    javelinaUrl: chunk.url,               // ✅ Now javelina_url
    confidence: chunk.similarity,
    lastUpdated: chunk.last_updated,
  }));
  
  res.json({ results: citations });
});
```

### 2. Update Support Chat RAG Logic

**File:** `backend/routes/support-chat.js`

**Current Code (Hypothetical):**
```javascript
// POST /api/support/chat
app.post('/api/support/chat', async (req, res) => {
  const { message, userId, orgId } = req.body;
  
  // Generate embedding for user's message
  const embedding = await generateEmbedding(message);
  
  // Search KB chunks
  const { data: chunks } = await supabase.rpc('search_kb_chunks', {
    query_embedding: embedding,
    user_org_id: orgId,
    match_count: 3
  });
  
  // Use chunks as context for AI response
  const context = chunks.map(c => c.chunk_text).join('\n\n');
  const aiResponse = await generateAIResponse(message, context);
  
  // Build citations from chunks
  const citations = chunks.map(c => ({
    title: c.title,
    articleId: c.external_id,
    javelinaUrl: `https://javelina.com/docs/${c.external_id}`,  // ❌ Manual URL construction
    confidence: c.similarity
  }));
  
  res.json({ reply: aiResponse, citations });
});
```

**Updated Code:**
```javascript
// POST /api/support/chat
app.post('/api/support/chat', async (req, res) => {
  const { message, userId, orgId } = req.body;
  
  // Generate embedding for user's message
  const embeddingArray = await generateEmbedding(message);
  const embeddingText = `[${embeddingArray.join(',')}]`;  // ✅ Convert to text
  
  // Search KB chunks
  const { data: chunks, error } = await supabase.rpc('search_kb_chunks', {
    query_embedding: embeddingText,  // ✅ Text input
    user_org_id: orgId,
    similarity_threshold: 0.3,       // ✅ Lower threshold for better recall
    match_count: 3
  });
  
  if (error) {
    console.error('KB search failed:', error);
    // Fallback to generic response
    return res.json({ reply: 'I'm having trouble accessing the knowledge base...', citations: [] });
  }
  
  // Use chunks as context for AI response
  const context = chunks.map(c => c.chunk_text).join('\n\n');
  const aiResponse = await generateAIResponse(message, context);
  
  // Build citations from chunks
  const citations = chunks.map(c => ({
    title: c.title,
    articleId: c.external_id,        // ✅ From metadata->external_id or document
    javelinaUrl: c.url,               // ✅ Already proxied javelina_url
    confidence: c.similarity,
    lastUpdated: c.last_updated       // ✅ From last_updated_at
  }));
  
  res.json({ reply: aiResponse, citations });
});
```

### 3. Add Helper Function for Embedding Conversion

**File:** `backend/utils/embeddings.js`

```javascript
/**
 * Converts an embedding array to PostgreSQL vector text format
 * @param {number[]} embeddingArray - Array of floats (e.g., [0.123, -0.456, ...])
 * @returns {string} PostgreSQL vector string (e.g., '[0.123,-0.456,...]')
 */
export function embeddingToVectorText(embeddingArray) {
  if (!Array.isArray(embeddingArray) || embeddingArray.length !== 1536) {
    throw new Error('Embedding must be an array of 1536 numbers');
  }
  return `[${embeddingArray.join(',')}]`;
}

/**
 * Generate embedding using OpenAI API
 * @param {string} text - Text to embed
 * @returns {Promise<number[]>} Embedding array
 */
export async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

/**
 * Search KB chunks with automatic embedding generation
 * @param {string} query - User's search query
 * @param {string} orgId - Organization ID
 * @param {object} options - Search options (threshold, matchCount)
 * @returns {Promise<object[]>} Matching chunks with citations
 */
export async function searchKBChunks(query, orgId, options = {}) {
  const { threshold = 0.3, matchCount = 5 } = options;
  
  // Generate and convert embedding
  const embeddingArray = await generateEmbedding(query);
  const embeddingText = embeddingToVectorText(embeddingArray);
  
  // Call Supabase function
  const { data, error } = await supabase.rpc('search_kb_chunks', {
    query_embedding: embeddingText,
    user_org_id: orgId,
    similarity_threshold: threshold,
    match_count: matchCount
  });
  
  if (error) throw error;
  
  return data.map(chunk => ({
    chunkId: chunk.chunk_id,
    documentId: chunk.document_id,
    text: chunk.chunk_text,
    similarity: chunk.similarity,
    citation: {
      title: chunk.title,
      articleId: chunk.external_id,
      javelinaUrl: chunk.url,
      lastUpdated: chunk.last_updated
    },
    metadata: chunk.metadata
  }));
}
```

---

## Frontend Changes Required

### 1. Update API Client

**File:** `lib/api-client.ts`

**Current Code:**
```typescript
// types/support.ts
export interface SupportCitation {
  title: string;
  articleId: string;
  javelinaUrl: string;
  confidence: number;
  lastUpdated: string;
}

// lib/api-client.ts
export const supportApi = {
  // ... other methods
  
  searchKB: async (query: string, orgId?: string) => {
    return apiClient.post('/support/search-kb', { query, orgId });
  },
};
```

**Updated Code (No Frontend Changes Needed):**
```typescript
// types/support.ts remains the same
export interface SupportCitation {
  title: string;
  articleId: string;        // ✅ Now prioritizes metadata->external_id
  javelinaUrl: string;      // ✅ Now from javelina_url field
  confidence: number;
  lastUpdated: string;      // ✅ From last_updated_at
}

// lib/api-client.ts - No changes needed
export const supportApi = {
  searchKB: async (query: string, orgId?: string) => {
    return apiClient.post('/support/search-kb', { query, orgId });
  },
};
```

### 2. Chat Component (No Changes Required)

**File:** `components/chat/ChatWindow.tsx`

The chat component already handles citations correctly. The backend changes ensure the citation data is accurate:

```tsx
{message.citations?.map((citation, idx) => (
  <div key={idx} className="text-xs pl-3 border-l-2">
    <a
      href={citation.javelinaUrl}  // ✅ Now guaranteed to be proxied URL
      target="_blank"
      rel="noopener noreferrer"
      className="text-orange hover:underline"
    >
      {citation.title}
    </a>
    <span className="text-gray-500 ml-2">
      (confidence: {(citation.confidence * 100).toFixed(0)}%)
    </span>
  </div>
))}
```

---

## Migration Application Steps

### Dev Database (Branch: ipfsrbxjgewhdcvonrbo)

1. **Open Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ipfsrbxjgewhdcvonrbo/sql/new
   ```

2. **Copy Migration File:**
   - Open `supabase/migrations/20260212000000_fix_search_kb_chunks_function.sql`
   - Copy entire contents

3. **Execute in SQL Editor:**
   - Paste into SQL editor
   - Click "Run" to execute
   - Verify success message

4. **Verify Function:**
   ```sql
   -- Test the function with a sample embedding
   SELECT * FROM public.search_kb_chunks(
     '[0.1,0.2,0.3,...]',  -- Replace with actual embedding string
     NULL,                  -- user_org_id (NULL = global docs)
     0.3,                   -- similarity_threshold
     5                      -- match_count
   );
   ```

5. **Check Return Values:**
   - Ensure `url` column contains javelina URLs (e.g., `/docs/...`)
   - Verify `external_id` comes from metadata when available
   - Confirm `last_updated` matches `kb_documents.last_updated_at`

---

## Testing Checklist

### Backend Tests

- [ ] Generate embedding from text query
- [ ] Convert embedding array to vector text format `[x,y,z,...]`
- [ ] Call `search_kb_chunks` with text input
- [ ] Verify returned `url` is a javelina URL
- [ ] Verify `external_id` prioritizes `metadata->>'external_id'`
- [ ] Test with `user_org_id` (org-specific docs)
- [ ] Test with `user_org_id = NULL` (global docs only)
- [ ] Test similarity threshold adjustments (0.2, 0.3, 0.5)

### Frontend Tests

- [ ] Chat sends message and receives citations
- [ ] Citation links use `javelinaUrl` (proxied URLs)
- [ ] Citation titles display correctly
- [ ] Confidence scores render as percentages
- [ ] Click tracking works for citation links
- [ ] No console errors related to undefined fields

### Edge Cases

- [ ] Empty query (no embeddings)
- [ ] No matching chunks (similarity too low)
- [ ] User has no org (org_id = NULL)
- [ ] KB has no documents (empty table)
- [ ] Metadata missing `external_id` (falls back to document.external_id)

---

## Rollback Plan

If issues arise, revert to the previous function:

```sql
-- Rollback: Restore original function signature
DROP FUNCTION IF EXISTS public.search_kb_chunks(text, uuid, double precision, integer);

CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding public.vector,
  user_org_id uuid DEFAULT NULL::uuid,
  similarity_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index integer,
  external_id text,
  title text,
  url text,
  last_updated timestamp with time zone,
  metadata jsonb,
  similarity double precision
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.document_id,
    kc.chunk_text,
    kc.chunk_index,
    kd.external_id,
    kd.title,
    kd.url,  -- Original url field
    kd.updated_at AS last_updated,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks kc
  INNER JOIN public.kb_documents kd ON kc.document_id = kd.id
  WHERE 
    (user_org_id IS NULL OR kc.org_id = user_org_id OR kc.org_id IS NULL)
    AND (kc.embedding IS NOT NULL)
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## Summary

**Migration:** `20260212000000_fix_search_kb_chunks_function.sql`  
**Backend Changes:** Update all `search_kb_chunks` calls to pass text embeddings  
**Frontend Changes:** None required (backend API remains consistent)  
**Testing:** Verify URL, external_id, and last_updated fields are correct  
**Status:** Ready for manual application to dev database

**Next Steps:**
1. Apply migration to dev database via SQL editor
2. Update backend to pass text embeddings
3. Deploy backend changes
4. Test end-to-end chat with citations
5. Monitor for errors in production logs
