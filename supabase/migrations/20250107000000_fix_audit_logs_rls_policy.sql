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
    -- Users can always see their own actions (fixes deleted org issue)
    user_id = auth.uid()
    or
    -- For organizations table
    (table_name = 'organizations' and exists (
      select 1 from public.organization_members
      where organization_members.organization_id = record_id::uuid
      and organization_members.user_id = auth.uid()
    ))
    or
    -- For environments table
    (table_name = 'environments' and exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
    or
    -- For zones table
    (table_name = 'zones' and exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
  );

