import type { DNSRecordType, DNSRecordFormData, DNSValidationResult, DNSRecord } from '@/types/dns';

/**
 * Validates IPv4 address format
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validates IPv6 address format
 */
export function isValidIPv6(ip: string): boolean {
  // Simplified IPv6 validation - handles most common formats
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|::)$/;
  return ipv6Regex.test(ip);
}

/**
 * Validates domain name format
 * Allows: alphanumerics, backslash, hyphens, underscores, dots, and optional trailing dot
 * Maximum length: 255 characters
 * Maximum label length: 63 characters
 */
export function isValidDomain(domain: string): boolean {
  // Allow @ for apex
  if (domain === '@') return true;
  
  // Allow wildcard
  if (domain.startsWith('*.')) {
    domain = domain.slice(2);
  }
  
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

/**
 * Validates record name
 * Allows: alphanumerics, backslash, hyphens, underscores, dots
 * Maximum length: 253 characters
 * Maximum label length: 63 characters
 */
export function isValidRecordName(name: string): boolean {
  // @ is valid for apex
  if (name === '@') return true;
  
  // Empty is valid (represents zone apex)
  if (name === '') return true;
  
  // Wildcard is valid
  if (name === '*' || name.startsWith('*.')) return true;
  
  // Check total length
  if (name.length > 253) return false;
  
  // Check for valid characters and format
  // Allows: alphanumerics, backslash, hyphens, underscores, dots
  const nameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9_\-\\]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!nameRegex.test(name)) return false;
  
  // Check each label length (max 63 characters per label)
  const labels = name.split('.');
  return labels.every(label => label.length > 0 && label.length <= 63);
}

/**
 * Determines if a zone is a reverse zone based on its name
 * Reverse zones end with .in-addr.arpa (IPv4) or .ip6.arpa (IPv6)
 */
export function isReverseZone(zoneName: string): boolean {
  return zoneName.endsWith('.in-addr.arpa') || zoneName.endsWith('.ip6.arpa');
}

/**
 * Determines if a reverse zone is IPv4 (.in-addr.arpa) or IPv6 (.ip6.arpa)
 */
export function getReverseZoneType(zoneName: string): 'ipv4' | 'ipv6' | null {
  if (zoneName.endsWith('.in-addr.arpa')) return 'ipv4';
  if (zoneName.endsWith('.ip6.arpa')) return 'ipv6';
  return null;
}

/**
 * Validates TTL value
 */
export function isValidTTL(ttl: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(ttl)) {
    return { valid: false, error: 'TTL must be an integer' };
  }
  if (ttl < 10) {
    return { valid: false, error: 'TTL must be at least 10 seconds' };
  }
  if (ttl > 604800) {
    return { valid: false, error: 'TTL must not exceed 604800 seconds (7 days)' };
  }
  return { valid: true };
}

/**
 * Validates MX record format
 * Expected format: "priority hostname" (e.g., "10 mail.example.com")
 */
export function validateMXRecord(value: string): { valid: boolean; error?: string } {
  const parts = value.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return { valid: false, error: 'MX record must include priority and hostname (e.g., "10 mail.example.com")' };
  }
  
  const priority = parseInt(parts[0], 10);
  if (isNaN(priority) || priority < 0 || priority > 65535) {
    return { valid: false, error: 'Priority must be a number between 0 and 65535' };
  }
  
  const hostname = parts.slice(1).join(' ').trim();
  if (!isValidDomain(hostname)) {
    return { valid: false, error: 'Invalid mail server domain' };
  }
  
  return { valid: true };
}

/**
 * Validates SRV record format
 * Expected format: "priority weight port target" (e.g., "10 10 5060 sip.example.com")
 */
export function validateSRVRecord(value: string): { valid: boolean; error?: string } {
  const parts = value.trim().split(/\s+/);
  
  if (parts.length < 4) {
    return { valid: false, error: 'SRV record must include priority, weight, port, and target (e.g., "10 10 5060 sip.example.com")' };
  }
  
  const [priorityStr, weightStr, portStr, ...targetParts] = parts;
  
  const priority = parseInt(priorityStr, 10);
  if (isNaN(priority) || priority < 0 || priority > 65535) {
    return { valid: false, error: 'Priority must be a number between 0 and 65535' };
  }
  
  const weight = parseInt(weightStr, 10);
  if (isNaN(weight) || weight < 0 || weight > 65535) {
    return { valid: false, error: 'Weight must be between 0 and 65535' };
  }
  
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 0 || port > 65535) {
    return { valid: false, error: 'Port must be between 0 and 65535' };
  }
  
  const target = targetParts.join(' ').trim();
  
  if (!isValidDomain(target)) {
    return { valid: false, error: 'Invalid target domain' };
  }
  
  return { valid: true };
}

/**
 * Validates CAA record format
 */
