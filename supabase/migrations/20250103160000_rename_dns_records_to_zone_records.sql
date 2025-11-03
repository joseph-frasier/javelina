-- =====================================================
-- Rename dns_records table to zone_records
-- =====================================================

-- =====================================================
-- 1. Drop existing triggers (must drop before renaming)
-- =====================================================

drop trigger if exists dns_records_update_count_insert on public.dns_records;
drop trigger if exists dns_records_update_count_delete on public.dns_records;
drop trigger if exists dns_records_updated_at on public.dns_records;
drop trigger if exists dns_records_increment_soa_insert on public.dns_records;
drop trigger if exists dns_records_increment_soa_update on public.dns_records;
drop trigger if exists dns_records_increment_soa_delete on public.dns_records;
drop trigger if exists dns_records_audit on public.dns_records;

-- =====================================================
-- 2. Drop existing RLS policies
-- =====================================================

drop policy if exists "Users can view DNS records in their organizations" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can create DNS records" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can update DNS records" on public.dns_records;
drop policy if exists "SuperAdmin, Admin, and Editor can delete DNS records" on public.dns_records;

-- =====================================================
-- 3. Drop indexes (will be recreated with new names)
-- =====================================================

drop index if exists public.dns_records_zone_id_idx;
drop index if exists public.dns_records_zone_type_idx;
drop index if exists public.dns_records_zone_name_idx;
drop index if exists public.dns_records_active_idx;
drop index if exists public.dns_records_created_by_idx;

-- =====================================================
-- 4. Rename table and constraint
-- =====================================================

alter table public.dns_records rename to zone_records;

-- Rename the unique constraint
alter table public.zone_records 
  rename constraint dns_records_zone_name_type_value_unique to zone_records_zone_name_type_value_unique;

-- Rename the foreign key constraint
alter table public.zone_records 
  rename constraint dns_records_zone_id_fkey to zone_records_zone_id_fkey;

-- =====================================================
-- 5. Recreate indexes with new names
-- =====================================================

create index if not exists zone_records_zone_id_idx on public.zone_records(zone_id);
create index if not exists zone_records_zone_type_idx on public.zone_records(zone_id, type);
create index if not exists zone_records_zone_name_idx on public.zone_records(zone_id, name);
create index if not exists zone_records_active_idx on public.zone_records(active);
create index if not exists zone_records_created_by_idx on public.zone_records(created_by);

-- =====================================================
-- 6. Update functions to reference zone_records
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
    from public.zone_records
    where zone_id = zone_uuid
  ),
  updated_at = now()
  where id = zone_uuid;
  
  return coalesce(NEW, OLD);
end;
$$;

-- =====================================================
-- 7. Recreate triggers with new names
-- =====================================================

-- Trigger to update records count on insert
create trigger zone_records_update_count_insert
  after insert on public.zone_records
  for each row
  execute function public.update_zone_records_count();

-- Trigger to update records count on delete
create trigger zone_records_update_count_delete
  after delete on public.zone_records
  for each row
  execute function public.update_zone_records_count();

-- Trigger to update updated_at timestamp
create trigger zone_records_updated_at
  before update on public.zone_records
  for each row
  execute function public.handle_updated_at();

-- Trigger to increment SOA serial on insert
create trigger zone_records_increment_soa_insert
  after insert on public.zone_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to increment SOA serial on update
create trigger zone_records_increment_soa_update
  after update on public.zone_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to increment SOA serial on delete
create trigger zone_records_increment_soa_delete
  after delete on public.zone_records
  for each row
  execute function public.increment_zone_soa_serial();

-- Trigger to log changes to audit_logs table
create trigger zone_records_audit
  after insert or update or delete on public.zone_records
  for each row
  execute function public.handle_audit_log();

-- =====================================================
-- 8. Recreate RLS policies
-- =====================================================

-- SELECT: Users can view records for zones in their organizations
create policy "Users can view zone records in their organizations"
  on public.zone_records for select
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = zone_records.zone_id
      and om.user_id = auth.uid()
    )
  );

-- INSERT: SuperAdmin, Admin, and Editor can create records
create policy "SuperAdmin, Admin, and Editor can create zone records"
  on public.zone_records for insert
  with check (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = zone_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- UPDATE: SuperAdmin, Admin, and Editor can update records
create policy "SuperAdmin, Admin, and Editor can update zone records"
  on public.zone_records for update
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = zone_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  )
  with check (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = zone_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- DELETE: SuperAdmin, Admin, and Editor can delete records
create policy "SuperAdmin, Admin, and Editor can delete zone records"
  on public.zone_records for delete
  using (
    exists (
      select 1 from public.zones z
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where z.id = zone_records.zone_id
      and om.user_id = auth.uid()
      and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- =====================================================
-- 9. Update Audit Logs RLS Policy
-- =====================================================

-- Update the audit logs policy to reference zone_records
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
    -- For zone_records table (renamed from dns_records)
    (table_name = 'zone_records' and exists (
      select 1 from public.zone_records zr
      join public.zones z on z.id = zr.zone_id
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where zr.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
    or
    -- Keep backward compatibility for dns_records table name in audit logs
    (table_name = 'dns_records' and exists (
      select 1 from public.zone_records zr
      join public.zones z on z.id = zr.zone_id
      join public.environments e on e.id = z.environment_id
      join public.organization_members om on om.organization_id = e.organization_id
      where zr.id = record_id::uuid
      and om.user_id = auth.uid()
    ))
  );

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

