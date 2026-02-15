-- Add metadata column to kb_chunks table
-- This supports storing article metadata from sync scripts (source, articleId, locale, etc.)
--
-- Migration: 20260130000000_add_metadata_to_kb_chunks
-- Purpose: Enable article sync scripts to store source metadata in kb_chunks
-- Status: Frontend-generated, pending manual application to dev database

ALTER TABLE public.kb_chunks 
  ADD COLUMN metadata jsonb DEFAULT NULL;

COMMENT ON COLUMN public.kb_chunks.metadata IS 
  'Additional metadata from source system (e.g., {"source":"support","articleId":"support_456","locale":"en-US"})';

-- Optional: Add GIN index for efficient metadata queries (if filtering by metadata becomes common)
-- Uncomment if metadata queries become a performance bottleneck:
-- CREATE INDEX idx_kb_chunks_metadata ON public.kb_chunks USING GIN (metadata);
