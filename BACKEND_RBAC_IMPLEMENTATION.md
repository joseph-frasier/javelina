# Backend RBAC Implementation Guide

## Overview

This document outlines all required backend changes to support the updated Role-Based Access Control (RBAC) system with five organization-level roles: `SuperAdmin`, `Admin`, `BillingContact`, `Editor`, and `Viewer`.

**For team member management endpoints specifically**, see `TEAM_MEMBERS_API_REQUIREMENTS.md` which provides detailed API contracts, error codes, and implementation examples.

## Database Changes

### Migration: Add BillingContact Role

**File:** `supabase/migrations/20251217000000_add_billing_contact_role.sql`

**Status:** ✅ Created in Javelina frontend repo

**What it does:**
- Adds `BillingContact` to the `organization_members.role` check constraint
- Updates billing RLS policies to allow `BillingContact` to manage subscriptions
- Documents role semantics in comments

**Action Required:** Apply this migration to the dev database when ready to test.

---

## Role Definitions & Permissions Matrix

### Role Hierarchy

```
SuperAdmin (5) - Full access to everything, bypass RLS globally
├─ Admin (4) - Manage org, members, billing, DNS
├─ BillingContact (3) - Manage billing only, read-only for DNS
├─ Editor (2) - Manage DNS zones/records, read-only for org/billing
└─ Viewer (1) - Read-only access to everything
```

### Permission Matrix by Feature Area

| Feature Area | SuperAdmin | Admin | BillingContact | Editor | Viewer |
|-------------|-----------|-------|----------------|--------|--------|
| **Organization Management** |
| View org settings | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ |
| Edit org settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete organization | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Team Management** |
| View members & roles | ✅ | ✅ | ✅ (read-only) | ✅ (read-only) | ✅ |
| Invite members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change member roles | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Billing & Subscriptions** |
| View billing info | ✅ | ✅ | ✅ | ❌ | ❌ |
| View invoices | ✅ | ✅ | ✅ | ❌ | ❌ |
| Change plan | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update payment methods | ✅ | ✅ | ✅ | ❌ | ❌ |
| Manage tax info | ✅ | ✅ | ✅ | ❌ | ❌ |
| **DNS Zones** |
| View zones | ✅ | ✅ | ✅ (read-only) | ✅ | ✅ |
| Create zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete zones | ✅ | ✅ | ❌ | ✅ | ❌ |
| **DNS Records** |
| View records | ✅ | ✅ | ✅ (read-only) | ✅ | ✅ |
| Create records | ✅ | ✅ | ❌ | ✅ | ❌ |
| Edit records | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete records | ✅ | ✅ | ❌ | ✅ | ❌ |
| **Tags** |
| View tags | ✅ | ✅ | ✅ (read-only) | ✅ | ✅ |
| Create/Edit tags | ✅ | ✅ | ❌ | ✅ | ❌ |
| Delete tags | ✅ | ✅ | ❌ | ✅ | ❌ |
| Assign tags to zones | ✅ | ✅ | ❌ | ✅ | ❌ |

---

## Required Backend Changes

### 1. Create Authorization Helpers

**File:** `middleware/rbac.js` (create new)

```javascript
/**
 * RBAC Authorization Helpers
 * Centralized role checking for consistent enforcement across routes
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Get user's role in an organization
 * @param {string} userId - Supabase auth user ID
 * @param {string} orgId - Organization UUID
 * @returns {Promise<string|null>} Role string or null if not a member
 */
async function getUserOrgRole(userId, orgId) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', orgId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data.role;
}

/**
 * Check if user has any of the allowed roles in an organization
 * @param {string} userId - Supabase auth user ID
 * @param {string} orgId - Organization UUID
 * @param {string[]} allowedRoles - Array of allowed role strings
 * @returns {Promise<boolean>} True if user has one of the allowed roles
 */
async function hasOrgRole(userId, orgId, allowedRoles) {
  const role = await getUserOrgRole(userId, orgId);
  return role && allowedRoles.includes(role);
}

/**
 * Middleware: Require user to have specific org roles
 * Usage: router.post('/:orgId/zones', requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), ...)
 */
function requireOrgRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const userId = req.user.id; // Assumes authenticateUser middleware sets req.user
      const orgId = req.params.orgId || req.body.organization_id;

      if (!orgId) {
        return res.status(400).json({ error: 'Organization ID required' });
      }

      const hasAccess = await hasOrgRole(userId, orgId, allowedRoles);

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required_roles: allowedRoles
        });
      }

      // Store role in request for potential use in handlers
      req.userOrgRole = await getUserOrgRole(userId, orgId);
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Authorization check failed' });
    }
  };
}

/**
 * Middleware: Require user to be any member of an organization
 */
function requireOrgMember() {
  return requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer']);
}

module.exports = {
  getUserOrgRole,
  hasOrgRole,
  requireOrgRole,
  requireOrgMember
};
```

