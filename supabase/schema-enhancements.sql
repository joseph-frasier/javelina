-- =====================================================
-- Javelina Database Schema Enhancements
-- Run this in Supabase SQL Editor to add new fields
-- =====================================================
-- This file adds enhancements to existing tables without modifying the base schema.
-- All changes use IF NOT EXISTS or IF EXISTS for safe, idempotent execution.
-- =====================================================

-- =====================================================
-- 1. ORGANIZATIONS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to organizations
alter table public.organizations
  add column if not exists slug text unique,
  add column if not exists logo_url text,
  add column if not exists settings jsonb default '{}'::jsonb,
  add column if not exists is_active boolean default true,
  add column if not exists owner_id uuid references auth.users on delete set null;

-- Add index for slug lookups
create index if not exists organizations_slug_idx on public.organizations(slug);

-- Add index for active organizations
create index if not exists organizations_is_active_idx on public.organizations(is_active);

-- =====================================================
-- 2. ORGANIZATION_MEMBERS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to organization_members
alter table public.organization_members
  add column if not exists invited_by uuid references auth.users on delete set null,
  add column if not exists invited_at timestamp with time zone,
  add column if not exists joined_at timestamp with time zone,
  add column if not exists last_accessed_at timestamp with time zone,
  add column if not exists permissions jsonb default '{}'::jsonb,
  add column if not exists status text default 'active' check (status in ('active', 'invited', 'suspended'));

-- Add composite index for filtering by status and organization
create index if not exists organization_members_status_org_idx 
  on public.organization_members(status, organization_id);

-- Add index for last_accessed_at for activity tracking
create index if not exists organization_members_last_accessed_idx 
  on public.organization_members(last_accessed_at);

-- =====================================================
-- 3. ENVIRONMENTS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to environments
alter table public.environments
  add column if not exists configuration jsonb default '{}'::jsonb,
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists parent_environment_id uuid references public.environments on delete set null,
  add column if not exists last_deployed_at timestamp with time zone,
  add column if not exists health_status text default 'unknown' 
    check (health_status in ('healthy', 'degraded', 'down', 'unknown'));

-- Add index for health status filtering
create index if not exists environments_health_status_idx 
  on public.environments(health_status);

-- Add index for parent environment lookups
create index if not exists environments_parent_id_idx 
  on public.environments(parent_environment_id);

-- =====================================================
-- 4. ZONES TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to zones
alter table public.zones
  add column if not exists metadata jsonb default '{}'::jsonb,
  add column if not exists ttl integer default 3600,
  add column if not exists nameservers text[] default array[]::text[],
  add column if not exists last_verified_at timestamp with time zone,
  add column if not exists verification_status text default 'pending' 
    check (verification_status in ('verified', 'pending', 'failed')),
  add column if not exists records_count integer default 0;

-- Add composite index for verification status filtering
create index if not exists zones_verification_status_env_idx 
  on public.zones(verification_status, environment_id);

-- Add index for last_verified_at for monitoring
create index if not exists zones_last_verified_idx 
  on public.zones(last_verified_at);

-- =====================================================
-- 5. PROFILES TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to profiles
alter table public.profiles
  add column if not exists preferences jsonb default '{}'::jsonb,
  add column if not exists onboarding_completed boolean default false,
  add column if not exists email_verified boolean default false,
  add column if not exists notification_preferences jsonb 
    default '{"email": true, "in_app": true}'::jsonb,
  add column if not exists language text default 'en';

-- Add index for onboarding tracking
create index if not exists profiles_onboarding_completed_idx 
  on public.profiles(onboarding_completed);

-- =====================================================
-- 6. AUDIT_LOGS TABLE ENHANCEMENTS
-- =====================================================

-- Add new columns to audit_logs
alter table public.audit_logs
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists metadata jsonb default '{}'::jsonb;

