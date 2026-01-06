/**
 * DNS Record Types and Interfaces
 */

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SRV' | 'CAA' | 'SOA' | 'PTR';

export interface DNSRecord {
  id: string;
  zone_id: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  comment: string | null;
  metadata: any;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DNSRecordFormData {
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  comment?: string;
}

export interface DNSValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export interface ImportConflict {
  recordName: string;
  recordType: DNSRecordType;
  existingValue: string;
  newValue: string;
  resolution: 'skip' | 'replace' | 'merge';
}

export interface DNSImportResult {
  success: number;
  failed: number;
  conflicts: ImportConflict[];
  errors: Array<{ record: string; error: string }>;
}

export interface DNSExportOptions {
  format: 'bind' | 'json' | 'csv';
  includeInactive?: boolean;
  includeComments?: boolean;
}

// Common TTL presets (15 minutes to 1 day)
export const TTL_PRESETS = [
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 14400, label: '4 hours' },
  { value: 43200, label: '12 hours' },
  { value: 86400, label: '1 day' },
] as const;

// Record type metadata
export const RECORD_TYPE_INFO: Record<DNSRecordType, {
  label: string;
  description: string;
  requiresPriority: boolean;
  defaultTTL: number;
  placeholder: string;
  hint: string;
}> = {
  A: {
    label: 'A',
    description: 'IPv4 Address',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: '192.0.2.1',
    hint: 'Enter an IPv4 address (e.g., 192.0.2.1)',
  },
  AAAA: {
    label: 'AAAA',
    description: 'IPv6 Address',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: '2001:db8::1',
    hint: 'Enter an IPv6 address (e.g., 2001:db8::1)',
  },
  CNAME: {
    label: 'CNAME',
    description: 'Canonical Name',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: 'example.com',
    hint: 'Enter a domain name. CNAME cannot coexist with other records at the same name.',
  },
  MX: {
    label: 'MX',
    description: 'Mail Exchange',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: '10 mail.example.com',
    hint: 'Format: priority hostname (e.g., 10 mail.example.com). Lower priority = higher preference.',
  },
  NS: {
    label: 'NS',
    description: 'Name Server',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: 'ns1.example.com',
    hint: 'Enter nameserver domain. Zones should have at least 2 NS records.',
  },
  TXT: {
    label: 'TXT',
    description: 'Text Record',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: 'v=spf1 include:_spf.example.com ~all',
    hint: 'Enter text value. Each string limited to 255 characters.',
  },
  SRV: {
    label: 'SRV',
    description: 'Service Record',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: '10 10 5060 sip.example.com',
    hint: 'Format: priority weight port target (e.g., 10 10 5060 sip.example.com).',
  },
  CAA: {
    label: 'CAA',
    description: 'Certification Authority Authorization',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: '0 issue "letsencrypt.org"',
    hint: 'Format: flags tag "value" (e.g., 0 issue "letsencrypt.org")',
  },
  SOA: {
    label: 'SOA',
    description: 'Start of Authority (System Managed)',
    requiresPriority: false,
    defaultTTL: 86400,
    placeholder: 'System-generated from zone properties',
    hint: 'SOA data is automatically generated from zone properties. Edit SOA settings in zone configuration.',
  },
  PTR: {
    label: 'PTR',
    description: 'Pointer Record (Reverse DNS)',
    requiresPriority: false,
    defaultTTL: 3600,
    placeholder: 'server.example.com',
    hint: 'Enter the target hostname (e.g., server.example.com). Typically used in reverse DNS zones.',
  },
};

