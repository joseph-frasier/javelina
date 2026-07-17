-- 20260630000000_drop_mcp_policy_tables.sql
-- Remove the mis-conceived MCP policy layer. The tenant_memberships /
-- tenant_entitlements / idempotency_keys tables (created in
-- 20260309000000_mcp_tool_schema.sql) are empty and unreferenced
-- (no FKs/views/functions/triggers) across main/dev/qa as of 2026-06-30;
-- authorization is now sourced from the backend's organization_members RBAC.
-- Idempotency is out of scope.
--
-- This migration belongs in the frontend `javelina` repo's supabase/migrations
-- history (that repo owns the shared schema). It is NOT applied by the MCP code.
-- Apply via the normal migration flow.

DROP TABLE IF EXISTS public.idempotency_keys;
DROP TABLE IF EXISTS public.tenant_entitlements;
DROP TABLE IF EXISTS public.tenant_memberships;

-- audit_logs already has the app's org-scoping column `org_id` (added in
-- 20260213201338_add_org_id_to_audit_logs.sql; populated by the handle_audit_log
-- trigger, indexed, and used by the org-scoped RLS policy). The MCP layer now
-- writes that shared org_id column directly, so its own `tenant_id` column
-- (added by the MCP schema migration, NULL in all rows) is dead. Dropping the
-- column also removes its dependent index idx_mcp_audit_tenant_created_at.
ALTER TABLE public.audit_logs DROP COLUMN IF EXISTS tenant_id;
