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

### 10. AAAA (IPv6) Record Validation (December 2025)

The AAAA record validation must be updated to use robust IPv6 parsing instead of regex-based validation.

#### A. Validation Source of Truth

**Backend (Express) is authoritative**: All writes must pass backend validation.

**Frontend (Next.js)**: Mirrors backend rules for immediate UX feedback, but never replaces backend enforcement.

#### B. Implementation Using net.isIP()

Add IPv6 validation helper function using Node's built-in `net.isIP()`:

```javascript
/**
 * Validates IPv6 address format using Node's built-in net.isIP
 * 
 * Test vectors (shared with frontend):
 * Valid:
 *   - 2001:0db8:85a3:0000:0000:8a2e:0370:7334 (full form)
 *   - 2001:db8::1 (compressed)
 *   - ::1 (loopback)
 *   - :: (all zeros)
 *   - 2001:db8::192.0.2.1 (IPv4-embedded)
 *   - ::ffff:192.0.2.1 (IPv4-mapped)
 *   - 2001:DB8::1 (uppercase hex)
 * 
 * Invalid:
 *   - 192.0.2.1 (IPv4 only)
 *   - 2001:db8:::1 (multiple ::)
 *   - 2001:db8::zzzz (invalid hextet)
 *   - 2001:db8::1::1 (multiple :: groups)
 *   - 2001:db8:1:2:3:4:5:6:7 (>8 groups)
 *   - example.com (hostname)
 */
function isValidIPv6(ip) {
  const net = require('net');
  const trimmed = ip.trim();
  return net.isIP(trimmed) === 6;
}
```

#### C. Apply to DNS Record Endpoints

**Location**: DNS record create/update endpoints
- `POST /api/dns-records`
- `PUT /api/dns-records/:id`

Add validation in the type-specific validation section:

```javascript
if (recordData.type === 'AAAA') {
  if (!isValidIPv6(recordData.value)) {
    return res.status(400).json({
      error: 'Enter a valid IPv6 address'
    });
  }
}
```

#### D. Input Handling

- **Trim whitespace**: Always trim before validation
- **Accept uppercase hex**: Both `2001:db8::1` and `2001:DB8::1` are valid

#### E. Acceptance Rules

**Accept**:
- Full IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334`
- Compressed with `::`: `2001:db8::1`, `::1`, `::`
- Suppressed leading zeros: `2001:db8:0:0:0:0:0:1`
- IPv4-embedded: `2001:db8::192.0.2.1`, `::ffff:192.0.2.1`
- Uppercase hex: `2001:DB8::1`

**Reject**:
- IPv4-only: `192.0.2.1`
- Hostnames: `example.com`, `mail.example.com.`
- Invalid hextets: `2001:db8::zzzz`
- Multiple `::`: `2001:db8::1::1`
- More than 8 groups: `2001:db8:1:2:3:4:5:6:7`
- Leading/trailing junk: `2001:db8::1x`, `x2001:db8::1`

#### Why This Is Important

- **Regex limitations**: IPv6 regex patterns are notoriously complex and error-prone
- **Consistency**: Using `net.isIP()` ensures the same behavior as Node.js itself
- **Comprehensive**: Handles all IPv6 formats including compressed, IPv4-embedded, and edge cases
- **Frontend alignment**: Frontend uses `ipaddr.js` parser which has identical acceptance rules

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

### AAAA Record Validation (New)
- [ ] Create AAAA with full IPv6: `2001:0db8:85a3:0000:0000:8a2e:0370:7334` → Should succeed
- [ ] Create AAAA with compressed: `2001:db8::1` → Should succeed
- [ ] Create AAAA with loopback: `::1` → Should succeed
- [ ] Create AAAA with all zeros: `::` → Should succeed
- [ ] Create AAAA with IPv4-embedded: `2001:db8::192.0.2.1` → Should succeed
- [ ] Create AAAA with IPv4-mapped: `::ffff:192.0.2.1` → Should succeed
- [ ] Create AAAA with uppercase: `2001:DB8::1` → Should succeed
- [ ] Reject AAAA with IPv4 only: `192.0.2.1` → Should fail
- [ ] Reject AAAA with multiple `::`: `2001:db8:::1` → Should fail
- [ ] Reject AAAA with invalid hextet: `2001:db8::zzzz` → Should fail
- [ ] Reject AAAA with hostname: `example.com` → Should fail
- [ ] Reject AAAA with >8 groups: `2001:db8:1:2:3:4:5:6:7` → Should fail

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

### 11. Audit Logs API Endpoints (December 2025)

The application was making direct Supabase PostgREST calls for audit logs, which were failing with 400 errors due to missing foreign key relationships. All audit log queries must now go through the Express API.

#### A. Zone Audit Logs Endpoint

**Create new endpoint:**
```
GET /api/zones/:id/audit-logs
```

**Purpose**: Fetch audit logs for a specific zone with user profile information enriched server-side.

**IMPORTANT**: This endpoint should return audit logs for **BOTH** the zone itself (zones table) **AND** its DNS records (zone_records table). This gives users a complete history of all changes within that zone. The frontend `AuditTimeline` component checks the `table_name` field to display appropriate labels ("updated zone" vs "updated a record").

**Implementation:**

```javascript
const express = require('express');
const router = express.Router();

