-- ============================================================
-- pending_jobs: retry queue for outbound service calls
-- Used when Javelina's call to the Intake App fails — we enqueue
-- rather than throw back to Stripe, so webhook retries don't cause
-- duplicates. Manual retry in v1; automated in v1.5.
-- ============================================================

create type pending_job_status as enum
  ('pending', 'succeeded', 'failed', 'manual_resolved');

create table pending_jobs (
  id               uuid primary key default gen_random_uuid(),
  target           text not null,           -- e.g. 'intake_kickoff'
  payload          jsonb not null,
  status           pending_job_status not null default 'pending',
  attempts         integer not null default 0,
  last_attempt_at  timestamptz,
  last_error       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_pending_jobs_status_target
  on pending_jobs (status, target) where status = 'pending';

alter table pending_jobs enable row level security;

-- Admin-only read access. Writes come from the service role.
create policy pending_jobs_admin_read on pending_jobs
  for select using (
    exists (
      select 1 from profiles up
      where up.id = auth.uid()
        and up.role = 'superadmin'
    )
  );