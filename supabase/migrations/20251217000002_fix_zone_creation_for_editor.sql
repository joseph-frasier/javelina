-- =====================================================
-- Migration: Fix Zone Creation for Editor Role
-- Allow Editor to create zones (was missing from previous migration)
-- =====================================================

-- Drop existing zone create policy
DROP POLICY IF EXISTS "SuperAdmin and Admin can create zones" ON public.zones;

-- Recreate with Editor included
CREATE POLICY "SuperAdmin, Admin, and Editor can create zones"
  ON public.zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Verify all zone policies now include Editor
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'zones' AND cmd IN ('INSERT', 'UPDATE', 'DELETE')
ORDER BY cmd;

