-- Drop the broken update_chat_sessions_timestamp trigger.
-- The handle_updated_at() trigger function sets NEW.updated_at, but the
-- chat_sessions table has no "updated_at" column (it uses last_message_at instead).
-- This causes a silent error on every UPDATE, resulting in PATCH 400 from PostgREST.

DROP TRIGGER IF EXISTS update_chat_sessions_timestamp ON public.chat_sessions;
