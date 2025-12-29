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

##### C. Add CNAME Conflict Validation (CRITICAL)
**IMPORTANT:** CNAME records cannot coexist with any other records at the same name. This validation must be enforced on both creation and update:

```javascript
// Helper function to check for CNAME conflicts
async function checkCNAMEConflicts(zoneId, recordName, recordType, recordId = null) {
  // Fetch all records with the same name in this zone (excluding current record if editing)
  const query = supabase
    .from('zone_records')
    .select('id, name, type')
    .eq('zone_id', zoneId)
    .eq('name', recordName);
  
  if (recordId) {
    query.neq('id', recordId); // Exclude current record when editing
  }
  
  const { data: conflictingRecords, error } = await query;
  
  if (error) throw error;
  
  if (recordType === 'CNAME') {
    // Creating/updating to CNAME: check if ANY other record exists
    if (conflictingRecords && conflictingRecords.length > 0) {
      return {
        hasConflict: true,
        error: `Cannot create CNAME: ${conflictingRecords.length} other record(s) already exist at this name. CNAME cannot coexist with other records.`
      };
    }
  } else {
    // Creating/updating to non-CNAME: check if a CNAME exists
    const cnameExists = conflictingRecords && conflictingRecords.some(r => r.type === 'CNAME');
    if (cnameExists) {
      return {
        hasConflict: true,
        error: `Cannot create ${recordType} record: a CNAME record already exists at this name. CNAME cannot coexist with other records.`
      };
    }
  }
  
  return { hasConflict: false };
}

// Use in create/update endpoints:
const conflictCheck = await checkCNAMEConflicts(zoneId, recordData.name, recordData.type, recordId);
if (conflictCheck.hasConflict) {
  return res.status(400).json({ error: conflictCheck.error });
}
```

##### D. Add PTR Record Type Support
Update the record type validation to include 'PTR':

```javascript
const validRecordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV', 'CAA', 'PTR'];

if (!validRecordTypes.includes(recordData.type)) {
  return res.status(400).json({
    error: `Invalid record type. Must be one of: ${validRecordTypes.join(', ')}`
  });
}
```

##### E. Update TTL Validation
Update TTL validation to enforce minimum of 10 seconds and maximum of 7 days (604800 seconds):

```javascript
// Old validation (if exists)
if (recordData.ttl < 60) {
  return res.status(400).json({
    error: 'TTL must be at least 60 seconds'
  });
}

// New validation
if (!Number.isInteger(recordData.ttl)) {
  return res.status(400).json({
    error: 'TTL must be an integer'
  });
}

if (recordData.ttl < 10) {
  return res.status(400).json({
    error: 'TTL must be at least 10 seconds'
  });
}

if (recordData.ttl > 604800) {
  return res.status(400).json({
    error: 'TTL must not exceed 604800 seconds (7 days)'
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

### 6. DNS Record Comment Field Support (Required)

The `comment` field must be included in all DNS record operations. Currently, the comment field is being saved but not returned by the API.

#### Required Changes

**Location**: All DNS records endpoints

**GET /api/dns-records/zone/:zoneId** - List records for a zone:
```javascript
// Ensure the SELECT query includes the comment column
const { data: records, error } = await supabase
  .from('zone_records')
  .select('id, zone_id, name, type, value, ttl, comment, created_at, updated_at')
  .eq('zone_id', zoneId);
```

**GET /api/dns-records/:id** - Get single record:
```javascript
// Ensure the SELECT query includes the comment column
const { data: record, error } = await supabase
  .from('zone_records')
  .select('id, zone_id, name, type, value, ttl, comment, created_at, updated_at')
  .eq('id', recordId)
  .single();
```

**POST /api/dns-records** - Create new record:
```javascript
// Accept comment in request body
const { name, type, value, ttl, comment, zone_id } = req.body;

// Check for CNAME conflicts BEFORE inserting
const conflictCheck = await checkCNAMEConflicts(zone_id, name, type);
if (conflictCheck.hasConflict) {
  return res.status(400).json({ error: conflictCheck.error });
}

// Include comment when inserting
const { data: record, error } = await supabase
  .from('zone_records')
  .insert({
    zone_id,
    name,
    type,
    value,
    ttl,
    comment: comment || null  // Store null if empty
  })
  .select('id, zone_id, name, type, value, ttl, comment, created_at, updated_at')
  .single();

