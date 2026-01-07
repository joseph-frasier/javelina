# Backend DNS Record Validation Updates

## Overview

Update DNS record validation in Express API to match frontend validation improvements. These changes ensure consistency between frontend and backend validation, improve data quality, and prevent invalid DNS records from being stored.

## Changes Required

### 1. Add Helper Functions

**Location**: `lib/validation.js` or similar validation utilities file

#### isIPAddress()

Detects both IPv4 and IPv6 addresses to prevent them from being used in MX and SRV records.

```javascript
/**
 * Checks if a string is an IPv4 or IPv6 address
 * @param {string} value - The value to check
 * @returns {boolean} - True if the value is an IP address
 */
function isIPAddress(value) {
  const trimmed = value.trim();
  
  // Check IPv4: xxx.xxx.xxx.xxx
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    // Validate octets are 0-255
    const octets = trimmed.split('.');
    return octets.every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // Check IPv6: contains colons
  if (trimmed.includes(':')) {
    // Simple check: if it has colons and valid hex characters, it's likely IPv6
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    return ipv6Regex.test(trimmed);
  }
  
  return false;
}
```

#### normalizeWhitespace()

Normalizes whitespace in all DNS record values before storing in the database.

```javascript
/**
 * Normalizes whitespace in DNS record values
 * - Trims leading/trailing whitespace
 * - Collapses multiple consecutive spaces to single space
 * @param {string} value - The value to normalize
 * @returns {string} - Normalized value
 */
function normalizeWhitespace(value) {
  return value
    .trim()                    // Remove leading/trailing
    .replace(/\s+/g, ' ');     // Collapse multiple spaces
}
```

### 2. Update MX Record Validation

**Location**: DNS record validation functions

Enhance MX validation to:
- Reject IP addresses in the hostname field
- Normalize whitespace
- Provide clear error messages

```javascript
/**
 * Validates MX record format
 * Expected format: "priority hostname" (e.g., "10 mail.example.com")
 * @param {string} value - The MX record value
 * @returns {{valid: boolean, error?: string, normalized?: string}}
 */
function validateMXRecord(value) {
  const normalized = normalizeWhitespace(value);
  const parts = normalized.split(' ');
  
  if (parts.length < 2) {
    return { 
      valid: false, 
      error: 'MX record must include priority and hostname (e.g., "10 mail.example.com")' 
    };
  }
  
  // Validate priority (first field)
  const priority = parseInt(parts[0], 10);
  if (isNaN(priority) || priority < 0 || priority > 65535) {
    return { 
      valid: false, 
      error: 'MX priority must be a number between 0 and 65535' 
    };
  }
  
  // Get hostname (everything after priority)
  const hostname = parts.slice(1).join(' ');
  
  // Reject IP addresses
  if (isIPAddress(hostname)) {
    return { 
      valid: false, 
      error: 'MX records cannot use IP addresses. Use a hostname instead (e.g., mail.example.com)' 
    };
  }
  
  // Validate hostname format
  if (!isValidHostname(hostname)) {
    return { valid: false, error: 'Invalid mail server hostname' };
  }
  
  return { valid: true, normalized };
}
```

### 3. Update SRV Record Validation

**Location**: DNS record validation functions

Enhance SRV validation to:
- Reject IP addresses in the target field
- Normalize whitespace
- Validate all numeric fields (priority, weight, port)