export function validateCAARecord(value: string): { valid: boolean; error?: string } {
  // CAA format: flags tag "value"
  const caaRegex = /^(\d+)\s+(issue|issuewild|iodef)\s+"([^"]+)"$/;
  const match = value.match(caaRegex);
  
  if (!match) {
    return { valid: false, error: 'CAA record must be in format: flags tag "value"' };
  }
  
  const flags = parseInt(match[1], 10);
  if (flags < 0 || flags > 255) {
    return { valid: false, error: 'Flags must be between 0 and 255' };
  }
  
  return { valid: true };
}

/**
 * Validates TXT record
 */
export function validateTXTRecord(value: string): { valid: boolean; error?: string; warning?: string } {
  // TXT records can contain any text, but each string is limited to 255 characters
  // Multiple strings can be concatenated
  
  if (value.length === 0) {
    return { valid: false, error: 'TXT record value cannot be empty' };
  }
  
  // Check if any single string exceeds 255 characters (rough check)
  // In practice, DNS implementations handle splitting
  if (value.length > 255) {
    return { 
      valid: true, 
      warning: 'TXT values longer than 255 characters may be split into multiple strings' 
    };
  }
  
  return { valid: true };
}

/**
 * Validates PTR record format for reverse DNS
 */
export function validatePTRRecord(value: string): { valid: boolean; error?: string } {
  // PTR records should point to a valid domain name
  // The record name itself should be in reverse DNS format (validated separately)
  
  if (!isValidDomain(value)) {
    return { valid: false, error: 'PTR record must point to a valid domain name' };
  }
  
  return { valid: true };
}

/**
 * Validates if a record name is in reverse DNS format
 */
export function isValidReverseDNSName(name: string): boolean {
  // IPv4 reverse DNS: X.X.X.X.in-addr.arpa
  const ipv4ReverseRegex = /^(\d{1,3}\.){3}\d{1,3}\.in-addr\.arpa$/;
  
  // IPv6 reverse DNS: *.*.*.*.ip6.arpa (nibble format)
  const ipv6ReverseRegex = /^([0-9a-fA-F]\.){1,32}ip6\.arpa$/;
  
  // Allow @ or empty for zone apex (for reverse zones)
  if (name === '@' || name === '') return true;
  
  // Allow partial reverse DNS names (subdomains within reverse zones)
  const ipv4PartialRegex = /^(\d{1,3}\.?)+$/;
  const ipv6PartialRegex = /^([0-9a-fA-F]\.?)+$/;
  
  return ipv4ReverseRegex.test(name) || 
         ipv6ReverseRegex.test(name) ||
         ipv4PartialRegex.test(name) ||
         ipv6PartialRegex.test(name);
}

/**
 * Validates NS record placement - prevents creation at zone root
 */
export function validateNSRecordPlacement(
  name: string, 
  zoneName: string
): { valid: boolean; error?: string } {
  // Normalize the name
  const normalizedName = name.trim();
  
  // Check if this is a root NS record
  const isRootNS = normalizedName === '@' || 
                   normalizedName === '' || 
                   normalizedName === zoneName;
  
  if (isRootNS) {
    return {
      valid: false,
      error: 'NS records at zone root are system-managed and cannot be created or modified by users. NS records are only allowed for subdomains (e.g., "dev" for delegation).'
    };
  }
  
  return { valid: true };
}

/**
 * Validates PTR record name based on reverse zone type
 * For reverse zones, applies strict validation. For forward zones, allows normal record names.
 */
export function validatePTRRecordName(
  name: string,
  zoneName: string
): { valid: boolean; error?: string } {
  const reverseType = getReverseZoneType(zoneName);
  
  // If this is a forward zone (not a reverse zone), skip special PTR validation
  // and use standard record name validation
  if (!reverseType) {
    return { valid: true };
  }
  
  // For reverse zones, PTR records cannot be at zone root
  if (name === '@' || name === '') {
    return { valid: false, error: 'PTR records cannot be created at zone root. Specify a valid name.' };
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
    // IPv6 reverse: must be a single hexadecimal nibble (0-9, a-f)
    if (!/^[0-9a-fA-F]$/.test(name)) {
      return {
        valid: false,
        error: 'PTR name in IPv6 reverse zone must be a single hexadecimal digit (0-9, a-f)'
      };
    }
  }
  
  return { valid: true };
}

/**
 * Main validation function for DNS records
 */
