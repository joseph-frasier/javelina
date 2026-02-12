-- Fix search_kb_chunks function
-- 
-- Purpose: Update search_kb_chunks to accept text input for query_embedding
--          and properly use javelina_url, last_updated_at, and metadata->external_id
--
-- Migration: 20260212000000_fix_search_kb_chunks_function
-- Status: Pending manual application to dev database (branch: ipfsrbxjgewhdcvonrbo)
-- DO NOT APPLY DIRECTLY - User will apply manually via SQL editor

-- Drop all existing search_kb_chunks overloads
DROP FUNCTION IF EXISTS public.search_kb_chunks(public.vector, uuid, double precision, integer);
DROP FUNCTION IF EXISTS public.search_kb_chunks(text, uuid, double precision, integer);

-- Create new search_kb_chunks function with text input
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding text,
  user_org_id uuid DEFAULT NULL::uuid,
  similarity_threshold double precision DEFAULT 0.3,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  similarity double precision,
  title text,
  url text,
  last_updated timestamptz,
  external_id text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE 
  qv vector(1536);
BEGIN
  -- Convert text to vector
  qv := query_embedding::vector(1536);
  
  RETURN QUERY
  WITH scored AS (
    SELECT 
      kc.id,
      kc.document_id,
      kc.chunk_text,
      1 - (kc.embedding <=> qv) AS sim,
      kd.title,
      kd.javelina_url AS url,
      kd.last_updated_at,
      COALESCE(kc.metadata->>'external_id', kd.external_id::text) AS ext_id,
      kc.metadata
    FROM public.kb_chunks kc
    JOIN public.kb_documents kd ON kd.id = kc.document_id
    WHERE kc.embedding IS NOT NULL
      AND (kd.org_id IS NULL OR kd.org_id = user_org_id)
  )
  SELECT 
    s.id,
    s.document_id,
    s.chunk_text,
    s.sim,
    s.title,
    s.url,
    s.last_updated_at,
    s.ext_id,
    s.metadata
  FROM scored s 
  WHERE s.sim > similarity_threshold
  ORDER BY s.sim DESC 
  LIMIT match_count;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.search_kb_chunks(text, uuid, double precision, integer) IS 
  'Performs vector similarity search over knowledge base chunks. Accepts text embedding input, returns javelina_url and metadata->external_id for citation mapping.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.search_kb_chunks(text, uuid, double precision, integer) TO authenticated, service_role;
