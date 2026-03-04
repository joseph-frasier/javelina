-- Add auth0_invitation_ticket to organization_invitations
-- The ticket is the value used in Auth0's /authorize URL and is distinct
-- from the invitation id (uinv_...) returned by the Management API.

ALTER TABLE public.organization_invitations
  ADD COLUMN IF NOT EXISTS auth0_invitation_ticket TEXT;

COMMENT ON COLUMN public.organization_invitations.auth0_invitation_ticket IS
'Auth0 invitation ticket used in the /authorize URL (distinct from the invitation id)';
