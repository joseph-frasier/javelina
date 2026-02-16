-- ============================================================================
-- AI Support Chat System Migration
-- ============================================================================
-- This migration creates the complete support chat infrastructure including:
-- - Chat sessions and messages with citations
-- - Knowledge base for RAG retrieval (pgvector)
-- - Support ticket creation and Freshdesk mapping
-- - App snapshots for debugging
-- - Feedback and analytics
-- - Comprehensive RLS policies for org-based security
-- - Audit logging and triggers
-- ============================================================================

-- ============================================================================
-- 1. Extensions
-- ============================================================================

-- Enable pgvector for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. Core Tables
-- ============================================================================

-- Chat Sessions
-- Tracks individual support chat conversations
CREATE TABLE chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations,
  entry_point text,  -- 'chat_widget', 'help_button', 'error_page'
  page_url text,
  resolution_status text CHECK (resolution_status IN ('pending', 'resolved', 'escalated', 'abandoned')) DEFAULT 'pending',
  ticket_created boolean DEFAULT false,
  ticket_id text,  -- Freshdesk ticket ID if escalated
  attempt_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  last_message_at timestamp with time zone DEFAULT now(),
  retention_expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  CONSTRAINT valid_org_or_user CHECK (org_id IS NOT NULL OR user_id IS NOT NULL)
);

COMMENT ON TABLE chat_sessions IS 'Support chat conversations with resolution tracking';
COMMENT ON COLUMN chat_sessions.entry_point IS 'Where user initiated chat: chat_widget, help_button, error_page';
COMMENT ON COLUMN chat_sessions.resolution_status IS 'Current status: pending, resolved, escalated, abandoned';
COMMENT ON COLUMN chat_sessions.attempt_count IS 'Number of failed resolution attempts before escalation';
COMMENT ON COLUMN chat_sessions.retention_expires_at IS 'Auto-cleanup date (30 days retention policy)';

-- App Snapshots
-- Captures UI state for debugging
CREATE TABLE app_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations,
  route text NOT NULL,  -- Current page route
  view text,  -- Component/view name
  ui_state jsonb,  -- Route-specific UI state (tabs, filters, modals, etc.)
  entities_on_screen jsonb,  -- {org_id, zone_id, record_id, user_id, invoice_id, etc.}
  user_action text,  -- Last action: "clicked_upgrade", "add_record_failed", etc.
  errors jsonb,  -- Array of error objects {code, field, message}
  network_errors jsonb,  -- Array of network error details {request_id, endpoint, status_code, etc.}
  created_at timestamp with time zone DEFAULT now(),
  retention_expires_at timestamp with time zone DEFAULT (now() + interval '14 days')
);

COMMENT ON TABLE app_snapshots IS 'UI state snapshots for debugging support escalations';
COMMENT ON COLUMN app_snapshots.ui_state IS 'Route-specific state: tabs, filters, modals, step numbers';
COMMENT ON COLUMN app_snapshots.entities_on_screen IS 'IDs of entities visible to user';
COMMENT ON COLUMN app_snapshots.retention_expires_at IS 'Auto-cleanup date (14 days retention policy)';

-- ============================================================================
-- 3. Knowledge Base Tables (must come before chat_messages/citations)
-- ============================================================================

-- KB Documents
-- Source documents for RAG retrieval
CREATE TABLE kb_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations,  -- NULL = global doc, non-NULL = org-specific
  source text NOT NULL CHECK (source IN ('freshdesk', 'internal_markdown', 'notion', 'google_docs')),
  external_id text,  -- Source system ID (e.g., Freshdesk article ID)
  title text NOT NULL,
  url text,  -- Original source URL
  javelina_url text,  -- Mapped Javelina proxy URL for citations
  summary text,
  content text,  -- Full article content
  visibility text DEFAULT 'all' CHECK (visibility IN ('all', 'admin', 'billing_contact')),
  last_updated_at timestamp with time zone DEFAULT now(),
  last_verified_at timestamp with time zone,  -- Manual review timestamp
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE kb_documents IS 'Knowledge base documents for RAG retrieval';
COMMENT ON COLUMN kb_documents.org_id IS 'NULL for global docs visible to all, non-NULL for org-specific';
COMMENT ON COLUMN kb_documents.source IS 'Origin system: freshdesk, internal_markdown, notion, google_docs';
COMMENT ON COLUMN kb_documents.visibility IS 'Role-based visibility: all, admin, billing_contact';
COMMENT ON COLUMN kb_documents.last_updated_at IS 'Last update timestamp - compute staleness in queries: (now() - last_updated_at > interval ''90 days'')';

