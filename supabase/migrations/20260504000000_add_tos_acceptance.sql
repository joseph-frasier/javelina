-- ToS / legal acceptance: per-user record with verifiable trail
-- Adds tos_* columns to profiles for fast gate checks, plus an immutable
-- history table for legal trail (timestamp, IP, UA, version, context).

alter table public.profiles
  add column if not exists tos_version_accepted text,
  add column if not exists tos_accepted_at timestamptz;

create table if not exists public.tos_acceptances (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  document_type    text not null check (document_type in ('terms_of_service','privacy_policy','acceptable_use')),
  document_version text not null,
  accepted_at      timestamptz not null default now(),
  ip_address       inet,
  user_agent       text,
  context          text not null check (context in ('signup','login_regate','checkout','api')),
  organization_id  uuid references public.organizations(id) on delete set null,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists idx_tos_acceptances_user_id  on public.tos_acceptances(user_id);
create index if not exists idx_tos_acceptances_user_doc on public.tos_acceptances(user_id, document_type);
create index if not exists idx_tos_acceptances_accepted on public.tos_acceptances(accepted_at);

alter table public.tos_acceptances enable row level security;

-- Defensive read policy for Supabase-auth users. Auth0-only users
-- (the majority on this platform) read via backend service_role,
-- which bypasses RLS. Writes are backend-only — no INSERT/UPDATE/DELETE
-- policy is defined intentionally.
create policy "Users read their own acceptances"
  on public.tos_acceptances for select
  using (auth.uid() = user_id);

grant select on public.tos_acceptances to authenticated;

-- Mirror the latest terms_of_service acceptance onto profiles for O(1) gating.
create or replace function public.sync_tos_to_profile() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  if NEW.document_type = 'terms_of_service' then
    update public.profiles
       set tos_version_accepted = NEW.document_version,
           tos_accepted_at      = NEW.accepted_at
     where id = NEW.user_id;
  end if;
  return NEW;
end$$;

drop trigger if exists trg_sync_tos_to_profile on public.tos_acceptances;
create trigger trg_sync_tos_to_profile
  after insert on public.tos_acceptances
  for each row execute function public.sync_tos_to_profile();

-- Audit trail. handle_audit_log is generic (uses to_jsonb to extract
-- organization_id), so attaching it directly works for this table.
drop trigger if exists trg_audit_tos_acceptances on public.tos_acceptances;
create trigger trg_audit_tos_acceptances
  after insert or update or delete on public.tos_acceptances
  for each row execute function public.handle_audit_log();
