-- =====================================================
-- Admin Users Schema
-- =====================================================

-- Admin users table (separate from regular auth.users)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Soft delete support for organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_orgs_deleted_at ON public.organizations(deleted_at);

