# Javelina Role-Based Access Control (RBAC) Reference

**Version:** 1.0  
**Date:** December 17, 2024  
**Status:** ✅ Active

## Overview

Javelina uses a two-tier role system:
1. **Global SuperAdmin** - Javelina staff with access to all organizations (via `profiles.superadmin = true`)
2. **Organization Roles** - Member-level roles defined in `organization_members.role`

This document defines the five organization-level roles and their permissions across all feature areas.

---

## Organization-Level Roles

### 1. SuperAdmin (Org-Level)

**Description:** Full control over the organization and all its resources.

**Use Case:** Organization owners, primary administrators

**Key Permissions:**
- ✅ Everything an Admin can do
- ✅ Delete the organization itself
- ✅ Promote/demote other admins

**Database Value:** `'SuperAdmin'`

---

### 2. Admin

**Description:** Can manage organization settings, team members, billing, and create/delete DNS zones.

**Use Case:** Technical leads, DevOps managers

**Key Permissions:**
- ✅ Edit organization settings
- ✅ Invite/remove team members
- ✅ Change member roles (except other SuperAdmins)
- ✅ View and manage billing/subscriptions
- ✅ Create/edit/delete DNS zones
- ✅ Create/edit/delete DNS records
- ✅ Create/edit/delete tags
- ❌ Cannot delete the organization

**Database Value:** `'Admin'`

---

### 3. BillingContact

**Description:** Can manage billing and subscriptions only. Read-only access to DNS and team information.

**Use Case:** Finance team members, accounting personnel

**Key Permissions:**
- ✅ View and manage billing/subscriptions
- ✅ Change subscription plans
- ✅ Update payment methods
- ✅ View and download invoices
- ✅ Manage billing contact info and tax details
- ✅ View organization members (read-only)
- ✅ View DNS zones and records (read-only)
- ❌ Cannot invite/remove team members
- ❌ Cannot create/edit/delete DNS zones or records
- ❌ Cannot edit organization settings

**Database Value:** `'BillingContact'`

---

### 4. Editor

**Description:** Can fully manage DNS zones, records, and tags. Read-only access to organization settings and billing.

**Use Case:** DNS administrators, junior DevOps engineers

**Key Permissions:**
- ✅ Create/edit/delete DNS zones
- ✅ Create/edit/delete DNS records
- ✅ Create/edit/delete tags
- ✅ Assign tags to zones
- ✅ View organization settings (read-only)
- ✅ View organization members (read-only)
- ❌ Cannot view billing information
- ❌ Cannot invite/remove team members
- ❌ Cannot edit organization settings

**Database Value:** `'Editor'`

---

### 5. Viewer

**Description:** Read-only access to organization, DNS zones, and records.

**Use Case:** Auditors, stakeholders, observers

**Key Permissions:**
- ✅ View organization settings
- ✅ View organization members and roles
- ✅ View DNS zones and records
- ✅ Export DNS data
- ❌ Cannot modify anything
- ❌ Cannot view billing information
- ❌ Cannot invite/remove team members

**Database Value:** `'Viewer'`

---

## Global SuperAdmin

**Stored In:** `profiles.superadmin = true`

**Description:** Javelina platform staff with unrestricted access to all organizations.

**Key Characteristics:**
- Bypasses all RLS policies via `admin-rls-policies.sql`
- Automatically added to all organizations with `SuperAdmin` org-level role
- Accessible via `/admin` portal routes
- Used for platform administration, customer support, and system maintenance

**Separation of Concerns:**
- `profiles.superadmin = true` → Global platform staff
- `organization_members.role = 'SuperAdmin'` → Org-level manifestation when acting within a specific org

---

## Complete Permissions Matrix

