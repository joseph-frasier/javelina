-- 20260715000000_domains_organization_id_not_null.sql
-- Contract phase of user->org scoping for domains, completing 20260710000000.
--
-- DO NOT APPLY until every domains row has been backfilled with an organization_id.
-- Step 1 below is a hard stop that aborts the migration if any NULL remains, so
-- running this early fails loudly instead of silently dropping rows.
--
-- Pre-flight check (run this first, expect 0):
--   select count(*) from public.domains where organization_id is null;

-- 1. Refuse to proceed if any domain is still orgless. Post-003ea37 such rows are
--    invisible to every org list, so they must be assigned, not left behind.
do $$
declare
  orphan_count bigint;
begin
  select count(*) into orphan_count
  from public.domains
  where organization_id is null;

  if orphan_count > 0 then
    raise exception
      'Cannot set domains.organization_id NOT NULL: % row(s) still have a NULL organization_id. Backfill them first.',
      orphan_count;
  end if;
end $$;

-- 2. Replace ON DELETE SET NULL with ON DELETE RESTRICT.
--    SET NULL is incompatible with the NOT NULL added in step 3 - deleting an org
--    would attempt to write NULL and fail on the constraint. It is also wrong on its
--    own terms now: since 003ea37 (list scoped strictly by org), nulling a domain's
--    org makes it invisible to everyone rather than falling back to owner access.
--    RESTRICT forces the caller to reassign or delete an org's domains explicitly.
alter table public.domains
  drop constraint if exists domains_organization_id_fkey;

alter table public.domains
  add constraint domains_organization_id_fkey
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict;

-- 3. The constraint this migration exists for.
alter table public.domains
  alter column organization_id set not null;

-- 4. Drop the legacy NULL-org branches from the dual-mode RLS policies added in
--    20260710000000. `organization_id is null` is now unreachable, and leaving the
--    user_id fallback in place would keep a second, org-blind access path alive -
--    the same shape as the bug fixed in 003ea37.
drop policy if exists "Members can view org or own domains"   on public.domains;
drop policy if exists "Members can insert org or own domains" on public.domains;
drop policy if exists "Members can update org or own domains" on public.domains;

create policy "Members can view org domains"
  on public.domains for select
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = domains.organization_id
        and om.user_id = auth.uid()
    )
  );

create policy "Members can insert org domains"
  on public.domains for insert
  with check (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = domains.organization_id
        and om.user_id = auth.uid()
        and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );

create policy "Members can update org domains"
  on public.domains for update
  using (
    exists (
      select 1 from public.organization_members om
      where om.organization_id = domains.organization_id
        and om.user_id = auth.uid()
        and om.role in ('SuperAdmin', 'Admin', 'Editor')
    )
  );
