# Backend Handoff: Pending Invitation Listing & Revocation

## Goal
Allow organization admins to view pending invitations and revoke them before they are accepted.

This builds on the invitation system documented in [BACKEND_AUTH0_ORG_INVITES.md](./BACKEND_AUTH0_ORG_INVITES.md).

## Prerequisites
- `organization_invitations` table exists (migration `20260226170000`).
- Auth0 M2M client has Management API scope: **read:organization_invitations**, **delete:organization_invitations**.
- The invite creation endpoint (`POST /api/organizations/:id/members`) is already implemented.

## New Endpoints

### 1) GET `/api/organizations/:id/invitations`

Returns all active (non-terminal) invitations for the organization.

**Auth:** Caller must have `Admin` or `SuperAdmin` role in the organization (same guard as `POST .../members`).

**Query:**

```sql
SELECT
  oi.id,
  oi.email,
  oi.role,
  oi.status,
  oi.created_at,
  oi.expires_at,
  p.full_name AS invited_by_name,
  p.email AS invited_by_email
FROM organization_invitations oi
LEFT JOIN profiles p ON p.id = oi.invited_by
WHERE oi.organization_id = :id
  AND oi.status IN ('pending', 'awaiting_verification')
ORDER BY oi.created_at DESC;
```

Before returning results, optionally call `check_expired_invitations()` or filter out rows where `expires_at < now()` to avoid returning stale pending invites.

**Response: `200 OK`**

```json
[
  {
    "id": "uuid",
    "email": "user@example.com",
    "role": "Editor",
    "status": "pending",
    "invited_by_name": "Jane Doe",
    "invited_by_email": "jane@example.com",
    "created_at": "2026-03-01T00:00:00Z",
    "expires_at": "2026-03-08T00:00:00Z"
  }
]
```

Returns an empty array `[]` if there are no active invitations.

**Error codes:**
| Code | HTTP | Condition |
|------|------|-----------|
| `UNAUTHORIZED` | 403 | Caller is not Admin/SuperAdmin in this org |
| `ORG_NOT_FOUND` | 404 | Organization does not exist |

---

### 2) POST `/api/organizations/:id/invitations/:invitationId/revoke`

Revokes a single pending invitation both in the local database and in Auth0.

**Auth:** Caller must have `Admin` or `SuperAdmin` role in the organization.

**Steps:**
1. Load `organization_invitations` row by `:invitationId`.
2. Verify `organization_id = :id` (invitation belongs to this org).
3. Verify `status IN ('pending', 'awaiting_verification')`. If already `accepted`, `expired`, `revoked`, or `failed`, return `INVITATION_NOT_REVOCABLE`.
4. Revoke the Auth0 invitation:
   ```
   DELETE /api/v2/organizations/{auth0_organization_id}/invitations/{auth0_invitation_id}
   ```
   Use the `auth0_organization_id` from the `organizations` table and `auth0_invitation_id` from the invitation row.
   If Auth0 returns 404 (invitation already gone), treat as success and continue.
5. Update the local row:
   ```sql
   UPDATE organization_invitations
   SET status = 'revoked', updated_at = now()
   WHERE id = :invitationId;
   ```

**Response: `200 OK`**

```json
{
  "success": true
}
```

**Error codes:**
| Code | HTTP | Condition |
|------|------|-----------|
| `UNAUTHORIZED` | 403 | Caller is not Admin/SuperAdmin in this org |
| `INVITATION_NOT_FOUND` | 404 | No invitation with this ID exists in this org |
| `INVITATION_NOT_REVOCABLE` | 409 | Invitation is already accepted, expired, revoked, or failed |
| `AUTH0_REVOKE_FAILED` | 502 | Auth0 Management API call failed (non-404) |

---

## Auth0 Management API Reference

### Delete an Organization Invitation

```
DELETE /api/v2/organizations/{org_id}/invitations/{invitation_id}
```

- `org_id`: the Auth0 organization ID (`organizations.auth0_organization_id`)
- `invitation_id`: the Auth0 invitation ID (`organization_invitations.auth0_invitation_id`)
- Required scope: `delete:organization_invitations`
- Returns `204 No Content` on success, `404` if already deleted/expired

### List Organization Invitations (optional, for verification)

```
GET /api/v2/organizations/{org_id}/invitations
```

- Required scope: `read:organization_invitations`
- Can be used to cross-check local state against Auth0

---

## Frontend Expectations

The frontend calls these endpoints through the existing catch-all API proxy (`app/api/[...proxy]/route.ts`).

- `GET /api/organizations/:id/invitations` is called when the user opens the "Pending Invitations" tab in the Manage Team Members modal.
- `POST /api/organizations/:id/invitations/:invitationId/revoke` is called when the user clicks "Revoke" and confirms.
- The frontend refreshes the invitation list after a successful revoke.

API client methods (already added):
```typescript
organizationsApi.getInvitations(orgId)
organizationsApi.revokeInvitation(orgId, invitationId)
```

## Verification Checklist
1. Admin can list pending invitations for their org.
2. Non-admin users receive 403 when attempting to list invitations.
3. Revoking a pending invitation sets status to `revoked` in the DB and deletes the Auth0 invitation.
4. Revoking an already-accepted or expired invitation returns `INVITATION_NOT_REVOCABLE` (409).
5. Revoking an invitation that doesn't exist returns `INVITATION_NOT_FOUND` (404).
6. If Auth0 invitation was already deleted (404), revoke still succeeds locally.
7. Revoked invitation can no longer be accepted via the invite link.