---

### 2. Update Route Authorization

#### A. Organizations Routes (`routes/organizations.js`)

**Add Member Endpoint:**
```javascript
const { requireOrgRole } = require('../middleware/rbac');
const { checkMemberLimit } = require('../middleware/enforcePlanLimits');

// POST /api/organizations/:orgId/members
router.post('/:orgId/members', 
  authenticateUser, 
  requireOrgRole(['SuperAdmin', 'Admin']), // Only SuperAdmin and Admin can add members
  checkMemberLimit, // Enforce plan limits
  async (req, res) => {
    // Add member logic - see TEAM_MEMBERS_API_REQUIREMENTS.md
    // Validate that req.body.role is one of:
    // ['Admin', 'BillingContact', 'Editor', 'Viewer']
    // NOTE: SuperAdmin is NOT allowed for customer-facing member addition
  }
);
```

**Note:** The previous `/members/invite` endpoint is deprecated for customer use. See `TEAM_MEMBERS_API_REQUIREMENTS.md` for the new direct-add flow.
```

**Remove Member Endpoint:**
```javascript
// DELETE /api/organizations/:orgId/members/:memberId
router.delete('/:orgId/members/:memberId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']), // Only SuperAdmin and Admin can remove
  async (req, res) => {
    // Existing remove logic
  }
);
```

**Change Member Role Endpoint:**
```javascript
// PUT /api/organizations/:orgId/members/:memberId/role
router.put('/:orgId/members/:memberId/role',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']), // Only SuperAdmin and Admin can change roles
  async (req, res) => {
    const { role } = req.body;
    
    // Validate role
    const validRoles = ['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Existing change role logic
  }
);
```

**View Organization Settings:**
```javascript
// GET /api/organizations/:orgId
router.get('/:orgId',
  authenticateUser,
  requireOrgMember(), // All members can view
  async (req, res) => {
    // Existing view logic
  }
);
```

**Update Organization Settings:**
```javascript
// PUT /api/organizations/:orgId
router.put('/:orgId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']), // Only SuperAdmin and Admin can edit
  async (req, res) => {
    // Existing update logic
  }
);
```

---

#### B. Billing/Subscription Routes (`routes/subscriptions.js` or `routes/billing.js`)

**View Subscription:**
```javascript
const { requireOrgRole } = require('../middleware/rbac');

// GET /api/subscriptions/:orgId
router.get('/:orgId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']), // Billing roles only
  async (req, res) => {
    // Existing view subscription logic
  }
);
```

**Change Plan:**
```javascript
// POST /api/subscriptions/:orgId/change-plan
router.post('/:orgId/change-plan',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']), // Billing roles only
  async (req, res) => {
    // Existing change plan logic
  }
);
```

**Create Stripe Portal Session:**
```javascript
// POST /api/stripe/create-portal-session
router.post('/create-portal-session',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']), // Billing roles only
  async (req, res) => {
    const { orgId } = req.body;
    // Existing portal session logic
  }
);
```

**View Invoices:**
```javascript
// GET /api/billing/:orgId/invoices
router.get('/:orgId/invoices',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']), // Billing roles only
  async (req, res) => {
    // Existing invoices logic
  }
);
```

**Update Payment Method:**
```javascript
// PUT /api/billing/:orgId/payment-method
router.put('/:orgId/payment-method',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'BillingContact']), // Billing roles only
  async (req, res) => {
    // Existing payment method logic
  }
);
```

---

#### C. DNS Zones Routes (`routes/zones.js`)

**List Zones (View):**
```javascript
const { requireOrgMember } = require('../middleware/rbac');

