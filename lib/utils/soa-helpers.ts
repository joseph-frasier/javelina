/**
 * SOA Management Utilities
 * Helper functions for generating and validating SOA data from zone properties
 */

export interface SOAMetadata {
  primary_nameserver: string;
  admin_email: string;
  negative_ttl: number;
  serial: number;
}

export interface ZoneSOAData {
  nameservers?: string[] | null;
  admin_email: string;
  negative_caching_ttl: number;
  soa_serial: number;
}

/**
 * Generate SOA data from zone properties
 */
export function generateSOAFromZone(zone: ZoneSOAData): SOAMetadata {
  return {
    primary_nameserver: (zone.nameservers && zone.nameservers.length > 0) 
      ? zone.nameservers[0] 
      : 'ns1.example.com',
    admin_email: zone.admin_email || 'admin@example.com',
    negative_ttl: zone.negative_caching_ttl || 3600,
    serial: zone.soa_serial || 1,
  };
}

/**
 * Validate SOA-related zone fields
 */
export function validateSOAFields(fields: {
  admin_email?: string;
  negative_caching_ttl?: number;
}): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  // Validate admin_email
  if (fields.admin_email !== undefined) {
    if (!fields.admin_email || !fields.admin_email.trim()) {
      errors.admin_email = 'Admin email is required';
    } else {
      // Support both regular email format and DNS format
      const hasAt = fields.admin_email.includes('@');
      if (hasAt) {
        // Regular email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.admin_email)) {
          errors.admin_email = 'Invalid email format';
        }
      } else {
        // DNS format validation (admin.example.com)
        if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.?$/.test(fields.admin_email)) {
          errors.admin_email = 'Invalid email format (use @ or DNS format like admin.example.com)';
        }
      }
    }
  }

  // Validate negative_caching_ttl
  if (fields.negative_caching_ttl !== undefined) {
    if (fields.negative_caching_ttl === null) {
      errors.negative_caching_ttl = 'Negative caching TTL is required';
    } else if (typeof fields.negative_caching_ttl !== 'number') {
      errors.negative_caching_ttl = 'Negative caching TTL must be a number';
    } else if (fields.negative_caching_ttl < 0 || fields.negative_caching_ttl > 86400) {
      errors.negative_caching_ttl = 'Negative caching TTL must be between 0 and 86400 seconds (24 hours)';
    }
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
  return `Primary NS: ${metadata.primary_nameserver}, Admin: ${dnsEmailToRegular(metadata.admin_email)}, Serial: ${metadata.serial}, Negative TTL: ${metadata.negative_ttl}s`;
}

/**
 * Get default SOA metadata
 */
export function getDefaultSOAMetadata(): Omit<SOAMetadata, 'serial'> {
  return {
    primary_nameserver: 'ns1.example.com',
    admin_email: 'admin@example.com',
    negative_ttl: 3600, // 1 hour
  };
}

