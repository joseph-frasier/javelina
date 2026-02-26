-- =====================================================
-- Add Auth0 organization mapping + invitation tracking
-- =====================================================
-- Purpose:
-- 1) Map Javelina organizations to Auth0 Organizations
-- 2) Track invitation lifecycle in DB
-- 3) Keep changes additive/backward compatible

BEGIN;

-- -----------------------------------------------------
-- 1. Organizations: add Auth0 org mapping
-- -----------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS auth0_organization_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_auth0_organization_id_uidx
  ON public.organizations(auth0_organization_id)
  WHERE auth0_organization_id IS NOT NULL;

COMMENT ON COLUMN public.organizations.auth0_organization_id IS
'Linked Auth0 Organization ID used for invite transport and callback context';

-- -----------------------------------------------------
-- 2. Organization invitations table
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending',
  auth0_organization_id TEXT NOT NULL,
  auth0_invitation_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.organization_invitations IS
'Tracks Auth0 invitation lifecycle for Javelina organization membership';

-- Ensure required columns/shape when table already exists in some environments
ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS organization_id UUID,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS auth0_organization_id TEXT,
  ADD COLUMN IF NOT EXISTS auth0_invitation_id TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_by UUID,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_invitations_role_check'
      AND conrelid = 'public.organization_invitations'::regclass
  ) THEN
    ALTER TABLE public.organization_invitations
      ADD CONSTRAINT organization_invitations_role_check
      CHECK (role IN ('Admin', 'Editor', 'BillingContact', 'Viewer'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_invitations_status_check'
      AND conrelid = 'public.organization_invitations'::regclass
  ) THEN
    ALTER TABLE public.organization_invitations
      ADD CONSTRAINT organization_invitations_status_check
      CHECK (status IN ('pending', 'awaiting_verification', 'accepted', 'expired', 'revoked', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'organization_invitations_auth0_invitation_id_key'
      AND conrelid = 'public.organization_invitations'::regclass
  ) THEN
    ALTER TABLE public.organization_invitations
      ADD CONSTRAINT organization_invitations_auth0_invitation_id_key
      UNIQUE (auth0_invitation_id);
  END IF;
END $$;

-- -----------------------------------------------------
-- 3. Indexes
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS organization_invitations_org_idx
  ON public.organization_invitations(organization_id);

CREATE INDEX IF NOT EXISTS organization_invitations_email_idx
  ON public.organization_invitations((lower(email)));

CREATE INDEX IF NOT EXISTS organization_invitations_lookup_idx
  ON public.organization_invitations(auth0_organization_id, (lower(email)), status);

CREATE INDEX IF NOT EXISTS organization_invitations_expires_at_idx
  ON public.organization_invitations(expires_at);

-- Only one active invite per organization/email
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_active_unique_idx
  ON public.organization_invitations(organization_id, (lower(email)))
  WHERE status IN ('pending', 'awaiting_verification');

-- Keep updated_at current on updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'organization_invitations_updated_at'
  ) THEN
    CREATE TRIGGER organization_invitations_updated_at
      BEFORE UPDATE ON public.organization_invitations
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;

COMMIT;
