-- =====================================================
-- SuperAdmin RLS Bypass Policies
-- Allow superadmin users (profile.superadmin = true) to access ALL data globally
-- SuperAdmins have full access to all organizations, environments, zones, etc.
-- =====================================================

-- Allow superadmins to SELECT all organizations
create policy if not exists "admin_read_all_orgs"
on public.organizations for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to INSERT organizations
create policy if not exists "admin_insert_all_orgs"
on public.organizations for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to UPDATE all organizations
create policy if not exists "admin_update_all_orgs"
on public.organizations for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to DELETE all organizations
create policy if not exists "admin_delete_all_orgs"
on public.organizations for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to SELECT all user profiles
create policy if not exists "admin_read_all_profiles"
on public.profiles for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.superadmin = true
  )
);

-- Allow superadmins to UPDATE all user profiles
create policy if not exists "admin_update_all_profiles"
on public.profiles for update
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.superadmin = true
  )
);

-- Allow superadmins to SELECT all organization members
create policy if not exists "admin_read_all_org_members"
on public.organization_members for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to INSERT organization members
create policy if not exists "admin_insert_all_org_members"
on public.organization_members for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to UPDATE all organization members
create policy if not exists "admin_update_all_org_members"
on public.organization_members for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to DELETE all organization members
create policy if not exists "admin_delete_all_org_members"
on public.organization_members for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to SELECT all environments
create policy if not exists "admin_read_all_environments"
on public.environments for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to INSERT environments
create policy if not exists "admin_insert_all_environments"
on public.environments for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to UPDATE all environments
create policy if not exists "admin_update_all_environments"
on public.environments for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to DELETE all environments
create policy if not exists "admin_delete_all_environments"
on public.environments for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to SELECT all zones
create policy if not exists "admin_read_all_zones"
on public.zones for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to INSERT zones
create policy if not exists "admin_insert_all_zones"
on public.zones for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to UPDATE all zones
create policy if not exists "admin_update_all_zones"
on public.zones for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to DELETE all zones
create policy if not exists "admin_delete_all_zones"
on public.zones for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to SELECT all zone records
create policy if not exists "admin_read_all_zone_records"
on public.zone_records for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to INSERT zone records
create policy if not exists "admin_insert_all_zone_records"
on public.zone_records for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to UPDATE all zone records
create policy if not exists "admin_update_all_zone_records"
on public.zone_records for update
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);

-- Allow superadmins to DELETE all zone records
create policy if not exists "admin_delete_all_zone_records"
on public.zone_records for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and superadmin = true
  )
);
