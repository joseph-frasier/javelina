-- ================================================================
-- Migration: Add org_id to audit_logs for tenant-scoped auditing
-- ================================================================
-- Previously, audit_logs had no org_id column. The backend worked
-- around this by fetching all logs and filtering in JS. This adds
-- org_id for DB-level tenant scoping, backfills existing rows,
-- updates the audit trigger to capture org_id automatically, and
-- adds an org-scoped RLS policy so org admins can see their
-- members' actions.
--
-- NOTE: No FK constraint on org_id -- audit logs must be preserved
-- even after organizations are deleted or for orphaned references.
-- ================================================================

-- 1. Add org_id column (nullable, no FK to preserve audit integrity)
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS org_id UUID;

-- 2. Add index for efficient org-scoped queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id_created_at
ON public.audit_logs(org_id, created_at DESC);

-- 3. Backfill org_id from new_data or old_data JSONB
-- Tables store org reference as 'organization_id' (zones, organization_members)
-- or 'org_id' (subscriptions, chat_sessions, support_tickets, etc.)
UPDATE public.audit_logs
SET org_id = COALESCE(
  (new_data ->> 'organization_id')::uuid,
  (new_data ->> 'org_id')::uuid,
  (old_data ->> 'organization_id')::uuid,
  (old_data ->> 'org_id')::uuid
)
WHERE org_id IS NULL
  AND (
    new_data ->> 'organization_id' IS NOT NULL
    OR new_data ->> 'org_id' IS NOT NULL
    OR old_data ->> 'organization_id' IS NOT NULL
    OR old_data ->> 'org_id' IS NOT NULL
  );

-- 3b. Backfill zone_records: look up org_id via zones table
UPDATE public.audit_logs al
SET org_id = z.organization_id
FROM public.zones z
WHERE al.org_id IS NULL
  AND al.table_name = 'zone_records'
  AND z.id = COALESCE(
    (al.new_data ->> 'zone_id')::uuid,
    (al.old_data ->> 'zone_id')::uuid
  );

-- 3c. Backfill records where the record_id IS the org (table_name = 'organizations')
UPDATE public.audit_logs
SET org_id = record_id
WHERE org_id IS NULL
  AND table_name = 'organizations'
  AND record_id IS NOT NULL;

-- 4. Add a comment for documentation
COMMENT ON COLUMN public.audit_logs.org_id IS
  'Organization context for tenant-scoped audit queries. No FK -- audit logs preserved independently of org lifecycle.';


-- 5. Update handle_audit_log trigger to capture org_id
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_org_id UUID;
BEGIN
  -- Extract org_id from the record being logged.
  -- Tables use 'organization_id' or 'org_id' for the FK column.
  -- We use to_jsonb() to safely access columns without table-specific references.
  v_org_id := COALESCE(
    (to_jsonb(COALESCE(NEW, OLD)) ->> 'organization_id')::uuid,
    (to_jsonb(COALESCE(NEW, OLD)) ->> 'org_id')::uuid
  );

  -- For zone_records: look up org_id via zones table
  IF v_org_id IS NULL AND TG_TABLE_NAME = 'zone_records' THEN
    SELECT organization_id INTO v_org_id
    FROM public.zones
    WHERE id = COALESCE(
      (to_jsonb(COALESCE(NEW, OLD)) ->> 'zone_id')::uuid
    );
  END IF;

  -- For organizations table: the record_id IS the org_id
  IF v_org_id IS NULL AND TG_TABLE_NAME = 'organizations' THEN
    v_org_id := COALESCE(NEW.id, OLD.id);
  END IF;

  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id, org_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
      WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD)
      ELSE NULL
    END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    COALESCE(
      NULLIF(current_setting('app.current_user_id', true), '')::uuid,
      auth.uid()
    ),
    v_org_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$function$;


-- 6. Drop the old user-only SELECT policy and add org-scoped policies
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON public.audit_logs;

-- Users can see audit logs for their own actions
CREATE POLICY "audit_logs_select_own_actions"
  ON public.audit_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Org admins can see all audit logs for their organizations
CREATE POLICY "audit_logs_select_org_scoped"
  ON public.audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = audit_logs.org_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  );
