-- =====================================================
-- DNS Records Table Migration
-- Creates dns_records table and SOA serial functionality
-- =====================================================

-- =====================================================
-- 1. Add SOA Serial Column to Zones Table
-- =====================================================

-- Add soa_serial column to zones table (starts at 1 for new zones)
alter table public.zones
  add column if not exists soa_serial integer not null default 1;

-- Create index for soa_serial queries
create index if not exists zones_soa_serial_idx on public.zones(soa_serial);

-- =====================================================
-- 2. Create DNS Records Table
-- =====================================================

create table if not exists public.dns_records (
  id uuid default gen_random_uuid() primary key,
  zone_id uuid references public.zones on delete cascade not null,
  name text not null,
  type text not null check (type in ('A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV', 'CAA')),
  value text not null,
  ttl integer not null default 3600,
  priority integer,
  active boolean not null default true,
  comment text,
  metadata jsonb default '{}'::jsonb,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  
  -- Unique constraint: prevent exact duplicate records
  constraint dns_records_zone_name_type_value_unique unique (zone_id, name, type, value)
);

-- Enable Row Level Security
alter table public.dns_records enable row level security;

-- =====================================================
-- 3. Create Indexes for Performance
-- =====================================================

create index if not exists dns_records_zone_id_idx on public.dns_records(zone_id);
create index if not exists dns_records_zone_type_idx on public.dns_records(zone_id, type);
create index if not exists dns_records_zone_name_idx on public.dns_records(zone_id, name);
create index if not exists dns_records_active_idx on public.dns_records(active);
create index if not exists dns_records_created_by_idx on public.dns_records(created_by);

-- =====================================================
-- 4. Create Functions
-- =====================================================

-- Function to update zone records count
create or replace function public.update_zone_records_count()
returns trigger
language plpgsql
security definer
as $$
declare
  zone_uuid uuid;
begin
  -- Get zone_id from the trigger
  zone_uuid := coalesce(NEW.zone_id, OLD.zone_id);
  
  -- Update the records count for the zone
  update public.zones
  set records_count = (
    select count(*)
    from public.dns_records
    where zone_id = zone_uuid
  ),
  updated_at = now()
  where id = zone_uuid;
  
  return coalesce(NEW, OLD);
end;
$$;

-- Function to increment SOA serial when DNS records change
create or replace function public.increment_zone_soa_serial()
returns trigger
language plpgsql
security definer
as $$
declare
  zone_uuid uuid;
begin
  -- Get zone_id from the trigger
  zone_uuid := coalesce(NEW.zone_id, OLD.zone_id);
  
  -- Increment SOA serial for the zone
  update public.zones
  set soa_serial = soa_serial + 1,
      updated_at = now()
  where id = zone_uuid;
  
  return coalesce(NEW, OLD);
end;
$$;

-- =====================================================
-- 5. Create Triggers
-- =====================================================

-- Trigger to update records count on insert
drop trigger if exists dns_records_update_count_insert on public.dns_records;
create trigger dns_records_update_count_insert
  after insert on public.dns_records
  for each row
  execute function public.update_zone_records_count();

-- Trigger to update records count on delete
drop trigger if exists dns_records_update_count_delete on public.dns_records;
create trigger dns_records_update_count_delete
  after delete on public.dns_records
  for each row
  execute function public.update_zone_records_count();

-- Trigger to update updated_at timestamp
drop trigger if exists dns_records_updated_at on public.dns_records;
create trigger dns_records_updated_at
  before update on public.dns_records
  for each row
  execute function public.handle_updated_at();

-- Trigger to increment SOA serial on insert
drop trigger if exists dns_records_increment_soa_insert on public.dns_records;
create trigger dns_records_increment_soa_insert
  after insert on public.dns_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to increment SOA serial on update
drop trigger if exists dns_records_increment_soa_update on public.dns_records;
create trigger dns_records_increment_soa_update
  after update on public.dns_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to increment SOA serial on delete
drop trigger if exists dns_records_increment_soa_delete on public.dns_records;
create trigger dns_records_increment_soa_delete
  after delete on public.dns_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to log changes to audit_logs table
drop trigger if exists dns_records_audit on public.dns_records;
create trigger dns_records_audit
  after insert or update or delete on public.dns_records
  for each row
  execute function public.handle_audit_log();

-- =====================================================
-- 6. RLS Policies
-- =====================================================

-- Drop existing policies if they exist
drop policy if exists "Users can view DNS records in their organizations" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can create DNS records" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can update DNS records" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can delete DNS records" on public.dns_records;

-- SELECT: Users can view records for zones in their organizations
create policy "Users can view DNS records in their organizations"
  on public.dns_records for select
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = dns_records.zone_id
      and om.user_id = auth.uid()
    )
  );

-- INSERT: SuperAdmin, Admin, and Editor can create records
create policy "SuperAdmin, Admin, and Editor can create DNS records"
  on public.dns_records for insert
  with check (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = dns_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- UPDATE: SuperAdmin, Admin, and Editor can update records
create policy "SuperAdmin, Admin, and Editor can update DNS records"
  on public.dns_records for update
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = dns_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  )
  with check (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = dns_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- DELETE: SuperAdmin, Admin, and Editor can delete records
create policy "SuperAdmin, Admin, and Editor can delete DNS records"
  on public.dns_records for delete
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = dns_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 7. Update Audit Logs RLS Policy
-- =====================================================

-- Add dns_records to the audit logs RLS policy
drop policy if exists "Users can view audit logs for their organizations" on public.audit_logs;
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
    or
    -- For dns_records table
    (table_name = 'dns_records' and exists (
      select 1 from public.dns_records dr
      join public.zones z on z.id = dr.zone_id
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where dr.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
  );

-- =====================================================
-- 8. Update Existing Zones
-- =====================================================

-- Ensure all existing zones have soa_serial set to 1
update public.zones
set soa_serial = 1
where soa_serial is null or soa_serial = 0;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

