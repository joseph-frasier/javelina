-- 20260710000000_domains_add_organization_id.sql
-- Expand phase of user->org scoping for domains.
-- Nullable column, NO backfill, NO NOT NULL. organization_id NULL == legacy (pre-org) row.
-- Dual-mode RLS: org membership when organization_id is set, else legacy user_id fallback.

-- 1. Additive nullable column. SET NULL (not CASCADE): deleting an org must not delete legacy domains.
alter table public.domains
  add column if not exists organization_id uuid
    references public.organizations(id) on delete set null;

-- 2. Index for the new access path.
create index if not exists idx_domains_organization_id
  on public.domains(organization_id);

-- 3. Replace the 4 user-scoped policies with dual-mode ones. Keep "Service role full access".
drop policy if exists "Users can view own domains"   on public.domains;
drop policy if exists "Users can insert own domains"  on public.domains;
drop policy if exists "Users can update own domains"  on public.domains;

-- SELECT: any member of the domain's org, OR (legacy) the owner when org is NULL.
create policy "Members can view org or own domains"
  on public.domains for select
  using (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );

-- INSERT: SuperAdmin/Admin/Editor of the target org, OR (legacy) the owner when org is NULL.
create policy "Members can insert org or own domains"
  on public.domains for insert
  with check (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
          and om.role in ('SuperAdmin', 'Admin', 'Editor')
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );

-- UPDATE: SuperAdmin/Admin/Editor of the domain's org, OR (legacy) the owner when org is NULL.
create policy "Members can update org or own domains"
  on public.domains for update
  using (
    (
      organization_id is not null
      and exists (
        select 1 from public.organization_members om
        where om.organization_id = domains.organization_id
          and om.user_id = auth.uid()
          and om.role in ('SuperAdmin', 'Admin', 'Editor')
      )
    )
    or (organization_id is null and auth.uid() = user_id)
  );
