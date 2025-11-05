-- =====================================================
-- Javelina DNS Management - Consolidated Database Schema
-- Extracted from production database on 2025-11-03
-- =====================================================
-- This file represents the complete current state of the database
-- Use this as the single source of truth for future branches
-- =====================================================

-- ===================================================== 
-- 1. ENABLE EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 2. TABLES
-- =====================================================

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  display_name TEXT,
  title TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'America/New_York'::text,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user'::text CHECK (role = ANY (ARRAY['user'::text, 'superuser'::text])),
  mfa_enabled BOOLEAN DEFAULT false,
  sso_connected BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  preferences JSONB DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb,
  language TEXT DEFAULT 'en'::text,
  status TEXT DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'disabled'::text])),
  PRIMARY KEY (id)
);

-- ORGANIZATIONS TABLE
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  slug TEXT UNIQUE,
  logo_url TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  owner_id UUID REFERENCES auth.users ON DELETE SET NULL,
  status TEXT DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'deleted'::text, 'archived'::text])),
  deleted_at TIMESTAMPTZ,
  stripe_customer_id TEXT UNIQUE,
  environments_count INTEGER DEFAULT 0,
  PRIMARY KEY (id)
);

-- ORGANIZATION_MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text, 'Viewer'::text])),
  created_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'invited'::text, 'suspended'::text])),
  PRIMARY KEY (organization_id, user_id)
);

-- ENVIRONMENTS TABLE
CREATE TABLE IF NOT EXISTS public.environments (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  name TEXT NOT NULL,
  environment_type TEXT NOT NULL CHECK (environment_type = ANY (ARRAY['production'::text, 'staging'::text, 'development'::text])),
  location TEXT,
  status TEXT DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'disabled'::text, 'archived'::text])),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  configuration JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  parent_environment_id UUID REFERENCES public.environments ON DELETE SET NULL,
  last_deployed_at TIMESTAMPTZ,
  health_status TEXT DEFAULT 'unknown'::text CHECK (health_status = ANY (ARRAY['healthy'::text, 'degraded'::text, 'down'::text, 'unknown'::text])),
  zones_count INTEGER DEFAULT 0,
  PRIMARY KEY (id)
);

-- ZONES TABLE
CREATE TABLE IF NOT EXISTS public.zones (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  environment_id UUID NOT NULL REFERENCES public.environments ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL CHECK (zone_type = ANY (ARRAY['primary'::text, 'secondary'::text, 'redirect'::text])),
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ttl INTEGER DEFAULT 3600,
  nameservers TEXT[] DEFAULT ARRAY[]::text[],
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT DEFAULT 'pending'::text CHECK (verification_status = ANY (ARRAY['verified'::text, 'pending'::text, 'failed'::text])),
  records_count INTEGER DEFAULT 0,
  soa_serial INTEGER DEFAULT 1 NOT NULL,
  PRIMARY KEY (id)
);

-- ZONE_RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.zone_records (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  zone_id UUID NOT NULL REFERENCES public.zones ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type = ANY (ARRAY['A'::text, 'AAAA'::text, 'CNAME'::text, 'MX'::text, 'NS'::text, 'TXT'::text, 'SOA'::text, 'SRV'::text, 'CAA'::text])),
  value TEXT NOT NULL,
  ttl INTEGER DEFAULT 3600 NOT NULL,
  priority INTEGER,
  active BOOLEAN DEFAULT true NOT NULL,
  comment TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id),
  UNIQUE (zone_id, name, type, value)
);

-- AUDIT_LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  actor_type TEXT DEFAULT 'user'::text CHECK (actor_type = ANY (ARRAY['user'::text, 'admin'::text, 'system'::text])),
  admin_user_id UUID,
  PRIMARY KEY (id)
);