/**
 * Get audit logs for a zone
 * Returns logs for BOTH the zone AND its records
 * Performs server-side join with profiles table
 */
router.get('/zones/:id/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { id: zoneId } = req.params;
    
    // Verify user has access to this zone
    const { data: zone, error: zoneError } = await supabase
      .from('zones')
      .select('id, organization_id')
      .eq('id', zoneId)
      .single();
    
    if (zoneError || !zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    
    // Check user has access to the organization
    const hasAccess = await checkOrganizationAccess(req.user.id, zone.organization_id);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Get all record IDs for this zone
    const { data: records } = await supabase
      .from('zone_records')
      .select('id')
      .eq('zone_id', zoneId);
    
    const recordIds = records?.map(r => r.id) || [];
    
    // Fetch audit logs for BOTH zone and its records
    // Build the query to get logs where:
    // 1. table_name='zones' AND record_id=zoneId (zone changes)
    // 2. table_name='zone_records' AND record_id IN recordIds (record changes)
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`and(table_name.eq.zones,record_id.eq.${zoneId}),and(table_name.eq.zone_records,record_id.in.(${recordIds.join(',')}))`)
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Fetch user profiles for audit logs (do join manually)
    const userIds = [...new Set(auditLogs.map(log => log.user_id).filter(Boolean))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);
    
    // Create a map for quick lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Combine data
    const enrichedLogs = auditLogs.map(log => ({
      id: log.id,
      table_name: log.table_name,
      record_id: log.record_id,
      action: log.action,
      old_data: log.old_data,
      new_data: log.new_data,
      user_id: log.user_id,
      user_name: profileMap.get(log.user_id)?.name || 'Unknown User',
      user_email: profileMap.get(log.user_id)?.email || 'unknown@example.com',
      created_at: log.created_at,
      ip_address: log.metadata?.ip_address,
      user_agent: log.metadata?.user_agent,
    }));
    
    return res.json({ data: enrichedLogs });
  } catch (error) {
    console.error('Error fetching zone audit logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Response format:**
```json
{
  "data": [
    {
      "id": "uuid",
      "table_name": "zones",
      "record_id": "zone-uuid",
      "action": "UPDATE",
      "old_data": {"name": "old.com", "description": "Old description"},
      "new_data": {"name": "new.com", "description": "New description"},
      "user_id": "user-uuid",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "ip_address": "192.0.2.1",
      "user_agent": "Mozilla/5.0..."
    },
    {
      "id": "uuid",
      "table_name": "zone_records",
      "record_id": "record-uuid",
      "action": "INSERT",
      "old_data": null,
      "new_data": {"name": "www", "type": "A", "value": "192.0.2.100"},
      "user_id": "user-uuid",
      "user_name": "John Doe",
      "user_email": "john@example.com",
      "created_at": "2024-01-01T00:00:00Z",
      "ip_address": "192.0.2.1",
      "user_agent": "Mozilla/5.0..."
    }
  ]
}
```

**Note**: The `table_name` field will be either `"zones"` (for zone changes) or `"zone_records"` (for DNS record changes). The frontend uses this field to display appropriate labels in the audit timeline.
```

#### B. Organization Audit Logs Endpoint

**Create new endpoint:**
```
GET /api/organizations/:id/audit-logs?limit=10
```

**Purpose**: Fetch audit logs for a specific organization with user profile information.

**Implementation:**

```javascript
/**
 * Get audit logs for an organization
 * Performs server-side join with profiles table
 */
router.get('/organizations/:id/audit-logs', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Check user has access to the organization
    const hasAccess = await checkOrganizationAccess(req.user.id, organizationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Fetch audit logs
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('table_name', 'organizations')
      .eq('record_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Fetch user profiles (same manual join as zone audit logs)
    const userIds = [...new Set(auditLogs.map(log => log.user_id).filter(Boolean))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);
    
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    // Combine data
    const enrichedLogs = auditLogs.map(log => ({
      ...log,
      profiles: profileMap.get(log.user_id) || { name: 'Unknown User', email: 'unknown@example.com' }
    }));
    
    return res.json({ data: enrichedLogs });
  } catch (error) {
    console.error('Error fetching organization audit logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### C. Organization Activity Logs Endpoint

**Create new endpoint:**
```
GET /api/organizations/:id/activity?limit=10
```

**Purpose**: Get comprehensive activity logs for an organization (calls RPC function if available).

**Implementation:**

```javascript
/**
 * Get activity logs for an organization
 * Calls the get_organization_activity RPC function
 */
router.get('/organizations/:id/activity', authenticateToken, async (req, res) => {
  try {
    const { id: organizationId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    // Check user has access to the organization
    const hasAccess = await checkOrganizationAccess(req.user.id, organizationId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Call RPC function
    const { data, error } = await supabase.rpc('get_organization_activity', {
      org_id: organizationId,
      log_limit: limit
    });
    
    if (error) {
      // If RPC doesn't exist, fall back to organization audit logs
      console.warn('get_organization_activity RPC not found, falling back to audit logs');
      // Re-route to audit logs endpoint internally or return empty
      return res.json({ data: [] });
    }
    
    return res.json({ data: data || [] });
  } catch (error) {
    console.error('Error fetching organization activity logs:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

#### D. Update Existing Zones Endpoint

**CRITICAL BUG FIX: `GET /api/zones/:id` Query Issue**

The current endpoint has a bug where the `organization_members!inner` join causes the query to fail and return 404 even when the zone exists.

**Current (BROKEN) Implementation:**
```typescript
const { data: zone, error } = await supabaseAdmin
  .from("zones")
  .select(`
    id,
    organization_id,
    name,
    description,
    verification_status,
    last_verified_at,
    metadata,
    soa_serial,
    live,
    admin_email,
    negative_caching_ttl,
    error,
    created_at,
    updated_at,
    created_by,
    deleted_at,
    organizations(
      id,
      name,
      organization_members!inner(user_id, role)  // ← BUG: !inner causes query to fail
    )
  `)
  .eq("id", id)
  .single();
```

**Problem:** The `!inner` join requires a matching `organization_members` record. If the join fails (even temporarily), the entire query returns no results, causing a 404 "Zone not found" error before the membership check can run.

**Fixed Implementation:**
```typescript
export const getZone = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const userId = req.user!.id;

  if (!validateUUID(id)) {
    throw new ValidationError("Invalid zone ID");
  }

  // First, fetch the zone without the problematic inner join
  const { data: zone, error } = await supabaseAdmin
    .from("zones")
    .select(`
      id,
      organization_id,
      name,
      description,
      verification_status,
      last_verified_at,
      metadata,
      records_count,
      soa_serial,
      live,
      admin_email,
      negative_caching_ttl,
      error,
      created_at,
      updated_at,
      created_by,
      deleted_at,
      organizations(
        id,
        name
      )
    `)
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !zone) {
    throw new NotFoundError("Zone not found");
  }

  // Check membership separately (more reliable)
  const { data: membership } = await supabaseAdmin
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", zone.organization_id)
    .eq("user_id", userId)
    .single();

  if (!membership) {
    throw new ForbiddenError("You do not have access to this zone");
  }

  sendSuccess(res, zone);
};
```

**Required Fields:** The endpoint must return these fields for the frontend:
- `verification_status`
- `last_verified_at`
- `metadata`
- `records_count` (if available, otherwise calculate from zone_records)

#### Why This Is Important

1. **Security**: Direct Supabase calls expose database structure to client
2. **Foreign Key Issue**: The `audit_logs.user_id` → `profiles.id` foreign key doesn't exist, causing PostgREST joins to fail
3. **Consistency**: All data access should go through Express API for centralized auth/validation
4. **Performance**: Server-side joins are more efficient than client-side joins
5. **Reliability**: Eliminates 400 errors from failed direct Supabase queries

#### Frontend Changes Completed

✅ The following frontend files have been updated to use Express API:
- `lib/api/dns.ts` - Zone summary and audit logs now use Express API
- `lib/api/audit.ts` - Organization audit/activity logs now use Express API
- `lib/api-client.ts` - Added `auditLogs()` and `activityLogs()` methods

---

### 12. Audit Logging - Capturing User Information (January 2025)

#### Problem

Database triggers use `auth.uid()` to capture the user who made a change. However, when operations go through the Express API, the backend uses a **service role key** to execute database operations. In this context, `auth.uid()` returns NULL, resulting in audit logs showing "Unknown User" instead of the actual authenticated user.

#### Root Cause

```javascript
// Express backend uses service role key
const { data, error } = await supabase
  .from('zones')
  .update({ name: 'example.com' })
  .eq('id', zoneId);

// Database trigger fires
// auth.uid() returns NULL because there's no user session at the database level
// user_id column in audit_logs becomes NULL
```

The JWT token is validated at the Express API layer (`req.user.id`), but the database doesn't know about this user context.

#### Solution

The Express backend must set a session variable before any INSERT/UPDATE/DELETE operation so the database trigger can read it.

#### Implementation

##### A. Call set_user_context() Before All Mutations

**Before any database mutation, call the `set_user_context()` function:**

```javascript
// Example: Update zone endpoint
router.put('/zones/:id', authenticateToken, async (req, res) => {
  try {
    const { id: zoneId } = req.params;
    const { name, description } = req.body;
    
    // STEP 1: Set user context for audit logging
    await supabase.rpc('set_user_context', { user_id: req.user.id });
    
    // STEP 2: Perform the database operation
    const { data, error } = await supabase
      .from('zones')
      .update({ name, description })
      .eq('id', zoneId)
      .select()
      .single();
    
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    
    // The audit log trigger automatically captured the user_id from the session variable
    return res.json({ data });
  } catch (error) {
    console.error('Error updating zone:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
```

##### B. Affected Endpoints

**ALL endpoints that create, update, or delete the following resources must set user context:**

**Organizations:**
- `POST /api/organizations` - Create organization
- `PUT /api/organizations/:id` - Update organization  
- `DELETE /api/organizations/:id` - Delete organization

**Zones:**
- `POST /api/zones` - Create zone
- `PUT /api/zones/:id` - Update zone
- `DELETE /api/zones/:id` - Delete zone

**Zone Records (DNS Records):**
- `POST /api/dns-records` - Create DNS record
- `PUT /api/dns-records/:id` - Update DNS record
- `DELETE /api/dns-records/:id` - Delete DNS record

##### C. Implementation Approach - PostgreSQL Functions (REQUIRED)

**CRITICAL:** The backend MUST use the PostgreSQL functions defined in migration `20251230000002_audit_logging_functions.sql` for all mutations. These functions wrap the mutations and ensure `user_id` is captured correctly in audit logs.

**Why This Approach:**
- ✅ Guarantees user_id capture (single transaction/connection)
- ✅ Works reliably with service role keys
- ✅ No connection pooling issues
- ✅ Industry standard pattern for audit logging

**DO NOT** use direct `INSERT`/`UPDATE`/`DELETE` statements or Supabase's query builder for these tables when using the service role key.

##### D. Database Function Details

The migration `20251230000002_audit_logging_functions.sql` provides these functions:

**Zones:**
- `create_zone_with_audit(p_user_id, p_name, p_organization_id, p_description, p_admin_email, p_negative_caching_ttl)` → returns zones
- `update_zone_with_audit(p_user_id, p_zone_id, p_name, p_description, p_admin_email, p_negative_caching_ttl, p_live)` → returns zones
- `delete_zone_with_audit(p_user_id, p_zone_id)` → returns zones (soft delete)

**Zone Records:**
- `create_zone_record_with_audit(p_user_id, p_zone_id, p_name, p_type, p_value, p_ttl, p_comment)` → returns zone_records
- `update_zone_record_with_audit(p_user_id, p_record_id, p_name, p_type, p_value, p_ttl, p_comment)` → returns zone_records
- `delete_zone_record_with_audit(p_user_id, p_record_id)` → returns zone_records

**Organizations:**
- `create_organization_with_audit(p_user_id, p_name, p_description, p_slug, p_owner_id)` → returns organizations
- `update_organization_with_audit(p_user_id, p_org_id, p_name, p_description, p_slug, p_logo_url, p_settings, p_is_active)` → returns organizations
- `delete_organization_with_audit(p_user_id, p_org_id)` → returns organizations (soft delete)

Each function internally:
1. Sets `app.current_user_id` session variable
2. Performs the mutation
3. Returns the affected record

The `handle_audit_log()` trigger reads from this session variable:

```sql
user_id = coalesce(
  nullif(current_setting('app.current_user_id', true), '')::uuid,  -- Session variable
  auth.uid()  -- Fallback for direct operations
)
```

##### E. Backend Implementation Examples

**Example 1: Create Zone**

```javascript
// INCORRECT - DO NOT USE
const { data, error } = await supabaseAdmin
  .from('zones')
  .insert({ name: 'example.com', organization_id: orgId })
  .select()
  .single();

// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('create_zone_with_audit', {
    p_user_id: req.user.id,
    p_name: 'example.com',
    p_organization_id: orgId,
    p_description: 'My zone',
    p_admin_email: 'admin@example.com',
    p_negative_caching_ttl: 3600
  });
```

**Example 2: Update Zone**

```javascript
// INCORRECT - DO NOT USE
const { data, error } = await supabaseAdmin
  .from('zones')
  .update({ name: 'updated.com' })
  .eq('id', zoneId)
  .select()
  .single();

// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('update_zone_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: zoneId,
    p_name: 'updated.com',
    // Other fields are optional - only pass what you want to update
  });
```

**Example 3: Create DNS Record**

```javascript
// INCORRECT - DO NOT USE
const { data, error } = await supabaseAdmin
  .from('zone_records')
  .insert({
    zone_id: zoneId,
    name: 'www',
    type: 'A',
    value: '192.0.2.1',
    ttl: 3600
  })
  .select()
  .single();

// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('create_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: zoneId,
    p_name: 'www',
    p_type: 'A',
    p_value: '192.0.2.1',
    p_ttl: 3600,
    p_comment: 'Web server'
  });
```

**Example 4: Update DNS Record**

```javascript
// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('update_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_record_id: recordId,
    p_value: '192.0.2.2',
    // Only pass fields you want to update
  });