-- KB Chunks
-- Document chunks with embeddings for semantic search
CREATE TABLE kb_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES kb_documents ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations,  -- Inherited from parent document
  chunk_index integer NOT NULL,  -- Sequence number within document
  chunk_text text NOT NULL,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
  tokens integer,  -- Token count for the chunk
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

COMMENT ON TABLE kb_chunks IS 'Document chunks with vector embeddings for semantic search';
COMMENT ON COLUMN kb_chunks.embedding IS 'Vector embedding (1536 dimensions for text-embedding-3-small)';
COMMENT ON COLUMN kb_chunks.chunk_index IS 'Sequential position within parent document';

-- Chat Messages
-- Individual messages within chat sessions
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users,
  org_id uuid REFERENCES organizations,
  role text CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
  content text NOT NULL,
  intent text,  -- Classified intent: 'dns-zones', 'billing', 'troubleshooting', etc.
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),  -- 0.0 to 1.0
  failed_attempt boolean DEFAULT false,
  failure_reason text CHECK (failure_reason IN ('thumbs_down', 'not_resolved', 'low_confidence', 'repeated_question', 'timeout')),
  snapshot_id uuid REFERENCES app_snapshots,
  response_time_ms integer,  -- LLM response latency in milliseconds
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE chat_messages IS 'Individual messages in support chat conversations';
COMMENT ON COLUMN chat_messages.role IS 'Message sender: user, assistant, system';
COMMENT ON COLUMN chat_messages.intent IS 'AI-classified user intent for analytics';
COMMENT ON COLUMN chat_messages.confidence IS 'AI confidence score (0-1) for response quality';
COMMENT ON COLUMN chat_messages.failed_attempt IS 'Whether this response failed to resolve the issue';

-- Chat Message Citations
-- Links KB documents to assistant responses
CREATE TABLE chat_message_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages ON DELETE CASCADE NOT NULL,
  kb_document_id uuid REFERENCES kb_documents NOT NULL,
  kb_chunk_id uuid REFERENCES kb_chunks,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE chat_message_citations IS 'Links assistant responses to knowledge base sources';
COMMENT ON COLUMN chat_message_citations.confidence IS 'Relevance score of this citation';

-- Chat Feedback
-- User feedback on chat quality
CREATE TABLE chat_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES chat_messages ON DELETE CASCADE NOT NULL,
  session_id uuid REFERENCES chat_sessions NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations,
  rating text CHECK (rating IN ('thumbs_up', 'thumbs_down')),
  resolved boolean,
  reason_code text CHECK (reason_code IN ('irrelevant', 'incorrect', 'too_long', 'missing_steps', 'doc_link_broken', 'helpful', 'clear')),
  comment text,
  created_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE chat_feedback IS 'User feedback on chat responses for quality tracking';
COMMENT ON COLUMN chat_feedback.resolved IS 'Whether the conversation resolved the users issue';
COMMENT ON COLUMN chat_feedback.reason_code IS 'Categorized feedback reason';

-- ============================================================================
-- 4. Support Ticket Tables
-- ============================================================================

-- Support Tickets
-- Escalated conversations tracked as tickets
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions,  -- Originating chat session
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations NOT NULL,
  freshdesk_ticket_id bigint,  -- Freshdesk ticket ID
  freshdesk_ticket_url text,  -- Direct link to Freshdesk ticket
  subject text NOT NULL,
  description text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

