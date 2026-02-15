-- ============================================================================
-- Fix Support Chat Foreign Keys for Auth0 Migration
-- ============================================================================
-- This migration updates support chat tables to reference profiles.id instead
-- of auth.users, completing the Auth0 migration for the support chat system.
-- 
-- Changes:
-- 1. Update foreign key constraints to reference profiles instead of auth.users:
--    - app_snapshots.user_id
--    - chat_feedback.user_id
--    - chat_messages.user_id
--    - chat_sessions.user_id
--    - support_tickets.user_id
--
-- 2. Update search_kb_chunks() function to include metadata column
-- ============================================================================

alter table "public"."app_snapshots" drop constraint "app_snapshots_user_id_fkey";

alter table "public"."chat_feedback" drop constraint "chat_feedback_user_id_fkey";

alter table "public"."chat_messages" drop constraint "chat_messages_user_id_fkey";

alter table "public"."chat_sessions" drop constraint "chat_sessions_user_id_fkey";

alter table "public"."support_tickets" drop constraint "support_tickets_user_id_fkey";

drop function if exists "public"."search_kb_chunks"(query_embedding public.vector, user_org_id uuid, similarity_threshold double precision, match_count integer);

alter table "public"."app_snapshots" add constraint "app_snapshots_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."app_snapshots" validate constraint "app_snapshots_user_id_fkey";

alter table "public"."chat_feedback" add constraint "chat_feedback_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_feedback" validate constraint "chat_feedback_user_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_user_id_fkey";

alter table "public"."chat_sessions" add constraint "chat_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_sessions" validate constraint "chat_sessions_user_id_fkey";

alter table "public"."support_tickets" add constraint "support_tickets_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."support_tickets" validate constraint "support_tickets_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.search_kb_chunks(query_embedding public.vector, user_org_id uuid DEFAULT NULL::uuid, similarity_threshold double precision DEFAULT 0.5, match_count integer DEFAULT 5)
 RETURNS TABLE(chunk_id uuid, document_id uuid, chunk_text text, chunk_index integer, external_id text, title text, url text, last_updated timestamp with time zone, metadata jsonb, similarity double precision)
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
    (user_org_id IS NULL OR kc.org_id = user_org_id OR kc.org_id IS NULL)
    AND (kc.embedding IS NOT NULL)
    AND (1 - (kc.embedding <=> query_embedding)) > similarity_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$function$
;