```

**Example 5: Delete Zone (Soft Delete)**

```javascript
// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('delete_zone_with_audit', {
    p_user_id: req.user.id,
    p_zone_id: zoneId
  });
```

**Example 6: Delete DNS Record (Hard Delete)**

```javascript
// CORRECT - Use the PostgreSQL function
const { data, error } = await supabaseAdmin
  .rpc('delete_zone_record_with_audit', {
    p_user_id: req.user.id,
    p_record_id: recordId
  });
```

##### F. Error Handling

```javascript
const { data, error } = await supabaseAdmin
  .rpc('create_zone_with_audit', {
    p_user_id: req.user.id,
    p_name: name,
    p_organization_id: orgId
  });

if (error) {
  console.error('Failed to create zone:', error);
  throw new Error(`Failed to create zone: ${error.message}`);
}

return data; // Returns the created zone
```

---

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

## 10. Zone Creation Validation Enhancements (January 2025)

### Overview
Three new validation rules have been added to zone creation to improve data quality and prevent DNS conflicts:
1. **Hierarchical Zone Overlap Detection** - Prevent parent/child zone conflicts
2. **Minimum Label Requirement** - Enforce at least 2 labels in zone names
3. **Default TTL Updates** - Standardize NS and CAA record TTLs to 1 hour

### A. Zone Overlap Validation

#### Location
Update the zone creation endpoint:
- `POST /api/zones`

#### Changes Needed

Add validation to detect hierarchical zone conflicts (parent/child relationships):

```javascript
// Helper function to detect zone overlap
function detectZoneOverlap(zoneName, existingZones) {
  const normalizedZoneName = zoneName.trim().toLowerCase();
  
  for (const existingZone of existingZones) {
    const normalizedExisting = existingZone.trim().toLowerCase();
    
    // Skip if exactly the same (handled by unique constraint)
    if (normalizedZoneName === normalizedExisting) {
      continue;
    }
    
    // Check if new zone is a subdomain of existing zone
    // e.g., creating "foo.acme.com" when "acme.com" exists
    if (normalizedZoneName.endsWith(`.${normalizedExisting}`)) {
      return {
        hasOverlap: true,
        conflictingZone: existingZone
      };
    }
    
    // Check if existing zone is a subdomain of new zone
    // e.g., creating "acme.com" when "foo.acme.com" exists
    if (normalizedExisting.endsWith(`.${normalizedZoneName}`)) {
      return {
        hasOverlap: true,
        conflictingZone: existingZone
      };
    }
  }
  
  return { hasOverlap: false };
}

