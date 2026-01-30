-- ============================================================================
-- Support Chat Missing Objects Migration
-- Adds rate limiting table and missing helper functions
-- ============================================================================
-- This migration is idempotent and safe to re-run

-- ============================================================================
-- 1. Rate Limits Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,  -- user_id, ip_address, or org_id
  endpoint text NOT NULL,    -- e.g., '/api/support/chat', '/api/support/tickets'
  request_count integer DEFAULT 0,
  window_start_ms bigint NOT NULL,  -- Unix timestamp in milliseconds
  reset_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, endpoint)
);

COMMENT ON TABLE public.rate_limits IS 'Rate limiting counters for API endpoints';
COMMENT ON COLUMN public.rate_limits.identifier IS 'Unique identifier for rate limiting (user_id, ip_address, or org_id)';
COMMENT ON COLUMN public.rate_limits.endpoint IS 'API endpoint being rate limited';
COMMENT ON COLUMN public.rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN public.rate_limits.window_start_ms IS 'Start of rate limit window (Unix ms)';
COMMENT ON COLUMN public.rate_limits.reset_at IS 'When rate limit resets';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint ON public.rate_limits(identifier, endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON public.rate_limits(reset_at);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then recreate
DROP POLICY IF EXISTS "Service role full access to rate_limits" ON public.rate_limits;

CREATE POLICY "Service role full access to rate_limits"
  ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 2. Rate Limit Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  rate_identifier text,
  rate_endpoint text,
  rate_limit int,
  window_ms bigint
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_time_ms bigint;
  reset_time_ms bigint;
  existing_record record;
  remaining int;
  reset_in_seconds int;
BEGIN
  current_time_ms := EXTRACT(EPOCH FROM now()) * 1000;
  
  -- Get existing rate limit record
  SELECT * INTO existing_record
  FROM public.rate_limits
  WHERE identifier = rate_identifier AND endpoint = rate_endpoint
  FOR UPDATE;
  
  -- No existing record or window expired - create/reset
  IF existing_record IS NULL OR existing_record.window_start_ms + window_ms < current_time_ms THEN
    reset_time_ms := current_time_ms + window_ms;
    
    INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start_ms, reset_at)
    VALUES (rate_identifier, rate_endpoint, 1, current_time_ms, to_timestamp(reset_time_ms / 1000.0))
    ON CONFLICT (identifier, endpoint) 
    DO UPDATE SET 
      request_count = 1,
      window_start_ms = current_time_ms,
      reset_at = to_timestamp(reset_time_ms / 1000.0),
      updated_at = now();
    
    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', rate_limit - 1,
      'reset_in_seconds', CEIL((reset_time_ms - current_time_ms) / 1000.0)
    );
  END IF;
  
  -- Window still active - check if limit exceeded
  IF existing_record.request_count >= rate_limit THEN
    reset_in_seconds := CEIL((existing_record.window_start_ms + window_ms - current_time_ms) / 1000.0);
    
    RETURN jsonb_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_in_seconds', reset_in_seconds
    );
  END IF;
  
  -- Increment counter
  UPDATE public.rate_limits
  SET request_count = request_count + 1, updated_at = now()
  WHERE identifier = rate_identifier AND endpoint = rate_endpoint;
  
  remaining := rate_limit - (existing_record.request_count + 1);
  reset_in_seconds := CEIL((existing_record.window_start_ms + window_ms - current_time_ms) / 1000.0);
  
  RETURN jsonb_build_object(
    'allowed', true,
    'remaining', remaining,
    'reset_in_seconds', reset_in_seconds
  );
END;
$$;

COMMENT ON FUNCTION public.check_rate_limit(text, text, int, bigint) IS 'Checks and enforces rate limits for API endpoints';

-- ============================================================================
-- 3. Knowledge Base Vector Search Function (with external_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  query_embedding vector(1536),
  user_org_id uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
) RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  chunk_text text,
  chunk_index int,
  document_title text,
  document_url text,
  javelina_url text,
  external_id text,
  last_updated_at timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kc.id AS chunk_id,
    kc.document_id,
    kc.chunk_text,
    kc.chunk_index,
    kd.title AS document_title,
    kd.url AS document_url,
    kd.javelina_url,
    kd.external_id,
    kd.last_updated_at,
    (1 - (kc.embedding <=> query_embedding)) AS similarity
  FROM public.kb_chunks kc
  JOIN public.kb_documents kd ON kd.id = kc.document_id
  WHERE 
    kc.embedding IS NOT NULL
    AND (1 - (kc.embedding <=> query_embedding)) >= similarity_threshold
    AND (kd.org_id IS NULL OR kd.org_id = user_org_id)  -- Global docs or org-specific
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION public.search_kb_chunks(vector(1536), uuid, float, int) IS 'Performs vector similarity search over knowledge base chunks (returns external_id for citation mapping)';

-- ============================================================================
-- 4. Increment Attempt Count Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_attempt_count(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.chat_sessions
  SET 
    attempt_count = attempt_count + 1,
    last_message_at = now()
  WHERE id = p_session_id;
END;
$$;

COMMENT ON FUNCTION public.increment_attempt_count(uuid) IS 'Increments attempt count for a chat session (called on negative feedback)';

-- ============================================================================
-- 5. Grant Permissions
-- ============================================================================

-- Service role needs full access to rate_limits (already granted via RLS policy)
-- Authenticated users need execute permissions on functions
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, int, bigint) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_kb_chunks(vector(1536), uuid, float, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_attempt_count(uuid) TO authenticated, service_role;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- To verify, run the verification SQL after applying this migration.
-- See: AI_SUPPORT_BACKEND_HANDOFF.md for verification queries
-- 
-- ============================================================================
