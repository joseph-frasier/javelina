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
  environments_count int default 0,
  zones_count int default 0,
  created_at timestamp with time zone default now(),
  primary key (organization_id, user_id)
);

-- Enable Row Level Security
alter table public.organization_members enable row level security;

-- =====================================================
-- 4. ENVIRONMENTS TABLE
-- Represents logical/physical contexts within an organization
-- (e.g., Production, Staging, Development)
-- =====================================================

create table if not exists public.environments (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  name text not null,
  environment_type text not null check (environment_type in ('production', 'staging', 'development')),
  location text,
  status text default 'active' check (status in ('active', 'disabled', 'archived')),
  description text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users on delete set null
);

-- Enable Row Level Security
alter table public.environments enable row level security;

-- =====================================================
-- 5. ZONES TABLE
-- Represents DNS zones managed within an environment
-- =====================================================

create table if not exists public.zones (
  id uuid default gen_random_uuid() primary key,
  environment_id uuid references public.environments on delete cascade not null,
  name text not null,
  zone_type text not null check (zone_type in ('primary', 'secondary', 'redirect')),
  description text,
  active boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  created_by uuid references auth.users on delete set null
);

-- Enable Row Level Security
alter table public.zones enable row level security;

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

-- RLS Policy: Users can view environments in their organizations
create policy "Users can view environments in their organizations"
  on public.environments for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can view zones in their organizations
create policy "Users can view zones in their organizations"
  on public.zones for select
  using (
    exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = zones.environment_id
      and om.user_id = auth.uid()
    )
  );

-- =====================================================
-- 6. AUTOMATIC PROFILE CREATION TRIGGER
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
-- 7. UPDATE TIMESTAMP FUNCTION
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

-- Apply to environments table
drop trigger if exists environments_updated_at on public.environments;
create trigger environments_updated_at
  before update on public.environments
  for each row execute procedure public.handle_updated_at();

-- Apply to zones table
drop trigger if exists zones_updated_at on public.zones;
create trigger zones_updated_at
  before update on public.zones
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_organization_id_idx on public.organization_members(organization_id);
create index if not exists environments_organization_id_idx on public.environments(organization_id);
create index if not exists environments_created_by_idx on public.environments(created_by);
create index if not exists zones_environment_id_idx on public.zones(environment_id);
create index if not exists zones_created_by_idx on public.zones(created_by);

-- =====================================================
-- 9. SEED DATA (Optional - for testing)
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
insert into public.organization_members (organization_id, user_id, role, environments_count, zones_count) values
  ('550e8400-e29b-41d4-a716-446655440000', 'YOUR_USER_ID', 'SuperAdmin', 3, 5),
  ('550e8400-e29b-41d4-a716-446655440001', 'YOUR_USER_ID', 'Admin', 1, 2)
on conflict (organization_id, user_id) do nothing;

-- Insert test environments
insert into public.environments (id, organization_id, name, environment_type, description, created_by) values
  ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Production', 'production', 'Live production environment', 'YOUR_USER_ID'),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Staging', 'staging', 'Pre-production testing environment', 'YOUR_USER_ID'),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Development', 'development', 'Development environment', 'YOUR_USER_ID'),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Production', 'production', 'Personal projects production', 'YOUR_USER_ID')
on conflict (id) do nothing;

-- Insert test zones
insert into public.zones (id, environment_id, name, zone_type, description, created_by) values
  ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', 'acme.com', 'primary', 'Main company domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', 'api.acme.com', 'primary', 'API endpoint domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000', 'cdn.acme.com', 'primary', 'CDN domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'staging.acme.com', 'primary', 'Staging environment domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'dev.acme.com', 'primary', 'Development environment domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440003', 'myblog.com', 'primary', 'Personal blog domain', 'YOUR_USER_ID'),
  ('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003', 'portfolio.dev', 'primary', 'Portfolio website', 'YOUR_USER_ID')
on conflict (id) do nothing;
*/

-- =====================================================
-- 8. ENVIRONMENTS TABLE
-- Stores environment information (Production, Staging, Development)
-- =====================================================

create table if not exists public.environments (
  id uuid default gen_random_uuid() primary key,
  name text not null check (name in ('Production', 'Staging', 'Development')),
  description text,
  organization_id uuid references public.organizations on delete cascade not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(organization_id, name)
);

-- Enable Row Level Security
alter table public.environments enable row level security;

-- RLS Policy: Users can view environments in their organizations
create policy "Users can view environments in their organizations"
  on public.environments for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Admins can create environments
create policy "Admins can create environments"
  on public.environments for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin')
    )
  );

-- Apply updated_at trigger to environments table
drop trigger if exists environments_updated_at on public.environments;
create trigger environments_updated_at
  before update on public.environments
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 9. ZONES TABLE
-- Stores DNS zone information
-- =====================================================

create table if not exists public.zones (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  environment_id uuid references public.environments on delete cascade not null,
  organization_id uuid references public.organizations on delete cascade not null,
  data_configuration text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(environment_id, name)
);

-- Enable Row Level Security
alter table public.zones enable row level security;

-- RLS Policy: Users can view zones in their organizations
create policy "Users can view zones in their organizations"
  on public.zones for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = zones.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

-- RLS Policy: Editors and above can create zones
create policy "Editors can create zones"
  on public.zones for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = zones.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Apply updated_at trigger to zones table
drop trigger if exists zones_updated_at on public.zones;
create trigger zones_updated_at
  before update on public.zones
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

create index if not exists environments_organization_id_idx on public.environments(organization_id);
create index if not exists zones_environment_id_idx on public.zones(environment_id);
create index if not exists zones_organization_id_idx on public.zones(organization_id);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created
select 
  table_name,
  (select count(*) from information_schema.columns where columns.table_name = tables.table_name) as column_count
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'organizations', 'organization_members', 'environments', 'zones')
order by table_name;

