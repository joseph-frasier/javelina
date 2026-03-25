-- Migration: Lock down billing tables RLS
-- Description: Enable RLS, force RLS, revoke client access, and add service-only policies
-- on tenant_memberships, tenant_entitlements, and idempotency_keys
-- Date: 2026-03-25

-- 1) Enable RLS on all three tables
alter table public.tenant_memberships enable row level security;
alter table public.tenant_entitlements enable row level security;
alter table public.idempotency_keys enable row level security;

-- Optional but recommended: enforce RLS even for table owner
-- (roles with BYPASSRLS still bypass, e.g. postgres/service_role)
alter table public.tenant_memberships force row level security;
alter table public.tenant_entitlements force row level security;
alter table public.idempotency_keys force row level security;

-- 2) Remove any accidental client access
revoke all on table public.tenant_memberships from anon, authenticated;
revoke all on table public.tenant_entitlements from anon, authenticated;
revoke all on table public.idempotency_keys from anon, authenticated;

-- 3) Service-only policies (replace service_role with your DB role if different)

drop policy if exists tenant_memberships_service_select on public.tenant_memberships;
create policy tenant_memberships_service_select
on public.tenant_memberships
for select
to service_role
using (true);

drop policy if exists tenant_entitlements_service_select on public.tenant_entitlements;
create policy tenant_entitlements_service_select
on public.tenant_entitlements
for select
to service_role
using (true);

drop policy if exists idempotency_keys_service_select on public.idempotency_keys;
create policy idempotency_keys_service_select
on public.idempotency_keys
for select
to service_role
using (true);

drop policy if exists idempotency_keys_service_insert on public.idempotency_keys;
create policy idempotency_keys_service_insert
on public.idempotency_keys
for insert
to service_role
with check (true);
