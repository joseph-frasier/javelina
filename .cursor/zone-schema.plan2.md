<!-- 9aaf6562-7853-4ca8-b7b5-3a818f833c4b 428ada98-51a5-4de6-b67a-8a0d8c744532 -->
# SOA Refactor: Move SOA Data to Zones Table

## Overview

Refactor SOA record management to store data on the `zones` table instead of as records in `zone_records`. SOA data will be generated dynamically from zone properties.

## Phase 1: Database Migration

### Delete Old Migration

- Delete `supabase/migrations/20251119000000_zone_schema_refactor.sql`

### Create New Migration

Create `supabase/migrations/20251120000000_soa_refactor.sql` that:

**Add columns to zones:**

- `admin_email TEXT DEFAULT 'admin@example.com'`
- `negative_caching_ttl INT4 DEFAULT 3600`

**Drop columns from zones (cleanup):**

- `zone_type`
- `metadata` 
- `ttl`
- `records_count`

**Drop columns from zone_records:**

- `priority`
- `active`
- `metadata`

**Keep existing SOA serial triggers:**

- `increment_zone_serial_on_record_change()`
- `increment_zone_serial_on_zone_change()`
- Triggers for INSERT/UPDATE/DELETE on zone_records
- Trigger for UPDATE on zones

**Do NOT create SOA records in zone_records table**

## Phase 2: Type Updates

### Update `types/supabase.ts`

Add to zones Row/Insert/Update:

```typescript
admin_email: string
negative_caching_ttl: number
```

Remove from zone_records Row/Insert/Update:

```typescript
metadata (remove this field)
```

### Update `lib/mock-hierarchy-data.ts`

Add to Zone interface:

```typescript
admin_email: string;
negative_caching_ttl: number;
```

Update mock zones to include these fields with sensible defaults.

## Phase 3: SOA Helpers Refactor

### Update `lib/utils/soa-helpers.ts`

Refactor to work with zone properties instead of metadata:

- Remove `SOARecord` interface
- Remove `parseSOAMetadata()` 
- Remove `isSOARecord()`
- Update `SOAMetadata` interface to match new structure
- Add `generateSOAFromZone(zone)` function that returns:
  - `primary_nameserver`: from `zone.nameservers[0]` or default
  - `admin_email`: from `zone.admin_email`
  - `negative_ttl`: from `zone.negative_caching_ttl`
  - `serial`: from `zone.soa_serial`
- Keep validation functions, update to validate zone fields

## Phase 4: Remove SOA from DNS Records UI

### Update `components/modals/ManageDNSRecordModal.tsx`

- Remove SOA-specific UI section
- Remove `soaMetadata` state
- Remove SOA metadata handling in submit
- Remove SOA-related imports from soa-helpers
- Verify 'SOA' is already filtered from `recordTypeOptions`

### Update `types/dns.ts`

- Remove 'SOA' from `DNSRecordType` union or mark as system-only
- Update `RECORD_TYPE_INFO['SOA']` to indicate it's system-managed

## Phase 5: Add SOA Fields to Zone Management

### Update `components/modals/AddZoneModal.tsx`

Add form fields in a "SOA Configuration" section:

- Primary Nameserver (read-only, shows first nameserver or placeholder)
- Admin Email (text input, default: 'admin@example.com')
- Negative Caching TTL (number input, default: 3600, with tooltip)

Pass `admin_email` and `negative_caching_ttl` to `createZone` server action.

### Update `app/zone/[id]/ZoneDetailClient.tsx`

In the zone edit modal:

- Add `admin_email` field to `editFormData` state
- Add `negative_caching_ttl` field to `editFormData` state
- Add "SOA Configuration" section in edit modal UI with:
  - Primary Nameserver (read-only, derived from first nameserver)
  - Admin Email (editable text input)
  - Negative Caching TTL (editable number input)
  - SOA Serial (read-only, shows current serial)
- Include `admin_email` and `negative_caching_ttl` in `updateZone` call

### Update zone summary/header

Display SOA information clearly, showing it's derived from zone settings.

## Phase 6: Update Server Actions & API

### Update `lib/actions/zones.ts`

- `createZone`: Accept `admin_email` and `negative_caching_ttl`, pass to API
- `updateZone`: Accept `admin_email` and `negative_caching_ttl`, pass to API

### Update `lib/api-client.ts`

- `zonesApi.create`: Add `admin_email?: string` and `negative_caching_ttl?: number`
- `zonesApi.update`: Add `admin_email?: string` and `negative_caching_ttl?: number`

## Phase 7: Update BIND Export

### Update `lib/admin-export.ts`

- Remove logic that looks for SOA records in zone_records
- Generate SOA record dynamically from zone properties:
  - MNAME: from `zone.nameservers[0]`
  - RNAME: from `zone.admin_email`
  - Serial: from `zone.soa_serial`
  - Minimum TTL: from `zone.negative_caching_ttl`

Note: Refresh, Retry, and Expire are not relevant for this app

## Phase 8: Cleanup & Verification

### Remove unused code:

- Search for remaining `record.metadata` references
- Remove SOA validation from `lib/utils/dns-validation.ts` if present
- Clean up any SOA-related constants in types

### Verify functionality:

- SOA serial display in zone header
- SOA serial auto-increment on record/zone changes
- Zone creation with SOA fields
- Zone editing with SOA fields
- BIND export includes generated SOA record

### To-dos

- [x] Create and apply database migration to refactor zones/zone_records tables
- [x] Migrate existing zones to have SOA records with metadata
- [x] Create database triggers for automatic soa_serial incrementing
- [x] Update TypeScript types in types/supabase.ts
- [x] Update application type definitions in lib and components
- [x] Remove zone type dropdown and related UI from AddZoneModal
- [x] Remove zone_type editing from ZoneDetailClient
- [x] Remove zone_type from API client functions and actions
- [x] Create SOA management utility functions and update DNS record modal
- [x] Test database migration and verify data integrity