COMMENT ON TABLE support_tickets IS 'Support tickets created from escalated chat sessions';
COMMENT ON COLUMN support_tickets.session_id IS 'Originating chat session if escalated from chat';

-- Freshdesk Contacts
-- User-to-Freshdesk contact mapping
CREATE TABLE freshdesk_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  org_id uuid REFERENCES organizations NOT NULL,
  freshdesk_contact_id bigint NOT NULL,  -- Freshdesk contact ID
  email text NOT NULL,
  synced_at timestamp with time zone DEFAULT now(),  -- Last sync with Freshdesk
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, org_id)
);

COMMENT ON TABLE freshdesk_contacts IS 'Mapping between Javelina users and Freshdesk contacts';
COMMENT ON COLUMN freshdesk_contacts.synced_at IS 'Last successful sync with Freshdesk API';

-- ============================================================================
-- 5. Indexes for Performance
-- ============================================================================

-- Chat Sessions Indexes
CREATE INDEX idx_chat_sessions_user_org ON chat_sessions(user_id, org_id);
CREATE INDEX idx_chat_sessions_created ON chat_sessions(created_at DESC);
CREATE INDEX idx_chat_sessions_retention ON chat_sessions(retention_expires_at) 
  WHERE retention_expires_at IS NOT NULL;
CREATE INDEX idx_chat_sessions_status ON chat_sessions(resolution_status, created_at DESC);
CREATE INDEX idx_chat_sessions_ticket ON chat_sessions(ticket_created, created_at DESC) 
  WHERE ticket_created = true;

-- Chat Messages Indexes
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_intent ON chat_messages(intent, created_at DESC) 
  WHERE intent IS NOT NULL;
CREATE INDEX idx_chat_messages_failed ON chat_messages(failed_attempt, created_at DESC) 
  WHERE failed_attempt = true;

-- Chat Citations Indexes
CREATE INDEX idx_chat_message_citations_message ON chat_message_citations(message_id);
CREATE INDEX idx_chat_message_citations_document ON chat_message_citations(kb_document_id);

-- Chat Feedback Indexes
CREATE INDEX idx_chat_feedback_message ON chat_feedback(message_id);
CREATE INDEX idx_chat_feedback_session ON chat_feedback(session_id);
CREATE INDEX idx_chat_feedback_rating ON chat_feedback(rating, created_at DESC);
CREATE INDEX idx_chat_feedback_resolved ON chat_feedback(resolved, created_at DESC);

-- App Snapshots Indexes
CREATE INDEX idx_app_snapshots_user ON app_snapshots(user_id, created_at DESC);
CREATE INDEX idx_app_snapshots_route ON app_snapshots(route, created_at DESC);
CREATE INDEX idx_app_snapshots_retention ON app_snapshots(retention_expires_at) 
  WHERE retention_expires_at IS NOT NULL;

-- KB Documents Indexes
CREATE INDEX idx_kb_documents_source ON kb_documents(source, org_id);
CREATE INDEX idx_kb_documents_external_id ON kb_documents(external_id) 
  WHERE external_id IS NOT NULL;
CREATE INDEX idx_kb_documents_org ON kb_documents(org_id) 
  WHERE org_id IS NOT NULL;
-- Staleness computed in queries: (now() - last_updated_at > interval '90 days')
CREATE INDEX idx_kb_documents_updated ON kb_documents(last_updated_at DESC);

-- KB Chunks Indexes
-- Vector similarity search using IVFFlat algorithm
CREATE INDEX idx_kb_chunks_embedding ON kb_chunks 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
CREATE INDEX idx_kb_chunks_document ON kb_chunks(document_id, chunk_index);
CREATE INDEX idx_kb_chunks_org ON kb_chunks(org_id) 
  WHERE org_id IS NOT NULL;

