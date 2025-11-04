-- =====================================================
-- Auto-add SuperAdmins to Organizations
-- When a new organization is created, automatically add all superadmin users
-- as members with SuperAdmin role
-- =====================================================

-- Create function to auto-add superadmin users to new organizations
create or replace function public.auto_add_superadmins_to_org()
returns trigger as $$
begin
  -- Insert all users with superadmin = true into organization_members
  -- with SuperAdmin role for the newly created organization
  insert into public.organization_members (organization_id, user_id, role)
  select 
    new.id as organization_id,
    p.id as user_id,
    'SuperAdmin' as role
  from public.profiles p
  where p.superadmin = true
  on conflict (organization_id, user_id) 
  do update set role = 'SuperAdmin'
  where organization_members.role != 'SuperAdmin';
  
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger on organizations table
drop trigger if exists trigger_auto_add_superadmins on public.organizations;

create trigger trigger_auto_add_superadmins
  after insert on public.organizations
  for each row
  execute function public.auto_add_superadmins_to_org();

-- Add comment to document the trigger
comment on function public.auto_add_superadmins_to_org() is 
'Automatically adds all superadmin users to newly created organizations with SuperAdmin role';