| Permission | SuperAdmin | Admin | BillingContact | Editor | Viewer |
|-----------|-----------|-------|----------------|--------|--------|
| **Organization Management** |
| Access assigned org | ✅ | ✅ | ✅ | ✅ | ✅ |
| View org settings | ✅ | ✅ | ✅ | ✅ | ✅ |
| Edit org settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete organization | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Team Management** |
| View member list & roles | ✅ | ✅ | ✅ | ✅ | ✅ |
| Invite members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Assign/change roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Billing & Subscriptions** |
| View billing & subscriptions | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update payment methods | ✅ | ✅ | ✅ | ❌ | ❌ |
| View & download invoices | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change plan (upgrade/downgrade) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage billing contact & tax info | ✅ | ✅ | ✅ | ❌ | ❌ |
| **DNS Zones** |
| View DNS zones | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create DNS zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit DNS zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete DNS zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| **DNS Records** |
| View DNS records | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/edit/delete records | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Tags** |
| View tags | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create/edit/delete tags | ✅ | ✅ | ❌ | ✅ | ❌ |
| Assign tags to zones | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## Enforcement Layers

### 1. Database (Supabase RLS)

**Location:** `supabase/migrations/` and `supabase/admin-rls-policies.sql`

**Key Tables:**
- `organization_members` - Stores user-org relationships and roles
- `organizations` - RLS checks membership and role for updates/deletes
- `zones` - RLS checks org membership and role for CRUD operations
- `zone_records` - RLS checks via zones → org membership and role
- `tags` - RLS restricts create/update/delete to Admin roles
- `subscriptions` - RLS allows BillingContact to update

**Key Policies:**
- Global SuperAdmin bypass: `profiles.superadmin = true` grants full access
- Org membership check: `EXISTS (SELECT 1 FROM organization_members WHERE user_id = auth.uid())`
- Role-specific checks: `AND om.role IN ('SuperAdmin', 'Admin', 'BillingContact')`

**Example RLS Policy:**
```sql
CREATE POLICY "Users can update their org subscriptions"
  ON public.subscriptions 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = ANY (ARRAY['SuperAdmin', 'Admin', 'BillingContact'])
    )
  );
```

---

### 2. Backend API (Express)

**Location:** Express backend repo (separate from frontend)

**Enforcement Mechanism:**
- RBAC middleware in `middleware/rbac.js`
- Applied to routes before handlers execute
- Fetches user's org role and validates against allowed roles

**Key Functions:**
```javascript
requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact'])
requireOrgMember() // Any role
```

**Implementation Status:** 📋 Documented in `BACKEND_RBAC_IMPLEMENTATION.md`

---

### 3. Frontend UI (React/Next.js)

**Location:** `lib/permissions.ts`, component-level checks

**Enforcement Mechanism:**
- Permission helper functions check user's org role
- UI elements (buttons, forms, modals) conditionally render based on permissions
- Provides immediate feedback without round-trip to server

**Key Functions:**
```typescript
// Organization & Team Management
canManageOrganizationSettings(orgRole) // SuperAdmin, Admin
canInviteMembers(orgRole) // SuperAdmin, Admin
canManageRoles(orgRole) // SuperAdmin, Admin

// Billing
canViewBilling(orgRole) // SuperAdmin, Admin, BillingContact
canManageBilling(orgRole) // SuperAdmin, Admin, BillingContact
canChangePlan(orgRole) // SuperAdmin, Admin, BillingContact
canUpdatePaymentMethods(orgRole) // SuperAdmin, Admin, BillingContact
canViewInvoices(orgRole) // SuperAdmin, Admin, BillingContact

// DNS Zones
canCreateZone(orgRole) // SuperAdmin, Admin, Editor
canEditZone(orgRole) // SuperAdmin, Admin, Editor
canDeleteZone(orgRole) // SuperAdmin, Admin

// DNS Records
canEditRecords(orgRole) // SuperAdmin, Admin, Editor

// Read-only check
isReadOnly(orgRole) // Returns true for Viewer and BillingContact (for DNS)
```

**Implementation Status:** ✅ Completed

---

## Multi-Organization Support

### User Membership Model

- ✅ Users can belong to **multiple organizations**
- ✅ Users can have **different roles** in each organization
- ✅ Role context is determined by which organization the user is currently viewing/operating in

### Role Context Resolution

1. **Frontend:**
   - User selects organization from sidebar/dropdown
   - Frontend fetches user's role in that organization
   - UI adapts based on role in current org context

2. **Backend:**
   - Extract org ID from request (path param or body)
   - Fetch user's role in that org from `organization_members`
   - Validate against allowed roles for that endpoint

