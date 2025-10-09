-- =====================================================
-- Javelina DNS Management - Database Schema
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
-- Stores extended user information beyond auth.users
-- =====================================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text,
  email text,
  display_name text,
  title text,
  phone text,
  timezone text default 'America/New_York',
  bio text,
  avatar_url text,
  role text default 'user' check (role in ('user', 'superuser')),
  mfa_enabled boolean default false,
  sso_connected boolean default false,
  last_login timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.profiles enable row level security;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =====================================================
-- 2. ORGANIZATIONS TABLE
-- Stores organization/company information
-- =====================================================

create table if not exists public.organizations (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table public.organizations enable row level security;

-- =====================================================
-- 3. ORGANIZATION_MEMBERS TABLE
-- Junction table for user-organization relationships
-- NOTE: Created before RLS policies so policies can reference it
-- =====================================================

create table if not exists public.organization_members (
  organization_id uuid references public.organizations on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null check (role in ('SuperAdmin', 'Admin', 'Editor', 'Viewer')),
  projects_count int default 0,
  zones_count int default 0,
  created_at timestamp with time zone default now(),
  primary key (organization_id, user_id)
);

-- Enable Row Level Security
alter table public.organization_members enable row level security;

-- =====================================================
-- RLS POLICIES (Created after all tables exist)
-- =====================================================

-- RLS Policy: Users can view organizations they belong to
create policy "Users can view their organizations"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can view their own memberships
create policy "Users can view their memberships"
  on public.organization_members for select
  using (user_id = auth.uid());

-- =====================================================
-- 4. AUTOMATIC PROFILE CREATION TRIGGER
-- Creates a profile entry when a new user signs up
-- =====================================================

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, last_login)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now()
  );
  return new;
end;
$$;

-- Trigger to call the function on user creation
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- 5. UPDATE TIMESTAMP FUNCTION
-- Automatically updates the updated_at column
-- =====================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Apply to profiles table
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

-- Apply to organizations table
drop trigger if exists organizations_updated_at on public.organizations;
create trigger organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 6. INDEXES FOR PERFORMANCE
-- =====================================================

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_organization_id_idx on public.organization_members(organization_id);

-- =====================================================
-- 7. SEED DATA (Optional - for testing)
-- Create test organizations and memberships
-- =====================================================

-- Uncomment below to add seed data after your first user signs up
-- Replace 'YOUR_USER_ID' with actual user ID from auth.users table

/*
-- Insert test organizations
insert into public.organizations (id, name, description) values
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corp', 'Production and staging environments for Acme Corporation'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Personal Projects', 'Personal domains and side projects')
on conflict (id) do nothing;

-- Add user to organizations (replace YOUR_USER_ID with actual ID)
insert into public.organization_members (organization_id, user_id, role, projects_count, zones_count) values
  ('550e8400-e29b-41d4-a716-446655440000', 'YOUR_USER_ID', 'SuperAdmin', 2, 3),
  ('550e8400-e29b-41d4-a716-446655440001', 'YOUR_USER_ID', 'Admin', 1, 1)
on conflict (organization_id, user_id) do nothing;
*/

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created
select 
  table_name,
  (select count(*) from information_schema.columns where columns.table_name = tables.table_name) as column_count
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'organizations', 'organization_members')
order by table_name;

