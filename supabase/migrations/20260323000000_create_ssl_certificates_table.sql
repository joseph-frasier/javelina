-- SSL certificate orders for OpenSRS trust_service integration
-- Certificates are user-scoped, following the same pattern as the domains table

create table if not exists public.ssl_certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  domain text not null,
  product_type text not null,
  status text not null default 'pending'
    check (status in (
      'pending',           -- awaiting payment
      'processing',        -- payment received, order submitted to OpenSRS
      'awaiting_approval', -- domain validation pending
      'in_progress',       -- CA processing the order
      'active',            -- certificate issued
      'expired',           -- certificate expired
      'cancelled',         -- order cancelled
      'declined',          -- order declined by CA
      'failed',            -- order processing failed
      'renewing'           -- renewal in progress
    )),
  reg_type text not null default 'new'
    check (reg_type in ('new', 'renew', 'upgrade')),

  -- OpenSRS tracking
  opensrs_order_id text,
  opensrs_product_id text,
  opensrs_supplier_order_id text,

  -- Certificate data
  csr text,
  certificate text,           -- PEM certificate after issuance
  ca_certificates text,       -- intermediate/root CA certs

  -- Domain validation
  dv_auth_method text check (dv_auth_method in ('email', 'dns', 'file')),
  dv_auth_details jsonb,      -- validation token/record details from OpenSRS
  approver_email text,

  -- Contact info
  contact_info jsonb,         -- admin/org contact stored at order time
  server_type text,           -- apache, nginx, iis, etc.

  -- Dates
  issued_at timestamptz,
  expires_at timestamptz,
  period integer not null default 1,

  -- Payment
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  amount_paid integer,        -- in cents
  currency text not null default 'usd',

  -- Metadata
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_ssl_certificates_user_id on public.ssl_certificates(user_id);
create index idx_ssl_certificates_domain on public.ssl_certificates(domain);
create index idx_ssl_certificates_status on public.ssl_certificates(status);
create index idx_ssl_certificates_stripe_session on public.ssl_certificates(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index idx_ssl_certificates_opensrs_order on public.ssl_certificates(opensrs_order_id)
  where opensrs_order_id is not null;

-- Updated_at trigger
create or replace function public.update_ssl_certificates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger ssl_certificates_updated_at
  before update on public.ssl_certificates
  for each row
  execute function public.update_ssl_certificates_updated_at();

-- RLS
alter table public.ssl_certificates enable row level security;

-- Users can view their own certificates
create policy "Users can view own certificates"
  on public.ssl_certificates for select
  using (auth.uid() = user_id);

-- Users can insert their own certificates
create policy "Users can insert own certificates"
  on public.ssl_certificates for insert
  with check (auth.uid() = user_id);

-- Users can update their own certificates
create policy "Users can update own certificates"
  on public.ssl_certificates for update
  using (auth.uid() = user_id);

-- Service role has full access (for backend operations)
create policy "Service role full access"
  on public.ssl_certificates for all
  using (auth.role() = 'service_role');