-- ADMIN_USERS TABLE
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  mfa_enabled BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- Add foreign key from audit_logs to admin_users
ALTER TABLE public.audit_logs
  ADD CONSTRAINT audit_logs_admin_user_id_fkey 
  FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(id) ON DELETE SET NULL;

-- PLANS TABLE
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stripe_product_id TEXT,
  billing_interval TEXT CHECK (billing_interval = ANY (ARRAY['month'::text, 'year'::text])),
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.entitlements (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  value_type TEXT NOT NULL CHECK (value_type = ANY (ARRAY['boolean'::text, 'numeric'::text, 'text'::text])),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- PLAN_ENTITLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.plan_entitlements (
  plan_id UUID NOT NULL REFERENCES public.plans ON DELETE CASCADE,
  entitlement_id UUID NOT NULL REFERENCES public.entitlements ON DELETE CASCADE,
  value TEXT NOT NULL,
  PRIMARY KEY (plan_id, entitlement_id)
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  org_id UUID NOT NULL UNIQUE REFERENCES public.organizations ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  plan_id UUID REFERENCES public.plans ON DELETE SET NULL,
  status TEXT DEFAULT 'incomplete'::text NOT NULL CHECK (
    status = ANY (ARRAY['trialing'::text, 'active'::text, 'past_due'::text, 'unpaid'::text, 'canceled'::text, 'incomplete'::text, 'incomplete_expired'::text, 'paused'::text])
  ),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- SUBSCRIPTION_ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.subscription_items (
  id UUID DEFAULT gen_random_uuid() NOT NULL,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions ON DELETE CASCADE,
  stripe_price_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (id)
);

-- ORG_ENTITLEMENT_OVERRIDES TABLE
CREATE TABLE IF NOT EXISTS public.org_entitlement_overrides (
  org_id UUID NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  entitlement_id UUID NOT NULL REFERENCES public.entitlements ON DELETE CASCADE,
  value TEXT NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (org_id, entitlement_id)
);

-- =====================================================
-- 3. INDEXES
-- =====================================================

-- Profiles
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_onboarding_completed_idx ON public.profiles(onboarding_completed);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles(status);

-- Organizations
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON public.organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS organizations_deleted_at_idx ON public.organizations(deleted_at);
CREATE INDEX IF NOT EXISTS organizations_is_active_idx ON public.organizations(is_active);
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS organizations_status_idx ON public.organizations(status);

-- Organization Members
CREATE INDEX IF NOT EXISTS organization_members_last_accessed_idx ON public.organization_members(last_accessed_at);
CREATE INDEX IF NOT EXISTS organization_members_organization_id_idx ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS organization_members_status_org_idx ON public.organization_members(status, organization_id);
CREATE INDEX IF NOT EXISTS organization_members_user_id_idx ON public.organization_members(user_id);

-- Environments
CREATE INDEX IF NOT EXISTS environments_created_by_idx ON public.environments(created_by);
CREATE INDEX IF NOT EXISTS environments_health_status_idx ON public.environments(health_status);
CREATE INDEX IF NOT EXISTS environments_organization_id_idx ON public.environments(organization_id);
CREATE INDEX IF NOT EXISTS environments_parent_id_idx ON public.environments(parent_environment_id);

-- Zones
CREATE INDEX IF NOT EXISTS zones_created_by_idx ON public.zones(created_by);
CREATE INDEX IF NOT EXISTS zones_environment_id_idx ON public.zones(environment_id);
CREATE INDEX IF NOT EXISTS zones_last_verified_idx ON public.zones(last_verified_at);
CREATE INDEX IF NOT EXISTS zones_soa_serial_idx ON public.zones(soa_serial);
CREATE INDEX IF NOT EXISTS zones_verification_status_env_idx ON public.zones(verification_status, environment_id);

-- Zone Records
CREATE INDEX IF NOT EXISTS zone_records_active_idx ON public.zone_records(active);
CREATE INDEX IF NOT EXISTS zone_records_created_by_idx ON public.zone_records(created_by);
CREATE INDEX IF NOT EXISTS zone_records_zone_id_idx ON public.zone_records(zone_id);
CREATE INDEX IF NOT EXISTS zone_records_zone_name_idx ON public.zone_records(zone_id, name);
CREATE INDEX IF NOT EXISTS zone_records_zone_type_idx ON public.zone_records(zone_id, type);

-- Audit Logs
CREATE INDEX IF NOT EXISTS audit_logs_actor_type_idx ON public.audit_logs(actor_type);
CREATE INDEX IF NOT EXISTS audit_logs_admin_created_idx ON public.audit_logs(actor_type, created_at DESC) WHERE (actor_type = 'admin'::text);
CREATE INDEX IF NOT EXISTS audit_logs_admin_user_idx ON public.audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS audit_logs_ip_address_idx ON public.audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS audit_logs_record_id_idx ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS audit_logs_table_action_idx ON public.audit_logs(table_name, action);
CREATE INDEX IF NOT EXISTS audit_logs_table_name_idx ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);

-- Admin Users
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users(email);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON public.subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

-- Subscription Items
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription_id ON public.subscription_items(subscription_id);

-- Org Entitlement Overrides
CREATE INDEX IF NOT EXISTS idx_org_overrides_org_id ON public.org_entitlement_overrides(org_id);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zone_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_entitlement_overrides ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5. RLS POLICIES
-- =====================================================

-- Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Organizations Policies
DROP POLICY IF EXISTS "users_can_select_their_organizations" ON public.organizations;
CREATE POLICY "users_can_select_their_organizations" ON public.organizations
  FOR SELECT USING (
    (owner_id = auth.uid()) OR 
    (EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;
CREATE POLICY "organizations_insert_policy" ON public.organizations
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "SuperAdmin and Admin can update their organizations" ON public.organizations;
CREATE POLICY "SuperAdmin and Admin can update their organizations" ON public.organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin and Admin can delete their organizations" ON public.organizations;
CREATE POLICY "SuperAdmin and Admin can delete their organizations" ON public.organizations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

-- Organization Members Policies
DROP POLICY IF EXISTS "Users can view their memberships" ON public.organization_members;
CREATE POLICY "Users can view their memberships" ON public.organization_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "allow_select_own_memberships" ON public.organization_members;
CREATE POLICY "allow_select_own_memberships" ON public.organization_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "organization_members_insert_policy" ON public.organization_members;
CREATE POLICY "organization_members_insert_policy" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (true);

-- Environments Policies
DROP POLICY IF EXISTS "Users can view environments in their organizations" ON public.environments;
CREATE POLICY "Users can view environments in their organizations" ON public.environments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = environments.organization_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can create environments" ON public.environments;
CREATE POLICY "SuperAdmin, Admin, and Editor can create environments" ON public.environments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = environments.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can update environments" ON public.environments;
CREATE POLICY "SuperAdmin, Admin, and Editor can update environments" ON public.environments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = environments.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin and Admin can delete environments" ON public.environments;
CREATE POLICY "SuperAdmin and Admin can delete environments" ON public.environments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = environments.organization_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

-- Zones Policies
DROP POLICY IF EXISTS "Users can view zones in their organizations" ON public.zones;
CREATE POLICY "Users can view zones in their organizations" ON public.zones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.environments e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = zones.environment_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "SuperAdmin and Admin can create zones" ON public.zones;
CREATE POLICY "SuperAdmin and Admin can create zones" ON public.zones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.environments e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = zones.environment_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can update zones" ON public.zones;
CREATE POLICY "SuperAdmin, Admin, and Editor can update zones" ON public.zones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.environments e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = zones.environment_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin and Admin can delete zones" ON public.zones;
CREATE POLICY "SuperAdmin and Admin can delete zones" ON public.zones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.environments e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = zones.environment_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

-- Zone Records Policies
DROP POLICY IF EXISTS "Users can view zone records in their organizations" ON public.zone_records;
CREATE POLICY "Users can view zone records in their organizations" ON public.zone_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE z.id = zone_records.zone_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can create zone records" ON public.zone_records;
CREATE POLICY "SuperAdmin, Admin, and Editor can create zone records" ON public.zone_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE z.id = zone_records.zone_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can update zone records" ON public.zone_records;
CREATE POLICY "SuperAdmin, Admin, and Editor can update zone records" ON public.zone_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE z.id = zone_records.zone_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

DROP POLICY IF EXISTS "SuperAdmin, Admin, and Editor can delete zone records" ON public.zone_records;
CREATE POLICY "SuperAdmin, Admin, and Editor can delete zone records" ON public.zone_records
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE z.id = zone_records.zone_id
        AND om.user_id = auth.uid()
        AND om.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text, 'Editor'::text])
    )
  );

