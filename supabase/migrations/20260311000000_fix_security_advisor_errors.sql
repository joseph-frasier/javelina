-- =====================================================
-- Fix Security Advisor Errors (ERROR level)
-- =====================================================
-- 1. Security Definer View: public.support_metrics
-- 2. Security Definer View: public.knowledge_gaps
-- 3. RLS Disabled in Public: public.organization_invitations

BEGIN;

-- -----------------------------------------------------
-- 1 & 2. Convert SECURITY DEFINER views to SECURITY INVOKER
-- -----------------------------------------------------
-- These views were running with the permissions of the view creator,
-- meaning RLS policies were evaluated as the creator rather than the
-- querying user. Switching to SECURITY INVOKER ensures each caller's
-- own permissions and RLS policies are enforced instead.

ALTER VIEW public.support_metrics SET (security_invoker = true);
ALTER VIEW public.knowledge_gaps SET (security_invoker = true);

-- -----------------------------------------------------
-- 3. Enable RLS on organization_invitations + policies
-- -----------------------------------------------------
-- The table was created without RLS enabled, exposing it to any
-- authenticated caller via PostgREST without row-level restrictions.
-- Policies mirror the admin-gated pattern used on organization_members.

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- Org admins can view all invitations for their organizations
CREATE POLICY "organization_invitations_select_by_admin"
  ON public.organization_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- Org admins can create invitations for their organizations
CREATE POLICY "organization_invitations_insert_by_admin"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- Org admins can update invitations (e.g., revoke) for their organizations
CREATE POLICY "organization_invitations_update_by_admin"
  ON public.organization_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- Org admins can delete invitations for their organizations
CREATE POLICY "organization_invitations_delete_by_admin"
  ON public.organization_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = organization_invitations.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

COMMIT;
