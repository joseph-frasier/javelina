-- =====================================================
-- Migration: Create Tags System
-- Purpose: Add tagging system for zones
-- Organization-scoped tags with organization-wide favorites
-- =====================================================

-- =====================================================
-- 1. TAGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) <= 30 AND char_length(name) > 0),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_favorite BOOLEAN DEFAULT false NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create case-insensitive unique constraint on (organization_id, name)
CREATE UNIQUE INDEX tags_org_name_unique_idx 
  ON public.tags(organization_id, LOWER(name));

-- Create indexes for performance
CREATE INDEX tags_organization_id_idx ON public.tags(organization_id);
CREATE INDEX tags_display_order_idx ON public.tags(organization_id, display_order);
CREATE INDEX tags_is_favorite_idx ON public.tags(organization_id, is_favorite) WHERE is_favorite = true;

-- Enable Row Level Security
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
-- Users can view tags in their organizations
CREATE POLICY "Users can view tags in their organizations"
  ON public.tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- SuperAdmin and Admin can create tags
CREATE POLICY "SuperAdmin and Admin can create tags"
  ON public.tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- SuperAdmin and Admin can update tags
CREATE POLICY "SuperAdmin and Admin can update tags"
  ON public.tags FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- SuperAdmin and Admin can delete tags
CREATE POLICY "SuperAdmin and Admin can delete tags"
  ON public.tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = tags.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin')
    )
  );

-- =====================================================
-- 2. ZONE_TAGS TABLE (Junction Table)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.zone_tags (
  zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  PRIMARY KEY (zone_id, tag_id)
);

-- Create indexes for performance
CREATE INDEX zone_tags_zone_id_idx ON public.zone_tags(zone_id);
CREATE INDEX zone_tags_tag_id_idx ON public.zone_tags(tag_id);

-- Enable Row Level Security
ALTER TABLE public.zone_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for zone_tags
-- Users can view zone_tags in their organizations
CREATE POLICY "Users can view zone_tags in their organizations"
  ON public.zone_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_tags.zone_id
      AND om.user_id = auth.uid()
    )
  );

-- SuperAdmin, Admin, and Editor can create zone_tags
CREATE POLICY "SuperAdmin, Admin, and Editor can create zone_tags"
  ON public.zone_tags FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_tags.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- SuperAdmin, Admin, and Editor can delete zone_tags
CREATE POLICY "SuperAdmin, Admin, and Editor can delete zone_tags"
  ON public.zone_tags FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.organization_members om ON om.organization_id = z.organization_id
      WHERE z.id = zone_tags.zone_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at on tags
CREATE TRIGGER update_tags_updated_at_trigger
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tags_updated_at();

-- =====================================================
-- Migration Complete
-- =====================================================

