<!-- 9aaf6562-7853-4ca8-b7b5-3a818f833c4b 36e1ab08-55f4-4658-aaa3-d1a64bf292f9 -->
# DNS Schema Refactor: Zones & Zone_Records Overhaul

## Phase 1: Database Migration (Supabase)

### Migration File: Create new migration via MCP

Create migration `20251119000000_zone_schema_refactor.sql` that will:

1. **Create SOA records for existing zones**

   - Insert SOA record for each zone where one doesn't exist
   - Set `type='SOA'`, `name='@'`
   - Populate metadata with:
     - `primary_nameserver`: First element from zones.nameservers array, fallback to "ns1.example.com"
     - `admin_email`: "admin@example.com" (user-editable later)
     - `negative_ttl`: zones.ttl value, fallback to 3600 if NULL
   - Set TTL to 86400 (24 hours, standard for SOA)

2. **Add partial unique index for SOA**
   ```sql
   CREATE UNIQUE INDEX unique_soa_per_zone 
   ON zone_records(zone_id) WHERE type = 'SOA';
   ```

3. **Drop columns from zones table**

   - Drop `zone_type` (with CHECK constraint removal)
   - Drop `metadata` column
   - Drop `ttl` column  
   - Drop `records_count` column

4. **Drop columns from zone_records table**

   - Drop `priority` column
   - Drop `active` column

5. **Create triggers for serial auto-increment**

   - Trigger on zone_records INSERT/UPDATE/DELETE: Increment zones.soa_serial
   - Trigger on zones UPDATE: Increment soa_serial when nameservers or verification_status changes

### Files to update:

- `supabase/migrations/[new-timestamp]_zone_schema_refactor.sql`

## Phase 2: TypeScript Type Updates

### Update Database Types

Update `types/supabase.ts`:

- Remove `zone_type` from zones Row/Insert/Update types
- Remove `metadata`, `ttl`, `records_count` from zones types
- Remove `priority`, `active` from zone_records types
- Keep `live` and `deleted_at` in zones types

### Update Application Types

Update these type definitions:

- `lib/mock-hierarchy-data.ts`: Remove `zone_type` from Zone interface
- `app/organization/[orgId]/environment/[envId]/EnvironmentClient.tsx`: Remove `zone_type` from Zone interface
- `types/dns.ts`: Update DNSRecord type to remove priority/active

### Files to update:

- `types/supabase.ts`
- `lib/mock-hierarchy-data.ts`
- `app/organization/[orgId]/environment/[envId]/EnvironmentClient.tsx`
- `types/dns.ts`

## Phase 3: Frontend Component Updates

### Remove Zone Type UI

1. **AddZoneModal.tsx**

   - Remove zone type dropdown and state
   - Remove `zoneType` from form submission
   - Remove zone type validation

2. **ZoneDetailClient.tsx**

   - Remove zone_type from editFormData
   - Remove zone type change confirmation modal
   - Remove zone type display/editing UI

3. **Admin zones page**

   - Remove zone_type column from table display
   - Update any zone_type filters

### Update API Clients

1. **lib/api/hierarchy.ts**

   - Remove `zone_type` from CreateZoneData interface
   - Remove zone_type validation in createZone()
   - Remove zone_type from insert payload

2. **lib/actions/zones.ts**

   - Remove `zone_type` parameter from createZone()
   - Remove `zone_type` parameter from updateZone()
   - Remove zone_type from API request bodies

3. **lib/api-client.ts**

   - Remove `type` parameter from zonesApi.create()
   - Remove `type` parameter from zonesApi.update()

### Files to update:

- `components/modals/AddZoneModal.tsx`
- `app/zone/[id]/ZoneDetailClient.tsx`
- `app/admin/zones/page.tsx`
- `lib/api/hierarchy.ts`
- `lib/actions/zones.ts`
- `lib/api-client.ts`

## Phase 4: SOA Record Management

### Add SOA Editing Support

Create utility functions for SOA record management:

- `lib/utils/soa-helpers.ts`: Helper functions to parse/construct SOA metadata
- Update `components/modals/ManageDNSRecordModal.tsx`: Add special handling for SOA records
  - Show specialized form fields for primary_nameserver, admin_email, negative_ttl
  - Display serial as read-only (from zones.soa_serial)
  - Prevent manual SOA record creation (only edit existing)

### Files to create/update:

- `lib/utils/soa-helpers.ts` (new file)
- `components/modals/ManageDNSRecordModal.tsx`

## Phase 5: Backend API Changes (Separate Implementation)

**Note**: Backend API runs on separate server (localhost:3001), handled separately but documented here for reference:

### Backend Endpoints to Update:

1. **POST /api/zones**

   - Remove `zone_type` from request body validation
   - Remove `zone_type` from database insert
   - Create SOA record automatically when zone is created

2. **PUT /api/zones/:id**

   - Remove `zone_type` from request body validation
   - Remove `zone_type` from allowed update fields
   - Trigger soa_serial increment on nameservers change

3. **POST /api/zones/:zoneId/records**

   - Prevent manual SOA record creation (return error)
   - Trigger soa_serial increment on zone_records changes

4. **PUT /api/zones/:zoneId/records/:id**

   - Allow SOA metadata updates
   - Trigger soa_serial increment

5. **DELETE /api/zones/:zoneId/records/:id**

   - Prevent SOA record deletion
   - Trigger soa_serial increment

### Backend validation updates:

- Update zone creation validators to not require zone_type
- Update zone_records validators to handle SOA metadata structure
- Add constraint: One SOA per zone (already enforced by DB index)

## Testing Checklist

1. **Database Migration**

   - ✓ Verify all existing zones have SOA records created
   - ✓ Verify SOA metadata is correctly populated
   - ✓ Verify columns are dropped successfully
   - ✓ Verify triggers increment soa_serial correctly

2. **Frontend**

   - ✓ Zone creation works without zone_type
   - ✓ Zone editing UI doesn't show zone_type
   - ✓ SOA records can be edited with custom form
   - ✓ Serial number displays as read-only
   - ✓ TypeScript compilation succeeds

3. **Integration**

   - ✓ New zones automatically get SOA records
   - ✓ Serial increments on record changes
   - ✓ Serial increments on nameserver changes
   - ✓ Cannot create duplicate SOA records
   - ✓ Cannot delete SOA records

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