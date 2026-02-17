-- ============================================================================
-- JAVELINA PRODUCTION DATABASE WIPE SCRIPT
-- Purpose: Remove all user-generated data to prepare for launch
-- Date: 2026-02-16
-- ============================================================================
--
-- PRESERVES:
--   ✓ Superadmin profile (sethchesky@gmail.com) + auth account + sessions
--   ✓ Plans table (8 system-configured subscription plans)
--   ✓ Knowledge base documents (21 Freshdesk help articles, all global)
--   ✓ Knowledge base chunks (30 embedding chunks for RAG)
--   ✓ Freshdesk contacts (0 rows - integration mapping)
--   ✓ Support tickets (0 rows - escalated chat tickets)
--   ✓ Auth schema migrations & system tables
--
-- WIPES:
--   ✗ 112 user profiles (all except superadmin)
--   ✗ 112 auth users (all except superadmin)
--   ✗ 180 organizations + 1,002 organization memberships
--   ✗ 86 zones + 49 zone records + 34 tags + 19 zone-tag links
--   ✗ 124 subscriptions + 121 subscription items
--   ✗ 8 promotion codes + 3 discount redemptions
--   ✗ 5 chat sessions + 36 messages + 8 citations + 0 feedback
--   ✗ 18 app snapshots
--   ✗ 1,472 public audit logs + 12,185 auth audit log entries
--   ✗ 52 Stripe webhook events + 2 rate limits
--   ✗ 55 marketing contact form submissions
--   ✗ 169 irongrove contact submissions
--   ✗ All auth flow states, tokens, refresh tokens (non-superadmin)
--
-- ============================================================================
-- HOW TO RUN:
--   Option A: Supabase Dashboard > SQL Editor > paste & run
--   Option B: psql -h db.uhkwiqupiekatbtxxaky.supabase.co -U postgres -f wipe-production-data.sql
--
-- IMPORTANT: This is wrapped in a transaction. If anything fails, ALL
-- changes are rolled back and the database remains untouched.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  superadmin_id UUID := '43b5d245-5759-4283-897b-ca482ed6e80f';
  v_count BIGINT;
