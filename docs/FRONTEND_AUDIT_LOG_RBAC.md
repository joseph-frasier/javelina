# Frontend: Audit Log RBAC Changes

**Related backend PR:** `feat/invite-users` branch  
**Affected pages:** Zone detail, Organization detail  
**Risk level:** Low — failing API calls already return `[]` gracefully, so nothing will crash. These are UX-correctness fixes.

---

## Background

The backend now enforces role-based filtering on all audit log endpoints:

| Role | Allowed audit log tables |
|---|---|
| `SuperAdmin` | All |
| `Admin` | All |
| `Viewer` | All (read-only, no mutation endpoints exist) |
| `Editor` | `zones`, `zone_records` only (DNS-related) |
| `BillingContact` | `organizations`, `subscriptions` only (billing-related) |

Specifically:
- `GET /api/organizations/:id/audit-logs` — now returns **403** for `Editor`
- `GET /api/zones/:id/audit-logs` — now returns **403** for `BillingContact`

Both fetch functions already catch errors and return `[]`, so the UI won't crash. But these two sections should be **hidden** from the relevant roles rather than showing an empty state.

---

## Required Changes

### 1. `app/organization/[orgId]/page.tsx`

`userRole` is already fetched on line 85. Gate the audit log fetch so Editors don't trigger a 403:

```diff
  // Fetch user's role in this organization
  const userRole = await getUserRoleInOrganization(orgId);
  
  // ...

- // Fetch recent activity from audit logs
- const auditLogs = await getOrganizationAuditLogs(orgId, 10);
- const recentActivity = await Promise.all(auditLogs.map(log => formatAuditLog(log)));
+ // Editors only see DNS-related audit logs — skip org-level audit fetch for them
+ const recentActivity =
+   userRole !== 'Editor'
+     ? await Promise.all(
+         (await getOrganizationAuditLogs(orgId, 10)).map(log => formatAuditLog(log))
+       )
+     : [];
```

---

### 2. `app/zone/[id]/page.tsx`

The zone page currently doesn't fetch the user's role in the org. Add that fetch and pass it to the client component.

```diff
+ import { getUserRoleInOrganization } from '@/lib/api/roles';

  // ...existing zone + org fetching logic...

+ // Fetch user's role in the organization (needed for audit log visibility)
+ let userOrgRole: string | null = null;
+ if (zoneData.organization_id) {
+   userOrgRole = await getUserRoleInOrganization(zoneData.organization_id);
+ }

  return (
    <ZoneDetailClient 
      zone={zoneData} 
      zoneId={id}
      organization={organization}
+     userOrgRole={userOrgRole}
    />
  );
```

---

### 3. `app/zone/[id]/ZoneDetailClient.tsx`

Accept the new `userOrgRole` prop and use it to gate the audit log call and the "Change History" section.

**Step 1 — Update the props interface:**

```diff
  interface ZoneDetailClientProps {
    zone: any;
    zoneId: string;
    organization?: OrganizationDetail | null;
+   userOrgRole?: string | null;
  }

- export function ZoneDetailClient({ zone, zoneId, organization }: ZoneDetailClientProps) {
+ export function ZoneDetailClient({ zone, zoneId, organization, userOrgRole }: ZoneDetailClientProps) {
```

**Step 2 — Derive a `canViewAuditLogs` flag near the top of the component body:**

```ts
// BillingContacts only see billing-related audit logs — zone logs are DNS-only
const canViewAuditLogs = userOrgRole !== 'BillingContact';
```

**Step 3 — Skip the audit log fetch when not permitted:**

```diff
  useEffect(() => {
    const loadData = async () => {
      const [summary, logs, records] = await Promise.all([
        getZoneSummary(zoneId, zone.name, zone.records_count || 50),
-       getZoneAuditLogs(zoneId, zone.name),
+       canViewAuditLogs ? getZoneAuditLogs(zoneId, zone.name) : Promise.resolve([]),
        getDNSRecords(zoneId),
      ]);
      setZoneSummary(summary);
      setAuditLogs(logs);
      setDnsRecords(records);
      setFilteredDnsRecords(records);
    };
    loadData();
- }, [zoneId, zone.name, zone.records_count]);
+ }, [zoneId, zone.name, zone.records_count, canViewAuditLogs]);
```

Apply the same guard to `refreshAllData`:

```diff
  const refreshAllData = async () => {
    try {
      const [summary, logs, records] = await Promise.all([
        getZoneSummary(zoneId, zone.name, zone.records_count || 50),
-       getZoneAuditLogs(zoneId, zone.name),
+       canViewAuditLogs ? getZoneAuditLogs(zoneId, zone.name) : Promise.resolve([]),
        getDNSRecords(zoneId),
      ]);
      // ...
    }
  };
```

**Step 4 — Conditionally render the "Change History" card:**

```diff
- {/* Audit Timeline */}
- <CollapsibleCard 
-   title="Change History" 
-   className="p-4 sm:p-6 mb-6 sm:mb-8"
-   storageKey={`zone-${zoneId}-changeHistory-collapsed`}
- >
-   <AuditTimeline
-     auditLogs={auditLogs}
-     onDiffClick={setSelectedLog}
-   />
- </CollapsibleCard>
+ {/* Audit Timeline — hidden for BillingContact (DNS logs not permitted) */}
+ {canViewAuditLogs && (
+   <CollapsibleCard 
+     title="Change History" 
+     className="p-4 sm:p-6 mb-6 sm:mb-8"
+     storageKey={`zone-${zoneId}-changeHistory-collapsed`}
+   >
+     <AuditTimeline
+       auditLogs={auditLogs}
+       onDiffClick={setSelectedLog}
+     />
+   </CollapsibleCard>
+ )}
```

---

## Summary of Files to Change

| File | Change |
|---|---|
| `app/organization/[orgId]/page.tsx` | Gate `getOrganizationAuditLogs` call — skip for `Editor` |
| `app/zone/[id]/page.tsx` | Fetch `userOrgRole` via `getUserRoleInOrganization`, pass to client |
| `app/zone/[id]/ZoneDetailClient.tsx` | Accept `userOrgRole` prop, derive `canViewAuditLogs`, gate fetch + render |

No changes are needed to `lib/api/audit.ts` or `lib/api/dns.ts`. Their existing error handling already silences 403s safely.

---

## Role Reference

For the derived `canViewAuditLogs` flag and similar guards, use the same role strings the backend sets via `GET /api/organizations/:id/role`:

```ts
type OrgRole = 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer';
```

`userRole` on the org page and `userOrgRole` on the zone page are both fetched via `getUserRoleInOrganization` in `lib/api/roles.ts`, which calls `GET /api/organizations/:id/role`.
