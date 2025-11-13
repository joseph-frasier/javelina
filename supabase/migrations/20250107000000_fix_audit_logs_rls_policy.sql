-- =====================================================
-- Fix Audit Logs RLS Policy
-- Allow users to see their own audit log entries
-- =====================================================
-- This fixes the issue where users can't see audit logs
-- for deleted organizations (since they're no longer members)
-- =====================================================

-- Drop existing policy
drop policy if exists "Users can view audit logs for their organizations" on public.audit_logs;

-- Recreate with fix: users can always see their own actions
create policy "Users can view audit logs for their organizations"
  on public.audit_logs for select
  using (
    -- Users can always see their own actions (fixes deleted org/zone issue)
    -- This allows seeing audit logs even after the record is deleted
    user_id = auth.uid()
  );