-- Audit Logs Policies
DROP POLICY IF EXISTS "Users can view audit logs for their organizations" ON public.audit_logs;
CREATE POLICY "Users can view audit logs for their organizations" ON public.audit_logs
  FOR SELECT USING (
    (table_name = 'organizations' AND EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = audit_logs.record_id
        AND organization_members.user_id = auth.uid()
    ))
    OR
    (table_name = 'environments' AND EXISTS (
      SELECT 1 FROM public.environments e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = audit_logs.record_id
        AND om.user_id = auth.uid()
    ))
    OR
    (table_name = 'zones' AND EXISTS (
      SELECT 1 FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE z.id = audit_logs.record_id
        AND om.user_id = auth.uid()
    ))
    OR
    (table_name = 'zone_records' AND EXISTS (
      SELECT 1 FROM public.zone_records zr
      JOIN public.zones z ON z.id = zr.zone_id
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE zr.id = audit_logs.record_id
        AND om.user_id = auth.uid()
    ))
    OR
    (table_name = 'dns_records' AND EXISTS (
      SELECT 1 FROM public.zone_records zr
      JOIN public.zones z ON z.id = zr.zone_id
      JOIN public.environments e ON e.id = z.environment_id
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE zr.id = audit_logs.record_id
        AND om.user_id = auth.uid()
    ))
  );

