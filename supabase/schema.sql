-- =====================================================
-- Javelina DNS Management - Database Schema (Fixed)
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. PROFILES TABLE
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

-- Drop existing policies if they exist, then recreate
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

-- RLS Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- =====================================================
-- 2. ORGANIZATIONS TABLE
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
-- 6. AUDIT_LOGS TABLE
-- =====================================================

create table if not exists public.audit_logs (
  id uuid default gen_random_uuid() primary key,
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  user_id uuid references auth.users on delete set null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Indexes for performance
create index if not exists audit_logs_table_name_idx on public.audit_logs(table_name);
create index if not exists audit_logs_record_id_idx on public.audit_logs(record_id);
create index if not exists audit_logs_user_id_idx on public.audit_logs(user_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at);

-- =====================================================
-- RLS POLICIES (Drop existing first, then recreate)
-- =====================================================

-- Drop all existing policies
drop policy if exists "Users can view their organizations" on public.organizations;
drop policy if exists "Users can view their memberships" on public.organization_members;
drop policy if exists "Users can view environments in their organizations" on public.environments;
drop policy if exists "Users can view zones in their organizations" on public.zones;
drop policy if exists "Authenticated users can create organizations" on public.organizations;
drop policy if exists "SuperAdmin and Admin can update their organizations" on public.organizations;
drop policy if exists "SuperAdmin can delete their organizations" on public.organizations;
drop policy if exists "SuperAdmin and Admin can create environments" on public.environments;
drop policy if exists "SuperAdmin, Admin, and Editor can update environments" on public.environments;
drop policy if exists "SuperAdmin and Admin can delete environments" on public.environments;
drop policy if exists "SuperAdmin and Admin can create zones" on public.zones;
drop policy if exists "SuperAdmin, Admin, and Editor can update zones" on public.zones;
drop policy if exists "SuperAdmin and Admin can delete zones" on public.zones;
drop policy if exists "Users can view audit logs for their organizations" on public.audit_logs;

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
-- WRITE OPERATIONS RLS POLICIES
-- =====================================================

-- Organizations: INSERT
create policy "Authenticated users can create organizations"
  on public.organizations for insert
  to authenticated
  with check (true);

-- Organizations: UPDATE
create policy "SuperAdmin and Admin can update their organizations"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin')
    )
  );

-- Organizations: DELETE
create policy "SuperAdmin can delete their organizations"
  on public.organizations for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organizations.id
      and organization_members.user_id = auth.uid()
      and organization_members.role = 'SuperAdmin'
    )
  );

-- Environments: INSERT
create policy "SuperAdmin and Admin can create environments"
  on public.environments for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin')
    )
  );

-- Environments: UPDATE
create policy "SuperAdmin, Admin, and Editor can update environments"
  on public.environments for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Environments: DELETE
create policy "SuperAdmin and Admin can delete environments"
  on public.environments for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = environments.organization_id
      and organization_members.user_id = auth.uid()
      and organization_members.role in ('SuperAdmin', 'Admin')
    )
  );

-- Zones: INSERT
create policy "SuperAdmin and Admin can create zones"
  on public.zones for insert
  with check (
    exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = zones.environment_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin')
    )
  );

-- Zones: UPDATE
create policy "SuperAdmin, Admin, and Editor can update zones"
  on public.zones for update
  using (
    exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = zones.environment_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Zones: DELETE
create policy "SuperAdmin and Admin can delete zones"
  on public.zones for delete
  using (
    exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = zones.environment_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin')
    )
  );

-- Audit Logs: SELECT (read-only for organization members)
create policy "Users can view audit logs for their organizations"
  on public.audit_logs for select
  using (
    -- For organizations table
    (table_name = 'organizations' and exists (
      select 1 from public.organization_members
      where organization_members.organization_id = record_id::uuid
      and organization_members.user_id = auth.uid()
    ))
    or
    -- For environments table
    (table_name = 'environments' and exists (
      select 1 from public.environments e
      join public.organization_members om on om.organization_id = e.organization_id
      where e.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
    or
    -- For zones table
    (table_name = 'zones' and exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
  );

-- =====================================================
-- 7. AUTOMATIC PROFILE CREATION TRIGGER
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
-- 8. UPDATE TIMESTAMP FUNCTION
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
-- 9. AUDIT LOG FUNCTION
-- =====================================================

create or replace function public.handle_audit_log()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  values (
    TG_TABLE_NAME,
    coalesce(NEW.id, OLD.id),
    TG_OP,
    case when TG_OP = 'DELETE' then to_jsonb(OLD) else null end,
    case when TG_OP in ('INSERT', 'UPDATE') then to_jsonb(NEW) else null end,
    auth.uid()
  );
  return coalesce(NEW, OLD);
end;
$$;

-- Apply audit triggers to organizations
drop trigger if exists organizations_audit on public.organizations;
create trigger organizations_audit after insert or update or delete on public.organizations
  for each row execute function public.handle_audit_log();

-- Apply audit triggers to environments
drop trigger if exists environments_audit on public.environments;
create trigger environments_audit after insert or update or delete on public.environments
  for each row execute function public.handle_audit_log();

-- Apply audit triggers to zones
drop trigger if exists zones_audit on public.zones;
create trigger zones_audit after insert or update or delete on public.zones
  for each row execute function public.handle_audit_log();

-- =====================================================
-- 10. INDEXES FOR PERFORMANCE
-- =====================================================

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists organization_members_user_id_idx on public.organization_members(user_id);
create index if not exists organization_members_organization_id_idx on public.organization_members(organization_id);
create index if not exists environments_organization_id_idx on public.environments(organization_id);
create index if not exists environments_created_by_idx on public.environments(created_by);
create index if not exists zones_environment_id_idx on public.zones(environment_id);
create index if not exists zones_created_by_idx on public.zones(created_by);

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Verify tables were created
select 
  table_name,
  (select count(*) from information_schema.columns where columns.table_name = tables.table_name) as column_count
from information_schema.tables
where table_schema = 'public'
  and table_name in ('profiles', 'organizations', 'organization_members', 'environments', 'zones', 'audit_logs')
order by table_name;
