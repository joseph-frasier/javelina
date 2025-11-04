-- =====================================================
-- SuperAdmin Flag Migration
-- Add superadmin boolean to profiles and drop admin tables
-- =====================================================

-- Add superadmin column to profiles table (defaults to false)
alter table public.profiles 
add column if not exists superadmin boolean default false not null;

-- Create index on superadmin for performance
create index if not exists idx_profiles_superadmin on public.profiles(superadmin) 
where superadmin = true;

-- Add comment to document the column
comment on column public.profiles.superadmin is 
'SuperAdmin flag: users with true have global access to all organizations';

-- Drop admin-specific tables if they exist
drop table if exists public.admin_audit_logs cascade;
drop table if exists public.admin_sessions cascade;
drop table if exists public.admin_users cascade;

-- Note: The role column on profiles table is kept for backwards compatibility
-- but superadmin flag is now the source of truth for admin privileges

