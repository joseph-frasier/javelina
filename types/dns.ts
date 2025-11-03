/**
 * DNS Record Types and Interfaces
 */

export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SRV' | 'CAA' | 'SOA';

export interface DNSRecord {
  id: string;
  zone_id: string;
  name: string;
  type: DNSRecordType;
  value: string;
  ttl: number;
  priority: number | null;
  active: boolean;
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
  priority?: number;
  active: boolean;
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

// Common TTL presets
export const TTL_PRESETS = [
  { value: 60, label: '1 minute' },
  { value: 300, label: '5 minutes' },
  { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' },
  { value: 3600, label: '1 hour' },
  { value: 14400, label: '4 hours' },
  { value: 43200, label: '12 hours' },
  { value: 86400, label: '1 day' },
  { value: 604800, label: '1 week' },
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
    requiresPriority: true,
    defaultTTL: 3600,
    placeholder: 'mail.example.com',
    hint: 'Enter mail server domain. Priority is required (lower = higher priority).',
  },
  NS: {
    label: 'NS',
    description: 'Name Server',
    requiresPriority: false,
    defaultTTL: 86400,
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
    requiresPriority: true,
    defaultTTL: 3600,
    placeholder: '10 5060 sip.example.com',
    hint: 'Format: weight port target (e.g., 10 5060 sip.example.com). Priority is required.',
  },
  CAA: {
    label: 'CAA',
    description: 'Certification Authority Authorization',
    requiresPriority: false,
    defaultTTL: 86400,
    placeholder: '0 issue "letsencrypt.org"',
    hint: 'Format: flags tag "value" (e.g., 0 issue "letsencrypt.org")',
  },
  SOA: {
    label: 'SOA',
    description: 'Start of Authority',
    requiresPriority: false,
    defaultTTL: 86400,
    placeholder: 'ns1.example.com admin.example.com',
    hint: 'SOA records are auto-managed. Manual creation not recommended.',
  },
};

