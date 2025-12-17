-- =====================================================
-- Migration: Fix Editor Permissions for Zones and Tags
-- Allow Editor to delete zones and create/edit/delete tags
-- Aligns with master RBAC matrix
-- =====================================================

-- =====================================================
-- 1. FIX ZONE DELETION PERMISSIONS
-- =====================================================

-- Drop existing zone delete policy
DROP POLICY IF EXISTS "SuperAdmin and Admin can delete zones" ON public.zones;

-- Recreate with Editor included
CREATE POLICY "SuperAdmin, Admin, and Editor can delete zones"
  ON public.zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 2. FIX TAG CREATION PERMISSIONS
-- =====================================================

-- Drop existing tag create policy
DROP POLICY IF EXISTS "SuperAdmin and Admin can create tags" ON public.tags;

-- Recreate with Editor included
CREATE POLICY "SuperAdmin, Admin, and Editor can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 3. FIX TAG UPDATE PERMISSIONS
-- =====================================================

-- Drop existing tag update policy
DROP POLICY IF EXISTS "SuperAdmin and Admin can update tags" ON public.tags;

-- Recreate with Editor included
CREATE POLICY "SuperAdmin, Admin, and Editor can update tags"
  ON public.tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 4. FIX TAG DELETION PERMISSIONS
-- =====================================================

-- Drop existing tag delete policy
DROP POLICY IF EXISTS "SuperAdmin and Admin can delete tags" ON public.tags;

-- Recreate with Editor included
CREATE POLICY "SuperAdmin, Admin, and Editor can delete tags"
  ON public.tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- Migration Complete
-- =====================================================

-- Verify zone delete policy
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'zones' AND policyname LIKE '%delete%';

-- Verify tag policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename = 'tags'
ORDER BY cmd, policyname;

