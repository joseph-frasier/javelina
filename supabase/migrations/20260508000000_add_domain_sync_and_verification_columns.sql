-- JAV-102 + JAV-103: Sync state + registrant verification status for domains.
-- Applied manually to dev branch (project ref: ipfsrbxjgewhdcvonrbo).

ALTER TABLE public.domains
  ADD COLUMN last_synced_at timestamptz,
  ADD COLUMN registrant_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN registrant_verification_deadline timestamptz;

CREATE INDEX idx_domains_status_synced
  ON public.domains(status, last_synced_at)
  WHERE status = 'transferring';