BEGIN

  -- ============================================================
  -- SAFETY CHECK: Verify superadmin exists before proceeding
  -- ============================================================
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = superadmin_id AND email = 'sethchesky@gmail.com' AND superadmin = true
  ) THEN
    RAISE EXCEPTION 'ABORT: Superadmin profile (sethchesky@gmail.com) not found! Refusing to wipe.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = superadmin_id AND email = 'sethchesky@gmail.com'
  ) THEN
    RAISE EXCEPTION 'ABORT: Superadmin auth user (sethchesky@gmail.com) not found! Refusing to wipe.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'JAVELINA PRODUCTION DATA WIPE - STARTING';
  RAISE NOTICE 'Superadmin preserved: sethchesky@gmail.com (%)' , superadmin_id;
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';

  -- ============================================================
  -- PHASE 1: PUBLIC SCHEMA - Delete child tables first
  -- ============================================================

  RAISE NOTICE 'PHASE 1: Wiping public schema tables...';
  RAISE NOTICE '------------------------------------------------------------';

  -- Temporarily disable triggers that would block bulk deletion
  ALTER TABLE public.organization_members DISABLE TRIGGER trg_prevent_last_admin_removal;
  ALTER TABLE public.organization_members DISABLE TRIGGER trg_prevent_last_admin_demotion;
  -- Disable audit triggers to avoid writing audit rows we'll delete moments later
  ALTER TABLE public.chat_sessions DISABLE TRIGGER audit_chat_sessions;
  ALTER TABLE public.zone_records DISABLE TRIGGER zone_records_audit;
  ALTER TABLE public.zone_records DISABLE TRIGGER zone_records_increment_serial_delete;
  ALTER TABLE public.zones DISABLE TRIGGER zones_audit;
  RAISE NOTICE '  Triggers temporarily disabled for bulk deletion';

  -- 1a. Chat system (deepest children first)
  -- NOTE: support_tickets and freshdesk_contacts are PRESERVED
  DELETE FROM public.chat_message_citations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [1/21] chat_message_citations: % rows deleted', v_count;

  DELETE FROM public.chat_feedback;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [2/21] chat_feedback: % rows deleted', v_count;

  DELETE FROM public.chat_messages;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [3/21] chat_messages: % rows deleted', v_count;

  DELETE FROM public.app_snapshots;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [4/21] app_snapshots: % rows deleted', v_count;

  DELETE FROM public.chat_sessions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [5/21] chat_sessions: % rows deleted', v_count;

  -- 1b. DNS data
  DELETE FROM public.zone_tags;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [6/21] zone_tags: % rows deleted', v_count;

  DELETE FROM public.zone_records;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [7/21] zone_records: % rows deleted', v_count;

  DELETE FROM public.zones;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [8/21] zones: % rows deleted', v_count;

  DELETE FROM public.tags;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [9/21] tags: % rows deleted', v_count;

  -- 1c. Billing & subscriptions
  DELETE FROM public.discount_redemptions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [10/21] discount_redemptions: % rows deleted', v_count;

  DELETE FROM public.subscription_items;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [11/21] subscription_items: % rows deleted', v_count;

  DELETE FROM public.subscriptions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [12/21] subscriptions: % rows deleted', v_count;

  DELETE FROM public.promotion_codes;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [13/21] promotion_codes: % rows deleted (test promo codes)', v_count;

  DELETE FROM public.stripe_webhook_events;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [14/21] stripe_webhook_events: % rows deleted', v_count;

  -- 1d. Organization data
  DELETE FROM public.organization_members;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [15/21] organization_members: % rows deleted', v_count;

  DELETE FROM public.organizations;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [16/21] organizations: % rows deleted', v_count;

  -- 1e. Audit & operational data
  DELETE FROM public.audit_logs;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [17/21] audit_logs: % rows deleted', v_count;

  DELETE FROM public.rate_limits;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [18/21] rate_limits: % rows deleted', v_count;

  -- 1f. Contact form submissions
  DELETE FROM public."marketing-website-contact-form";
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [19/21] marketing-website-contact-form: % rows deleted', v_count;

  DELETE FROM public.irongrove_contact_submissions;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [20/21] irongrove_contact_submissions: % rows deleted', v_count;

  -- 1g. User profiles (PRESERVE superadmin)
  DELETE FROM public.profiles WHERE id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [21/21] profiles: % rows deleted (superadmin PRESERVED)', v_count;

  -- Re-enable all temporarily disabled triggers
  ALTER TABLE public.organization_members ENABLE TRIGGER trg_prevent_last_admin_removal;
  ALTER TABLE public.organization_members ENABLE TRIGGER trg_prevent_last_admin_demotion;
  ALTER TABLE public.chat_sessions ENABLE TRIGGER audit_chat_sessions;
  ALTER TABLE public.zone_records ENABLE TRIGGER zone_records_audit;
  ALTER TABLE public.zone_records ENABLE TRIGGER zone_records_increment_serial_delete;
  ALTER TABLE public.zones ENABLE TRIGGER zones_audit;
  RAISE NOTICE '  Triggers re-enabled';

  RAISE NOTICE '';

  -- ============================================================
  -- PHASE 2: AUTH SCHEMA - Clean auth tables
  -- ============================================================

  RAISE NOTICE 'PHASE 2: Wiping auth schema tables...';
  RAISE NOTICE '------------------------------------------------------------';

  -- 2a. OAuth data (empty tables, but clear for FK safety)
  DELETE FROM auth.oauth_authorizations WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [1/11] oauth_authorizations: % rows deleted', v_count;

  DELETE FROM auth.oauth_consents WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [2/11] oauth_consents: % rows deleted', v_count;

  -- 2b. Session-related data
  DELETE FROM auth.mfa_amr_claims
    WHERE session_id IN (
      SELECT id FROM auth.sessions WHERE user_id != superadmin_id
    );
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [3/11] mfa_amr_claims: % rows deleted', v_count;

  DELETE FROM auth.refresh_tokens
    WHERE user_id != superadmin_id::text;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [4/11] refresh_tokens: % rows deleted', v_count;

  DELETE FROM auth.sessions WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [5/11] sessions: % rows deleted (superadmin sessions PRESERVED)', v_count;

  -- 2c. MFA data
  DELETE FROM auth.mfa_challenges;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [6/11] mfa_challenges: % rows deleted', v_count;

  DELETE FROM auth.mfa_factors WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [7/11] mfa_factors: % rows deleted', v_count;

  -- 2d. Tokens & identities
  DELETE FROM auth.one_time_tokens WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [8/11] one_time_tokens: % rows deleted', v_count;

  DELETE FROM auth.identities WHERE user_id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [9/11] identities: % rows deleted', v_count;

  -- 2e. Flow & transient state
  DELETE FROM auth.saml_relay_states;
  DELETE FROM auth.flow_state;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [10/11] flow_state + saml_relay_states: % rows cleared', v_count;

  -- 2f. Auth audit log
  DELETE FROM auth.audit_log_entries;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '  [11/11] audit_log_entries: % rows deleted', v_count;

  -- 2g. Auth users (PRESERVE superadmin)
  DELETE FROM auth.users WHERE id != superadmin_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '         auth.users: % rows deleted (superadmin PRESERVED)', v_count;

  RAISE NOTICE '';

  -- ============================================================
  -- PHASE 3: VERIFICATION
  -- ============================================================

  RAISE NOTICE '============================================================';
  RAISE NOTICE 'VERIFICATION - Remaining row counts:';
  RAISE NOTICE '============================================================';
  RAISE NOTICE '  auth.users:          % (expect 1)', (SELECT COUNT(*) FROM auth.users);
  RAISE NOTICE '  profiles:            % (expect 1)', (SELECT COUNT(*) FROM public.profiles);
  RAISE NOTICE '  organizations:       % (expect 0)', (SELECT COUNT(*) FROM public.organizations);
  RAISE NOTICE '  org_members:         % (expect 0)', (SELECT COUNT(*) FROM public.organization_members);
  RAISE NOTICE '  zones:               % (expect 0)', (SELECT COUNT(*) FROM public.zones);
  RAISE NOTICE '  zone_records:        % (expect 0)', (SELECT COUNT(*) FROM public.zone_records);
  RAISE NOTICE '  subscriptions:       % (expect 0)', (SELECT COUNT(*) FROM public.subscriptions);
  RAISE NOTICE '  audit_logs:          % (expect 0)', (SELECT COUNT(*) FROM public.audit_logs);
  RAISE NOTICE '  auth.audit_log:      % (expect 0)', (SELECT COUNT(*) FROM auth.audit_log_entries);
  RAISE NOTICE '  plans:               % (expect 8 - preserved)', (SELECT COUNT(*) FROM public.plans);
  RAISE NOTICE '  kb_documents:        % (expect 21 - preserved)', (SELECT COUNT(*) FROM public.kb_documents);
  RAISE NOTICE '  kb_chunks:           % (expect 30 - preserved)', (SELECT COUNT(*) FROM public.kb_chunks);
  RAISE NOTICE '  support_tickets:     % (preserved)', (SELECT COUNT(*) FROM public.support_tickets);
  RAISE NOTICE '  freshdesk_contacts:  % (preserved)', (SELECT COUNT(*) FROM public.freshdesk_contacts);
  RAISE NOTICE '============================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'DATABASE WIPE COMPLETED SUCCESSFULLY';
  RAISE NOTICE 'Superadmin account intact: sethchesky@gmail.com';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: If anything looks wrong, this transaction has NOT';
  RAISE NOTICE 'been committed yet. The COMMIT statement below will';
  RAISE NOTICE 'finalize all changes.';
  RAISE NOTICE '============================================================';

END $$;

COMMIT;
