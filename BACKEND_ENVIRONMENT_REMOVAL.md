# Backend Environment Removal Guide

This document outlines all required changes to the backend Express API to support the removal of the environments layer from the hierarchy.

**New Hierarchy:**
```
Organizations -> Zones -> Zone Records
```

**Previous Hierarchy:**
```
Organizations -> Environments -> Zones -> Zone Records
```

## Database Changes (Already Applied)

The following changes have been applied to the Supabase database:

1. **Zones table** - Added `organization_id` column, removed `environment_id`
2. **Environments table** - Dropped entirely
3. **Organizations table** - Removed `environments_count` column
4. **RLS Policies** - Updated to reference organizations directly
5. **Functions removed** - `update_environment_health_status()`, `user_can_create_environment_in_org()`

---

## API Endpoints to Remove

Remove the following endpoints entirely:

### Environment Routes
```
GET    /api/environments
GET    /api/environments/:id
GET    /api/environments/organization/:orgId
POST   /api/environments
PUT    /api/environments/:id
DELETE /api/environments/:id
```

---

## API Endpoints to Modify

### 1. POST /api/zones - Create Zone

**Before:**
```json
{
  "name": "example.com",
  "environment_id": "uuid-here",
  "description": "Optional description",
  "admin_email": "admin@example.com",
  "negative_caching_ttl": 3600
}
```

**After:**
```json
{
  "name": "example.com",
  "organization_id": "uuid-here",
  "description": "Optional description",
  "admin_email": "admin@example.com",
  "negative_caching_ttl": 3600
}
```

**Authorization:** Check that the authenticated user is a member of the specified organization with `SuperAdmin` or `Admin` role.

---

### 2. GET /api/zones/environment/:envId - REMOVE THIS ENDPOINT

Replace with:

### GET /api/zones/organization/:orgId - List Zones by Organization

Returns all zones for a specific organization.

**Authorization:** User must be a member of the organization.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "example.com",
      "organization_id": "uuid",
      "description": "...",
      "admin_email": "admin@example.com",
      "negative_caching_ttl": 3600,
      "soa_serial": 1,
      "nameservers": [],
      "verification_status": "pending",
      "live": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### 3. GET /api/zones/:id - Get Zone

No request changes needed, but update the response to include `organization_id` instead of `environment_id`.

**Response Update:**
```json
{
  "data": {
    "id": "uuid",
    "name": "example.com",
    "organization_id": "uuid",
    "description": "...",
    ...
  }
}
```

---

### 4. Zone Authorization Checks

All zone CRUD operations should now verify organization membership directly:

**Before (pseudocode):**
```javascript
// Get environment
const environment = await db.environments.findById(zone.environment_id);
// Check org membership through environment
const membership = await db.organization_members.find({
  organization_id: environment.organization_id,
  user_id: currentUser.id
});
```

**After (pseudocode):**
```javascript
// Check org membership directly
const membership = await db.organization_members.find({
  organization_id: zone.organization_id,
  user_id: currentUser.id
});
```

---

## Database Queries to Update

### Zone Queries

**Before:**
```sql
SELECT z.*, e.organization_id 
FROM zones z
JOIN environments e ON e.id = z.environment_id
WHERE e.organization_id = $1;
```

**After:**
```sql
SELECT * FROM zones
WHERE organization_id = $1;
```

### Zone Insert

**Before:**
```sql
INSERT INTO zones (name, environment_id, description, ...)
VALUES ($1, $2, $3, ...);
```

**After:**
```sql
INSERT INTO zones (name, organization_id, description, ...)
VALUES ($1, $2, $3, ...);
```

---

## Files to Remove (Backend)

- `routes/environments.ts` (or equivalent)
- `controllers/environmentController.ts` (or equivalent)
- `models/environment.ts` (or equivalent)
- Any environment-related middleware or services

---

## Files to Update (Backend)

### Zone Routes/Controller
- Remove `environment_id` parameter handling
- Add `organization_id` parameter handling
- Update validation schemas
- Remove environment existence checks

### Authorization Middleware
- Update zone authorization to check organization membership directly
- Remove environment-based authorization logic

### Types/Interfaces
- Remove `Environment` type
- Update `Zone` type to use `organization_id`

---

## Migration Checklist

- [ ] Remove environment routes and controller
- [ ] Update zone creation to use `organization_id`
- [ ] Add `GET /api/zones/organization/:orgId` endpoint
- [ ] Remove `GET /api/zones/environment/:envId` endpoint
- [ ] Update all zone queries to use `organization_id`
- [ ] Update zone authorization middleware
- [ ] Update TypeScript types/interfaces
- [ ] Update API documentation
- [ ] Test all zone CRUD operations
- [ ] Deploy and verify

---

## Testing

After making changes, verify the following:

1. **Create Zone:** Can create a zone directly under an organization
2. **List Zones:** Can list all zones for an organization
3. **Get Zone:** Returns zone with `organization_id` field
4. **Update Zone:** Still works correctly
5. **Delete Zone:** Still works correctly
6. **Authorization:** Users can only access zones in their organizations
7. **RLS:** Row-level security policies work correctly

---

## Frontend Expectations

### Current State (Temporary)

The frontend currently makes direct Supabase calls for data reads (this is an architecture issue that will be fixed separately). The Express API is primarily used for **mutations** (create, update, delete).

**For now:** Just return `organization_id` in zone responses - no nested organization data required.

### Zone Response Structure

```json
{
  "data": {
    "id": "uuid",
    "name": "example.com",
    "organization_id": "uuid",
    "description": "...",
    "admin_email": "admin@example.com",
    "negative_caching_ttl": 3600,
    "soa_serial": 1,
    "nameservers": [],
    "verification_status": "pending",
    "live": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

### Fields No Longer Expected

The frontend no longer expects or uses:
- `environment_id` on zones
- Any environment-related nested data
- `environments_count` on organizations

### Cache Invalidation Keys

The frontend uses React Query with these cache keys:
- `['zones', organizationId]` - List of zones for an org
- Sidebar and zone lists invalidate cache using `zone.organization_id`

### Zone Creation Request

The frontend sends zone creation requests with:
```json
{
  "name": "example.com",
  "organization_id": "uuid",
  "description": "optional",
  "admin_email": "admin@example.com",
  "negative_caching_ttl": 3600
}
```

---

## API Client Changes (Frontend Reference)

For reference, the frontend API client (`lib/api-client.ts`) now expects:

```typescript
// REMOVED - environmentsApi object entirely

// UPDATED - zonesApi
zonesApi = {
  list: () => GET /zones
  listByOrganization: (orgId) => GET /zones/organization/:orgId  // NEW
  get: (id) => GET /zones/:id
  create: (data) => POST /zones  // expects organization_id, not environment_id
  update: (id, data) => PUT /zones/:id
  delete: (id) => DELETE /zones/:id
}
```

---

## Notes

- The frontend has already been updated to use `organization_id`
- Database RLS policies have been updated and are enforcing the new hierarchy
- No backwards compatibility needed - all test data will be cleaned before launch
- The `lib/api/hierarchy.ts` file still has legacy environment functions but they are not actively used
- Mock data files (`lib/mock-hierarchy-data.ts`, `types/supabase.ts`) still contain environment types but don't affect runtime

## Known Frontend Architecture Issue (Separate Fix)

Several frontend pages currently make direct Supabase calls for data reads instead of going through the Express API:
- `app/organization/[orgId]/page.tsx`
- `app/zone/[id]/page.tsx`
- `app/analytics/page.tsx`

This will be fixed separately. Once fixed, the Express API may need to return nested organization data. For now, just `organization_id` is sufficient.

