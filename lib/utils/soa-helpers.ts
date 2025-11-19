/**
 * SOA Record Management Utilities
 * Helper functions for parsing and constructing SOA record metadata
 */

export interface SOAMetadata {
  primary_nameserver: string;
  admin_email: string;
  negative_ttl: number;
}

export interface SOARecord {
  id: string;
  zone_id: string;
  name: string;
  type: 'SOA';
  value: string;
  ttl: number;
  comment: string | null;
  metadata: SOAMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Parse SOA metadata from a DNS record
 */
export function parseSOAMetadata(metadata: any): SOAMetadata | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const { primary_nameserver, admin_email, negative_ttl } = metadata;

  if (!primary_nameserver || !admin_email || typeof negative_ttl !== 'number') {
    return null;
  }

  return {
    primary_nameserver,
    admin_email,
    negative_ttl,
  };
}

/**
 * Validate SOA metadata fields
 */
export function validateSOAMetadata(metadata: Partial<SOAMetadata>): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate primary_nameserver
  if (!metadata.primary_nameserver || !metadata.primary_nameserver.trim()) {
    errors.primary_nameserver = 'Primary nameserver is required';
  } else if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/.test(metadata.primary_nameserver)) {
    errors.primary_nameserver = 'Invalid nameserver format (e.g., ns1.example.com)';
  }

  // Validate admin_email
  if (!metadata.admin_email || !metadata.admin_email.trim()) {
    errors.admin_email = 'Admin email is required';
  } else {
    // Convert DNS-style email (admin.example.com) to regular email for validation
    const emailCheck = metadata.admin_email.replace(/\./, '@');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCheck) && !metadata.admin_email.includes('@')) {
      errors.admin_email = 'Invalid email format (use @ or DNS format like admin.example.com)';
    }
  }

  // Validate negative_ttl
  if (metadata.negative_ttl === undefined || metadata.negative_ttl === null) {
    errors.negative_ttl = 'Negative TTL is required';
  } else if (typeof metadata.negative_ttl !== 'number') {
    errors.negative_ttl = 'Negative TTL must be a number';
  } else if (metadata.negative_ttl < 0 || metadata.negative_ttl > 86400) {
    errors.negative_ttl = 'Negative TTL must be between 0 and 86400 seconds (24 hours)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Convert email to DNS format (admin@example.com -> admin.example.com)
 */
export function emailToDNSFormat(email: string): string {
  if (!email.includes('@')) {
    return email; // Already in DNS format
  }
  return email.replace('@', '.');
}

/**
 * Convert DNS format email to regular email (admin.example.com -> admin@example.com)
 * Note: This is a best-effort conversion and may not be perfect for all cases
 */
export function dnsEmailToRegular(dnsEmail: string): string {
  if (dnsEmail.includes('@')) {
    return dnsEmail; // Already in regular format
  }
  
  // Find the first dot and replace with @
  const firstDotIndex = dnsEmail.indexOf('.');
  if (firstDotIndex === -1) {
    return dnsEmail; // No dot found, return as is
  }
  
  return dnsEmail.substring(0, firstDotIndex) + '@' + dnsEmail.substring(firstDotIndex + 1);
}

/**
 * Format SOA metadata for display
 */
export function formatSOAForDisplay(metadata: SOAMetadata): string {
  return `Primary NS: ${metadata.primary_nameserver}, Admin: ${dnsEmailToRegular(metadata.admin_email)}, Negative TTL: ${metadata.negative_ttl}s`;
}

/**
 * Get default SOA metadata
 */
export function getDefaultSOAMetadata(): SOAMetadata {
  return {
    primary_nameserver: 'ns1.example.com',
    admin_email: 'admin@example.com',
    negative_ttl: 3600, // 1 hour
  };
}

/**
 * Check if a DNS record is an SOA record
 */
export function isSOARecord(record: any): record is SOARecord {
  return record && record.type === 'SOA';
}