-- Support Tickets Indexes
CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_org ON support_tickets(org_id, created_at DESC);
CREATE INDEX idx_support_tickets_session ON support_tickets(session_id) 
  WHERE session_id IS NOT NULL;
CREATE INDEX idx_support_tickets_freshdesk ON support_tickets(freshdesk_ticket_id) 
  WHERE freshdesk_ticket_id IS NOT NULL;
CREATE INDEX idx_support_tickets_status ON support_tickets(status, created_at DESC);

-- Freshdesk Contacts Indexes
CREATE INDEX idx_freshdesk_contacts_user_org ON freshdesk_contacts(user_id, org_id);
CREATE INDEX idx_freshdesk_contacts_freshdesk_id ON freshdesk_contacts(freshdesk_contact_id);

-- ============================================================================
-- 6. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_citations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE freshdesk_contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Chat Sessions RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create chat sessions"
  ON chat_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can view all sessions in their org
CREATE POLICY "Admins can view org chat sessions"
  ON chat_sessions FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
    )
  );

-- ============================================================================
-- Chat Messages RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own chat messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Admins can view messages from org sessions
CREATE POLICY "Admins can view org chat messages"
  ON chat_messages FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM chat_sessions 
      WHERE org_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
      )
    )
  );

-- ============================================================================
-- Chat Message Citations RLS Policies
-- ============================================================================

CREATE POLICY "Users can view citations from their messages"
  ON chat_message_citations FOR SELECT
  USING (
    message_id IN (
      SELECT id FROM chat_messages 
      WHERE session_id IN (
        SELECT id FROM chat_sessions WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Chat Feedback RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own feedback"
  ON chat_feedback FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create feedback"
  ON chat_feedback FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid())
  );

-- Admins can view org feedback
CREATE POLICY "Admins can view org feedback"
  ON chat_feedback FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
    )
  );

-- ============================================================================
-- App Snapshots RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own snapshots"
  ON app_snapshots FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create snapshots"
  ON app_snapshots FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view org snapshots
CREATE POLICY "Admins can view org snapshots"
  ON app_snapshots FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
    )
  );

-- ============================================================================
-- KB Documents RLS Policies
-- ============================================================================

-- Users can view global docs and docs for their orgs
CREATE POLICY "Users can view allowed KB documents"
  ON kb_documents FOR SELECT
  USING (
    org_id IS NULL  -- Global docs visible to all
    OR org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Only service role can manage KB documents (backend sync job)
CREATE POLICY "Service role can manage KB documents"
  ON kb_documents FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- KB Chunks RLS Policies
-- ============================================================================

-- Chunks inherit visibility from their parent document
CREATE POLICY "Users can view allowed KB chunks"
  ON kb_chunks FOR SELECT
  USING (
    document_id IN (
      SELECT id FROM kb_documents 
      WHERE org_id IS NULL 
        OR org_id IN (
          SELECT organization_id FROM organization_members
          WHERE user_id = auth.uid()
        )
    )
  );

-- Only service role can manage KB chunks (backend sync job)
CREATE POLICY "Service role can manage KB chunks"
  ON kb_chunks FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- Support Tickets RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own tickets"
  ON support_tickets FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets"
  ON support_tickets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can view org tickets
CREATE POLICY "Admins can view org tickets"
  ON support_tickets FOR SELECT
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
    )
  );

-- Admins can update org tickets
CREATE POLICY "Admins can update org tickets"
  ON support_tickets FOR UPDATE
  USING (
    org_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role IN ('SuperAdmin', 'Admin')
    )
  );

-- ============================================================================
-- Freshdesk Contacts RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own Freshdesk contact"
  ON freshdesk_contacts FOR SELECT
  USING (user_id = auth.uid());

-- Only service role can manage Freshdesk contacts (backend sync)
CREATE POLICY "Service role can manage Freshdesk contacts"
  ON freshdesk_contacts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- ============================================================================
-- 7. Triggers
-- ============================================================================

