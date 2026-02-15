-- ================================================================
-- Migration: Fix overly permissive INSERT policies
-- ================================================================
-- CRITICAL FIX: organization_members had WITH CHECK (true) on INSERT,
-- allowing ANY authenticated user to add themselves to ANY org
-- with ANY role (including SuperAdmin) via direct PostgREST call.
--
-- All backend operations use service role (supabaseAdmin) which
-- bypasses RLS, so these changes only affect direct client SDK
-- access -- exactly the attack vector we're closing.
-- ================================================================

-- 1. Drop the dangerous organization_members INSERT policy
DROP POLICY IF EXISTS "organization_members_insert_policy" ON public.organization_members;

-- Also drop the older policy name if it exists (from base_schema)
DROP POLICY IF EXISTS "Authenticated users can create organization memberships" ON public.organization_members;

-- 2. Replace with restrictive policy: only existing Admin/SuperAdmin
-- of the target org can insert new members via client SDK.
-- Service role (backend) bypasses RLS entirely.
CREATE POLICY "organization_members_insert_by_admin"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members existing
      WHERE existing.organization_id = organization_members.organization_id
        AND existing.user_id = auth.uid()
        AND existing.role IN ('SuperAdmin', 'Admin')
    )
  );

-- 3. Fix the organizations INSERT policy (less critical but tighten it)
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;

-- Any authenticated user can create an org (expected behavior).
-- This just adds an explicit auth check instead of bare "true".
CREATE POLICY "organizations_insert_authenticated"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- 4. Clean up duplicate SELECT policy on organization_members
DROP POLICY IF EXISTS "allow_select_own_memberships" ON public.organization_members;

-- 5. Add UPDATE policy for organization_members (none existed before)
-- Only admins of the org can update member records via client SDK
CREATE POLICY "organization_members_update_by_admin"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members admin_check
      WHERE admin_check.organization_id = organization_members.organization_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role IN ('SuperAdmin', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members admin_check
      WHERE admin_check.organization_id = organization_members.organization_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role IN ('SuperAdmin', 'Admin')
    )
  );

-- 6. Add DELETE policy for organization_members
-- Only admins can remove other members via client SDK
CREATE POLICY "organization_members_delete_by_admin"
  ON public.organization_members
  FOR DELETE
  USING (
    organization_members.user_id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organization_members admin_check
      WHERE admin_check.organization_id = organization_members.organization_id
        AND admin_check.user_id = auth.uid()
        AND admin_check.role IN ('SuperAdmin', 'Admin')
    )
  );