-- Add composite index for filtering by table and action
create index if not exists audit_logs_table_action_idx 
  on public.audit_logs(table_name, action);

-- Add index for IP address lookups (security monitoring)
create index if not exists audit_logs_ip_address_idx 
  on public.audit_logs(ip_address);

-- =====================================================
-- 7. TRIGGER FUNCTIONS
-- =====================================================

-- Function to update environment health status based on zones
create or replace function public.update_environment_health_status()
returns trigger
language plpgsql
security definer
as $$
declare
  verified_count int;
  failed_count int;
  pending_count int;
  total_count int;
  env_health text;
begin
  -- Count zone statuses for the environment
  select 
    count(*) filter (where verification_status = 'verified'),
    count(*) filter (where verification_status = 'failed'),
    count(*) filter (where verification_status = 'pending'),
    count(*)
  into verified_count, failed_count, pending_count, total_count
  from public.zones
  where environment_id = coalesce(NEW.environment_id, OLD.environment_id)
    and active = true;

  -- Determine health status based on zone verification
  if total_count = 0 then
    env_health := 'unknown';
  elsif failed_count > 0 then
    env_health := 'degraded';
  elsif verified_count = total_count then
    env_health := 'healthy';
  elsif pending_count > 0 then
    env_health := 'unknown';
  else
    env_health := 'unknown';
  end if;

  -- Update the environment's health status
  update public.environments
  set health_status = env_health,
      updated_at = now()
  where id = coalesce(NEW.environment_id, OLD.environment_id);

  return coalesce(NEW, OLD);
end;
$$;

-- Trigger to update environment health when zone verification changes
drop trigger if exists zones_verification_health_update on public.zones;
create trigger zones_verification_health_update
  after insert or update of verification_status, active or delete
  on public.zones
  for each row
  execute function public.update_environment_health_status();

-- Function to update organization member last accessed timestamp
create or replace function public.update_member_last_accessed(
  p_organization_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
as $$
begin
  update public.organization_members
  set last_accessed_at = now()
  where organization_id = p_organization_id
    and user_id = p_user_id;
end;
$$;

-- Function to update zone records count (prepared for future zone_records table)
create or replace function public.update_zone_records_count()
returns trigger
language plpgsql
security definer
as $$
begin
  -- This function is a placeholder for when zone_records table is added
  -- Currently it just ensures the count is set to 0 for new zones
  if TG_OP = 'INSERT' then
    NEW.records_count := 0;
  end if;
  return NEW;
end;
$$;

-- Trigger to initialize zone records count
drop trigger if exists zones_records_count_init on public.zones;
create trigger zones_records_count_init
  before insert on public.zones
  for each row
  execute function public.update_zone_records_count();

-- =====================================================
-- 8. VERIFICATION QUERY
-- =====================================================

-- Verify all enhancements were applied successfully
select 
  'organizations' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'slug') as has_slug,
  exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'settings') as has_settings
union all
select 
  'organization_members' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'organization_members' and column_name = 'status') as has_status,
  exists(select 1 from information_schema.columns 
    where table_name = 'organization_members' and column_name = 'permissions') as has_permissions
union all
select 
  'environments' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'environments' and column_name = 'health_status') as has_health_status,
  exists(select 1 from information_schema.columns 
    where table_name = 'environments' and column_name = 'configuration') as has_configuration
union all
select 
  'zones' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'zones' and column_name = 'verification_status') as has_verification,
  exists(select 1 from information_schema.columns 
    where table_name = 'zones' and column_name = 'nameservers') as has_nameservers
union all
select 
  'profiles' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'preferences') as has_preferences,
  exists(select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'onboarding_completed') as has_onboarding
union all
select 
  'audit_logs' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'ip_address') as has_ip,
  exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'metadata') as has_metadata;

-- =====================================================
-- ENHANCEMENTS COMPLETE
-- =====================================================
-- To rollback these changes, run: schema-enhancements-rollback.sql
-- =====================================================