// Return the created record with comment
return res.json({ data: record });
```

**PUT /api/dns-records/:id** - Update existing record:
```javascript
// Accept comment in request body
const { name, type, value, ttl, comment } = req.body;

// Get the zone_id from the existing record
const { data: existingRecord } = await supabase
  .from('zone_records')
  .select('zone_id')
  .eq('id', recordId)
  .single();

// Check for CNAME conflicts BEFORE updating (pass recordId to exclude current record)
const conflictCheck = await checkCNAMEConflicts(existingRecord.zone_id, name, type, recordId);
if (conflictCheck.hasConflict) {
  return res.status(400).json({ error: conflictCheck.error });
}

// Include comment when updating
const { data: record, error } = await supabase
  .from('zone_records')
  .update({
    name,
    type,
    value,
    ttl,
    comment: comment || null,  // Store null if empty
    updated_at: new Date().toISOString()
  })
  .eq('id', recordId)
  .select('id, zone_id, name, type, value, ttl, comment, created_at, updated_at')
  .single();

// Return the updated record with comment
return res.json({ data: record });
```

#### Why This Is Important

- Users can add comments/notes to DNS records for documentation
- Comments help teams understand the purpose of specific records
- The frontend already supports creating and editing comments
- Without backend support, comments are lost or not displayed

### 7. Domain/Hostname Validation Updates (Required)

The domain/hostname validation must be updated to allow underscores and trailing dots in all hostname/domain value fields.

#### Changes Needed

##### Update `isValidDomain()` Helper Function

Replace the current domain validation regex to allow underscores:

```javascript
/**
 * Validates domain name format
 * Allows: alphanumerics, backslash, hyphens, underscores, dots, and optional trailing dot
 * Maximum length: 255 characters
 * Maximum label length: 63 characters
 */
function isValidDomain(domain) {
  // Allow @ for apex
  if (domain === '@') return true;
  
  // Check total length (255 characters for hostnames/domains)
  if (domain.length > 255) return false;
  
  // Domain name regex - allows alphanumerics, backslash, hyphens, underscores, and trailing dot
  // Note: Underscores and backslashes are technically not RFC-compliant for hostnames but are allowed here for flexibility
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?)*\.?$/;
  
  if (!domainRegex.test(domain)) return false;
  
  // Check each label length
  // Filter out empty labels caused by trailing dots (e.g., "example.com." splits to ["example", "com", ""])
  const labels = domain.split('.').filter(label => label.length > 0);
  return labels.length > 0 && labels.every(label => label.length <= 63);
}
```

##### Key Changes from Previous Validation

1. **Backslashes Allowed**: Added `\` to the character class `[a-zA-Z0-9_\-\\]`
2. **Underscores Allowed**: Added `_` to the character class
3. **Trailing Dot Allowed**: The regex already ends with `\.?$` which allows an optional trailing dot

##### Apply to These Record Types

This validation applies to hostname/domain values in:
- **CNAME**: Target domain (value field)
- **MX**: Mail server hostname (after priority in value field)
- **NS**: Nameserver domain (value field)
- **SRV**: Target hostname (last part of value field)
- **PTR**: Target domain (value field)

##### Example Valid Values

```
mail.example.com       // Standard domain
mail.example.com.      // With trailing dot (FQDN)
_dmarc.example.com     // With underscore (common for TXT/DKIM)
mail_server.example.com // Underscore in subdomain
```

##### Example Invalid Values

```
-invalid.com           // Cannot start with hyphen
invalid-.com           // Cannot end label with hyphen
..example.com          // Empty label
example..com           // Empty label
```

#### Why This Is Important

- **Trailing dots**: DNS fully qualified domain names (FQDNs) end with a dot. Users entering FQDNs should not get validation errors.
- **Underscores**: While not strictly RFC-compliant for hostnames, underscores are commonly used in DNS records like `_dmarc`, `_domainkey`, and `_acme-challenge`. Many DNS providers allow them.
- **Consistency**: The frontend now accepts these characters, so the backend must also accept them to prevent form submission errors.

### 8. DNS Record Name Validation Updates (Required)

The DNS record name validation must enforce consistent limits and character rules.

#### Changes Needed

##### Update Record Name Validation Function

Create or update the record name validation function:

```javascript
/**
 * Validates DNS record name
 * Allows: alphanumerics, backslash, hyphens, underscores, dots
 * Maximum length: 253 characters
 * Maximum label length: 63 characters
 */
