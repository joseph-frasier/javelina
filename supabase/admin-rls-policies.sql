-- =====================================================
-- Admin RLS Bypass Policies
-- Allow superusers (profile.role = 'superuser') to SELECT all data globally
-- =====================================================

-- Allow superusers to SELECT all organizations
create policy if not exists "admin_read_all_orgs"
on public.organizations for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superuser'
  )
);

-- Allow superusers to SELECT all user profiles
create policy if not exists "admin_read_all_profiles"
on public.profiles for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'superuser'
  )
);

-- Allow superusers to SELECT all organization members
create policy if not exists "admin_read_all_org_members"
on public.organization_members for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superuser'
  )
);

-- Allow superusers to SELECT all environments
create policy if not exists "admin_read_all_environments"
on public.environments for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superuser'
  )
);

-- Allow superusers to SELECT all zones
create policy if not exists "admin_read_all_zones"
on public.zones for select
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'superuser'
  )
);
