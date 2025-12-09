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

##### B. Add CNAME Root Record Restriction
Prevent users from creating or updating CNAME records at the zone root:

```javascript
// Validation logic to add
if (recordData.type === 'CNAME') {
  const normalizedName = recordData.name.trim();
  const isRootCNAME = normalizedName === '@' || 
                      normalizedName === '' || 
                      normalizedName === zoneName;
  
  if (isRootCNAME) {
    return res.status(400).json({
      error: 'The domain root (@) cannot be a CNAME. Please use a subdomain instead.'
    });
  }
}
```

##### C. Add PTR Record Type Support
Update the record type validation to include 'PTR':

```javascript
const validRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV', 'CAA', 'PTR'];

if (!validRecordTypes.includes(recordData.type)) {
  return res.status(400).json({
    error: `Invalid record type. Must be one of: ${validRecordTypes.join(', ')}`
  });
}
```

##### D. Update TTL Validation
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

### 3. Zone-Type-Based Record Validation (Required)

Add a helper function to determine zone type:

```javascript
function isReverseZone(zoneName) {
  return zoneName.endsWith('.in-addr.arpa') || zoneName.endsWith('.ip6.arpa');
}
```

Then add zone-type-based validation after fetching the zone:

```javascript
// Determine zone type
const reverseZone = isReverseZone(zone.name);

// Define allowed record types based on zone type
const forwardRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'CAA', 'NS'];
const reverseRecordTypes = ['PTR', 'NS'];

// Validate record type for reverse zones
if (reverseZone && !reverseRecordTypes.includes(recordData.type)) {
  return res.status(400).json({
    error: `Invalid record type for reverse zone. Reverse zones only support: ${reverseRecordTypes.join(', ')}`
  });
}

// Validate PTR records are only in reverse zones
if (!reverseZone && recordData.type === 'PTR') {
  return res.status(400).json({
    error: 'PTR records are only allowed in reverse zones (zones ending in .in-addr.arpa or .ip6.arpa)'
  });
}
```

### 4. PTR Record Value Validation

Add PTR-specific value validation:

```javascript
if (recordData.type === 'PTR') {
  // Validate that the value is a valid hostname
  if (!isValidDomain(recordData.value)) {
    return res.status(400).json({
      error: 'PTR record must point to a valid hostname (e.g., server.example.com)'
    });
  }
}
```

### 5. PTR Record Name Validation by Reverse Zone Type (Required)

Add helper function to determine IPv4 vs IPv6 reverse zone type:

```javascript
/**
 * Determines if a reverse zone is IPv4 or IPv6
 */
function getReverseZoneType(zoneName) {
  if (zoneName.endsWith('.in-addr.arpa')) return 'ipv4';
  if (zoneName.endsWith('.ip6.arpa')) return 'ipv6';
  return null;
}
```

Add PTR name validation function:

```javascript
/**
 * Validates PTR record name based on reverse zone type
 */
function validatePTRRecordName(name, zoneName) {
  // PTR records cannot be at zone root
  if (name === '@' || name === '') {
    return {
      valid: false,
      error: 'PTR records cannot be created at zone root. Specify a valid name.'
    };
  }
  
  const reverseType = getReverseZoneType(zoneName);
  
  if (!reverseType) {
    return {
      valid: false,
      error: 'PTR records are only allowed in reverse zones'
    };
  }
  
  if (reverseType === 'ipv4') {
    // IPv4 reverse: must be an integer 0-255
    const num = parseInt(name, 10);
    if (!/^\d+$/.test(name) || isNaN(num) || num < 0 || num > 255) {
      return {
        valid: false,
        error: 'PTR name in IPv4 reverse zone must be an integer between 0 and 255'
      };
    }
  } else if (reverseType === 'ipv6') {
    // IPv6 reverse: must be a single hexadecimal nibble
    if (!/^[0-9a-fA-F]$/.test(name)) {
      return {
        valid: false,
        error: 'PTR name in IPv6 reverse zone must be a single hexadecimal digit (0-9, a-f)'
      };
    }
  }
  
  return { valid: true };
}
```

Apply validation in PTR record handling:

```javascript
if (recordData.type === 'PTR') {
  // Existing zone type validation
  if (!isReverseZone(zone.name)) {
    return res.status(400).json({
      error: 'PTR records are only allowed in reverse zones (zones ending in .in-addr.arpa or .ip6.arpa)'
    });
  }
  
  // Existing value validation
  if (!isValidDomain(recordData.value)) {
    return res.status(400).json({
      error: 'PTR record must point to a valid hostname (e.g., server.example.com)'
    });
  }
  
  // NEW: Name validation based on reverse zone type
  const nameValidation = validatePTRRecordName(recordData.name, zone.name);
  if (!nameValidation.valid) {
    return res.status(400).json({
      error: nameValidation.error
    });
  }
}
```

#### PTR Name Validation Rules

**IPv4 Reverse Zones** (`*.in-addr.arpa`):
- Valid names: Integers `0` through `255` only
- Examples: `5`, `10`, `255`
- Invalid: `@`, `` (empty/root), `256`, `-1`, `1.2`, `a`, `0f`, `subdomain`

**IPv6 Reverse Zones** (`*.ip6.arpa`):
- Valid names: Single hex digits `0-9`, `a-f` (case insensitive) only
- Examples: `0`, `5`, `a`, `f`
- Invalid: `@`, `` (empty/root), `10`, `g`, `0a`, `subdomain`, `1.2`

**Note**: PTR records cannot be created at the zone root. They must always have a specific name.

## Testing Checklist

After implementing these changes, test the following scenarios:

### NS Record Validation
- [ ] Attempt to create NS record with name '@' → Should fail with appropriate error
- [ ] Attempt to create NS record with name '' (empty) → Should fail with appropriate error
- [ ] Attempt to create NS record with name matching zone name → Should fail with appropriate error
- [ ] Create NS record with subdomain name (e.g., 'dev') → Should succeed
- [ ] Attempt to update existing root NS record → Should fail with appropriate error

### CNAME Record Validation
- [ ] Attempt to create CNAME record with name '@' → Should fail with appropriate error
- [ ] Attempt to create CNAME record with name '' (empty) → Should fail with appropriate error
- [ ] Attempt to create CNAME record with name matching zone name → Should fail with appropriate error
- [ ] Create CNAME record with subdomain name (e.g., 'www') → Should succeed
- [ ] Attempt to update existing CNAME to root → Should fail with appropriate error

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