// GET /api/zones/organization/:orgId
router.get('/organization/:orgId',
  authenticateUser,
  requireOrgMember(), // All members can view
  async (req, res) => {
    // Existing list zones logic
  }
);
```

**Create Zone:**
```javascript
const { requireOrgRole } = require('../middleware/rbac');

// POST /api/zones
router.post('/',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles only
  async (req, res) => {
    // Existing create zone logic
  }
);
```

**Update Zone:**
```javascript
// PUT /api/zones/:id
router.put('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles only
  async (req, res) => {
    // Existing update zone logic
  }
);
```

**Delete Zone:**
```javascript
// DELETE /api/zones/:id
router.delete('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS administrators can delete
  async (req, res) => {
    // Existing delete zone logic
  }
);
```

**Verify Zone:**
```javascript
// PUT /api/zones/:id/verification
router.put('/:id/verification',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin']), // Only SuperAdmin and Admin can verify
  async (req, res) => {
    // Existing verification logic
  }
);
```

---

#### D. DNS Records Routes (`routes/dns-records.js`)

**View Records:**
```javascript
const { requireOrgMember } = require('../middleware/rbac');

// GET /api/dns-records/zone/:zoneId
router.get('/zone/:zoneId',
  authenticateUser,
  requireOrgMember(), // All members can view
  async (req, res) => {
    // Note: Need to fetch zone's org_id first to check membership
    // Existing view records logic
  }
);
```

**Create Record:**
```javascript
const { requireOrgRole } = require('../middleware/rbac');

// POST /api/dns-records
router.post('/',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles only
  async (req, res) => {
    // Note: Need to fetch zone's org_id from zone_id to check role
    // Existing create record logic
  }
);
```

**Update Record:**
```javascript
// PUT /api/dns-records/:id
router.put('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles only
  async (req, res) => {
    // Note: Need to fetch record's zone, then zone's org_id to check role
    // Existing update record logic
  }
);
```

**Delete Record:**
```javascript
// DELETE /api/dns-records/:id
router.delete('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles only
  async (req, res) => {
    // Note: Need to fetch record's zone, then zone's org_id to check role
    // Existing delete record logic
  }
);
```

---

#### E. Tags Routes (`routes/tags.js`)

**View Tags:**
```javascript
const { requireOrgMember } = require('../middleware/rbac');

// GET /api/tags?org_id=:orgId
router.get('/',
  authenticateUser,
  requireOrgMember(), // All members can view
  async (req, res) => {
    // Existing view tags logic
  }
);
```

**Create Tag:**
```javascript
const { requireOrgRole } = require('../middleware/rbac');

