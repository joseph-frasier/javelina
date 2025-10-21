-- =====================================================
-- Javelina Billing Schema - Stripe Integration
-- Run this after schema.sql
-- =====================================================

-- =====================================================
-- 1. EXTEND ORGANIZATIONS TABLE
-- =====================================================

-- Add billing-related columns to organizations
alter table public.organizations
  add column if not exists stripe_customer_id text unique,
  add column if not exists subscription_status text default 'free' 
    check (subscription_status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  add column if not exists trial_ends_at timestamp with time zone,
  add column if not exists current_period_end timestamp with time zone;

-- Index for faster subscription lookups
create index if not exists organizations_stripe_customer_id_idx on public.organizations(stripe_customer_id);
create index if not exists organizations_subscription_status_idx on public.organizations(subscription_status);

-- =====================================================
-- 2. SUBSCRIPTION_PLANS TABLE
-- =====================================================

create table if not exists public.subscription_plans (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  stripe_price_id text,
  description text,
  price_monthly numeric(10,2),
  price_annual numeric(10,2),
  limits jsonb not null default '{
    "organizations": 1,
    "environments": 1,
    "zones": 1
  }'::jsonb,
  features jsonb default '[]'::jsonb,
  is_active boolean default true,
  display_order int default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.subscription_plans enable row level security;

-- RLS Policy: Anyone can view active plans
create policy "Anyone can view active subscription plans"
  on public.subscription_plans for select
  using (is_active = true);

-- Insert default plans
insert into public.subscription_plans (name, description, price_monthly, price_annual, limits, features, display_order)
values 
  (
    'Free',
    'Perfect for trying out Javelina',
    0,
    0,
    '{"organizations": 1, "environments": 1, "zones": 1}'::jsonb,
    '["1 Organization", "1 Environment", "1 DNS Zone", "Community Support"]'::jsonb,
    1
  ),
  (
    'Pro',
    'For teams managing multiple environments',
    29,
    290,
    '{"organizations": -1, "environments": -1, "zones": -1}'::jsonb,
    '["Unlimited Organizations", "Unlimited Environments", "Unlimited DNS Zones", "Priority Support", "Advanced Analytics", "Audit Logs", "Team Collaboration"]'::jsonb,
    2
  )
on conflict (name) do nothing;

-- =====================================================
-- 3. ORGANIZATION_SUBSCRIPTIONS TABLE
-- =====================================================

create table if not exists public.organization_subscriptions (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations on delete cascade not null unique,
  stripe_subscription_id text unique,
  stripe_customer_id text,
  plan_id uuid references public.subscription_plans on delete set null,
  status text not null default 'free' 
    check (status in ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid')),
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  canceled_at timestamp with time zone,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.organization_subscriptions enable row level security;

-- RLS Policy: Users can view subscriptions for their organizations
create policy "Users can view their organization subscriptions"
  on public.organization_subscriptions for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organization_subscriptions.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists organization_subscriptions_org_id_idx on public.organization_subscriptions(organization_id);
create index if not exists organization_subscriptions_stripe_sub_id_idx on public.organization_subscriptions(stripe_subscription_id);
create index if not exists organization_subscriptions_status_idx on public.organization_subscriptions(status);

-- =====================================================
-- 4. USAGE_TRACKING TABLE
-- =====================================================

create table if not exists public.usage_tracking (
  id uuid default gen_random_uuid() primary key,
  organization_id uuid references public.organizations on delete cascade not null,
  period_start timestamp with time zone not null,
  period_end timestamp with time zone not null,
  organizations_count int default 0,
  environments_count int default 0,
  zones_count int default 0,
  dns_records_count int default 0,
  api_calls_count int default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(organization_id, period_start)
);

-- Enable RLS
alter table public.usage_tracking enable row level security;

-- RLS Policy: Users can view usage for their organizations
create policy "Users can view their organization usage"
  on public.usage_tracking for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = usage_tracking.organization_id
      and organization_members.user_id = auth.uid()
    )
  );

-- Indexes
create index if not exists usage_tracking_org_id_idx on public.usage_tracking(organization_id);
create index if not exists usage_tracking_period_idx on public.usage_tracking(period_start, period_end);

-- =====================================================
-- 5. UPDATE TIMESTAMP TRIGGERS
-- =====================================================

-- Apply to subscription_plans table
drop trigger if exists subscription_plans_updated_at on public.subscription_plans;
create trigger subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute procedure public.handle_updated_at();

-- Apply to organization_subscriptions table
drop trigger if exists organization_subscriptions_updated_at on public.organization_subscriptions;
create trigger organization_subscriptions_updated_at
  before update on public.organization_subscriptions
  for each row execute procedure public.handle_updated_at();

-- Apply to usage_tracking table
drop trigger if exists usage_tracking_updated_at on public.usage_tracking;
create trigger usage_tracking_updated_at
  before update on public.usage_tracking
  for each row execute procedure public.handle_updated_at();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to get current organization limits based on subscription
create or replace function public.get_organization_limits(org_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  limits jsonb;
begin
  select sp.limits into limits
  from public.organization_subscriptions os
  join public.subscription_plans sp on sp.id = os.plan_id
  where os.organization_id = org_id;
  
  -- If no subscription found, return free tier limits
  if limits is null then
    select sp.limits into limits
    from public.subscription_plans sp
    where sp.name = 'Free';
  end if;
  
  return limits;
end;
$$;

-- Function to check if organization can create resource
create or replace function public.can_create_resource(
  org_id uuid,
  resource_type text
)
returns boolean
language plpgsql
security definer
as $$
declare
  limits jsonb;
  current_count int;
  limit_value int;
begin
  -- Get limits
  limits := public.get_organization_limits(org_id);
  
  -- Extract limit for this resource type
  limit_value := (limits->>resource_type)::int;
  
  -- -1 means unlimited
  if limit_value = -1 then
    return true;
  end if;
  
  -- Count current usage
  case resource_type
    when 'organizations' then
      select count(*) into current_count
      from public.organization_members
      where user_id = auth.uid();
    when 'environments' then
      select count(*) into current_count
      from public.environments
      where organization_id = org_id;
    when 'zones' then
      select count(*) into current_count
      from public.zones z
      join public.environments e on e.id = z.environment_id
      where e.organization_id = org_id;
    else
      return false;
  end case;
  
  return current_count < limit_value;
end;
$$;

-- =====================================================
-- BILLING SCHEMA COMPLETE
-- =====================================================

-- Verify tables were created
select 
  table_name,
  (select count(*) from information_schema.columns where columns.table_name = tables.table_name) as column_count
from information_schema.tables
where table_schema = 'public'
  and table_name in ('subscription_plans', 'organization_subscriptions', 'usage_tracking')
order by table_name;