// In zone creation endpoint, before inserting:
// Fetch all zone names globally (including soft-deleted zones)
const { data: existingZones, error } = await supabase
  .from('zones')
  .select('name');

if (error) {
  return res.status(500).json({ error: 'Failed to validate zone name' });
}

const existingZoneNames = existingZones.map(z => z.name);
const overlapResult = detectZoneOverlap(zoneName, existingZoneNames);

if (overlapResult.hasOverlap) {
  return res.status(400).json({
    error: `Zone conflicts with existing zone: ${overlapResult.conflictingZone}. Cannot create parent or child zones.`
  });
}
```

**Important Notes:**
- Check is **global** across all organizations
- Includes **soft-deleted zones** (zones with `deleted_at` set)
- Applies to **all zone types** (forward and reverse DNS zones)
- Sibling subdomains are allowed (e.g., `foo.example.com` and `bar.example.com`)

**Test Cases:**
```javascript
// Should REJECT:
// - Creating "foo.acme.com" when "acme.com" exists
// - Creating "acme.com" when "foo.acme.com" exists
// - Creating "sub.foo.acme.com" when "acme.com" exists

// Should ALLOW:
// - Creating "bar.example.com" when "foo.example.com" exists (siblings)
// - Creating "acme.com" when "example.com" exists (different TLDs)
// - Creating "acme.net" when "acme.com" exists (different TLDs)
```

### B. Minimum Label Requirement

#### Location
Update the zone creation endpoint:
- `POST /api/zones`

#### Changes Needed

Add validation to enforce at least 2 labels (one dot) in zone names:

```javascript
// Validation logic to add
function validateMinimumLabels(zoneName) {
  const labels = zoneName.split('.').filter(l => l.length > 0);
  
  if (labels.length < 2) {
    return {
      valid: false,
      error: 'Zone name must have at least 2 labels (e.g., example.com, not just "example")'
    };
  }
  
  return { valid: true };
}