function isValidRecordName(name) {
  // @ is valid for apex
  if (name === '@') return true;
  
  // Empty is valid (represents zone apex)
  if (name === '') return true;
  
  // Check total length
  if (name.length > 253) {
    return false;
  }
  
  // Check for valid characters and format
  // Allows: alphanumerics, backslash, hyphens, underscores, dots
  const nameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!nameRegex.test(name)) {
    return false;
  }
  
  // Check each label length (max 63 characters per label)
  const labels = name.split('.');
  return labels.every(label => label.length > 0 && label.length <= 63);
}
```

##### Apply Validation to DNS Record Endpoints

**Location**: DNS record create/update endpoints
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`

```javascript
// Validate record name
if (!isValidRecordName(recordData.name)) {
  return res.status(400).json({
    error: 'Invalid record name format. Allowed: alphanumerics, backslash, hyphens, underscores, dots. Max 253 chars total, 63 chars per label.'
  });
}
```

##### Validation Rules Summary

**Characters Allowed**: 
- Alphanumerics: `a-z`, `A-Z`, `0-9`
- Backslash: `\`
- Hyphens: `-`
- Underscores: `_`
- Dots: `.` (for separating labels)

**Special Cases**:
- `@` - Zone apex (allowed)
- Empty string `''` - Zone apex (allowed)

**Length Limits**:
- **Total name length**: Maximum 253 characters
- **Per-label length**: Maximum 63 characters per label (part between dots)

**Label Rules**:
- Must start with alphanumeric character
- Must end with alphanumeric character
- Middle characters can be alphanumerics, hyphens, or underscores

##### Example Valid Names

```
www                    // Simple subdomain
_dmarc                 // Underscore prefix (common for service records)
sub-domain             // With hyphen
sub_domain             // With underscore
deep.nested.subdomain  // Multiple labels
```

##### Example Invalid Names

```
-invalid               // Cannot start with hyphen
invalid-               // Cannot end with hyphen
sub..domain            // Empty label
toolongname...         // Name exceeds 253 characters
verylonglabel...       // Any label exceeds 63 characters
```

#### Why This Is Important

- **Consistency**: Frontend and backend must enforce the same rules
- **Underscores**: Common in service records like `_dmarc`, `_domainkey`, `_acme-challenge`
- **Length limits**: DNS protocol limits (RFC 1035)
- **Label limits**: Each DNS label has a 63-byte limit

### 9. Zone Record Validation Improvements (December 2025)

The following validation improvements were implemented in the frontend and must be mirrored in the backend.

#### A. Record Name Validation - Allow Hyphens/Underscores at Start/End

**Location**: DNS record create/update endpoints
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`

**Change**:
Update the `isValidRecordName()` function to allow hyphens and underscores at the start and end of labels:

```javascript
function isValidRecordName(name) {
  // @ is valid for apex
  if (name === '@') return true;
  
  // Empty is valid (represents zone apex)
  if (name === '') return true;
  
  // Check total length
  if (name.length > 253) return false;
  
  // NEW REGEX: Allows hyphens and underscores at start/end of labels
  // This enables common DNS patterns like _dmarc, _domainkey, etc.
  const nameRegex = /^[a-zA-Z0-9_\-]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9_\-])?(\.[a-zA-Z0-9_\-]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9_\-])?)*$/;
  
  if (!nameRegex.test(name)) return false;
  
  // Check each label length (max 63 characters per label)
  const labels = name.split('.');
  return labels.every(label => label.length > 0 && label.length <= 63);
}
```

**Examples of newly allowed names**:
- `_dmarc` (underscore prefix for DMARC records)
- `_domainkey` (for DomainKeys)
- `_acme-challenge` (for ACME challenges)
- `-test-` (hyphens at both ends)
- `subdomain_` (underscore suffix)

#### B. Duplicate Record TTL Consistency Validation

**Location**: DNS record create/update endpoints

