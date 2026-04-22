-- ============================================================
-- Migration: add_provisioning_status_and_events
-- Adds the three tables the customer dashboard and admin
-- pipeline surfaces read from, plus the inbound webhook dedup
-- gate. Source: Supabase Setup Guide v1.1 (Part 2, Steps J2–J5).
-- ============================================================

-- ============================================================
-- Javelina: Pipeline status enums
-- ============================================================
create type canonical_state as enum
  ('not_started', 'in_progress', 'needs_input',
   'failed', 'live', 'not_applicable');
-- 'not_applicable' covers DNS-only legacy customers and any future
-- package that doesn't include all four services.

create type service_type as enum
  ('website', 'dns', 'email', 'domain');

create type event_actor as enum
  ('system', 'intake_app', 'admin', 'customer');

-- ============================================================
-- provisioning_status: current state per (org, service)
-- Tall shape: one row per (org, service). Pivot via view when needed.
-- ============================================================
create table provisioning_status (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null
                  references organizations(id) on delete cascade,
  service         service_type not null,
  state           canonical_state not null default 'not_started',
  internal_state  text,                            -- raw Intake App state
  progress_label  text,                            -- e.g. 'Building · 4/7'
  metadata        jsonb not null default '{}',
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (org_id, service)
);

create index idx_provisioning_status_queue
  on provisioning_status (state)
  where state in ('failed', 'needs_input');

-- ============================================================
-- pipeline_events: append-only event log
-- external_event_id is the idempotency gate for sync writes.
-- ============================================================
create table pipeline_events (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null
                     references organizations(id) on delete cascade,
  service            service_type not null,
  previous_state     canonical_state,
  new_state          canonical_state not null,
  internal_state     text,
  message            text,
  error_context      jsonb,
  actor_type         event_actor not null,
  actor_id           uuid,                          -- admin/customer user
  external_event_id  text unique,                   -- from Intake App
  metadata           jsonb not null default '{}',
  created_at         timestamptz not null default now()
);

create index idx_pipeline_events_org_time
  on pipeline_events (org_id, created_at desc);
create index idx_pipeline_events_org_service_time
  on pipeline_events (org_id, service, created_at desc);

-- ============================================================
-- webhook_events: inbound webhook dedup (Stripe, future: others)
-- ============================================================
create table webhook_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null,
  event_id     text not null,
  event_type   text not null,
  received_at  timestamptz not null default now(),
  raw_payload  jsonb not null
);

create unique index uq_webhook_events_provider_event
  on webhook_events (provider, event_id);

-- ============================================================
-- Pivot view for read-heavy surfaces (admin list filtering)
-- ============================================================
create or replace view provisioning_status_by_org as
select
  o.id as org_id,
  o.name as org_name,
  max(case when ps.service = 'website'
      then ps.state::text end) as website_state,
  max(case when ps.service = 'dns'
      then ps.state::text end) as dns_state,
  max(case when ps.service = 'email'
      then ps.state::text end) as email_state,
  max(case when ps.service = 'domain'
      then ps.state::text end) as domain_state,
  max(ps.updated_at) as last_updated_at
from organizations o
left join provisioning_status ps on ps.org_id = o.id
group by o.id, o.name;

-- ============================================================
-- RLS policies
-- Customer reads: must be a member of the org.
-- Admin (superadmin) reads are handled by a separate bypass policy
-- or query pattern per Javelina's existing auth model.
-- Writes come from the sync endpoint via the service role.
-- ============================================================
alter table provisioning_status enable row level security;
alter table pipeline_events     enable row level security;
alter table webhook_events      enable row level security;

create policy provisioning_status_member_read on provisioning_status
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = provisioning_status.org_id
        and om.user_id = auth.uid()
    )
  );

create policy pipeline_events_member_read on pipeline_events
  for select using (
    exists (
      select 1 from organization_members om
      where om.organization_id = pipeline_events.org_id
        and om.user_id = auth.uid()
    )
  );

-- webhook_events is admin-only.
create policy webhook_events_admin_read on webhook_events
  for select using (
    exists (
      select 1 from profiles up
      where up.id = auth.uid()
        and up.role = 'superadmin'
    )
  );

-- ============================================================
-- Backfill existing orgs
-- DNS-only legacy customers: DNS = 'live', everything else = 'not_applicable'.
-- When a customer later upgrades to Business Starter or Pro, the subscription
-- webhook handler flips their three not_applicable rows to 'not_started'
-- (app-layer logic, not a migration).
-- ============================================================
insert into provisioning_status (org_id, service, state)
select
  o.id,
  s.service::service_type,
  case
    when s.service = 'dns' then 'live'::canonical_state
    else 'not_applicable'::canonical_state
  end
from organizations o
cross join (values
  ('website'), ('dns'), ('email'), ('domain')
) as s(service)
on conflict (org_id, service) do nothing;
