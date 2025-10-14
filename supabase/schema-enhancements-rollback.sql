-- =====================================================
-- Javelina Database Schema Enhancements - ROLLBACK
-- Run this in Supabase SQL Editor to remove enhancements
-- =====================================================
-- This file removes all enhancements added by schema-enhancements.sql
-- WARNING: This will drop columns and their data. Backup first!
-- =====================================================

-- =====================================================
-- 1. DROP TRIGGERS FIRST
-- =====================================================

-- Drop zone verification health update trigger
drop trigger if exists zones_verification_health_update on public.zones;

-- Drop zone records count initialization trigger
drop trigger if exists zones_records_count_init on public.zones;

-- =====================================================
-- 2. DROP FUNCTIONS
-- =====================================================

-- Drop trigger functions
drop function if exists public.update_environment_health_status();
drop function if exists public.update_member_last_accessed(uuid, uuid);
drop function if exists public.update_zone_records_count();

-- =====================================================
-- 3. DROP INDEXES
-- =====================================================

-- Organizations indexes
drop index if exists public.organizations_slug_idx;
drop index if exists public.organizations_is_active_idx;

-- Organization members indexes
drop index if exists public.organization_members_status_org_idx;
drop index if exists public.organization_members_last_accessed_idx;

-- Environments indexes
drop index if exists public.environments_health_status_idx;
drop index if exists public.environments_parent_id_idx;

-- Zones indexes
drop index if exists public.zones_verification_status_env_idx;
drop index if exists public.zones_last_verified_idx;

-- Profiles indexes
drop index if exists public.profiles_onboarding_completed_idx;

-- Audit logs indexes
drop index if exists public.audit_logs_table_action_idx;
drop index if exists public.audit_logs_ip_address_idx;

-- =====================================================
-- 4. DROP COLUMNS FROM TABLES
-- =====================================================

-- Remove columns from organizations
alter table public.organizations
  drop column if exists slug,
  drop column if exists logo_url,
  drop column if exists settings,
  drop column if exists is_active,
  drop column if exists owner_id;

-- Remove columns from organization_members
alter table public.organization_members
  drop column if exists invited_by,
  drop column if exists invited_at,
  drop column if exists joined_at,
  drop column if exists last_accessed_at,
  drop column if exists permissions,
  drop column if exists status;

-- Remove columns from environments
alter table public.environments
  drop column if exists configuration,
  drop column if exists metadata,
  drop column if exists parent_environment_id,
  drop column if exists last_deployed_at,
  drop column if exists health_status;

-- Remove columns from zones
alter table public.zones
  drop column if exists metadata,
  drop column if exists ttl,
  drop column if exists nameservers,
  drop column if exists last_verified_at,
  drop column if exists verification_status,
  drop column if exists records_count;

-- Remove columns from profiles
alter table public.profiles
  drop column if exists preferences,
  drop column if exists onboarding_completed,
  drop column if exists email_verified,
  drop column if exists notification_preferences,
  drop column if exists language;

-- Remove columns from audit_logs
alter table public.audit_logs
  drop column if exists ip_address,
  drop column if exists user_agent,
  drop column if exists metadata;

-- =====================================================
-- 5. VERIFICATION QUERY
-- =====================================================

-- Verify all enhancements were removed successfully
select 
  'organizations' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'slug') as slug_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'settings') as settings_removed
union all
select 
  'organization_members' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'organization_members' and column_name = 'status') as status_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'organization_members' and column_name = 'permissions') as permissions_removed
union all
select 
  'environments' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'environments' and column_name = 'health_status') as health_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'environments' and column_name = 'configuration') as config_removed
union all
select 
  'zones' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'zones' and column_name = 'verification_status') as verification_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'zones' and column_name = 'nameservers') as nameservers_removed
union all
select 
  'profiles' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'preferences') as preferences_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'onboarding_completed') as onboarding_removed
union all
select 
  'audit_logs' as table_name,
  not exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'ip_address') as ip_removed,
  not exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'metadata') as metadata_removed;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================
-- Database has been restored to pre-enhancement state
-- =====================================================