3. **Database:**
   - RLS policies automatically filter based on `auth.uid()`
   - No manual org context switching needed

### Example Flow

```
User: Alice
Organizations:
  - Acme Corp (role: Admin)
  - Personal Projects (role: Editor)

Alice views Acme Corp:
  ✅ Can invite members (Admin)
  ✅ Can manage billing (Admin)
  ✅ Can create/edit zones (Admin)

Alice views Personal Projects:
  ❌ Cannot invite members (Editor)
  ❌ Cannot manage billing (Editor)
  ✅ Can create/edit zones (Editor)
```

---

## Special Cases & Business Logic

### 1. Zone Deletion (No Restriction for Editor)

**Rule:** `SuperAdmin`, `Admin`, and `Editor` can all delete DNS zones

**Rationale:** Editors are trusted DNS administrators who need full CRUD access

**Enforcement:**
- RLS policy allows `SuperAdmin`/`Admin`/`Editor`
- Backend route requires `requireOrgRole(['SuperAdmin', 'Admin', 'Editor'])`
- Frontend shows delete button for `Editor` via `canDeleteZone()`

### 2. Tag Management

**Rule:** `SuperAdmin`, `Admin`, and `Editor` can create/edit/delete tags and assign them to zones

**Rationale:** Editors manage DNS resources and need full tag management capabilities

**Enforcement:**
- RLS policies updated in `20251217000001_fix_editor_permissions.sql`
- Backend routes require `requireOrgRole(['SuperAdmin', 'Admin', 'Editor'])`
- Frontend tag creation UI available to `Editor` role

### 3. Billing Isolation

**Rule:** Only `SuperAdmin`, `Admin`, and `BillingContact` can view/manage billing

**Rationale:** Financial information should be restricted to specific roles

**Enforcement:**
- RLS on `subscriptions` table
- Backend billing routes require `requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact'])`
- Frontend billing pages check `canManageBilling()`

### 4. Self-Protection

**Rules:**
- Users cannot change their own role
- Users cannot remove themselves from an organization
- Warn when removing the last SuperAdmin/Admin

**Rationale:** Prevent accidental lockout

**Enforcement:**
- Backend validation in role change/remove endpoints
- Frontend disables self-targeting actions (future enhancement)

---

## Implementation Files

### Frontend (Javelina Repo)

| File | Purpose | Status |
|------|---------|--------|
| `lib/auth-store.ts` | Role type definitions | ✅ Updated |
| `lib/permissions.ts` | Permission helper functions | ✅ Updated |
| `types/supabase.ts` | Database type definitions | ✅ Updated |
| `lib/actions/admin/organizations.ts` | Admin actions with role validation | ✅ Updated |
| `lib/actions/profile.ts` | Profile actions with role types | ✅ Updated |
| `app/settings/billing/[org_id]/page.tsx` | Billing page access control | ✅ Updated |
| `app/organization/[orgId]/OrganizationClient.tsx` | Org role type | ✅ Updated |
| `app/profile/page.tsx` | Role display logic | ✅ Updated |
| `app/admin/organizations/[id]/page.tsx` | Admin role management UI | ✅ Updated |
| `components/modals/InviteUsersModal.tsx` | Invite role dropdown | ✅ Updated |
| `components/modals/ManageTeamMembersModal.tsx` | Team management modal | ✅ Updated |
| `components/organization/InviteUsersBox.tsx` | Invite box component | ✅ Updated |

### Database (Supabase)

| File | Purpose | Status |
|------|---------|--------|
| `supabase/migrations/20251217000000_add_billing_contact_role.sql` | Add BillingContact role and update RLS | ✅ Created |
| `supabase/admin-rls-policies.sql` | Global SuperAdmin RLS bypass | ✅ Compatible |
| `supabase/migrations/20251205000000_remove_environments.sql` | Current DNS zone RLS policies | ✅ Compatible |
| `supabase/migrations/20251209000000_create_tags_tables.sql` | Tags RLS policies | ✅ Compatible |
| `supabase/migrations/20251124200005_comprehensive_subscription_fix.sql` | Subscription RLS | ✅ Updated in new migration |