**Requirement**: When multiple records exist with the same `name` and `type` but different `value` fields, all records MUST have identical TTL values.

**Implementation**:
Before saving a record, query for existing records with same `zone_id`, `name`, and `type`:

```javascript
// Fetch existing records with same name and type
const existingRecords = await db.query(
  'SELECT ttl FROM zone_records WHERE zone_id = $1 AND name = $2 AND type = $3 AND id != $4',
  [zoneId, recordData.name, recordData.type, recordId || '00000000-0000-0000-0000-000000000000']
);

if (existingRecords.rows.length > 0) {
  const existingTTLs = existingRecords.rows.map(r => r.ttl);
  const uniqueTTLs = new Set([...existingTTLs, recordData.ttl]);
  
  if (uniqueTTLs.size > 1) {
    return res.status(400).json({
      error: `All records with name "${recordData.name}" and type ${recordData.type} must have the same TTL. Existing records use: ${existingTTLs.join(', ')} seconds`
    });
  }
}
```

**Why this is important**: DNS resolvers expect all records in an RRset (Resource Record set) to have the same TTL. Mixed TTLs can cause caching inconsistencies and unpredictable behavior.

**Example scenario**:
- Zone: `example.com`
- Existing record: `www A 192.0.2.1 TTL=3600`
- Existing record: `www A 192.0.2.2 TTL=3600`
- New record attempt: `www A 192.0.2.3 TTL=7200` → Should fail
- New record attempt: `www A 192.0.2.3 TTL=3600` → Should succeed

#### C. NS Glue Record Validation

**Location**: DNS record create/update endpoints (NS record handling)

**Requirement**: When an NS record points to a nameserver that is a subdomain of the current zone, at least one A or AAAA glue record must exist for that nameserver.

**Implementation**:
```javascript
if (recordData.type === 'NS') {
  // Existing validations...
  
  // NEW: Check for glue records if NS target is subdomain of zone
  const nsTarget = recordData.value.endsWith('.') 
    ? recordData.value.slice(0, -1) 
    : recordData.value;
  
  // Fetch zone name
  const zone = await db.query('SELECT name FROM zones WHERE id = $1', [zoneId]);
  const zoneName = zone.rows[0].name;
  
  // Check if NS target is subdomain of current zone
  if (nsTarget.endsWith(`.${zoneName}`) || nsTarget === zoneName) {
    // Query for A or AAAA glue records
    const glueRecords = await db.query(
      `SELECT id FROM zone_records 
       WHERE zone_id = $1 
       AND (type = 'A' OR type = 'AAAA')
       AND (CASE WHEN name = '@' OR name = '' THEN $2 ELSE name || '.' || $2 END) = $3`,
      [zoneId, zoneName, nsTarget]
    );
    
    if (glueRecords.rows.length === 0) {
      return res.status(400).json({
        error: `Nameserver "${nsTarget}" is within this zone and requires at least one A or AAAA glue record. Create the glue record first.`
      });
    }
  }
}
```

**Why this is important**: When a nameserver is within the same zone it's authoritative for, DNS resolvers need the IP address (glue record) to avoid circular dependencies. Without glue records, the zone becomes unresolvable.

**Example scenarios**:
- Zone: `example.com`
- NS record: `subdomain NS ns1.example.com` → Requires `ns1 A 192.0.2.1` to exist first
- NS record: `subdomain NS ns1.otherdomain.com` → No glue record required (external nameserver)

## Testing Checklist

After implementing these changes, test the following scenarios:

### Record Name Validation (Updated)
- [ ] Create record with name starting with underscore: `_dmarc` → Should succeed
- [ ] Create record with name starting with hyphen: `-test` → Should succeed
- [ ] Create record with name ending with underscore: `subdomain_` → Should succeed
- [ ] Create record with name ending with hyphen: `subdomain-` → Should succeed
- [ ] Create record with name `_acme-challenge` → Should succeed
- [ ] Create record with multiple labels: `deep.nested.subdomain` → Should succeed
- [ ] Reject name exceeding 253 characters → Should fail
- [ ] Reject name with any label exceeding 63 characters → Should fail

