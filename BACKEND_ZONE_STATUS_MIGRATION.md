# Backend Zone Status Migration

## Overview
This document outlines the required changes to the Express API backend to support the new zone status system. The migration consolidates `verification_status` and `last_verified_at` columns into a single `last_valid_serial` field for simpler status tracking.

## Database Schema Changes

### Zones Table
The following changes have been applied to the `zones` table in the Supabase database:

**Added:**
- `last_valid_serial` (INTEGER NOT NULL DEFAULT 0) - Tracks the last serial number that was successfully validated/published

**Removed:**
- `verification_status` (text with check constraint)
- `last_verified_at` (timestamp)

**Existing (unchanged):**
- `soa_serial` (integer) - Current SOA record serial number
- `error` (text, nullable) - Error message if zone validation/publication failed

## New Status Logic

The zone status is now computed from three columns rather than being stored directly:

### Status States

1. **ERROR State**
   - **Condition:** `error IS NOT NULL`
   - **Display:** Show the error message in red + display `last_valid_serial` value
   - **Meaning:** The zone has a validation/publication error

2. **PENDING State**
   - **Condition:** `error IS NULL AND last_valid_serial != soa_serial`
   - **Display:** Show "Pending" in amber
   - **Meaning:** Zone changes have been made but not yet validated/published

3. **OK State**
   - **Condition:** `error IS NULL AND last_valid_serial = soa_serial`
   - **Display:** Show "OK" in green
   - **Meaning:** Zone is successfully validated/published

## Required API Changes

### 1. GET /api/zones/:id

**Current Response (to be updated):**
```json
{
  "id": "uuid",
  "name": "example.com",
  "soa_serial": 5,
  "verification_status": "verified",
  "last_verified_at": "2024-01-01T12:00:00Z",
  ...
}
```

**New Response:**
```json
{
  "id": "uuid",
  "name": "example.com",
  "soa_serial": 5,
  "last_valid_serial": 5,
  "error": null,
  ...
}
```

**Changes:**
- Remove `verification_status` field from response
- Remove `last_verified_at` field from response
- Add `last_valid_serial` field (integer)
- Ensure `error` field is included (may be null)

### 2. GET /api/zones (List Zones)

**Changes:**
Apply the same field changes as GET /api/zones/:id to each zone object in the array.

### 3. POST /api/zones (Create Zone)

**Request Body (unchanged):**
```json
{
  "name": "example.com",
  "organization_id": "uuid",
  "description": "My zone",
  ...
}
```

**Changes:**
- When inserting into database, ensure `last_valid_serial` is initialized to `0` (this is the default)
- Remove any logic that sets `verification_status`
- Remove any logic that sets `last_verified_at`

**Response:**
Follow the same format as GET /api/zones/:id (include `last_valid_serial`, exclude deprecated fields)

### 4. PUT /api/zones/:id (Update Zone)

**Changes:**
- Remove any logic that modifies `verification_status`
- Remove any logic that modifies `last_verified_at`
- Do not allow clients to directly set `last_valid_serial` (this should only be updated by backend validation/publication processes)
- Response should follow the same format as GET /api/zones/:id

### 5. Zone Validation/Publication Endpoints

**Any endpoints that validate or publish zones need to update `last_valid_serial` and `error`:**

#### On Successful Validation/Publication:
```javascript
await supabase
  .from('zones')
  .update({
    last_valid_serial: currentSoaSerial, // Set to match current soa_serial
    error: null, // Clear any existing errors
    updated_at: new Date().toISOString()
  })
  .eq('id', zoneId);
```

#### On Validation/Publication Failure:
```javascript
await supabase
  .from('zones')
  .update({
    error: 'Descriptive error message about what went wrong',
    // Do NOT update last_valid_serial - it should remain at the last known good value
    updated_at: new Date().toISOString()
  })
  .eq('id', zoneId);
```

### 6. PUT /api/zones/:id/verification (if exists)

**Current Behavior:**
Likely updates `verification_status` and `last_verified_at`

**New Behavior:**
- Update `last_valid_serial` to match `soa_serial` on successful verification
- Set `error` to null on success
- Set `error` to descriptive message on failure (do not update `last_valid_serial`)

## Affected Endpoints Summary

All endpoints that return zone data need to be updated:

1. `GET /api/zones` - List zones
2. `GET /api/zones/:id` - Get single zone
3. `POST /api/zones` - Create zone
4. `PUT /api/zones/:id` - Update zone
5. `PUT /api/zones/:id/verification` - Verify zone (if exists)
6. Any zone publication/deployment endpoints
7. Any endpoints that return zone data as part of a larger response

## Frontend Status Computation

For reference, here's how the frontend will compute the status from the API response:

```typescript
interface ZoneStatus {
  status: 'error' | 'pending' | 'ok';
  errorMessage: string | null;
  lastValidSerial: number;
  soaSerial: number;
}

function computeZoneStatus(zone: Zone): ZoneStatus {
  const errorMessage = zone.error || null;
  const lastValidSerial = zone.last_valid_serial ?? 0;
  const soaSerial = zone.soa_serial ?? 1;
  
  let status: 'error' | 'pending' | 'ok';
  if (errorMessage !== null) {
    status = 'error';
  } else if (lastValidSerial !== soaSerial) {
    status = 'pending';
  } else {
    status = 'ok';
  }

  return { status, errorMessage, lastValidSerial, soaSerial };
}
```

## Migration Notes

1. **Default Value:** All existing zones will have `last_valid_serial` set to `0` after migration
2. **Initial State:** Zones will initially show as "pending" until first validation/publication
3. **Backward Compatibility:** The API should no longer accept or return `verification_status` or `last_verified_at` fields
4. **Error Messages:** Error messages should be descriptive and user-friendly as they will be displayed directly to users

## Testing Checklist

After implementing these changes, verify:

- [ ] GET /api/zones returns `last_valid_serial` and `error`, does not return `verification_status` or `last_verified_at`
- [ ] GET /api/zones/:id returns correct fields
- [ ] POST /api/zones initializes zones with `last_valid_serial = 0`
- [ ] Zone validation success updates `last_valid_serial` to match `soa_serial` and clears `error`
- [ ] Zone validation failure sets `error` message without changing `last_valid_serial`
- [ ] Status computation works correctly for all three states (error, pending, ok)
- [ ] Frontend displays correct status badges based on API responses

