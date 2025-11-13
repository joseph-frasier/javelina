-- =====================================================
-- Fix Environment Creation with RLS Enabled
-- =====================================================
-- This migration fixes the issue where environment creation is blocked
-- when organizations table has RLS enabled. The problem is a cascading
-- RLS check where the policy needs to check organization_members, which
-- references organizations, creating a circular dependency.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS for
-- the membership check, then use it in the policy.
-- =====================================================

-- Drop existing environment INSERT policies
DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can create environments" ON public.environments;
DROP POLICY IF EXISTS "SuperAdmin and Admin can create environments" ON public.environments;

-- Create a helper function to check if user can create environment in org
-- This function uses SECURITY DEFINER to bypass RLS and avoid circular dependencies
CREATE OR REPLACE FUNCTION public.user_can_create_environment_in_org(
  org_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user is a member of the organization with appropriate role
  RETURN EXISTS (
    SELECT 1 
    FROM public.organization_members
    WHERE organization_id = org_uuid
      AND user_id = user_uuid
      AND role IN ('SuperAdmin', 'Admin', 'Editor')
      AND status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.user_can_create_environment_in_org IS 
  'SECURITY DEFINER function to check if user can create environments in an organization. Bypasses RLS to avoid cascading check issues.';

-- Create new environment INSERT policy using the helper function
CREATE POLICY "Users with appropriate role can create environments"
  ON public.environments
  FOR INSERT
  TO public
  WITH CHECK (
    public.user_can_create_environment_in_org(
      environments.organization_id,
      auth.uid()
    )
  );

COMMENT ON POLICY "Users with appropriate role can create environments" ON public.environments IS
  'Allows SuperAdmin, Admin, and Editor roles to create environments in their organizations';

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.user_can_create_environment_in_org TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_create_environment_in_org TO anon;