```javascript
/**
 * Validates SRV record format
 * Expected format: "priority weight port target" (e.g., "10 10 5060 sip.example.com")
 * @param {string} value - The SRV record value
 * @returns {{valid: boolean, error?: string, normalized?: string}}
 */
function validateSRVRecord(value) {
  const normalized = normalizeWhitespace(value);
  const parts = normalized.split(' ');
  
  if (parts.length < 4) {
    return { 
      valid: false, 
      error: 'SRV record must include priority, weight, port, and target (e.g., "10 10 5060 sip.example.com")' 
    };
  }
  
  const [priorityStr, weightStr, portStr, ...targetParts] = parts;
  
  // Validate priority
  const priority = parseInt(priorityStr, 10);
  if (isNaN(priority) || priority < 0 || priority > 65535) {
    return { valid: false, error: 'SRV priority must be a number between 0 and 65535' };
  }
  
  // Validate weight
  const weight = parseInt(weightStr, 10);
  if (isNaN(weight) || weight < 0 || weight > 65535) {
    return { valid: false, error: 'SRV weight must be a number between 0 and 65535' };
  }
  
  // Validate port (note: port 0 is technically valid in SRV records)
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    return { valid: false, error: 'SRV port must be a number between 0 and 65535' };
  }
  
  // Get target hostname
  const target = targetParts.join(' ');
  
  // Reject IP addresses
  if (isIPAddress(target)) {
    return { 
      valid: false, 
      error: 'SRV target cannot be an IP address. Use a hostname instead (e.g., sip.example.com)' 
    };
  }
  
  // Validate target format
  if (!isValidHostname(target)) {
    return { valid: false, error: 'Invalid SRV target hostname' };
  }
  
  return { valid: true, normalized };
}
```

### 4. Update DNS Record Endpoints

**Endpoints**: 
- `POST /api/dns-records` (create)
- `PUT /api/dns-records/:id` (update)

**Changes**: Normalize whitespace for ALL record types before validation and storage.

```javascript
// In DNS record create/update handler
router.post('/dns-records', authenticateUser, async (req, res) => {
  try {
    const recordData = req.body;
    
    // IMPORTANT: Normalize whitespace for ALL record types before validation
    recordData.name = normalizeWhitespace(recordData.name);
    recordData.value = normalizeWhitespace(recordData.value);
    
    // Type-specific validation
    if (recordData.type === 'MX') {
      const validation = validateMXRecord(recordData.value);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      // Value is already normalized from above
    }
    
    if (recordData.type === 'SRV') {
      const validation = validateSRVRecord(recordData.value);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }
      // Value is already normalized from above
    }
    
    // ... other record type validations ...
    
    // recordData.name and recordData.value are now normalized for all types
    // Store them in the database
    const result = await createDNSRecord(recordData);
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating DNS record:', error);
    res.status(500).json({ error: 'Failed to create DNS record' });
  }
});

// Same logic applies to PUT /api/dns-records/:id
router.put('/dns-records/:id', authenticateUser, async (req, res) => {
  try {
    const recordData = req.body;
    
    // Normalize whitespace for ALL record types
    recordData.name = normalizeWhitespace(recordData.name);
    recordData.value = normalizeWhitespace(recordData.value);
    
    // ... rest of validation and update logic ...
  } catch (error) {
    console.error('Error updating DNS record:', error);
    res.status(500).json({ error: 'Failed to update DNS record' });
  }
});
```

### 5. Test Cases

Use these test cases to verify the implementation:

