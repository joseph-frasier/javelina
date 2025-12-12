# Direct Supabase Calls to Fix

## Overview

The following files contain direct Supabase PostgREST calls that should be routed through the Express API instead. These calls are causing 400 errors because:

1. The `profiles:user_id` join requires a foreign key that doesn't exist
2. Direct client-side Supabase calls bypass Express API auth/validation
3. RLS policies may be blocking some queries

---

## Files to Update

### 1. `lib/api/dns.ts`

#### Function: `getZoneSummary()` (Lines 25-55)

**Current (Direct Supabase):**
```typescript
const { data: zone } = await supabase
  .from('zones')
  .select('verification_status, last_verified_at, metadata, records_count')
  .eq('id', zoneId)
  .is('deleted_at', null)
  .single();
```

**Should use Express API:**
```typescript
import { zonesApi } from '@/lib/api-client';

// Replace direct Supabase call with:
const zone = await zonesApi.get(zoneId);
// Access: zone.verification_status, zone.last_verified_at, etc.
```

**Backend requirement:** Ensure `GET /api/zones/:id` returns `verification_status`, `last_verified_at`, `metadata`, and `records_count` fields.

---

#### Function: `getZoneAuditLogs()` (Lines 61-97)

**Current (Direct Supabase):**
```typescript
const { data: auditLogs } = await supabase
  .from('audit_logs')
  .select(`
    *,
    profiles:user_id (
      name,
      email
    )
  `)
  .eq('table_name', 'zones')
  .eq('record_id', zoneId)
  .order('created_at', { ascending: false })
  .limit(50);
```

**Should use Express API:**
```typescript
import { apiClient } from '@/lib/api-client';

// Replace with:
const auditLogs = await apiClient.get(`/zones/${zoneId}/audit-logs`);
```

**Backend requirement:** Create new endpoint:
```
GET /api/zones/:id/audit-logs
```

Returns:
```json
[
  {
    "id": "uuid",
    "action": "UPDATE",
    "old_data": {...},
    "new_data": {...},
    "user_name": "John Doe",
    "user_email": "john@example.com",
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

The backend should do the `profiles` join server-side.

---

### 2. `lib/api/audit.ts`

#### Function: `getOrganizationAuditLogs()` (Lines 19-39)

**Current (Direct Supabase):**
```typescript
const { data, error } = await supabase
  .from('audit_logs')
  .select(`
    *,
    profiles(name, email)
  `)
  .eq('table_name', 'organizations')
  .eq('record_id', organizationId)
  .order('created_at', { ascending: false })
  .limit(limit)
```

**Should use Express API:**
```typescript
import { apiClient } from '@/lib/api-client';

// Replace with:
const auditLogs = await apiClient.get(`/organizations/${organizationId}/audit-logs?limit=${limit}`);
```

**Backend requirement:** Create new endpoint:
```
GET /api/organizations/:id/audit-logs?limit=10
```

Returns same format as zone audit logs.

---

#### Function: `getOrganizationActivityLogs()` (Lines 44-58)

**Current (Direct Supabase RPC):**
```typescript
const { data, error } = await supabase.rpc('get_organization_activity', {
  org_id: organizationId,
  log_limit: limit
})
```

**Should use Express API:**
```typescript
import { apiClient } from '@/lib/api-client';

// Replace with:
const activityLogs = await apiClient.get(`/organizations/${organizationId}/activity?limit=${limit}`);
```

**Backend requirement:** Create new endpoint:
```
GET /api/organizations/:id/activity?limit=10
```

This endpoint should call the `get_organization_activity` RPC function on the server side.

---

## Summary of Required Express API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/zones/:id` | GET | Already exists - ensure it returns verification fields |
| `/api/zones/:id/audit-logs` | GET | **NEW** - Zone audit logs with user info |
| `/api/organizations/:id/audit-logs` | GET | **NEW** - Org audit logs with user info |
| `/api/organizations/:id/activity` | GET | **NEW** - Org activity feed |

---

## Why This Matters

1. **Security**: Direct Supabase calls expose database structure to client
2. **Consistency**: All data access should go through Express API
3. **Maintainability**: Single point of control for data access logic
4. **Reliability**: Express can handle the `profiles` join without requiring FK

---

## Database Note

The `audit_logs.user_id` → `profiles.id` foreign key doesn't exist, which causes the PostgREST join to fail. Options:

1. **Add the foreign key** (if you want to keep direct Supabase calls):
   ```sql
   ALTER TABLE audit_logs
   ADD CONSTRAINT fk_audit_logs_user_id
   FOREIGN KEY (user_id) REFERENCES profiles(id);
   ```

2. **Do the join in Express** (recommended):
   - Query `audit_logs` first
   - Then query `profiles` for the user IDs
   - Combine the results server-side

---

## Files Reference

- `lib/api/dns.ts` - Zone summary and audit logs
- `lib/api/audit.ts` - Organization audit and activity logs
- `lib/api-client.ts` - API client utilities (use this for new calls)