-- Plans Policies
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
CREATE POLICY "Anyone can view active plans" ON public.plans
  FOR SELECT USING (is_active = true);

-- Entitlements Policies
DROP POLICY IF EXISTS "Anyone can view entitlements" ON public.entitlements;
CREATE POLICY "Anyone can view entitlements" ON public.entitlements
  FOR SELECT USING (true);

-- Plan Entitlements Policies
DROP POLICY IF EXISTS "Anyone can view plan entitlements" ON public.plan_entitlements;
CREATE POLICY "Anyone can view plan entitlements" ON public.plan_entitlements
  FOR SELECT USING (true);

-- Subscriptions Policies
DROP POLICY IF EXISTS "Users can view their org subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view their org subscriptions" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create subscriptions for their orgs" ON public.subscriptions;
CREATE POLICY "Users can create subscriptions for their orgs" ON public.subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their org subscriptions" ON public.subscriptions;
CREATE POLICY "Users can update their org subscriptions" ON public.subscriptions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = ANY (ARRAY['SuperAdmin'::text, 'Admin'::text])
    )
  );

DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;
CREATE POLICY "Service role can manage subscriptions" ON public.subscriptions
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Subscription Items Policies
DROP POLICY IF EXISTS "Users can view their subscription items" ON public.subscription_items;
CREATE POLICY "Users can view their subscription items" ON public.subscription_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.subscriptions s
      JOIN public.organization_members om ON om.organization_id = s.org_id
      WHERE s.id = subscription_items.subscription_id
        AND om.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role can manage subscription items" ON public.subscription_items;
CREATE POLICY "Service role can manage subscription items" ON public.subscription_items
  FOR ALL USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Org Entitlement Overrides Policies