export function validateDNSRecord(
  formData: DNSRecordFormData,
  existingRecords: DNSRecord[] = [],
  recordId?: string,
  zoneName?: string
): DNSValidationResult {
  const errors: Record<string, string> = {};
  const warnings: string[] = [];
  
  // Validate name
  if (!formData.name.trim()) {
    errors.name = 'Record name is required';
  } else if (!isValidRecordName(formData.name)) {
    errors.name = 'Invalid record name format';
  }
  
  // Validate TTL
  const ttlValidation = isValidTTL(formData.ttl);
  if (!ttlValidation.valid) {
    errors.ttl = ttlValidation.error || 'Invalid TTL';
  }
  
  // Check for CNAME conflicts (applies to all record types)
  // CNAME records cannot coexist with any other records at the same name
  if (formData.type === 'CNAME') {
    // When creating a CNAME, check if ANY other record exists with this name
    const existingRecordsAtName = existingRecords.filter(
      r => r.name === formData.name && r.id !== recordId
    );
    if (existingRecordsAtName.length > 0) {
      errors.name = `Cannot create CNAME: ${existingRecordsAtName.length} other record(s) already exist at this name. CNAME cannot coexist with other records.`;
    }
  } else {
    // When creating any other record type, check if a CNAME exists with this name
    const cnameAtName = existingRecords.find(
      r => r.name === formData.name && r.type === 'CNAME' && r.id !== recordId
    );
    if (cnameAtName) {
      errors.name = `Cannot create ${formData.type} record: a CNAME record already exists at this name. CNAME cannot coexist with other records.`;
    }
  }
  
  // Type-specific validation
  switch (formData.type) {
    case 'A':
      if (!isValidIPv4(formData.value)) {
        errors.value = 'Invalid IPv4 address format';
      }
      break;
      
    case 'AAAA':
      if (!isValidIPv6(formData.value)) {
        errors.value = 'Invalid IPv6 address format';
      }
      break;
      
    case 'CNAME':
      if (!isValidDomain(formData.value)) {
        errors.value = 'Invalid domain name';
      }
      
      // Prevent CNAME at zone root
      if (formData.name === '@' || formData.name === '') {
        errors.name = 'The domain root (@) cannot be a CNAME. Please use a subdomain instead.';
      }
      
      // Note: CNAME conflict checking is now done globally above, not here
      break;
      
    case 'MX':
      const mxValidation = validateMXRecord(formData.value);
      if (!mxValidation.valid) {
        errors.value = mxValidation.error || 'Invalid MX record';
      }
      break;
      
    case 'NS':
      if (!isValidDomain(formData.value)) {
        errors.value = 'Invalid nameserver domain';
      }
      
      // Validate NS record placement - prevent root NS records
      if (zoneName) {
        const placementValidation = validateNSRecordPlacement(formData.name, zoneName);
        if (!placementValidation.valid) {
          errors.name = placementValidation.error || 'Invalid NS record placement';
        }
      }
      break;
      
    case 'TXT':
      const txtValidation = validateTXTRecord(formData.value);
      if (!txtValidation.valid) {
        errors.value = txtValidation.error || 'Invalid TXT record';
      }
      if (txtValidation.warning) {
        warnings.push(txtValidation.warning);
      }
      break;
      
    case 'SRV':
      const srvValidation = validateSRVRecord(formData.value);
      if (!srvValidation.valid) {
        errors.value = srvValidation.error || 'Invalid SRV record';
      }
      break;
      
    case 'CAA':
      const caaValidation = validateCAARecord(formData.value);
      if (!caaValidation.valid) {
        errors.value = caaValidation.error || 'Invalid CAA record';
      }
      break;
      
    case 'SOA':
      warnings.push('SOA records are auto-managed. Manual modification not recommended.');
      break;
      
    case 'PTR':
      const ptrValidation = validatePTRRecord(formData.value);
      if (!ptrValidation.valid) {
        errors.value = ptrValidation.error || 'Invalid PTR record';
      }
      
      // Validate PTR record name (applies strict validation for reverse zones only)
      if (zoneName) {
        const nameValidation = validatePTRRecordName(formData.name, zoneName);
        if (!nameValidation.valid) {
          errors.name = nameValidation.error || 'Invalid PTR record name';
        }
      }
      break;
  }
  
  // Check for duplicate records
  const duplicate = existingRecords.find(
    r => r.name === formData.name && 
         r.type === formData.type && 
         r.value === formData.value && 
         r.id !== recordId
  );
  if (duplicate) {
    errors.value = 'This exact record already exists';
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a record can be safely deleted
 */
export function canDeleteRecord(record: DNSRecord, allRecords: DNSRecord[]): {
  canDelete: boolean;
  reason?: string;
  warning?: string;
} {
  // Prevent deletion of SOA records
  if (record.type === 'SOA') {
    return {
      canDelete: false,
      reason: 'SOA records are auto-managed and cannot be deleted manually',
    };
  }
  
  // Warn about deleting last NS record at apex
  if (record.type === 'NS' && (record.name === '@' || record.name === '')) {
    const apexNSRecords = allRecords.filter(
      r => r.type === 'NS' && (r.name === '@' || r.name === '') && r.id !== record.id
    );
    if (apexNSRecords.length === 0) {
      return {
        canDelete: true,
        warning: 'This is the last NS record at the zone apex. Deleting it may cause DNS resolution issues.',
      };
    }
    if (apexNSRecords.length === 1) {
      return {
        canDelete: true,
        warning: 'After deletion, only 1 NS record will remain. Zones should have at least 2 NS records for redundancy.',
      };
    }
  }
  
  return { canDelete: true };
}

/**
 * Normalize record name (convert empty string to @)
 */
export function normalizeRecordName(name: string): string {
  return name.trim() || '@';
}

/**
 * Get fully qualified domain name
 */
export function getFQDN(recordName: string, zoneName: string): string {
  const normalized = normalizeRecordName(recordName);
  if (normalized === '@') {
    return zoneName;
  }
  return `${normalized}.${zoneName}`;
}

