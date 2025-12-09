# Express API Changes Required

## Overview
The following changes need to be made to the Express API (separate repository) to support the zone records schema updates implemented in this frontend repository.

## Database Schema Changes Applied
1. **PTR Record Type Added**: The `zone_records` table now accepts 'PTR' as a valid record type
2. **Nameservers Column Removed**: The `nameservers` column has been removed from the `zones` table

## Required Express API Changes

### 1. DNS Records Validation

#### Location
Update the DNS records create/update endpoints:
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`

#### Changes Needed

##### A. Add NS Root Record Restriction
Prevent users from creating or updating NS records at the zone root:

```javascript
// Validation logic to add
if (recordData.type === 'NS') {
  const normalizedName = recordData.name.trim();
  const isRootNS = normalizedName === '@' || 
                   normalizedName === '' || 
                   normalizedName === zoneName;
  
  if (isRootNS) {
    return res.status(400).json({
      error: 'NS records at zone root are system-managed and cannot be created or modified by users. NS records are only allowed for subdomains (e.g., "dev" for delegation).'
    });
  }
}
```

##### B. Add PTR Record Type Support
Update the record type validation to include 'PTR':

```javascript
const validRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV', 'CAA', 'PTR'];

if (!validRecordTypes.includes(recordData.type)) {
  return res.status(400).json({
    error: `Invalid record type. Must be one of: ${validRecordTypes.join(', ')}`
  });
}
```

##### C. Update TTL Validation
Change minimum TTL from 60 seconds to 10 seconds:

```javascript
// Old validation
if (recordData.ttl < 60) {
  return res.status(400).json({
    error: 'TTL must be at least 60 seconds'
  });
}

// New validation
if (recordData.ttl < 10) {
  return res.status(400).json({
    error: 'TTL must be at least 10 seconds'
  });
}
```

### 2. Zones Endpoint Updates

#### Location
Update zone create/update endpoints:
- `POST /api/zones`
- `PUT /api/zones/:id`

#### Changes Needed

##### Remove Nameservers Field Handling
The `nameservers` field should no longer be accepted or returned:

```javascript
// Remove nameservers from accepted fields in zone creation/updates
// Old code (remove this):
if (req.body.nameservers) {
  updateData.nameservers = req.body.nameservers;
}

// Nameservers are now system-managed via zone_records table
// Root NS records should be created/managed by the DNS service backend
```

### 3. PTR Record Validation (Optional)

For enhanced validation, you may want to add PTR-specific validation:

```javascript
if (recordData.type === 'PTR') {
  // Validate that the value is a valid domain name
  if (!isValidDomain(recordData.value)) {
    return res.status(400).json({
      error: 'PTR record must point to a valid domain name'
    });
  }
  
  // Optionally validate reverse DNS format for the name field
  // This is informational since PTR records can technically exist in forward zones
}
```

## Testing Checklist

After implementing these changes, test the following scenarios:

### NS Record Validation
- [ ] Attempt to create NS record with name '@' → Should fail with appropriate error
- [ ] Attempt to create NS record with name '' (empty) → Should fail with appropriate error
- [ ] Attempt to create NS record with name matching zone name → Should fail with appropriate error
- [ ] Create NS record with subdomain name (e.g., 'dev') → Should succeed
- [ ] Attempt to update existing root NS record → Should fail with appropriate error

### PTR Record Support
- [ ] Create PTR record with valid domain as value → Should succeed
- [ ] PTR record type is accepted in validation → Should succeed
- [ ] PTR records are stored and retrieved correctly → Should succeed

### TTL Validation
- [ ] Create record with TTL = 10 seconds → Should succeed
- [ ] Create record with TTL = 9 seconds → Should fail with appropriate error
- [ ] Create record with TTL = 60 seconds → Should succeed (still valid)

### Nameservers Field
- [ ] Attempt to create zone with nameservers field → Should be ignored (not stored)
- [ ] Attempt to update zone with nameservers field → Should be ignored (not stored)
- [ ] GET zone endpoint should not return nameservers field → Should succeed

## Migration Notes

1. **Existing Root NS Records**: Any existing root NS records in the database should remain but become read-only for users. The DNS service backend should manage these.

2. **Zone Nameservers Data**: The `nameservers` column has been dropped from the zones table. If you need to display nameservers to users, query them from the `zone_records` table where `type = 'NS'` and `name` is the zone root.

3. **Backward Compatibility**: If older API clients send `nameservers` field, it should be silently ignored rather than causing an error.

## Database Migration Status

✅ Migration applied to dev branch: `20251209000000_add_ptr_and_remove_nameservers.sql`
- Project: https://ipfsrbxjgewhdcvonrbo.supabase.co (dev branch)
- Changes:
  - Added PTR to zone_records type constraint
  - Removed nameservers column from zones table

## Frontend Changes Completed

✅ All frontend changes have been implemented:
- TypeScript types updated for PTR and nameservers removal
- DNS validation updated with NS root restrictions and PTR validation
- TTL presets updated (15 min to 1 day range)
- TTL minimum validation updated to 10 seconds
- Zone edit modal updated (nameservers field removed)
- DNS records table updated (root NS records filtered from display)
- Manage DNS record modal updated (PTR added to dropdown, TTL minimum updated)

## Contact

If you have questions about these changes, please refer to:
- Plan document: `zone-records-schema.plan.md`
- Migration file: `supabase/migrations/20251209000000_add_ptr_and_remove_nameservers.sql`
- Frontend validation: `lib/utils/dns-validation.ts`