### TTL Consistency Validation (New)
- [ ] Create first A record: `www A 192.0.2.1 TTL=3600` → Should succeed
- [ ] Create second A record with same TTL: `www A 192.0.2.2 TTL=3600` → Should succeed
- [ ] Create third A record with different TTL: `www A 192.0.2.3 TTL=7200` → Should fail with TTL mismatch error
- [ ] Update existing record to mismatched TTL → Should fail
- [ ] Update existing record to matching TTL → Should succeed
- [ ] Create records with same name but different type (e.g., www A and www AAAA) → Should succeed (TTL check only applies within same type)

### NS Glue Record Validation (New)
- [ ] Create NS record pointing to subdomain without glue records → Should fail with glue record error
- [ ] Create glue record: `ns1 A 192.0.2.1` → Should succeed
- [ ] Create NS record pointing to subdomain with glue records → Should succeed
- [ ] Create NS record pointing to external domain → Should succeed (no glue check)
- [ ] Delete glue record when NS record still references it → Should fail (referential integrity)

### NS Record Validation (Existing)
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
- [ ] Create record with TTL = 604800 seconds (7 days) → Should succeed
- [ ] Create record with TTL = 604801 seconds (over 7 days) → Should fail with appropriate error
- [ ] Create record with non-integer TTL → Should fail with appropriate error

### Nameservers Field
- [ ] Attempt to create zone with nameservers field → Should be ignored (not stored)
- [ ] Attempt to update zone with nameservers field → Should be ignored (not stored)
- [ ] GET zone endpoint should not return nameservers field → Should succeed

### Comment Field Support
- [ ] Create DNS record with comment → Should succeed and return comment
- [ ] Create DNS record without comment → Should succeed and return null comment
- [ ] Update DNS record with new comment → Should succeed and return updated comment
- [ ] Update DNS record to remove comment (empty string) → Should succeed and return null comment
- [ ] GET single record should include comment field → Should succeed
- [ ] GET zone records should include comment field for all records → Should succeed
- [ ] Comment field persists when editing other record fields → Should succeed

### CNAME Conflict Validation
- [ ] Create CNAME when A record exists at same name → Should fail with conflict error
- [ ] Create A record when CNAME exists at same name → Should fail with conflict error
- [ ] Create CNAME at name with no other records → Should succeed
- [ ] Create multiple A records at same name → Should succeed (non-CNAME records can coexist)
- [ ] Update record name to conflict with CNAME → Should fail with conflict error
- [ ] Update record type to CNAME when other records exist at name → Should fail with conflict error
- [ ] Delete CNAME then create A record at same name → Should succeed

### Hostname/Domain Validation
- [ ] Create CNAME with underscore in target (e.g., `_dmarc.example.com`) → Should succeed
- [ ] Create CNAME with trailing dot (e.g., `mail.example.com.`) → Should succeed
- [ ] Create MX with underscore in hostname (e.g., `10 mail_server.example.com`) → Should succeed
- [ ] Create NS with trailing dot (e.g., `ns1.example.com.`) → Should succeed
- [ ] Create SRV with underscore in target → Should succeed
- [ ] Create PTR with trailing dot in target → Should succeed
- [ ] Reject hostname starting with hyphen (e.g., `-invalid.com`) → Should fail
- [ ] Reject hostname with empty label (e.g., `example..com`) → Should fail
- [ ] Reject hostname exceeding 255 characters → Should fail
- [ ] Reject hostname with label exceeding 63 characters → Should fail

### Record Name Validation
- [ ] Create record with underscore in name (e.g., `_dmarc`) → Should succeed
- [ ] Create record with hyphen in name (e.g., `sub-domain`) → Should succeed
- [ ] Create record with multiple labels (e.g., `deep.nested.subdomain`) → Should succeed
- [ ] Create record with name `@` (apex) → Should succeed
- [ ] Create record with empty name (apex) → Should succeed
- [ ] Reject wildcard record (e.g., `*` or `*.subdomain`) → Should fail
- [ ] Reject name starting with hyphen (e.g., `-invalid`) → Should fail
- [ ] Reject name ending with hyphen (e.g., `invalid-`) → Should fail
- [ ] Reject name with empty label (e.g., `sub..domain`) → Should fail
- [ ] Reject name exceeding 253 characters → Should fail
- [ ] Reject name with any label exceeding 63 characters → Should fail

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

