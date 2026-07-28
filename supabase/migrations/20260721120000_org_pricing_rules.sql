-- 20260721120000_org_pricing_rules.sql
-- Per-org custom pricing engine. Source of truth for negotiated/partner pricing.

create type org_pricing_scope    as enum ('all', 'category');
create type org_pricing_category as enum ('plan', 'mailbox', 'domain');
create type org_pricing_type     as enum ('percent', 'waive', 'price_override');

create table org_pricing_rules (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  scope           org_pricing_scope    not null,
  category        org_pricing_category,
  discount_type   org_pricing_type     not null,
  value_bps       integer,
  value_cents     integer,
  effective_from  timestamptz not null default now(),
  effective_until timestamptz,
  note            text,
  created_by      uuid references profiles(id),
  created_at      timestamptz not null default now(),
  archived_at     timestamptz,

  constraint scope_category_coherent check (
    (scope = 'all'      and category is null) or
    (scope = 'category' and category is not null)
  ),
  constraint value_matches_type check (
    (discount_type = 'percent'        and value_bps is not null and value_bps between 1 and 10000 and value_cents is null) or
    (discount_type = 'waive'          and value_bps is null and value_cents is null) or
    (discount_type = 'price_override' and value_cents is not null and value_cents >= 0 and value_bps is null)
  )
);

create unique index uq_org_pricing_active_category
  on org_pricing_rules (org_id, category)
  where archived_at is null and scope = 'category';

create unique index uq_org_pricing_active_baseline
  on org_pricing_rules (org_id)
  where archived_at is null and scope = 'all';

create index idx_org_pricing_org_active
  on org_pricing_rules (org_id) where archived_at is null;
