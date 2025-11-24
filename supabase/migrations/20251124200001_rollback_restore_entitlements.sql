-- =====================================================
-- ROLLBACK: Restore Entitlements System
-- This migration restores the entitlement tables and functions
-- that were accidentally dropped from production
-- =====================================================

-- =====================================================
-- 1. RECREATE ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('boolean', 'numeric', 'text')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view entitlements (for feature discovery)
DROP POLICY IF EXISTS "Anyone can view entitlements" ON public.entitlements;
CREATE POLICY "Anyone can view entitlements"
  ON public.entitlements FOR SELECT
  USING (true);

COMMENT ON TABLE public.entitlements IS 'Available capabilities and limits that can be assigned to plans';
COMMENT ON COLUMN public.entitlements.key IS 'Unique entitlement key (e.g., environments_limit, api_access)';
COMMENT ON COLUMN public.entitlements.value_type IS 'Data type for this entitlement: boolean, numeric, or text';

-- =====================================================
-- 2. RECREATE PLAN_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE NOT NULL,
  entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (plan_id, entitlement_id)
);

-- Enable RLS
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;

-- RLS: Anyone can view plan entitlements (public info)
DROP POLICY IF EXISTS "Anyone can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Anyone can view plan entitlements"
  ON public.plan_entitlements FOR SELECT
  USING (true);

COMMENT ON TABLE public.plan_entitlements IS 'Maps entitlements to plans with their values';
COMMENT ON COLUMN public.plan_entitlements.value IS 'Value for this entitlement (numeric limit, boolean, or text)';

-- =====================================================
-- 3. RECREATE ORG_ENTITLEMENT_OVERRIDES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.org_entitlement_overrides (
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  entitlement_id UUID REFERENCES public.entitlements(id) ON DELETE CASCADE NOT NULL,
  value TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, entitlement_id)
);

-- Enable RLS
ALTER TABLE public.org_entitlement_overrides ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view overrides for their organizations
DROP POLICY IF EXISTS "Users can view their org overrides" ON public.org_entitlement_overrides;
CREATE POLICY "Users can view their org overrides"
  ON public.org_entitlement_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- RLS: Only admins can modify overrides
DROP POLICY IF EXISTS "Admins can manage org overrides" ON public.org_entitlement_overrides;
CREATE POLICY "Admins can manage org overrides"
  ON public.org_entitlement_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'Admin'
    )
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_org_overrides_org_id 
  ON public.org_entitlement_overrides(org_id);

COMMENT ON TABLE public.org_entitlement_overrides IS 'Custom entitlement values for specific organizations';
COMMENT ON COLUMN public.org_entitlement_overrides.reason IS 'Why this override was created (e.g., custom deal)';

-- Trigger for org_entitlement_overrides
DROP TRIGGER IF EXISTS org_overrides_updated_at ON public.org_entitlement_overrides;
CREATE TRIGGER org_overrides_updated_at
  BEFORE UPDATE ON public.org_entitlement_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- 4. RECREATE DATABASE FUNCTIONS
-- =====================================================

-- Function: Get all entitlements for an organization (with overrides)
CREATE OR REPLACE FUNCTION public.get_org_entitlements(org_uuid UUID)
RETURNS TABLE (
  entitlement_key TEXT,
  entitlement_description TEXT,
  value TEXT,
  value_type TEXT,
  is_override BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  -- First, get overrides
  SELECT 
    e.key,
    e.description,
    o.value,
    e.value_type,
    true AS is_override
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid
  
  UNION ALL
  
  -- Then get plan entitlements (exclude overridden ones)
  SELECT 
    e.key,
    e.description,
    pe.value,
    e.value_type,
    false AS is_override
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.org_entitlement_overrides o
    WHERE o.org_id = org_uuid AND o.entitlement_id = e.id
  );
END;
$$;

COMMENT ON FUNCTION public.get_org_entitlements IS 'Get all entitlements for an organization including overrides';

