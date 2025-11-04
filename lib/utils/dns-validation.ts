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
 */
export function isValidDomain(domain: string): boolean {
  // Allow @ for apex
  if (domain === '@') return true;
  
  // Allow wildcard
  if (domain.startsWith('*.')) {
    domain = domain.slice(2);
  }
  
  // Domain name regex - RFC 1035
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/;
  
  if (!domainRegex.test(domain)) return false;
  
  // Check total length
  if (domain.length > 253) return false;
  
  // Check each label length
  const labels = domain.split('.');
  return labels.every(label => label.length > 0 && label.length <= 63);
}

/**
 * Validates record name
 */
export function isValidRecordName(name: string): boolean {
  // @ is valid for apex
  if (name === '@') return true;
  
  // Empty is valid (represents zone apex)
  if (name === '') return true;
  
  // Wildcard is valid
  if (name === '*' || name.startsWith('*.')) return true;
  
  // Check for valid characters and format
  const nameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-_]{0,61}[a-zA-Z0-9])?)*$/;
  return nameRegex.test(name) && name.length <= 253;
}

/**
 * Validates TTL value
 */
export function isValidTTL(ttl: number): { valid: boolean; error?: string } {
  if (!Number.isInteger(ttl)) {
    return { valid: false, error: 'TTL must be an integer' };
  }
  if (ttl < 60) {
    return { valid: false, error: 'TTL must be at least 60 seconds' };
  }
  if (ttl > 604800) {
    return { valid: false, error: 'TTL must not exceed 604800 seconds (7 days)' };
  }
  return { valid: true };
}

/**
 * Validates MX record format
 */
export function validateMXRecord(value: string, priority?: number): { valid: boolean; error?: string } {
  if (priority === undefined || priority === null) {
    return { valid: false, error: 'Priority is required for MX records' };
  }
  
  if (!Number.isInteger(priority) || priority < 0 || priority > 65535) {
    return { valid: false, error: 'Priority must be between 0 and 65535' };
  }
  
  if (!isValidDomain(value)) {
    return { valid: false, error: 'Invalid mail server domain' };
  }
  
  return { valid: true };
}

/**
 * Validates SRV record format
 */
export function validateSRVRecord(value: string, priority?: number): { valid: boolean; error?: string } {
  if (priority === undefined || priority === null) {
    return { valid: false, error: 'Priority is required for SRV records' };
  }
  
  if (!Number.isInteger(priority) || priority < 0 || priority > 65535) {
    return { valid: false, error: 'Priority must be between 0 and 65535' };
  }
  
  // SRV format: weight port target
  const parts = value.trim().split(/\s+/);
  if (parts.length !== 3) {
    return { valid: false, error: 'SRV record must be in format: weight port target' };
  }
  
  const [weight, port, target] = parts;
  
  const weightNum = parseInt(weight, 10);
  if (isNaN(weightNum) || weightNum < 0 || weightNum > 65535) {
    return { valid: false, error: 'Weight must be between 0 and 65535' };
  }
  
  const portNum = parseInt(port, 10);
  if (isNaN(portNum) || portNum < 0 || portNum > 65535) {
    return { valid: false, error: 'Port must be between 0 and 65535' };
  }
  
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
 * Main validation function for DNS records
 */
export function validateDNSRecord(
  formData: DNSRecordFormData,
  existingRecords: DNSRecord[] = [],
  recordId?: string
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
      
      // Check for CNAME conflicts
      const cnameConflicts = existingRecords.filter(
        r => r.name === formData.name && r.id !== recordId
      );
      if (cnameConflicts.length > 0) {
        errors.value = 'CNAME records cannot coexist with other records at the same name';
      }
      
      // Warn about apex CNAME
      if (formData.name === '@' || formData.name === '') {
        warnings.push('CNAME at zone apex (@) may cause issues with some DNS implementations');
      }
      break;
      
    case 'MX':
      const mxValidation = validateMXRecord(formData.value, formData.priority);
      if (!mxValidation.valid) {
        errors.value = mxValidation.error || 'Invalid MX record';
      }
      break;
      
    case 'NS':
      if (!isValidDomain(formData.value)) {
        errors.value = 'Invalid nameserver domain';
      }
      
      // Check NS record count for apex
      if (formData.name === '@' || formData.name === '') {
        const nsRecords = existingRecords.filter(
          r => r.type === 'NS' && (r.name === '@' || r.name === '') && r.id !== recordId
        );
        if (nsRecords.length < 1) {
          warnings.push('Zones should have at least 2 NS records for redundancy');
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
      const srvValidation = validateSRVRecord(formData.value, formData.priority);
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