-- Add audit logging to chat sessions
CREATE TRIGGER audit_chat_sessions
  AFTER INSERT OR UPDATE OR DELETE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

-- Add audit logging to support tickets
CREATE TRIGGER audit_support_tickets
  AFTER INSERT OR UPDATE OR DELETE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION handle_audit_log();

-- Update timestamps on chat_sessions
CREATE TRIGGER update_chat_sessions_timestamp
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Update timestamps on kb_documents
CREATE TRIGGER update_kb_documents_timestamp
  BEFORE UPDATE ON kb_documents
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Update timestamps on support_tickets
CREATE TRIGGER update_support_tickets_timestamp
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Update timestamps on freshdesk_contacts
CREATE TRIGGER update_freshdesk_contacts_timestamp
  BEFORE UPDATE ON freshdesk_contacts
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ============================================================================
-- 8. Analytics Views
-- ============================================================================

-- Support Metrics View
-- Daily aggregation of key support metrics
CREATE OR REPLACE VIEW support_metrics AS
SELECT
  DATE_TRUNC('day', cs.created_at) as date,
  COUNT(DISTINCT cs.id) as total_conversations,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.resolution_status = 'resolved') as resolved_count,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.ticket_created = true) as escalated_count,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.resolution_status = 'abandoned') as abandoned_count,
  AVG(cs.attempt_count) as avg_attempts,
  AVG(EXTRACT(EPOCH FROM (cs.last_message_at - cs.created_at))) as avg_session_duration_seconds,
  -- Thumbs up rate
  COUNT(cf.id) FILTER (WHERE cf.rating = 'thumbs_up')::float / 
    NULLIF(COUNT(cf.id), 0) * 100 as thumbs_up_rate,
  -- Thumbs down rate
  COUNT(cf.id) FILTER (WHERE cf.rating = 'thumbs_down')::float / 
    NULLIF(COUNT(cf.id), 0) * 100 as thumbs_down_rate,
  -- Deflection rate (resolved without ticket / total)
  (COUNT(DISTINCT cs.id) FILTER (WHERE cs.resolution_status = 'resolved' AND cs.ticket_created = false)::float / 
    NULLIF(COUNT(DISTINCT cs.id), 0)) * 100 as deflection_rate,
  -- Average response time
  AVG(cm.response_time_ms) FILTER (WHERE cm.role = 'assistant') as avg_response_time_ms
FROM chat_sessions cs
LEFT JOIN chat_feedback cf ON cf.session_id = cs.id
LEFT JOIN chat_messages cm ON cm.session_id = cs.id
GROUP BY DATE_TRUNC('day', cs.created_at)
ORDER BY date DESC;

COMMENT ON VIEW support_metrics IS 'Daily aggregation of support chat metrics for analytics dashboard';

-- Knowledge Gap Analysis View
-- Identifies low-confidence topics that need better documentation
CREATE OR REPLACE VIEW knowledge_gaps AS
SELECT
  cm.intent,
  COUNT(*) as occurrences,
  AVG(cm.confidence) as avg_confidence,
  COUNT(*) FILTER (WHERE cm.failed_attempt = true) as failed_attempts,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.ticket_created = true) as escalations,
  -- Most recent occurrence
  MAX(cm.created_at) as last_seen,
  -- Sample messages for context (limit to first 5 in application code if needed)
  ARRAY_AGG(cm.content ORDER BY cm.created_at DESC) as sample_messages
FROM chat_messages cm
JOIN chat_sessions cs ON cs.id = cm.session_id
WHERE cm.role = 'assistant'
  AND cm.confidence < 0.7  -- Low confidence threshold
  AND cm.created_at > now() - interval '90 days'  -- Last 90 days only
GROUP BY cm.intent
HAVING COUNT(*) >= 3  -- Minimum 3 occurrences to be significant
ORDER BY failed_attempts DESC, occurrences DESC
LIMIT 100;

COMMENT ON VIEW knowledge_gaps IS 'Identifies topics with low confidence scores for KB improvement';

