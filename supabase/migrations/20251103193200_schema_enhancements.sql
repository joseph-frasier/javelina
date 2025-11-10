-- =====================================================
-- Javelina Database Schema Enhancements
-- Adds enhanced columns to existing tables
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'deleted', 'archived'));

-- Add index for slug lookups
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations(slug);

-- Add index for active organizations
CREATE INDEX IF NOT EXISTS organizations_is_active_idx ON public.organizations(is_active);

-- Add index for owner lookups
CREATE INDEX IF NOT EXISTS organizations_owner_id_idx ON public.organizations(owner_id);

-- =====================================================
-- 2. ORGANIZATION_MEMBERS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended'));

-- Add composite index for filtering by status and organization
CREATE INDEX IF NOT EXISTS organization_members_status_org_idx 
  ON public.organization_members(status, organization_id);

-- Add index for last_accessed_at for activity tracking
CREATE INDEX IF NOT EXISTS organization_members_last_accessed_idx 
  ON public.organization_members(last_accessed_at);

-- =====================================================
-- 3. ENVIRONMENTS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to environments
ALTER TABLE public.environments
  ADD COLUMN IF NOT EXISTS configuration JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS parent_environment_id UUID REFERENCES public.environments ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_deployed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'unknown' 
    CHECK (health_status IN ('healthy', 'degraded', 'down', 'unknown'));

-- Add index for health status filtering
CREATE INDEX IF NOT EXISTS environments_health_status_idx 
  ON public.environments(health_status);

-- Add index for parent environment lookups
CREATE INDEX IF NOT EXISTS environments_parent_id_idx 
  ON public.environments(parent_environment_id);

-- =====================================================
-- 4. ZONES TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to zones
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ttl INTEGER DEFAULT 3600,
  ADD COLUMN IF NOT EXISTS nameservers TEXT[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending' 
    CHECK (verification_status IN ('verified', 'pending', 'failed'));

-- Add composite index for verification status filtering
CREATE INDEX IF NOT EXISTS zones_verification_status_env_idx 
  ON public.zones(verification_status, environment_id);

-- Add index for last_verified_at for monitoring
CREATE INDEX IF NOT EXISTS zones_last_verified_idx 
  ON public.zones(last_verified_at);

-- =====================================================
-- 5. PROFILES TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_preferences JSONB 
    DEFAULT '{"email": true, "in_app": true}'::jsonb,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'disabled'));

-- Add index for onboarding tracking
CREATE INDEX IF NOT EXISTS profiles_onboarding_completed_idx 
  ON public.profiles(onboarding_completed);

-- =====================================================
-- 6. AUDIT_LOGS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS actor_type TEXT DEFAULT 'user' CHECK (actor_type IN ('user', 'admin', 'system')),
  ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES public.admin_users(id);

-- Add composite index for filtering by table and action
CREATE INDEX IF NOT EXISTS audit_logs_table_action_idx 
  ON public.audit_logs(table_name, action);

-- Add index for IP address lookups (security monitoring)
CREATE INDEX IF NOT EXISTS audit_logs_ip_address_idx 
  ON public.audit_logs(ip_address);

-- =====================================================
-- 7. TRIGGER FUNCTIONS
-- =====================================================

-- Function to update environment health status based on zones
CREATE OR REPLACE FUNCTION public.update_environment_health_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  verified_count INT;
  failed_count INT;
  pending_count INT;
  total_count INT;
  env_health TEXT;
BEGIN
  -- Count zone statuses for the environment
  SELECT 
    COUNT(*) FILTER (WHERE verification_status = 'verified'),
    COUNT(*) FILTER (WHERE verification_status = 'failed'),
    COUNT(*) FILTER (WHERE verification_status = 'pending'),
    COUNT(*)
  INTO verified_count, failed_count, pending_count, total_count
  FROM public.zones
  WHERE environment_id = COALESCE(NEW.environment_id, OLD.environment_id)
    AND active = true;

  -- Determine health status based on zone verification
  IF total_count = 0 THEN
    env_health := 'unknown';
  ELSIF failed_count > 0 THEN
    env_health := 'degraded';
  ELSIF verified_count = total_count THEN
    env_health := 'healthy';
  ELSIF pending_count > 0 THEN
    env_health := 'unknown';
  ELSE
    env_health := 'unknown';
  END IF;

  -- Update the environment's health status
  UPDATE public.environments
  SET health_status = env_health,
      updated_at = now()
  WHERE id = COALESCE(NEW.environment_id, OLD.environment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger to update environment health when zone verification changes
DROP TRIGGER IF EXISTS zones_verification_health_update ON public.zones;
CREATE TRIGGER zones_verification_health_update
  AFTER INSERT OR UPDATE OF verification_status, active OR DELETE
  ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_environment_health_status();

-- Function to update organization member last accessed timestamp
CREATE OR REPLACE FUNCTION public.update_member_last_accessed(
  p_organization_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organization_members
  SET last_accessed_at = now()
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id;
END;
$$;

-- Function to update zone records count
CREATE OR REPLACE FUNCTION public.update_zone_records_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This function is a placeholder for when zone_records table is added
  -- Currently it just ensures the count is set to 0 for new zones
  IF TG_OP = 'INSERT' THEN
    NEW.records_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to initialize zone records count
DROP TRIGGER IF EXISTS zones_records_count_init ON public.zones;
CREATE TRIGGER zones_records_count_init
  BEFORE INSERT ON public.zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_zone_records_count();