// In zone creation endpoint:
const labelValidation = validateMinimumLabels(zoneName);
if (!labelValidation.valid) {
  return res.status(400).json({ error: labelValidation.error });
}
```

**Regex Pattern:**
```javascript
// Updated regex that enforces at least one dot (2+ labels)
const zoneNameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

if (!zoneNameRegex.test(zoneName)) {
  return res.status(400).json({
    error: 'Zone name must be a valid domain with at least 2 labels'
  });
}
```

**Test Cases:**
```javascript
// Should REJECT:
// - "example" (single label)
// - "localhost" (single label)
// - ".com" (starts with dot)
// - "example." (ends with dot, only 1 label)

// Should ALLOW:
// - "example.com" (2 labels)
// - "sub.example.com" (3 labels)
// - "1.0.10.in-addr.arpa" (reverse zone, 4 labels)
// - "foo.bar.baz.example.com" (5 labels)
```

### C. Default TTL Updates for NS and CAA Records

#### Location
Update the DNS record creation logic:
- `POST /api/dns-records`
- Default TTL assignment for new records

#### Changes Needed

Update default TTL values for NS and CAA record types from 86400 seconds (1 day) to 3600 seconds (1 hour):

```javascript
// Updated default TTL mapping
const DEFAULT_TTLS = {
  'A': 3600,
  'AAAA': 3600,
  'CNAME': 3600,
  'MX': 3600,
  'NS': 3600,      // Changed from 86400
  'TXT': 3600,
  'SRV': 3600,
  'CAA': 3600,     // Changed from 86400
  'SOA': 86400,    // Remains 1 day (system-managed)
  'PTR': 3600
};

