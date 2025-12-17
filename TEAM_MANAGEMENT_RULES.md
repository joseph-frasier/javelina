# Team Management Rules & Permissions

## Overview

This document defines who can perform team management actions (inviting, removing, changing roles) in the Javelina DNS management application.

## Team Management Permissions Matrix

| Action | SuperAdmin | Admin | BillingContact | Editor | Viewer |
|--------|-----------|-------|----------------|--------|--------|
| View member list | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ |
| View member roles | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ |
| Invite new members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| Resend invitations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel pending invitations | ✅ | ✅ | ❌ | ❌ | ❌ |

## Business Rules

### 1. Viewing Members

**Who can view:**
- All organization members (SuperAdmin, Admin, BillingContact, Editor, Viewer)

**What they can see:**
- List of all members
- Member names and emails
- Member roles
- Member status (active, invited, suspended)
- Last accessed timestamp

**UI Implementation:**
- Show member list to all roles
- Disable action buttons (invite, remove, change role) for roles without permissions
- Show informative tooltip explaining why actions are disabled

### 2. Inviting New Members

**Who can invite:**
- SuperAdmin
- Admin

**Restrictions:**
- Cannot invite to a higher role than their own
- Must respect organization's team member limits (per subscription plan)
- Cannot invite duplicate email addresses

**Available roles to assign:**
- SuperAdmin (only if inviter is SuperAdmin)
- Admin (only if inviter is SuperAdmin or Admin)
- BillingContact
- Editor
- Viewer

**Invitation Flow:**
1. Inviter enters email and selects role
2. System validates:
   - Email format is valid
   - Email not already a member
   - Inviter has permission to assign selected role
   - Organization hasn't reached member limit
3. System creates invitation record with status='invited'
4. System sends invitation email (if email service is configured)
5. Invitee receives link to accept invitation
6. Upon acceptance, invitation status changes to 'active'

**Backend Enforcement:**
```javascript
// POST /api/organizations/:orgId/members/invite
// Requires role: SuperAdmin or Admin
router.post('/:orgId/members/invite', 
  authenticateUser, 
  requireOrgRole(['SuperAdmin', 'Admin']),
  async (req, res) => {
    // Validate role assignment permissions
    // Check member limits
    // Create invitation
  }
);
```

### 3. Removing Members

**Who can remove:**
- SuperAdmin
- Admin

**Restrictions:**
- Cannot remove yourself (would leave org without admin)
- Should warn if removing the last SuperAdmin/Admin
- Cannot remove members if you don't have permissions

**Removal Flow:**
1. Remover clicks remove button
2. System shows confirmation dialog
3. Upon confirmation:
   - Delete organization_members record (cascade deletes any pending invitations)
   - Optionally: Send notification email to removed user
   - Update UI to remove member from list

**Backend Enforcement:**
```javascript
// DELETE /api/organizations/:orgId/members/:memberId
// Requires role: SuperAdmin or Admin
router.delete('/:orgId/members/:memberId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  async (req, res) => {
    // Prevent self-removal
    // Check if last admin
    // Delete member
  }
);
```

### 4. Changing Member Roles

**Who can change roles:**
- SuperAdmin
- Admin

**Restrictions:**
- Cannot change own role (prevents accidental lockout)
- Cannot promote to a role higher than your own
- Cannot demote another SuperAdmin if you're an Admin

**Role Change Matrix:**

| Changer Role | Can Change To |
|--------------|---------------|
| SuperAdmin | SuperAdmin, Admin, BillingContact, Editor, Viewer |
| Admin | Admin, BillingContact, Editor, Viewer |
| BillingContact | ❌ None |
| Editor | ❌ None |
| Viewer | ❌ None |

**Role Change Flow:**
1. Changer selects new role from dropdown
2. System validates:
   - Changer has permission to modify roles
   - Changer has permission to assign selected role
   - Target is not the changer themselves
3. Update organization_members.role
4. Update UI immediately
5. Optionally: Send notification email to affected user

**Backend Enforcement:**
```javascript
// PUT /api/organizations/:orgId/members/:memberId/role
// Requires role: SuperAdmin or Admin
router.put('/:orgId/members/:memberId/role',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  async (req, res) => {
    // Prevent self-role-change
    // Validate role assignment permissions
    // Update role
  }
);
```

## Frontend Implementation Status

### ✅ Completed

1. **InviteUsersModal** (`components/modals/InviteUsersModal.tsx`)
   - Added BillingContact to role dropdown
   - Updated role type to include BillingContact
   - Already has plan limit checks

