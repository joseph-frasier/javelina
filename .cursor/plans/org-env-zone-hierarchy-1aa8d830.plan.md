<!-- 1aa8d830-a95f-43f4-b6ca-7cfd8ca3e8a8 9db40176-49b6-4961-a7d1-7f1a4c6017d1 -->
# Organization → Environments → Zones Hierarchy Implementation

## Architecture Changes

### 1. Data Model Updates

**Update `lib/auth-store.ts`:**

- Replace `projects_count` and `zones_count` with `environments_count` in `Organization` interface
- Add `Environment` interface with fields: `id`, `name`, `type` ('production' | 'staging' | 'development'), `zones_count`, `role` (for environment-level RBAC)
- Extend `Organization` to include `environments: Environment[]`
- Update mock user data to reflect new structure

**Create `lib/hierarchy-store.ts`:**

- New Zustand store to manage current context (selected org, selected environment)
- Actions: `setCurrentOrg()`, `setCurrentEnvironment()`, `getCurrentContext()`
- Persist selections to localStorage for user navigation state

### 2. Sidebar Navigation Restructure

**Update `components/layout/Sidebar.tsx`:**

- Change hierarchy from Org → Projects → Zones to Org → Environments → Zones
- Update icons and labels (Projects become Environments)
- Update routes: `/organization/[id]` → `/organization/[orgId]/environment/[envId]`
- Keep collapsible tree structure with proper expand/collapse state management

### 3. Page Restructure

**Dashboard (`app/page.tsx`):**

- Shows aggregated data across ALL organizations user has access to
- Stats cards: Total Orgs, Total Environments, Total Zones, Total DNS Queries
- Quick access cards to recent orgs/environments
- Keep existing stat cards but update data source to aggregate across orgs

**Organization Page (`app/organization/[id]/page.tsx`):**

- Show list of all environments within the selected organization
- Stats: Total Environments, Total Zones (across all envs), Queries (24h), Avg Response
- Environment cards with name, type badge (Production/Staging/Dev), zone count, and stats
- Click environment card → navigate to Environment detail page
- Role badge display (user's role in this org: Admin/Editor/Viewer)
- "Add Environment" button (Admin only)

**NEW Environment Page (`app/organization/[orgId]/environment/[envId]/page.tsx`):**

- Show all zones within the selected environment
- Stats: Total Zones, Total DNS Records, Queries (24h), Success Rate
- Zone list/table with name, record count, query stats, status
- Click zone → navigate to existing Zone detail page
- Breadcrumb: Org Name → Env Name
- Display user's environment-level role if different from org role
- "Add Zone" button (Editors and above)

**Zone Detail (`app/zone/[id]/page.tsx` and `ZoneDetailClient.tsx`):**

- Keep existing functionality
- Add context display: show which Org → Env this zone belongs to
- Breadcrumb: Org Name → Env Name → Zone Name

**Analytics Page (`app/analytics/page.tsx`):**

- Show analytics for the user across all their organizations
- Add org filter dropdown at top
- Keep existing metrics structure

**Profile & Settings:**

- No major changes needed
- Organizations list in profile now shows environments count instead of projects count

### 4. Role-Based Access Control (RBAC)

**Update RBAC to support two levels:**

- Organization-level role (existing: SuperAdmin/Admin/Editor/Viewer)
- Environment-level role override (optional, e.g., Admin in org but Editor in Production env)

**Permission matrix:**

- **SuperAdmin (org):** Full access to all environments and zones
- **Admin (org):** Can create/delete environments, manage all zones in org
- **Admin (env):** Can manage zones only in specific environment
- **Editor (org/env):** Can edit zones and records
- **Viewer (org/env):** Read-only access

**Implementation:**

- Create `lib/permissions.ts` helper with functions like `canCreateEnvironment()`, `canEditZone()`, `canDeleteEnvironment()`
- Check permissions in UI components to show/hide action buttons
- Mock permission checks for now (no backend)

### 5. Mock Data Structure

**Create comprehensive mock data in new file `lib/mock-hierarchy-data.ts`:**

```typescript
{
  organizations: [
    {
      id: 'org_company',
      name: 'Company Corp',
      role: 'Admin',
      environments: [
        {
          id: 'env_prod',
          name: 'Production',
          type: 'production',
          zones_count: 45,
          role: 'Admin' // can override org role
        },
        {
          id: 'env_staging',
          name: 'Staging', 
          type: 'staging',
          zones_count: 12,
          role: 'Editor' // override: editor in staging
        },
        {
          id: 'env_dev',
          name: 'Development',
          type: 'development',
          zones_count: 8,
          role: 'Admin'
        }
      ]
    }
  ],
  zones: [
    {
      id: 'zone_1',
      name: 'acme.com',
      org_id: 'org_company',
      env_id: 'env_prod',
      records: 24,
      queries_24h: 1250000
    }
    // ... more zones
  ]
}
```

### 6. Routing & File Structure

**Create new routes:**

- `app/organization/[orgId]/environment/[envId]/page.tsx` - Environment detail page
- Keep: `app/organization/[id]/page.tsx` - Organization overview (shows environments)
- Keep: `app/zone/[id]/page.tsx` - Zone detail (add context info)

**Remove old routes:**

- Delete `app/project/[id]/page.tsx` (replaced by environment page)

### 7. UI Components

**Reusable components to create:**

- `components/ui/EnvironmentBadge.tsx` - Visual badge for Production/Staging/Development with colors
- `components/ui/Breadcrumb.tsx` - Navigation breadcrumb component
- `components/hierarchy/EnvironmentCard.tsx` - Card component for displaying environment summary

### 8. Visual Design

**Environment type colors:**

- Production: Red/orange badge (indicates caution)
- Staging: Yellow/amber badge
- Development: Green/blue badge

**Navigation flow:**

1. Dashboard (landing page) → shows all orgs
2. Click org → Organization page (shows all environments)
3. Click environment → Environment page (shows all zones)
4. Click zone → Zone detail page

## Implementation Order

1. Create data models and stores (hierarchy-store, update auth-store)
2. Create mock data structure (mock-hierarchy-data.ts)
3. Update Sidebar navigation component
4. Update Organization page to show environments
5. Create new Environment detail page
6. Update Zone detail to show context/breadcrumbs
7. Update Dashboard to aggregate across orgs
8. Implement RBAC permission helpers
9. Add UI components (badges, breadcrumbs, cards)
10. Update all pages to use new data structure
11. Test navigation flow and role-based rendering

### To-dos

- [ ] Create/update data models: hierarchy-store.ts, update auth-store.ts with Environment interface, create mock-hierarchy-data.ts
- [ ] Update Sidebar.tsx to show Org → Env → Zone hierarchy with proper routes
- [ ] Update Organization page to display environments instead of projects
- [ ] Create new Environment detail page showing all zones in that environment
- [ ] Update Zone detail page to show org/env context with breadcrumbs
- [ ] Update Dashboard to aggregate stats across all organizations
- [ ] Implement RBAC helpers in permissions.ts for org and environment-level access control
- [ ] Create reusable UI components: EnvironmentBadge, Breadcrumb, EnvironmentCard
- [ ] Remove old project routes and update all internal links to new structure