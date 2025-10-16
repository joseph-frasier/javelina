-- =====================================================
-- Admin Users & Sessions Schema
-- =====================================================

-- Admin users table (separate from regular auth.users)
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text not null,
  last_login timestamptz,
  mfa_enabled boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.admin_users enable row level security;

-- Admin sessions (separate from regular user sessions)
create table if not exists public.admin_sessions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  token text unique not null,
  expires_at timestamptz not null,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.admin_sessions enable row level security;

-- Admin audit logs (immutable, insert-only)
create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.admin_users(id),
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.admin_audit_logs enable row level security;

-- Soft delete support for organizations
alter table public.organizations add column if not exists deleted_at timestamptz;

-- Indexes for performance
create index if not exists idx_admin_sessions_token on public.admin_sessions(token);
create index if not exists idx_admin_sessions_expires on public.admin_sessions(expires_at);
create index if not exists idx_admin_audit_actor on public.admin_audit_logs(actor_user_id);
create index if not exists idx_admin_audit_created on public.admin_audit_logs(created_at desc);
create index if not exists idx_orgs_deleted_at on public.organizations(deleted_at);
