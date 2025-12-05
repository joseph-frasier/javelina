-- =====================================================
-- Migration: Remove Environments Layer
-- Restructure: Organizations -> Zones -> Zone Records
-- (Previously: Organizations -> Environments -> Zones -> Zone Records)
-- =====================================================

-- Step 1: Add organization_id column to zones table
ALTER TABLE public.zones
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Step 2: Populate organization_id from environments relationship
UPDATE public.zones z
SET organization_id = e.organization_id
FROM public.environments e
WHERE z.environment_id = e.id;

-- Step 3: Make organization_id NOT NULL (after population)
ALTER TABLE public.zones
ALTER COLUMN organization_id SET NOT NULL;

-- Step 4: Create index on the new column
CREATE INDEX IF NOT EXISTS zones_organization_id_idx ON public.zones(organization_id);

-- Step 5: Drop the trigger that depends on environments
DROP TRIGGER IF EXISTS zones_verification_health_update ON public.zones;

-- Step 6: Drop existing zones RLS policies that reference environments
DROP POLICY IF EXISTS "Users can view zones in their organizations" ON public.zones;
DROP POLICY IF EXISTS "SuperAdmin and Admin can create zones" ON public.zones;
DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can update zones" ON public.zones;
DROP POLICY IF EXISTS "SuperAdmin and Admin can delete zones" ON public.zones;

-- Step 7: Drop existing zone_records RLS policies that reference environments (through zones)
DROP POLICY IF EXISTS "Users can view zone records in their organizations" ON public.zone_records;
DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can create zone records" ON public.zone_records;
DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can update zone records" ON public.zone_records;
DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can delete zone records" ON public.zone_records;

-- Step 8: Create new zones RLS policies that reference organizations directly
CREATE POLICY "Users can view zones in their organizations"
  ON public.zones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "SuperAdmin and Admin can create zones"
  ON public.zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

CREATE POLICY "SuperAdmin, Admin, and Editor can update zones"
  ON public.zones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

CREATE POLICY "SuperAdmin and Admin can delete zones"
  ON public.zones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- Step 9: Create new zone_records RLS policies that reference organizations through zones
CREATE POLICY "Users can view zone records in their organizations"
  ON public.zone_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_records.zone_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "SuperAdmin, Admin, and Editor can create zone records"
  ON public.zone_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_records.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

CREATE POLICY "SuperAdmin, Admin, and Editor can update zone records"
  ON public.zone_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_records.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_records.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

CREATE POLICY "SuperAdmin, Admin, and Editor can delete zone records"
  ON public.zone_records FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_records.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Step 10: Drop the foreign key constraint from zones to environments
ALTER TABLE public.zones
DROP CONSTRAINT IF EXISTS zones_environment_id_fkey;

-- Step 11: Drop the environment_id column from zones (no longer needed)
ALTER TABLE public.zones
DROP COLUMN IF EXISTS environment_id;

-- Step 12: Drop environment-related functions
DROP FUNCTION IF EXISTS public.update_environment_health_status() CASCADE;
DROP FUNCTION IF EXISTS public.user_can_create_environment_in_org(uuid, uuid) CASCADE;

-- Step 13: Drop environments table (this will cascade and remove dependent objects)
DROP TABLE IF EXISTS public.environments CASCADE;

-- Step 14: Remove environments_count column from organizations
ALTER TABLE public.organizations
DROP COLUMN IF EXISTS environments_count;

-- Step 15: Drop old indexes that referenced environment_id
DROP INDEX IF EXISTS zones_environment_id_idx;
DROP INDEX IF EXISTS environments_organization_id_idx;
DROP INDEX IF EXISTS environments_created_by_idx;

-- =====================================================
-- Migration Complete
-- =====================================================
