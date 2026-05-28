-- Mailbox setup improvements: add DKIM enablement state to domains.
-- Applied manually by Seth — do not auto-apply via CI.

ALTER TABLE public.domains
  ADD COLUMN dkim_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN dkim_selector text;

COMMENT ON COLUMN public.domains.dkim_enabled IS
  'True once DKIM signing has been provisioned for this domain via the Enable DKIM Signing flow.';
COMMENT ON COLUMN public.domains.dkim_selector IS
  'DKIM selector configured in OMA (e.g. dkim1). NULL when dkim_enabled is false.';