// When creating a new record without explicit TTL:
const ttl = recordData.ttl || DEFAULT_TTLS[recordData.type] || 3600;
```

**Important Notes:**
- This change **only affects new records**
- Existing NS and CAA records with 86400s TTL are **not modified**
- SOA records remain at 86400s (1 day) as they are system-managed
- Users can still manually set any valid TTL (10 to 604800 seconds)

**Rationale:**
- Standardizes default TTLs across most record types
- 1 hour is a reasonable balance between caching efficiency and change propagation
- Aligns with modern DNS best practices

### Summary of Validation Flow

```
Zone Creation Request
  ↓
1. Basic validation (required fields, format)
  ↓
2. Minimum 2 labels check
  ↓
3. Fetch all existing zone names (global, including deleted)
  ↓
4. Check for hierarchical overlap
  ↓
5. Check organization limits
  ↓
6. Create zone in database
  ↓
Success
```

### Error Response Format

All validation errors should return HTTP 400 with clear error messages:

```javascript
// Zone overlap error
{
  "error": "Zone conflicts with existing zone: acme.com. Cannot create parent or child zones."
}

// Minimum labels error
{
  "error": "Zone name must have at least 2 labels (e.g., example.com, not just \"example\")"
}

// Invalid format error
{
  "error": "Zone name must be a valid domain name (e.g., example.com or subdomain.example.com)"
}
```

## Frontend Changes Completed

✅ All frontend changes have been implemented:
- TypeScript types updated for PTR and nameservers removal
- DNS validation updated with NS root restrictions and PTR validation
- TTL presets updated (15 min to 1 day range)
- TTL minimum validation updated to 10 seconds
- Zone edit modal updated (nameservers field removed)
- DNS records table updated (root NS records filtered from display)
- Manage DNS record modal updated (PTR added to dropdown, TTL minimum updated)
- **Zone overlap detection function added** (January 2025)
- **Zone creation modal updated with 2-label minimum and overlap validation** (January 2025)
- **NS and CAA default TTLs updated to 3600s** (January 2025)

## Contact

If you have questions about these changes, please refer to:
- Plan document: `zone-records-schema.plan.md`
- Migration file: `supabase/migrations/20251209000000_add_ptr_and_remove_nameservers.sql`
- Frontend validation: `lib/utils/dns-validation.ts`
- Zone validation enhancements: `lib/utils/dns-validation.ts` (detectZoneOverlap function)
- Zone creation modal: `components/modals/AddZoneModal.tsx`