-- ============================================================================
-- 9. Storage Bucket for Support Attachments
-- ============================================================================

-- Create storage bucket for support ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('support-tickets', 'support-tickets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Only authenticated users can upload
CREATE POLICY "Authenticated users can upload support attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'support-tickets' AND
  auth.uid() IS NOT NULL
);

-- RLS: Users can view their own uploads
CREATE POLICY "Users can view own support attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'support-tickets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Service role can manage all attachments
CREATE POLICY "Service role can manage all support attachments"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'support-tickets');

-- ============================================================================
-- 10. Helper Functions
-- ============================================================================

-- Function to cleanup expired records
CREATE OR REPLACE FUNCTION cleanup_expired_support_data()
RETURNS integer AS $$
DECLARE
  deleted_sessions integer;
  deleted_snapshots integer;
BEGIN
  -- Delete expired chat sessions (and cascade to messages)
  DELETE FROM chat_sessions
  WHERE retention_expires_at < now()
    AND retention_expires_at IS NOT NULL;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
  
  -- Delete expired app snapshots
  DELETE FROM app_snapshots
  WHERE retention_expires_at < now()
    AND retention_expires_at IS NOT NULL;
  GET DIAGNOSTICS deleted_snapshots = ROW_COUNT;
  
  -- Return total deleted
  RETURN deleted_sessions + deleted_snapshots;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_support_data() IS 'Removes expired chat sessions (30d) and snapshots (14d) per retention policy';

-- Function to get conversation summary for ticket creation
CREATE OR REPLACE FUNCTION get_conversation_summary(p_session_id uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'session', jsonb_build_object(
      'id', cs.id,
      'created_at', cs.created_at,
      'last_message_at', cs.last_message_at,
      'entry_point', cs.entry_point,
      'page_url', cs.page_url,
      'attempt_count', cs.attempt_count
    ),
    'messages', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'role', cm.role,
          'content', cm.content,
          'created_at', cm.created_at,
          'confidence', cm.confidence,
          'intent', cm.intent
        ) ORDER BY cm.created_at
      )
      FROM chat_messages cm
      WHERE cm.session_id = cs.id
    ),
    'feedback', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'rating', cf.rating,
          'resolved', cf.resolved,
          'reason_code', cf.reason_code,
          'comment', cf.comment
        )
      )
      FROM chat_feedback cf
      WHERE cf.session_id = cs.id
    )
  ) INTO result
  FROM chat_sessions cs
  WHERE cs.id = p_session_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_conversation_summary(uuid) IS 'Returns complete conversation data for ticket creation';

-- ============================================================================
-- 11. Grants
-- ============================================================================

-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE ON chat_sessions TO authenticated;
GRANT SELECT, INSERT ON chat_messages TO authenticated;
GRANT SELECT ON chat_message_citations TO authenticated;
GRANT SELECT, INSERT ON chat_feedback TO authenticated;
GRANT SELECT, INSERT ON app_snapshots TO authenticated;
GRANT SELECT ON kb_documents TO authenticated;
GRANT SELECT ON kb_chunks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON support_tickets TO authenticated;
GRANT SELECT ON freshdesk_contacts TO authenticated;

-- Grant view access
GRANT SELECT ON support_metrics TO authenticated;
GRANT SELECT ON knowledge_gaps TO authenticated;

-- Grant function execution
GRANT EXECUTE ON FUNCTION get_conversation_summary(uuid) TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- 
-- Next Steps:
-- 1. Review this migration file
-- 2. Apply to dev database: psql -f supabase/migrations/20260127000000_support_chat_system.sql
-- 3. Verify all tables, indexes, and policies were created
-- 4. Run initial KB sync job to populate kb_documents and kb_chunks
-- 5. Test RLS policies with test users
-- 6. Configure Freshdesk API credentials in backend
-- 7. Deploy backend API endpoints
-- 8. Enable LaunchDarkly feature flag for support chat
-- 
-- ============================================================================