DROP POLICY IF EXISTS "Users can view their org overrides" ON public.org_entitlement_overrides;
CREATE POLICY "Users can view their org overrides" ON public.org_entitlement_overrides
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
        AND organization_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage org overrides" ON public.org_entitlement_overrides;
CREATE POLICY "Admins can manage org overrides" ON public.org_entitlement_overrides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = org_entitlement_overrides.org_id
        AND organization_members.user_id = auth.uid()
        AND organization_members.role = 'Admin'::text
    )
  );

-- =====================================================
-- 6. FUNCTIONS
-- =====================================================

-- Function: Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, last_login)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    now()
  );
  RETURN new;
END;
$$;

-- Function: Handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

-- Function: Handle audit logging
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, user_id)
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    auth.uid()
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: Update environment health status
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
  SELECT 
    COUNT(*) FILTER (WHERE verification_status = 'verified'),
    COUNT(*) FILTER (WHERE verification_status = 'failed'),
    COUNT(*) FILTER (WHERE verification_status = 'pending'),
    COUNT(*)
  INTO verified_count, failed_count, pending_count, total_count
  FROM public.zones
  WHERE environment_id = COALESCE(NEW.environment_id, OLD.environment_id)
    AND active = true;

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

  UPDATE public.environments
  SET health_status = env_health,
      updated_at = now()
  WHERE id = COALESCE(NEW.environment_id, OLD.environment_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: Update member last accessed timestamp
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

-- Function: Update zone records count
CREATE OR REPLACE FUNCTION public.update_zone_records_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  zone_uuid UUID;
BEGIN
  zone_uuid := COALESCE(NEW.zone_id, OLD.zone_id);
  
  UPDATE public.zones
  SET records_count = (
    SELECT COUNT(*)
    FROM public.zone_records
    WHERE zone_id = zone_uuid
  ),
  updated_at = now()
  WHERE id = zone_uuid;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: Increment zone SOA serial
CREATE OR REPLACE FUNCTION public.increment_zone_soa_serial()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  zone_uuid UUID;
BEGIN
  zone_uuid := COALESCE(NEW.zone_id, OLD.zone_id);
  
  UPDATE public.zones
  SET soa_serial = soa_serial + 1,
      updated_at = now()
  WHERE id = zone_uuid;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function: Soft delete organization
CREATE OR REPLACE FUNCTION public.soft_delete_organization(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET 
    status = 'deleted',
    deleted_at = now(),
    updated_at = now()
  WHERE id = org_id;
END;
$$;

-- Function: Restore organization
CREATE OR REPLACE FUNCTION public.restore_organization(org_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.organizations
  SET 
    status = 'active',
    deleted_at = NULL,
    updated_at = now()
  WHERE id = org_id;
END;
$$;

-- Function: Get org subscription
CREATE OR REPLACE FUNCTION public.get_org_subscription(org_uuid UUID)
RETURNS TABLE(
  subscription_id UUID,
  stripe_subscription_id TEXT,
  plan_code TEXT,
  plan_name TEXT,
  status TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.stripe_subscription_id,
    p.code,
    p.name,
    s.status,
    s.current_period_start,
    s.current_period_end,
    s.trial_end,
    s.cancel_at_period_end
  FROM public.subscriptions s
  LEFT JOIN public.plans p ON p.id = s.plan_id
  WHERE s.org_id = org_uuid;
END;
$$;

-- Function: Get org entitlements
CREATE OR REPLACE FUNCTION public.get_org_entitlements(org_uuid UUID)
RETURNS TABLE(
  entitlement_key TEXT,
  entitlement_description TEXT,
  value TEXT,
  value_type TEXT,
  is_override BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.key,
    e.description,
    o.value,
    e.value_type,
    true AS is_override
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid
  
  UNION ALL
  
  SELECT 
    e.key,
    e.description,
    pe.value,
    e.value_type,
    false AS is_override
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.org_entitlement_overrides o
    WHERE o.org_id = org_uuid AND o.entitlement_id = e.id
  );
END;
$$;

-- Function: Check entitlement
CREATE OR REPLACE FUNCTION public.check_entitlement(
  org_uuid UUID,
  entitlement_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  entitlement_value TEXT;
BEGIN
  SELECT o.value INTO entitlement_value
  FROM public.org_entitlement_overrides o
  JOIN public.entitlements e ON e.id = o.entitlement_id
  WHERE o.org_id = org_uuid AND e.key = entitlement_key;
  
  IF entitlement_value IS NOT NULL THEN
    RETURN entitlement_value;
  END IF;
  
  SELECT pe.value INTO entitlement_value
  FROM public.subscriptions s
  JOIN public.plan_entitlements pe ON pe.plan_id = s.plan_id
  JOIN public.entitlements e ON e.id = pe.entitlement_id
  WHERE s.org_id = org_uuid AND e.key = entitlement_key;
  
  RETURN entitlement_value;
END;
$$;

-- Function: Can create resource
CREATE OR REPLACE FUNCTION public.can_create_resource(
  org_uuid UUID,
  resource_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  limit_value TEXT;
  current_count INTEGER;
  limit_int INTEGER;
BEGIN
  CASE resource_type
    WHEN 'environment' THEN
      limit_value := public.check_entitlement(org_uuid, 'environments_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.environments
      WHERE organization_id = org_uuid;
    
    WHEN 'zone' THEN
      limit_value := public.check_entitlement(org_uuid, 'zones_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.zones z
      JOIN public.environments e ON e.id = z.environment_id
      WHERE e.organization_id = org_uuid;
    
    WHEN 'member' THEN
      limit_value := public.check_entitlement(org_uuid, 'team_members_limit');
      SELECT COUNT(*) INTO current_count
      FROM public.organization_members
      WHERE organization_id = org_uuid;
    
    ELSE
      RETURN false;
  END CASE;
  
  IF limit_value IS NULL THEN
    RETURN false;
  END IF;
  
  limit_int := limit_value::INTEGER;
  IF limit_int = -1 THEN
    RETURN true;
  END IF;
  
  RETURN current_count < limit_int;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

-- Trigger: User creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers: Updated at timestamps
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS admin_users_updated_at ON public.admin_users;
CREATE TRIGGER admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS environments_updated_at ON public.environments;
CREATE TRIGGER environments_updated_at
  BEFORE UPDATE ON public.environments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS zones_updated_at ON public.zones;
CREATE TRIGGER zones_updated_at
  BEFORE UPDATE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS zone_records_updated_at ON public.zone_records;
CREATE TRIGGER zone_records_updated_at
  BEFORE UPDATE ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS subscription_items_updated_at ON public.subscription_items;
CREATE TRIGGER subscription_items_updated_at
  BEFORE UPDATE ON public.subscription_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS org_overrides_updated_at ON public.org_entitlement_overrides;
CREATE TRIGGER org_overrides_updated_at
  BEFORE UPDATE ON public.org_entitlement_overrides
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Triggers: Audit logs
DROP TRIGGER IF EXISTS environments_audit ON public.environments;
CREATE TRIGGER environments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.environments
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS zones_audit ON public.zones;
CREATE TRIGGER zones_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

DROP TRIGGER IF EXISTS zone_records_audit ON public.zone_records;
CREATE TRIGGER zone_records_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- Triggers: Zone health status
DROP TRIGGER IF EXISTS zones_verification_health_update ON public.zones;
CREATE TRIGGER zones_verification_health_update
  AFTER INSERT OR UPDATE OF verification_status, active OR DELETE ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_environment_health_status();

-- Triggers: Zone records count
DROP TRIGGER IF EXISTS zones_records_count_init ON public.zones;
CREATE TRIGGER zones_records_count_init
  BEFORE INSERT ON public.zones
  FOR EACH ROW EXECUTE FUNCTION public.update_zone_records_count();

DROP TRIGGER IF EXISTS zone_records_update_count_insert ON public.zone_records;
CREATE TRIGGER zone_records_update_count_insert
  AFTER INSERT ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.update_zone_records_count();

DROP TRIGGER IF EXISTS zone_records_update_count_delete ON public.zone_records;
CREATE TRIGGER zone_records_update_count_delete
  AFTER DELETE ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.update_zone_records_count();

-- Triggers: SOA serial increment
DROP TRIGGER IF EXISTS zone_records_increment_soa_insert ON public.zone_records;
CREATE TRIGGER zone_records_increment_soa_insert
  AFTER INSERT ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.increment_zone_soa_serial();

DROP TRIGGER IF EXISTS zone_records_increment_soa_update ON public.zone_records;
CREATE TRIGGER zone_records_increment_soa_update
  AFTER UPDATE ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.increment_zone_soa_serial();

DROP TRIGGER IF EXISTS zone_records_increment_soa_delete ON public.zone_records;
CREATE TRIGGER zone_records_increment_soa_delete
  AFTER DELETE ON public.zone_records
  FOR EACH ROW EXECUTE FUNCTION public.increment_zone_soa_serial();

-- =====================================================
-- 8. COMMENTS
-- =====================================================

COMMENT ON TABLE public.plans IS 'Subscription plans that map to Stripe Products';
COMMENT ON COLUMN public.plans.code IS 'Unique plan identifier (e.g., free, pro, enterprise)';
COMMENT ON COLUMN public.plans.stripe_product_id IS 'Stripe Product ID for this plan';
COMMENT ON COLUMN public.plans.billing_interval IS 'Billing cycle: month or year';

COMMENT ON TABLE public.entitlements IS 'Available capabilities and limits that can be assigned to plans';
COMMENT ON COLUMN public.entitlements.key IS 'Unique entitlement key (e.g., environments_limit, api_access)';
COMMENT ON COLUMN public.entitlements.value_type IS 'Data type for this entitlement: boolean, numeric, or text';

COMMENT ON TABLE public.plan_entitlements IS 'Maps entitlements to plans with their values';
COMMENT ON COLUMN public.plan_entitlements.value IS 'Value for this entitlement (numeric limit, boolean, or text)';

COMMENT ON TABLE public.subscriptions IS 'Stripe subscriptions linked to organizations';
COMMENT ON COLUMN public.subscriptions.org_id IS 'One subscription per organization';
COMMENT ON COLUMN public.subscriptions.stripe_subscription_id IS 'Stripe Subscription ID';
COMMENT ON COLUMN public.subscriptions.status IS 'Mirrors Stripe subscription status';
COMMENT ON COLUMN public.subscriptions.created_by IS 'User who initiated the subscription';

COMMENT ON TABLE public.subscription_items IS 'Line items for subscriptions (seats, add-ons)';
COMMENT ON COLUMN public.subscription_items.stripe_price_id IS 'Stripe Price ID for this item';
COMMENT ON COLUMN public.subscription_items.quantity IS 'Quantity of this item (e.g., number of seats)';

COMMENT ON TABLE public.org_entitlement_overrides IS 'Custom entitlement values for specific organizations';
COMMENT ON COLUMN public.org_entitlement_overrides.reason IS 'Why this override was created (e.g., custom deal)';

COMMENT ON COLUMN public.organizations.stripe_customer_id IS 'Stripe Customer ID for billing';
COMMENT ON COLUMN public.organizations.environments_count IS 'Cached count of environments (for quick limit checks)';

COMMENT ON COLUMN public.environments.zones_count IS 'Cached count of zones in this environment (for quick limit checks)';

-- =====================================================
-- SCHEMA COMPLETE
-- =====================================================