### Backend (Express Repo - Separate)

| File | Purpose | Status |
|------|---------|--------|
| `middleware/rbac.js` | Role authorization helpers | 📋 To be created |
| `routes/organizations.js` | Org and team management routes | 📋 To be updated |
| `routes/billing.js` or `routes/subscriptions.js` | Billing routes | 📋 To be updated |
| `routes/zones.js` | DNS zone routes | 📋 To be updated |
| `routes/dns-records.js` | DNS record routes | 📋 To be updated |
| `routes/tags.js` | Tags routes | 📋 To be updated |
| `tests/middleware/rbac.test.js` | RBAC unit tests | 📋 To be created |
| `tests/integration/billing.test.js` | Billing integration tests | 📋 To be created |

**See:** `BACKEND_RBAC_IMPLEMENTATION.md` for complete backend implementation guide.

---

## Usage Examples

### Frontend Permission Checks

```typescript
import { 
  canManageBilling, 
  canInviteMembers, 
  canDeleteZone, 
  canEditRecords 
} from '@/lib/permissions';

// In a component
const userOrgRole = user.organizations.find(o => o.id === currentOrgId)?.role;

// Check if user can see billing section
if (canManageBilling(userOrgRole)) {
  return <BillingSection />;
}

// Check if user can invite members
if (canInviteMembers(userOrgRole)) {
  return <Button onClick={openInviteModal}>Invite Team Member</Button>;
}

// Check if user can delete zones
if (canDeleteZone(userOrgRole)) {
  return <Button onClick={deleteZone} variant="danger">Delete Zone</Button>;
}

// Check if user is read-only for DNS
if (isReadOnly(userOrgRole)) {
  return <ReadOnlyNotice>You have view-only access to DNS zones</ReadOnlyNotice>;
}
```

### Backend Authorization Checks

```javascript
const { requireOrgRole, requireOrgMember } = require('../middleware/rbac');

// Billing route - allow Admin, SuperAdmin, BillingContact
router.post('/api/subscriptions/:orgId/change-plan',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']),
  async (req, res) => {
    // Handle plan change
  }
);

// DNS zone creation - allow Admin, SuperAdmin, Editor
router.post('/api/zones',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']),
  async (req, res) => {
    // Handle zone creation
  }
);

// View zones - allow any member
router.get('/api/zones/organization/:orgId',
  authenticateUser,
  requireOrgMember(),
  async (req, res) => {
    // Return zones (RLS will filter appropriately)
  }
);

// Invite member - allow only Admin and SuperAdmin
router.post('/api/organizations/:orgId/members/invite',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']),
  async (req, res) => {
    // Handle invitation
  }
);
```

### Database RLS Example

```sql
-- Zone creation policy
CREATE POLICY "SuperAdmin and Admin and Editor can create zones"
  ON public.zones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = zones.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('SuperAdmin', 'Admin', 'Editor')
    )
  );

-- Subscription update policy  
CREATE POLICY "Users can update their org subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = subscriptions.org_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = ANY (ARRAY['SuperAdmin', 'Admin', 'BillingContact'])
    )
  );
```

---

## Role Display & Styling

### Display Names

| Database Value | Display Name | UI Label |
|---------------|--------------|----------|
| `SuperAdmin` | SuperUser | SuperAdmin - Full access |
| `Admin` | SuperUser | Admin - Can manage resources |
| `BillingContact` | Billing Contact | Billing Contact - Can manage billing |
| `Editor` | Editor | Editor - Can manage DNS |
| `Viewer` | Viewer | Viewer - Can view only |

### Badge Colors

| Role | Light Mode | Dark Mode |
|------|-----------|-----------|
| SuperAdmin | Orange | Orange |
| Admin | Blue-electric | Blue-electric |
| BillingContact | Blue | Blue |
| Editor | Green | Green |
| Viewer | Gray | Gray |

**Implementation:** See `getRoleBadgeColor()` in `lib/permissions.ts`

---

## Migration Strategy

### For Existing Organizations

**No immediate action required.** Existing members with roles will continue to work:
- `SuperAdmin` → No change
- `Admin` → No change
- `Editor` → No change
- `Viewer` → No change

