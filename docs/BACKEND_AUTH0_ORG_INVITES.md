# Backend Handoff: Auth0 User Invitation Template for Javelina Org Membership

## Goal
Allow a user to invite another user to a **Javelina organization** (the org that owns zones/records) while using Auth0's **User Invitation** email template flow.

Important: Javelina org authorization remains in `public.organization_members`. Auth0 Organizations are used only as invite transport/context.

## Glossary
1. Javelina organization: app/business entity in `public.organizations`.
2. Auth0 organization: identity-layer org used for invitation links/templates.
3. Mapping: `organizations.auth0_organization_id`.

## Decisions Locked
1. Backward compatibility strategy: Hybrid.
2. New Javelina orgs: backend attempts Auth0 org creation after org create.
3. Existing orgs: if no mapping, create Auth0 org lazily on first invite.
4. Membership creation timing: after successful login and verified-email requirement passes.

## Required Auth0 Dashboard Configuration (Manual)
1. Universal Login: New Universal Login active, Classic custom pages disabled.
2. Application org behavior enabled (`Type of Users` compatible with org flows).
3. Application Login URI set to frontend invite handoff route (example: `https://app.javelina.cloud/invite/accept`).
4. Connection enabled for org invitation flow.
5. Branding -> Email Templates -> `User Invitation` customized.
6. SMTP provider configured (already confirmed).
7. Backend M2M client has Management API scopes for:
   - create/read organizations
   - create organization connections
   - create/read/revoke invitations

## Database Migration
Apply migration file manually:
- [20260226170000_add_auth0_org_invitation_mapping.sql](/Users/sethchesky/Documents/GitHub/javelina/supabase/migrations/20260226170000_add_auth0_org_invitation_mapping.sql)

Includes:
1. `organizations.auth0_organization_id` (nullable + unique when present).
2. `organization_invitations` table for invite lifecycle.
3. Active-invite uniqueness per org/email.

## Backend API Contract Changes

### 1) POST `/api/organizations/:id/members`
Current frontend request body stays:

```json
{
  "email": "teammate@example.com",
  "role": "Viewer"
}
```

New behavior:
1. Validate inviter permissions and member limits.
2. Ensure org has `auth0_organization_id`; create on demand if missing.
3. Create Auth0 org invitation.
4. Persist local `organization_invitations` row with `status='pending'`.
5. Return invitation metadata (`202` preferred).

Possible deterministic errors:
1. `ALREADY_MEMBER`
2. `INVITE_ALREADY_PENDING`
3. `MEMBER_LIMIT_REACHED`
4. `ORG_AUTH0_SYNC_FAILED`

### 2) GET `/auth/login`
Pass through invite query params:
1. `invitation`
2. `organization`

### 3) GET `/auth/callback`
After session/auth established:
1. Resolve invite context.
2. Match pending row by auth0 org + invitee email + not expired.
3. If verified-email passes: insert `organization_members`, set invite `accepted`.
4. If not verified: set `awaiting_verification`, redirect to `/email-verified`.

### 4) POST `/api/auth/finalize-invitation` (new)
Purpose:
1. Called by frontend after verification refresh.
2. Finalizes pending invite and writes `organization_members`.
3. Returns success or `NO_PENDING_INVITATION`.

## Membership Write Rules
When finalizing:
1. Insert `organization_members` with selected role.
2. Set `status='active'`.
3. Set `invited_by`, `invited_at`, `joined_at`.
4. Enforce duplicate protection (`ALREADY_MEMBER`).

## Expiration / Maintenance
1. Expired pending invites marked `expired` (cron or periodic sweep).
2. Expired invites cannot be finalized.

## Frontend Expectations (Already Implemented Here)
1. Public invite route: `/invite/accept`.
2. Middleware allows unauthenticated access to `/invite/accept`.
3. Invite modal now treats endpoint as invitation flow (not direct member add).
4. `email-verified` flow calls `POST /api/auth/finalize-invitation`.

## Rollout Order
1. Apply DB migration manually.
2. Deploy backend endpoint changes.
3. Test invite acceptance in Auth0 + Javelina.
4. Deploy frontend branch changes.

## Verification Checklist
1. Existing account invite: link -> login -> member added to correct Javelina org.
2. New account invite: signup -> verify -> finalize -> member added.
3. Legacy org with no mapping: first invite creates mapping and sends email.
4. Duplicate pending invite blocked.
5. Existing member invite blocked.
6. Expired invite not accepted.
7. Existing production org behavior unchanged unless invite feature is used.