-- Function: Check specific entitlement for an organization
CREATE OR REPLACE FUNCTION public.check_entitlement(
  org_uuid UUID,
  entitlement_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  entitlement_value TEXT;
BEGIN
  -- First check for override
  SELECT o.value INTO entitlement_value
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid AND e.key = entitlement_key;
  
  IF entitlement_value IS NOT NULL THEN
    RETURN entitlement_value;
  END IF;
  
  -- If no override, get from plan
  SELECT pe.value INTO entitlement_value
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid AND e.key = entitlement_key;
  
  RETURN entitlement_value;
END;
$$;

COMMENT ON FUNCTION public.check_entitlement IS 'Get value of a specific entitlement for an organization';

-- Function: Check if organization can create a resource based on limits
CREATE OR REPLACE FUNCTION public.can_create_resource(
  org_uuid UUID,
  resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  limit_value TEXT;
  current_count INTEGER;
  limit_int INTEGER;
BEGIN
  -- Determine entitlement key based on resource type
  CASE resource_type
    WHEN 'environment' THEN
      limit_value := public.check_entitlement(org_uuid, 'environments_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.environments
      WHERE organization_id = org_uuid;
    
    WHEN 'zone' THEN
      limit_value := public.check_entitlement(org_uuid, 'zones_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      WHERE e.organization_id = org_uuid;
    
    WHEN 'member' THEN
      limit_value := public.check_entitlement(org_uuid, 'team_members_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.organization_members
      WHERE organization_id = org_uuid;
    
    ELSE
      RETURN false;
  END CASE;
  
  -- If no limit defined, deny
  IF limit_value IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if unlimited (-1)
  limit_int := limit_value::INTEGER;
  IF limit_int = -1 THEN
    RETURN true;
  END IF;
  
  -- Check if under limit
  RETURN current_count < limit_int;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If conversion fails or other error, deny
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.can_create_resource IS 'Check if organization can create a resource based on subscription limits';

-- =====================================================
-- 5. RESTORE ENTITLEMENT SEED DATA
-- =====================================================

-- Insert entitlements
INSERT INTO public.entitlements (key, description, value_type)
VALUES
  -- Numeric Limits
  ('environments_limit', 'Maximum number of environments per organization', 'numeric'),
  ('zones_limit', 'Maximum number of DNS zones per organization', 'numeric'),
  ('dns_records_limit', 'Maximum number of DNS records per zone', 'numeric'),
  ('team_members_limit', 'Maximum number of team members per organization', 'numeric'),
  
  -- Boolean Features
  ('api_access', 'Access to REST API and API keys', 'boolean'),
  ('advanced_analytics', 'Access to advanced analytics and insights', 'boolean'),
  ('priority_support', 'Priority email and chat support', 'boolean'),
  ('audit_logs', 'Access to detailed audit logs', 'boolean'),
  ('custom_roles', 'Ability to create custom user roles', 'boolean'),
  ('sso_enabled', 'Single Sign-On (SSO) support', 'boolean'),
  ('bulk_operations', 'Bulk DNS record operations', 'boolean'),
  ('export_data', 'Export DNS data to various formats', 'boolean')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  value_type = EXCLUDED.value_type;

-- Map entitlements to plans
DO $$
DECLARE
  free_plan_id UUID;
  basic_monthly_id UUID;
  basic_annual_id UUID;
  pro_monthly_id UUID;
  pro_annual_id UUID;
  enterprise_id UUID;
  
  -- Entitlement IDs
  env_limit_id UUID;
  zones_limit_id UUID;
  dns_limit_id UUID;
  members_limit_id UUID;
  api_access_id UUID;
  analytics_id UUID;
  priority_support_id UUID;
  audit_logs_id UUID;
  custom_roles_id UUID;
  sso_id UUID;
  bulk_ops_id UUID;
  export_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO free_plan_id FROM public.plans WHERE code = 'free';
  SELECT id INTO basic_monthly_id FROM public.plans WHERE code = 'basic_monthly';
  SELECT id INTO basic_annual_id FROM public.plans WHERE code = 'basic_annual';
  SELECT id INTO pro_monthly_id FROM public.plans WHERE code = 'pro_monthly';
  SELECT id INTO pro_annual_id FROM public.plans WHERE code = 'pro_annual';
  SELECT id INTO enterprise_id FROM public.plans WHERE code = 'enterprise_monthly';
  
  -- Get entitlement IDs
  SELECT id INTO env_limit_id FROM public.entitlements WHERE key = 'environments_limit';
  SELECT id INTO zones_limit_id FROM public.entitlements WHERE key = 'zones_limit';
  SELECT id INTO dns_limit_id FROM public.entitlements WHERE key = 'dns_records_limit';
  SELECT id INTO members_limit_id FROM public.entitlements WHERE key = 'team_members_limit';
  SELECT id INTO api_access_id FROM public.entitlements WHERE key = 'api_access';
  SELECT id INTO analytics_id FROM public.entitlements WHERE key = 'advanced_analytics';
  SELECT id INTO priority_support_id FROM public.entitlements WHERE key = 'priority_support';
  SELECT id INTO audit_logs_id FROM public.entitlements WHERE key = 'audit_logs';
  SELECT id INTO custom_roles_id FROM public.entitlements WHERE key = 'custom_roles';
  SELECT id INTO sso_id FROM public.entitlements WHERE key = 'sso_enabled';
  SELECT id INTO bulk_ops_id FROM public.entitlements WHERE key = 'bulk_operations';
  SELECT id INTO export_id FROM public.entitlements WHERE key = 'export_data';
  
  -- FREE PLAN ENTITLEMENTS
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (free_plan_id, env_limit_id, '1'),
      (free_plan_id, zones_limit_id, '3'),
      (free_plan_id, dns_limit_id, '100'),
      (free_plan_id, members_limit_id, '2'),
      (free_plan_id, api_access_id, 'false'),
      (free_plan_id, analytics_id, 'false'),
      (free_plan_id, priority_support_id, 'false'),
      (free_plan_id, audit_logs_id, 'false'),
      (free_plan_id, custom_roles_id, 'false'),
      (free_plan_id, sso_id, 'false'),
      (free_plan_id, bulk_ops_id, 'false'),
      (free_plan_id, export_id, 'false')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  -- BASIC MONTHLY PLAN ENTITLEMENTS
  IF basic_monthly_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (basic_monthly_id, env_limit_id, '3'),
      (basic_monthly_id, zones_limit_id, '10'),
      (basic_monthly_id, dns_limit_id, '500'),
      (basic_monthly_id, members_limit_id, '5'),
      (basic_monthly_id, api_access_id, 'true'),
      (basic_monthly_id, analytics_id, 'false'),
      (basic_monthly_id, priority_support_id, 'false'),
      (basic_monthly_id, audit_logs_id, 'false'),
      (basic_monthly_id, custom_roles_id, 'false'),
      (basic_monthly_id, sso_id, 'false'),
      (basic_monthly_id, bulk_ops_id, 'true'),
      (basic_monthly_id, export_id, 'true')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  -- BASIC ANNUAL PLAN ENTITLEMENTS
  IF basic_annual_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (basic_annual_id, env_limit_id, '3'),
      (basic_annual_id, zones_limit_id, '10'),
      (basic_annual_id, dns_limit_id, '500'),
      (basic_annual_id, members_limit_id, '5'),
      (basic_annual_id, api_access_id, 'true'),
      (basic_annual_id, analytics_id, 'false'),
      (basic_annual_id, priority_support_id, 'false'),
      (basic_annual_id, audit_logs_id, 'false'),
      (basic_annual_id, custom_roles_id, 'false'),
      (basic_annual_id, sso_id, 'false'),
      (basic_annual_id, bulk_ops_id, 'true'),
      (basic_annual_id, export_id, 'true')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  -- PRO MONTHLY PLAN ENTITLEMENTS
  IF pro_monthly_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (pro_monthly_id, env_limit_id, '10'),
      (pro_monthly_id, zones_limit_id, '50'),
      (pro_monthly_id, dns_limit_id, '1000'),
      (pro_monthly_id, members_limit_id, '15'),
      (pro_monthly_id, api_access_id, 'true'),
      (pro_monthly_id, analytics_id, 'true'),
      (pro_monthly_id, priority_support_id, 'true'),
      (pro_monthly_id, audit_logs_id, 'true'),
      (pro_monthly_id, custom_roles_id, 'false'),
      (pro_monthly_id, sso_id, 'false'),
      (pro_monthly_id, bulk_ops_id, 'true'),
      (pro_monthly_id, export_id, 'true')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  -- PRO ANNUAL PLAN ENTITLEMENTS
  IF pro_annual_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (pro_annual_id, env_limit_id, '10'),
      (pro_annual_id, zones_limit_id, '50'),
      (pro_annual_id, dns_limit_id, '1000'),
      (pro_annual_id, members_limit_id, '15'),
      (pro_annual_id, api_access_id, 'true'),
      (pro_annual_id, analytics_id, 'true'),
      (pro_annual_id, priority_support_id, 'true'),
      (pro_annual_id, audit_logs_id, 'true'),
      (pro_annual_id, custom_roles_id, 'false'),
      (pro_annual_id, sso_id, 'false'),
      (pro_annual_id, bulk_ops_id, 'true'),
      (pro_annual_id, export_id, 'true')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  -- ENTERPRISE PLAN ENTITLEMENTS
  IF enterprise_id IS NOT NULL THEN
    INSERT INTO public.plan_entitlements (plan_id, entitlement_id, value)
    VALUES
      (enterprise_id, env_limit_id, '-1'),
      (enterprise_id, zones_limit_id, '-1'),
      (enterprise_id, dns_limit_id, '-1'),
      (enterprise_id, members_limit_id, '-1'),
      (enterprise_id, api_access_id, 'true'),
      (enterprise_id, analytics_id, 'true'),
      (enterprise_id, priority_support_id, 'true'),
      (enterprise_id, audit_logs_id, 'true'),
      (enterprise_id, custom_roles_id, 'true'),
      (enterprise_id, sso_id, 'true'),
      (enterprise_id, bulk_ops_id, 'true'),
      (enterprise_id, export_id, 'true')
    ON CONFLICT (plan_id, entitlement_id) DO UPDATE SET value = EXCLUDED.value;
  END IF;
  
  RAISE NOTICE 'Entitlements system restored successfully';
END $$;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================