// POST /api/tags
router.post('/',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS administrators can create tags
  async (req, res) => {
    // Existing create tag logic
  }
);
```

**Update Tag:**
```javascript
// PUT /api/tags/:id
router.put('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS administrators can update tags
  async (req, res) => {
    // Existing update tag logic
  }
);
```

**Delete Tag:**
```javascript
// DELETE /api/tags/:id
router.delete('/:id',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS administrators can delete tags
  async (req, res) => {
    // Existing delete tag logic
  }
);
```

**Assign Tags to Zone:**
```javascript
// PUT /api/tags/zones/:zoneId
router.put('/zones/:zoneId',
  authenticateUser,
  requireOrgRole(['SuperAdmin', 'Admin', 'Editor']), // DNS write roles can assign tags
  async (req, res) => {
    // Note: Need to fetch zone's org_id to check role
    // Existing assign tags logic
  }
);
```

---

### 3. Update Profile Endpoint

**File:** `routes/profile.js` or `routes/users.js`

**Get User Profile:**
```javascript
// GET /api/users/profile
router.get('/profile',
  authenticateUser,
  async (req, res) => {
    try {
      const userId = req.user.id;
      
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        return res.status(500).json({ error: 'Failed to fetch profile' });
      }
      
      // Fetch organizations with roles (including BillingContact)
      const { data: orgs, error: orgsError } = await supabase
        .from('organizations')
        .select(`
          id,
          name,
          organization_members!inner(role)
        `)
        .eq('organization_members.user_id', userId);
      
      if (orgsError) {
        return res.status(500).json({ error: 'Failed to fetch organizations' });
      }
      
      // Format organizations array
      const organizations = orgs.map(org => ({
        id: org.id,
        name: org.name,
        role: org.organization_members[0].role // Will include 'BillingContact' now
      }));
      
      res.json({
        data: {
          ...profile,
          organizations
        }
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);
```

---

### 4. Validation Updates

Anywhere in the backend that validates role values, update to include `'BillingContact'`:

**Example validation helper:**
```javascript
function isValidOrgRole(role) {
  return ['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'].includes(role);
}
```

**Use in invite/role change endpoints:**
```javascript
// Validate role before inserting/updating
if (!isValidOrgRole(req.body.role)) {
  return res.status(400).json({ error: 'Invalid role' });
}
```

---

## Testing Requirements

### Unit Tests

Create tests for the new RBAC helpers:

**File:** `tests/middleware/rbac.test.js`

```javascript
describe('RBAC Helpers', () => {
  describe('getUserOrgRole', () => {
    it('should return role for valid user and org', async () => {
      // Test implementation
    });
    
    it('should return null for non-member', async () => {
      // Test implementation
    });
  });
  
  describe('hasOrgRole', () => {
    it('should return true when user has allowed role', async () => {
      // Test implementation
    });
    
    it('should return false when user lacks required role', async () => {
      // Test implementation
    });
  });
  
  describe('requireOrgRole middleware', () => {
    it('should pass through when role is allowed', async () => {
      // Test implementation
    });
    
    it('should return 403 when role is not allowed', async () => {
      // Test implementation
    });
  });
});
```

### Integration Tests

Test each role's access to various endpoints:

**Example test structure:**
```javascript
describe('Organization Billing Endpoints', () => {
  describe('GET /api/subscriptions/:orgId', () => {
    it('should allow SuperAdmin to view subscription', async () => {
      // Test with SuperAdmin user
    });
    
    it('should allow Admin to view subscription', async () => {
      // Test with Admin user
    });
    
    it('should allow BillingContact to view subscription', async () => {
      // Test with BillingContact user
    });
    
    it('should deny Editor from viewing subscription', async () => {
      // Test with Editor user, expect 403
    });
    
    it('should deny Viewer from viewing subscription', async () => {
      // Test with Viewer user, expect 403
    });
  });
  
  describe('POST /api/subscriptions/:orgId/change-plan', () => {
    it('should allow BillingContact to change plan', async () => {
      // Test with BillingContact user
    });
    
    it('should deny Editor from changing plan', async () => {
      // Test with Editor user, expect 403
    });
  });
});

describe('DNS Zone Endpoints', () => {
  describe('POST /api/zones', () => {
    it('should allow Editor to create zone', async () => {
      // Test with Editor user
    });
    
    it('should deny BillingContact from creating zone', async () => {
      // Test with BillingContact user, expect 403
    });
    
    it('should deny Viewer from creating zone', async () => {
      // Test with Viewer user, expect 403
    });
  });
  
  describe('DELETE /api/zones/:id', () => {
    it('should allow Editor to delete zone', async () => {
      // Test with Editor user
    });
    
    it('should deny BillingContact from deleting zone', async () => {
      // Test with BillingContact user, expect 403
    });
    
    it('should deny Viewer from deleting zone', async () => {
      // Test with Viewer user, expect 403
    });
  });
});

describe('Tag Endpoints', () => {
  describe('POST /api/tags', () => {
    it('should allow Editor to create tag', async () => {
      // Test with Editor user
    });
    
    it('should deny BillingContact from creating tag', async () => {
      // Test with BillingContact user, expect 403
    });
    
    it('should deny Viewer from creating tag', async () => {
      // Test with Viewer user, expect 403
    });
  });
  
  describe('PUT /api/tags/:id', () => {
    it('should allow Editor to update tag', async () => {
      // Test with Editor user
    });
    
    it('should deny Viewer from updating tag', async () => {
      // Test with Viewer user, expect 403
    });
  });
  
  describe('DELETE /api/tags/:id', () => {
    it('should allow Editor to delete tag', async () => {
      // Test with Editor user
    });
    
    it('should deny Viewer from deleting tag', async () => {
      // Test with Viewer user, expect 403
    });
  });
});

describe('Team Management Endpoints', () => {
  // See TEAM_MEMBERS_API_REQUIREMENTS.md for complete endpoint specifications
  
  describe('POST /api/organizations/:orgId/members', () => {
    it('should allow Admin to add members', async () => {
      // Test with Admin user
    });
    
    it('should deny BillingContact from adding members', async () => {
      // Test with BillingContact user, expect 403
    });
    
    it('should deny Editor from adding members', async () => {
      // Test with Editor user, expect 403
    });
    
    it('should return 404 for non-existent user email', async () => {
      // Test with email not in system, expect USER_NOT_FOUND
    });
  });
});
```

---

## Implementation Checklist

### Phase 1: Infrastructure
- [ ] Create `middleware/rbac.js` with authorization helpers
- [ ] Add `isValidOrgRole()` validation helper
- [ ] Update authentication middleware to work with new RBAC helpers

### Phase 2: Route Updates
- [ ] Update organizations routes (invite, remove, change role, edit settings)
- [ ] Update billing/subscriptions routes (view, change plan, portal, invoices)
- [ ] Update DNS zones routes (create, update, delete, verify)
- [ ] Update DNS records routes (create, update, delete)
- [ ] Update tags routes (create, update, delete, assign)
- [ ] Update profile endpoint to return BillingContact role

### Phase 3: Testing
- [ ] Write unit tests for RBAC helpers
- [ ] Write integration tests for each role on billing endpoints
- [ ] Write integration tests for each role on DNS endpoints
- [ ] Write integration tests for each role on team management endpoints
- [ ] Test edge cases (non-members, invalid roles, missing org IDs)

### Phase 4: Documentation
- [ ] Update API documentation to reflect new BillingContact role
- [ ] Document role permissions in README
- [ ] Add examples of using RBAC middleware in route handlers

---

## Migration Path

### Step 1: Deploy Database Changes
1. Apply migration `20251217000000_add_billing_contact_role.sql` to dev database
2. Verify constraint is updated: 
   ```sql
   SELECT conname, pg_get_constraintdef(oid) 
   FROM pg_constraint 
   WHERE conname = 'organization_members_role_check';
   ```

### Step 2: Deploy Backend Changes
1. Add RBAC middleware
2. Update routes one area at a time (billing → DNS → team management)
3. Deploy to staging
4. Run integration tests

### Step 3: Deploy Frontend Changes
Frontend changes have already been implemented in the Javelina repo:
- Updated TypeScript types
- Added billing permission helpers
- Updated UI components to show BillingContact
- Updated role dropdowns in admin/modals

### Step 4: Production Deployment
1. Deploy backend to production
2. Apply migration to production database
3. Deploy frontend to production
4. Monitor for any authorization errors in logs

---

## Rollback Plan

If issues arise:

1. **Database rollback:**
   ```sql
   -- Remove BillingContact from constraint
   ALTER TABLE public.organization_members
   DROP CONSTRAINT IF EXISTS organization_members_role_check;
   
   ALTER TABLE public.organization_members
   ADD CONSTRAINT organization_members_role_check 
   CHECK (role IN ('SuperAdmin', 'Admin', 'Editor', 'Viewer'));
   
   -- Update any BillingContact users to Admin temporarily
   UPDATE public.organization_members
   SET role = 'Admin'
   WHERE role = 'BillingContact';
   ```

2. **Backend rollback:** Revert to previous version before RBAC changes

3. **Frontend rollback:** Revert to previous version (BillingContact will just not appear in dropdowns)

---

## Questions & Clarifications

If you encounter any ambiguity during implementation, refer to the permissions matrix at the top of this document or consult with the team lead.

**Contact:** Seth Chesky
**Date:** December 17, 2024
**Status:** Ready for Implementation

