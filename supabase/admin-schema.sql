-- =====================================================
-- Javelina Admin Schema
-- Run this in Supabase SQL Editor after schema.sql and schema-enhancements.sql
-- =====================================================
-- This file adds admin-specific functionality:
-- - admin_users table for admin authentication
-- - status fields for user/org management
-- - enhanced audit_logs for admin action tracking
-- =====================================================

-- =====================================================
-- 1. ADMIN_USERS TABLE
-- =====================================================

create table if not exists public.admin_users (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text not null,
  password_hash text not null,
  mfa_enabled boolean default false,
  last_login timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for email lookups
create index if not exists admin_users_email_idx on public.admin_users(email);

-- Enable Row Level Security (admin operations use service role, bypassing RLS)
alter table public.admin_users enable row level security;

-- Update timestamp trigger
drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at
  before update on public.admin_users
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 2. PROFILES TABLE ENHANCEMENTS (User Status)
-- =====================================================

-- Add status field to profiles for user enable/disable functionality
alter table public.profiles
  add column if not exists status text default 'active' 
    check (status in ('active', 'disabled'));

-- Index for filtering by status
create index if not exists profiles_status_idx on public.profiles(status);

-- =====================================================
-- 3. ORGANIZATIONS TABLE ENHANCEMENTS (Soft Delete)
-- =====================================================

-- Add status field for organization lifecycle management
alter table public.organizations
  add column if not exists status text default 'active' 
    check (status in ('active', 'deleted', 'archived'));

-- Add deleted_at timestamp for soft delete tracking
alter table public.organizations
  add column if not exists deleted_at timestamp with time zone;

-- Indexes for filtering and sorting
create index if not exists organizations_status_idx on public.organizations(status);
create index if not exists organizations_deleted_at_idx on public.organizations(deleted_at);

-- =====================================================
-- 4. AUDIT_LOGS TABLE ENHANCEMENTS (Admin Actions)
-- =====================================================

-- Add actor_type to distinguish between user, admin, and system actions
alter table public.audit_logs
  add column if not exists actor_type text default 'user'
    check (actor_type in ('user', 'admin', 'system'));

-- Add admin_user_id for tracking which admin performed the action
alter table public.audit_logs
  add column if not exists admin_user_id uuid references public.admin_users on delete set null;

-- Indexes for admin action queries
create index if not exists audit_logs_admin_user_idx on public.audit_logs(admin_user_id);
create index if not exists audit_logs_actor_type_idx on public.audit_logs(actor_type);

-- Composite index for filtering admin actions by date
create index if not exists audit_logs_admin_created_idx 
  on public.audit_logs(actor_type, created_at desc) 
  where actor_type = 'admin';

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- NOTE: Admin operations use the service role key which BYPASSES all RLS policies.
-- This is intentional - admins need full access to manage users and organizations.
-- The service role key should be kept secure and only used in server-side code.

-- Admin users table: No policies needed (service role only)
-- Policies added here would not affect admin operations anyway.

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to soft delete an organization
create or replace function public.soft_delete_organization(org_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.organizations
  set 
    status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  where id = org_id;
end;
$$;

-- Function to restore a soft-deleted organization
create or replace function public.restore_organization(org_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.organizations
  set 
    status = 'active',
    deleted_at = null,
    updated_at = now()
  where id = org_id;
end;
$$;

-- =====================================================
-- 7. VERIFICATION QUERY
-- =====================================================

-- Verify all admin schema enhancements were applied successfully
select 
  'admin_users' as table_name,
  exists(select 1 from information_schema.tables 
    where table_name = 'admin_users') as table_exists,
  exists(select 1 from information_schema.columns 
    where table_name = 'admin_users' and column_name = 'password_hash') as has_password_hash
union all
select 
  'profiles' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'profiles' and column_name = 'status') as has_status,
  exists(select 1 from pg_indexes 
    where tablename = 'profiles' and indexname = 'profiles_status_idx') as has_index
union all
select 
  'organizations' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'status') as has_status,
  exists(select 1 from information_schema.columns 
    where table_name = 'organizations' and column_name = 'deleted_at') as has_deleted_at
union all
select 
  'audit_logs' as table_name,
  exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'actor_type') as has_actor_type,
  exists(select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'admin_user_id') as has_admin_user_id;

-- =====================================================
-- ADMIN SCHEMA SETUP COMPLETE
-- =====================================================
-- Next steps:
-- 1. Run seed-admin-user.sql to create the default admin user
-- 2. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env.local
-- 3. Test admin login and functionality
-- =====================================================
