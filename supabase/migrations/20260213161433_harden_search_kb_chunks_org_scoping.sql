-- Fix search_kb_chunks to prevent cross-tenant data leakage
-- When user_org_id is NULL, only return global (non-org-specific) chunks
-- When user_org_id is provided, return matching org chunks AND global chunks
-- This prevents an unauthenticated or unscoped call from seeing all org data

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
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.document_id,
    kc.chunk_text,
    kc.chunk_index,
    kd.external_id,
    kd.title,
    kd.url,
    kd.updated_at AS last_updated,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.kb_chunks kc
  INNER JOIN public.kb_documents kd ON kc.document_id = kd.id
  WHERE 
    -- When user_org_id is NULL: only return global chunks (org_id IS NULL)
    -- When user_org_id is provided: return org-specific chunks OR global chunks
    (kc.org_id IS NULL OR (user_org_id IS NOT NULL AND kc.org_id = user_org_id))
    AND (kc.embedding IS NOT NULL)
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$;