```javascript
// ============================================================================
// MX Record Tests
// ============================================================================

// MX - Should Pass
console.assert(validateMXRecord('10 mail.example.com').valid === true);
console.assert(validateMXRecord('0 mx.host.com.').valid === true);
console.assert(validateMXRecord('65535 mail.example.com').valid === true);
console.assert(validateMXRecord('  10    mail.example.com  ').valid === true); // Whitespace normalized

// MX - Should Fail
console.assert(validateMXRecord('10 192.1.1.1').valid === false); // IPv4 address
console.assert(validateMXRecord('10 2001:db8::1').valid === false); // IPv6 address
console.assert(validateMXRecord('-1 mail.com').valid === false); // Negative priority
console.assert(validateMXRecord('70000 mail.com').valid === false); // Priority too high
console.assert(validateMXRecord('10.mail.com').valid === false); // Invalid format (period instead of space)
console.assert(validateMXRecord('mail.example.com').valid === false); // Missing priority

// ============================================================================
// SRV Record Tests
// ============================================================================

// SRV - Should Pass
console.assert(validateSRVRecord('10 20 5060 sip.example.com').valid === true);
console.assert(validateSRVRecord('0 0 443 service.host.com.').valid === true);
console.assert(validateSRVRecord('  10   20   5060   sip.example.com  ').valid === true); // Whitespace normalized

// SRV - Should Fail
console.assert(validateSRVRecord('10 20 5060 192.168.1.1').valid === false); // IPv4 address
console.assert(validateSRVRecord('10 20 5060 2001:db8::1').valid === false); // IPv6 address
console.assert(validateSRVRecord('10 5060 sip.example.com').valid === false); // Missing weight
console.assert(validateSRVRecord('10 20 70000 sip.com').valid === false); // Port too high
console.assert(validateSRVRecord('-1 20 5060 sip.com').valid === false); // Negative priority

// ============================================================================
// Whitespace Normalization Tests (All Record Types)
// ============================================================================

// A Record
console.assert(normalizeWhitespace('  192.168.1.1  ') === '192.168.1.1');

// CNAME Record
console.assert(normalizeWhitespace('  www.example.com  ') === 'www.example.com');

// TXT Record
console.assert(normalizeWhitespace('  "v=spf1    include:_spf.example.com    ~all"  ') === '"v=spf1 include:_spf.example.com ~all"');

// MX Record
console.assert(normalizeWhitespace('10      mail.example.com') === '10 mail.example.com');

// SRV Record
console.assert(normalizeWhitespace('10   20   5060   sip.example.com') === '10 20 5060 sip.example.com');
```

## Summary

### Key Changes

1. **Whitespace Normalization (ALL record types)**:
   - Trim leading and trailing whitespace
   - Collapse multiple consecutive spaces to single space
   - Applied before validation and storage

2. **IP Address Rejection (MX and SRV only)**:
   - Detect both IPv4 and IPv6 addresses
   - Reject IP addresses in MX hostname field
   - Reject IP addresses in SRV target field

3. **Improved Error Messages**:
   - Specific error messages for each validation failure
   - Clear guidance on correct format
   - Examples included in error messages

### Files to Modify

1. **`lib/validation.js`** (or similar):
   - Add `isIPAddress()` function
   - Add `normalizeWhitespace()` function
   - Update `validateMXRecord()` function
   - Update `validateSRVRecord()` function

2. **DNS Record Endpoints**:
   - `POST /api/dns-records`
   - `PUT /api/dns-records/:id`
   - Apply `normalizeWhitespace()` to name and value fields for ALL record types
   - Call updated validation functions for MX and SRV records

### Testing Checklist

- [ ] Test MX record with valid priority and hostname
- [ ] Test MX record with IPv4 address (should fail)
- [ ] Test MX record with IPv6 address (should fail)
- [ ] Test MX record with invalid priority (should fail)
- [ ] Test MX record with extra whitespace (should normalize)
- [ ] Test SRV record with all 4 fields
- [ ] Test SRV record with IPv4 address in target (should fail)
- [ ] Test SRV record with IPv6 address in target (should fail)
- [ ] Test SRV record with missing fields (should fail)
- [ ] Test SRV record with extra whitespace (should normalize)
- [ ] Test A/AAAA/CNAME/TXT records with extra whitespace (should normalize)
- [ ] Verify normalized values are stored in database
- [ ] Verify error messages are clear and actionable

## Notes

- **Backwards Compatibility**: Existing valid records will continue to work. Only new/updated records will be normalized.
- **Frontend Consistency**: These backend changes match the frontend validation exactly, ensuring consistency.
- **Database Cleanup**: After implementing, you may want to scan for and normalize existing records with excessive whitespace.
- **Port 0 in SRV**: Note that port 0 is technically valid in SRV records per RFC 2782 (indicates service not available).

