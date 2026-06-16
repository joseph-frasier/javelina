-- 20260616000000_fix_security_advisor_errors_operator_actions_and_provisioning_view.sql
-- Resolves the two ERROR-level Supabase security advisor findings:
--   1. security_definer_view  -> public.provisioning_status_by_org
--   2. rls_disabled_in_public  -> public.operator_actions
--
-- Safe to run on any branch; all statements are idempotent.

-- ============================================================
-- 1. provisioning_status_by_org: enforce caller RLS
--
-- The view aggregates organizations + provisioning_status. Both base
-- tables already enforce org-membership RLS (provisioning_status_member_read,
-- organizations select policies), but a non-invoker view runs with the
-- view owner's privileges and BYPASSES that RLS, exposing every org's
-- provisioning state to any caller. security_invoker makes the view
-- evaluate the underlying RLS as the querying user instead.
-- ============================================================
alter view public.provisioning_status_by_org set (security_invoker = on);

-- ============================================================
-- 2. operator_actions: enable RLS (service-role-only access)
--
-- operator_actions is a backend audit log written by the Javelina backend
-- via the service role (operator_id = Auth0 sub, lead_id = cross-project
-- reference). It has no end-user/org ownership column, so no anon or
-- authenticated access is intended. Enabling RLS with only a service_role
-- policy denies all anon/authenticated reads and writes; the service role
-- bypasses RLS but the explicit policy documents intent (matches the
-- rate_limits / idempotency_keys convention in this database).
-- ============================================================
alter table public.operator_actions enable row level security;

drop policy if exists operator_actions_service_all on public.operator_actions;
create policy operator_actions_service_all on public.operator_actions
  for all
  to service_role
  using (true)
  with check (true);

-- Defense in depth: remove the default broad grants so the table is not
-- reachable through PostgREST by the anon/authenticated roles at all.
revoke all on table public.operator_actions from anon, authenticated;
