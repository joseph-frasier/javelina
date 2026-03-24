-- Domain registrations table for OpenSRS integration
-- Domains are user-scoped (not org-scoped) since Javelina acts as a reseller

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain_name text not null,
  tld text not null,
  status text not null default 'pending'
    check (status in (
      'pending',           -- awaiting payment
      'processing',        -- payment received, OpenSRS order in progress
      'active',            -- registered and active
      'expired',           -- registration expired
      'transferring',      -- transfer in progress
      'transfer_complete', -- transfer completed
      'failed',            -- registration/transfer failed
      'cancelled'          -- order cancelled/refunded
    )),
  registration_type text not null default 'new'
    check (registration_type in ('new', 'transfer')),

  -- OpenSRS order tracking
  opensrs_order_id text,
  opensrs_transfer_id text,

  -- Registration details
  registered_at timestamptz,
  expires_at timestamptz,
  years integer not null default 1,
  auto_renew boolean not null default false,

  -- Payment tracking
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid integer, -- in cents
  currency text not null default 'usd',

  -- Registrant contact (ICANN-required)
  contact_info jsonb,

  -- Nameservers set at registration
  nameservers jsonb,

  -- OpenSRS response metadata
  metadata jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_domains_user_id on public.domains(user_id);
create index idx_domains_domain_name on public.domains(domain_name);
create index idx_domains_status on public.domains(status);
create index idx_domains_stripe_session on public.domains(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Updated_at trigger
create or replace function public.update_domains_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger domains_updated_at
  before update on public.domains
  for each row
  execute function public.update_domains_updated_at();

-- RLS
alter table public.domains enable row level security;

-- Users can view their own domains
create policy "Users can view own domains"
  on public.domains for select
  using (auth.uid() = user_id);

-- Users can insert their own domains
create policy "Users can insert own domains"
  on public.domains for insert
  with check (auth.uid() = user_id);

-- Users can update their own domains
create policy "Users can update own domains"
  on public.domains for update
  using (auth.uid() = user_id);

-- Service role has full access (for backend operations)
create policy "Service role full access"
  on public.domains for all
  using (auth.role() = 'service_role');
