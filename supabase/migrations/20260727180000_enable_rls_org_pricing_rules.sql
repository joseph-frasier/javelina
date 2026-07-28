-- 20260727180000_enable_rls_org_pricing_rules.sql
-- Enables RLS on public.org_pricing_rules, which was created without it in
-- 20260721120000_org_pricing_rules.sql. Left as-is, it is a
-- rls_disabled_in_public ERROR in the Supabase security advisor and is
-- readable/writable by any anon or authenticated caller through PostgREST.
--
-- Safe to run on any branch; all statements are idempotent.

-- ============================================================
-- org_pricing_rules: enable RLS (service-role-only access)
--
-- The table is read and written exclusively by the Javelina backend via the
-- service role (pricingRulesController / adminController / the pricing
-- resolver, all through supabaseAdmin). The frontend never touches it
-- directly — the admin panel goes through pricingApi -> backend, and rule
-- history for the panel is served by the backend's listRules.
--
-- No org-membership read policy is granted on purpose. Rows are negotiated
-- commercial terms (percent off, waived products, absolute price overrides)
-- and are not intended to be readable by org members, only surfaced as an
-- already-computed effective price by the backend.
--
-- The service role bypasses RLS regardless; the explicit policy documents
-- intent and matches the operator_actions / rate_limits / idempotency_keys
-- convention in this database.
-- ============================================================
alter table public.org_pricing_rules enable row level security;

drop policy if exists org_pricing_rules_service_all on public.org_pricing_rules;
create policy org_pricing_rules_service_all on public.org_pricing_rules
  for all
  to service_role
  using (true)
  with check (true);

-- Defense in depth: remove the default broad grants so the table is not
-- reachable through PostgREST by the anon/authenticated roles at all.
revoke all on table public.org_pricing_rules from anon, authenticated;
