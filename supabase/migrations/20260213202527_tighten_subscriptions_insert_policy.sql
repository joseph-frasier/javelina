-- ================================================================
-- Migration: Tighten subscriptions INSERT policy
-- ================================================================
-- The existing INSERT policy allows ANY org member to create
-- subscriptions. The UPDATE policy already requires SuperAdmin,
-- Admin, or BillingContact. We align INSERT with UPDATE.
-- ================================================================

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can create subscriptions for their orgs" ON public.subscriptions;

-- Recreate with role restriction matching the UPDATE policy
CREATE POLICY "Users can create subscriptions for their orgs"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role IN ('SuperAdmin', 'Admin', 'BillingContact')
    )
  );