2. **ManageTeamMembersModal** (`components/modals/ManageTeamMembersModal.tsx`)
   - Added BillingContact to role options
   - Updated role type to include BillingContact
   - Added BillingContact to role color mapping

3. **InviteUsersBox** (`components/organization/InviteUsersBox.tsx`)
   - Added BillingContact to user type
   - Updated role color function
   - Displays warning that feature is not yet fully available

4. **Admin Organizations Page** (`app/admin/organizations/[id]/page.tsx`)
   - Added BillingContact to both role selection dropdowns
   - Updated for adding members and changing roles

5. **Admin Actions** (`lib/actions/admin/organizations.ts`)
   - Updated role validation to include BillingContact
   - Validates role in addMemberToOrganization
   - Validates role in changeMemberRole

### 🔄 Future Enhancements

1. **Permission-based UI disabling:**
   - Disable invite button for BillingContact, Editor, Viewer
   - Disable remove button for non-Admin/SuperAdmin
   - Disable role dropdown for non-Admin/SuperAdmin
   - Show tooltips explaining why actions are disabled

2. **Self-protection logic:**
   - Prevent changing own role
   - Prevent removing self
   - Warn if about to remove last admin

3. **Enhanced invitation flow:**
   - Track invitation expiration
   - Allow resending invitations
   - Show pending invitations separately from active members

4. **Notification system:**
   - Email when invited to organization
   - Email when role changed
   - Email when removed from organization

## Backend Implementation Status

### ✅ Documented

See `BACKEND_RBAC_IMPLEMENTATION.md` for full backend implementation guide, including:

- Authorization middleware (`requireOrgRole`)
- Route protection for invite/remove/change role endpoints
- Role validation logic
- Integration test requirements

**NEW:** See `TEAM_MEMBERS_API_REQUIREMENTS.md` for complete API specification, including:

- Detailed endpoint contracts for GET, POST, PUT, DELETE member operations
- Request/response formats and examples
- Error codes and handling (USER_NOT_FOUND, MEMBER_LIMIT_REACHED, etc.)
- Business rules enforcement
- Testing checklists
- Frontend integration details

### 🔄 To Be Implemented in Express Backend Repo

1. Create RBAC middleware (see `BACKEND_RBAC_IMPLEMENTATION.md`)
2. Implement member endpoints (see `TEAM_MEMBERS_API_REQUIREMENTS.md`)
3. Apply to team management routes
4. Write integration tests
5. Deploy to staging for testing

## Testing Checklist

### Frontend Tests

- [ ] SuperAdmin can invite with all role options
- [ ] Admin can invite with Admin/BillingContact/Editor/Viewer options
- [ ] BillingContact cannot see invite button
- [ ] Editor cannot see invite button
- [ ] Viewer cannot see invite button
- [ ] SuperAdmin can remove any member
- [ ] Admin can remove non-SuperAdmin members
- [ ] SuperAdmin can change roles to any role
- [ ] Admin can change roles to Admin/BillingContact/Editor/Viewer
- [ ] All roles can view member list and roles

### Backend Tests

- [ ] POST /organizations/:orgId/members/invite returns 403 for BillingContact
- [ ] POST /organizations/:orgId/members/invite returns 403 for Editor
- [ ] POST /organizations/:orgId/members/invite returns 403 for Viewer
- [ ] POST /organizations/:orgId/members/invite succeeds for Admin
- [ ] POST /organizations/:orgId/members/invite succeeds for SuperAdmin
- [ ] DELETE /organizations/:orgId/members/:memberId returns 403 for non-Admin
- [ ] PUT /organizations/:orgId/members/:memberId/role returns 403 for non-Admin
- [ ] Role validation rejects invalid roles
- [ ] Cannot invite duplicate emails
- [ ] Member limit enforcement works correctly

## Related Documentation

- `TEAM_MEMBERS_API_REQUIREMENTS.md` - **API specification for member management endpoints**
- `BACKEND_RBAC_IMPLEMENTATION.md` - Complete backend implementation guide
- `RBAC.md` - Master RBAC reference document
- `lib/permissions.ts` - Frontend permission helper functions
- `supabase/migrations/20251217000000_add_billing_contact_role.sql` - Database migration

## Contact

For questions about team management rules or implementation:
- **Owner:** Seth Chesky
- **Date Created:** December 17, 2024
- **Last Updated:** December 17, 2024

