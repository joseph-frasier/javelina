-- 20260504210800_operator_actions.sql
-- Audit log of operator actions taken from the Sales & Onboarding queue.
-- Written by Javelina backend in the same transaction as the forwarded
-- call to the Intake App's /api/internal/leads/[id]/* action endpoints.
--
-- lead_id references Intake App's leads.id but is intentionally NOT a SQL
-- foreign key (cross-project consistency is application-level only).
-- operator_id is the Auth0 `sub` claim of the staff member who acted.

create table operator_actions (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid not null,
    operator_id text not null,
    action text not null,
    payload jsonb,
    created_at timestamptz not null default now()
);

create index operator_actions_lead_id_idx on operator_actions (lead_id);
create index operator_actions_action_idx on operator_actions (action);