### Adding BillingContact Members

Once backend implements the RBAC changes:

1. Admins/SuperAdmins can invite new members with `BillingContact` role
2. Admins/SuperAdmins can change existing members to `BillingContact` role
3. BillingContact members gain access to billing pages automatically
4. BillingContact members remain read-only for DNS zones/records

---

## Testing Strategy

### Unit Tests

**Frontend:**
- Test all permission helpers return correct values for each role
- Test role hierarchy comparison logic
- Test role display and color mapping

**Backend:**
- Test `getUserOrgRole()` retrieves correct role
- Test `hasOrgRole()` validates permissions correctly
- Test `requireOrgRole()` middleware blocks/allows requests appropriately

### Integration Tests

**Billing Endpoints:**
- ✅ SuperAdmin can access all billing endpoints
- ✅ Admin can access all billing endpoints
- ✅ BillingContact can access all billing endpoints
- ❌ Editor cannot access billing endpoints (403)
- ❌ Viewer cannot access billing endpoints (403)

**DNS Endpoints:**
- ✅ SuperAdmin can create/edit/delete zones and records
- ✅ Admin can create/edit/delete zones and records
- ❌ BillingContact can only view zones and records (403 on write)
- ✅ Editor can create/edit zones and records
- ✅ Editor can view but cannot delete zones (403 on delete)
- ❌ Viewer can only view (403 on all writes)

**Team Management Endpoints:**
- ✅ SuperAdmin can invite/remove members and change roles
- ✅ Admin can invite/remove members and change roles (except other SuperAdmins)
- ❌ BillingContact cannot invite/remove or change roles (403)
- ❌ Editor cannot invite/remove or change roles (403)
- ❌ Viewer cannot invite/remove or change roles (403)

### End-to-End Tests

1. Create test user with `BillingContact` role
2. Verify they can:
   - View billing dashboard
   - Change subscription plan
   - Update payment method
   - View and download invoices
   - View DNS zones (read-only)
   - View team members (read-only)
3. Verify they cannot:
   - Create/edit/delete DNS zones
   - Create/edit/delete DNS records
   - Invite/remove team members
   - Change member roles
   - Edit organization settings

---

## Troubleshooting

### Issue: BillingContact Cannot Access Billing Page

**Check:**
1. Database: Verify migration applied and role constraint includes `'BillingContact'`
   ```sql
   SELECT role FROM organization_members WHERE user_id = '...' AND organization_id = '...';
   ```
2. Frontend: Check `app/settings/billing/[org_id]/page.tsx` includes `'BillingContact'` in access check
3. Backend: Verify billing routes allow `'BillingContact'` role

### Issue: Editor Can Delete Zones

**Check:**
1. RLS Policy: Verify delete policy only allows `SuperAdmin` and `Admin`
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'zones' AND policyname LIKE '%delete%';
   ```
2. Backend: Verify zone deletion route uses `requireOrgRole(['SuperAdmin', 'Admin'])`
3. Frontend: Verify delete button hidden for Editor via `canDeleteZone()`

### Issue: User Has Wrong Role

**Check:**
1. Database: Query actual role
   ```sql
   SELECT om.role, o.name 
   FROM organization_members om
   JOIN organizations o ON o.id = om.organization_id
   WHERE om.user_id = '...';
   ```
2. Frontend: Clear auth store cache and refresh
3. Backend: Check profile endpoint returns correct role in organizations array

---

## Related Documentation

- `BACKEND_RBAC_IMPLEMENTATION.md` - Complete backend implementation guide with code samples
- `TEAM_MANAGEMENT_RULES.md` - Detailed team management rules and invitation flow
- `lib/permissions.ts` - Frontend permission helper implementation
- `supabase/admin-rls-policies.sql` - Global SuperAdmin RLS bypass policies
- `BACKEND_API_REQUIREMENTS.md` - Original API specification
- `TAGS_API_REQUIREMENTS.md` - Tags API specification

---

## Changelog

### v1.0 - December 17, 2024
- Initial RBAC reference document
- Added `BillingContact` as fifth organization role
- Defined complete permissions matrix
- Documented enforcement at DB, backend, and frontend layers
- Created migration and implementation guides

