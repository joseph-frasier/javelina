import * as XLSX from 'xlsx';
import type { DNSRecord, DNSRecordType } from '@/types/dns';

/**
 * Export utilities for admin portal
 * Supports CSV, JSON, Excel, and BIND zone file exports
 */

export type ExportFormat = 'csv' | 'json' | 'excel' | 'bind';

interface ExportOptions {
  filename?: string;
  sheetName?: string;
}

interface BINDExportOptions extends ExportOptions {
  zoneName: string;
  nameservers?: string[];
  soaSerial?: number;
  defaultTTL?: number;
  adminEmail?: string;
  negativeCachingTTL?: number;
}

/**
 * Generate filename with timestamp
 */
function getFilename(basename: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  return `${basename}_${timestamp}.${extension}`;
}

/**
 * Flatten nested objects for export
 */
function flattenObject(obj: any, prefix = ''): any {
  const flattened: any = {};
  
  for (const key in obj) {
    if (obj[key] === null || obj[key] === undefined) {
      flattened[prefix + key] = '';
    } else if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      Object.assign(flattened, flattenObject(obj[key], `${prefix}${key}.`));
    } else if (Array.isArray(obj[key])) {
      flattened[prefix + key] = obj[key].length;
    } else {
      flattened[prefix + key] = obj[key];
    }
  }
  
  return flattened;
}

/**
 * Format data for export (flatten nested objects, format dates)
 */
function prepareData(data: any[]): any[] {
  return data.map(item => {
    const flattened = flattenObject(item);
    
    // Format dates
    for (const key in flattened) {
      const value = flattened[key];
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
        flattened[key] = new Date(value).toLocaleString();
      }
    }
    
    return flattened;
  });
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const prepared = prepareData(data);
  const headers = Object.keys(prepared[0]);
  
  // Create CSV content
  const csvRows = [
    headers.join(','),
    ...prepared.map(row =>
      headers.map(header => {
        const value = row[header];
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    )
  ];
  
  const csvContent = csvRows.join('\n');
  const filename = options.filename || getFilename(basename, 'csv');
  
  // Download file
  downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
}

/**
 * Export data to JSON format
 */
export function exportToJSON(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const filename = options.filename || getFilename(basename, 'json');
  
  downloadFile(jsonContent, filename, 'application/json;charset=utf-8;');
}

/**
 * Export data to Excel format
 */
export function exportToExcel(data: any[], basename: string, options: ExportOptions = {}): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const prepared = prepareData(data);
  
  // Create workbook
  const worksheet = XLSX.utils.json_to_sheet(prepared);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, options.sheetName || 'Data');
  
  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(prepared[0]).map(key => ({
    wch: Math.min(
      maxWidth,
      Math.max(
        key.length,
        ...prepared.map(row => String(row[key] || '').length)
      )
    )
  }));
  worksheet['!cols'] = colWidths;
  
  const filename = options.filename || getFilename(basename, 'xlsx');
  
  // Download file
  XLSX.writeFile(workbook, filename);
}

/**
 * Helper function to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format a DNS record name for BIND zone file
 * Handles @ for zone apex and adds trailing dots for FQDNs
 */
function formatBINDName(name: string, zoneName: string): string {
  // Zone apex
  if (!name || name === '@') {
    return '@';
  }
  
  // If name already contains a dot, it might be a FQDN
  // Check if it's within the zone or external
  if (name.includes('.')) {
    // If it ends with the zone name, make it relative
    if (name.endsWith(`.${zoneName}`)) {
      return name.replace(`.${zoneName}`, '');
    }
    // Otherwise treat as FQDN and add trailing dot
    return name.endsWith('.') ? name : `${name}.`;
  }
  
  // Simple relative name
  return name;
}

/**
 * Format a DNS record value for BIND zone file
 * Adds trailing dots to domain names where needed
 */
function formatBINDValue(value: string, type: DNSRecordType, zoneName: string): string {
  // Types that need domain name formatting
  const domainTypes: DNSRecordType[] = ['CNAME', 'MX', 'NS', 'SRV'];
  
  if (!domainTypes.includes(type)) {
    // TXT records need quotes
    if (type === 'TXT') {
      return value.startsWith('"') ? value : `"${value}"`;
    }
    // A, AAAA records - return as-is
    return value;
  }
  
  // For SRV records, parse and format the target
  if (type === 'SRV') {
    const parts = value.trim().split(/\s+/);
    if (parts.length >= 3) {
      const [weight, port, target] = parts;
      const formattedTarget = target.endsWith('.') ? target : 
        (target.includes('.') && !target.endsWith(zoneName)) ? `${target}.` : target;
      return `${weight} ${port} ${formattedTarget}`;
    }
    return value;
  }
  
  // For other domain types (CNAME, MX, NS)
  // Add trailing dot if it looks like a FQDN outside the zone
  if (value.includes('.') && !value.endsWith(`.${zoneName}`) && !value.endsWith('.')) {
    return `${value}.`;
  }
  
  return value;
}

/**
 * Generate SOA record for BIND zone file
 */
function generateSOARecord(
  zoneName: string,
  nameservers: string[],
  soaSerial?: number,
  adminEmail?: string,
  negativeCachingTTL?: number
): string {
  const primaryNS = nameservers && nameservers.length > 0 
    ? nameservers[0] 
    : `ns1.${zoneName}.`;
  
  // Convert email to DNS format (admin@example.com -> admin.example.com)
  const dnsAdminEmail = adminEmail 
    ? adminEmail.includes('@') 
      ? adminEmail.replace('@', '.') 
      : adminEmail
    : `admin.${zoneName}.`;
  
  const serial = soaSerial || parseInt(new Date().toISOString().replace(/[-:T]/g, '').substring(0, 10));
  const negativeTTL = negativeCachingTTL || 3600;
  
  return `
; SOA Record (Generated from zone properties)
@\t86400\tIN\tSOA\t${primaryNS} ${dnsAdminEmail} (
\t\t\t${serial}\t; Serial (auto-incrementing)
\t\t\t7200\t\t; Refresh (2 hours)
\t\t\t3600\t\t; Retry (1 hour)
\t\t\t1209600\t\t; Expire (14 days)
\t\t\t${negativeTTL} )\t; Negative caching TTL
`;
}

/**
 * Export DNS records to BIND zone file format
 */
export function exportToBIND(
  records: DNSRecord[],
  basename: string,
  options: BINDExportOptions
): void {
  if (!records || records.length === 0) {
    throw new Error('No records to export');
  }

  const { zoneName, nameservers = [], soaSerial, defaultTTL = 3600, adminEmail, negativeCachingTTL } = options;
  
  // Sort records by type for organized output (all records are now active by default)
  // SOA records are filtered out since they're generated dynamically
  const typeOrder: Record<string, number> = {
    'NS': 1, 'A': 2, 'AAAA': 3, 
    'CNAME': 4, 'MX': 5, 'TXT': 6, 'SRV': 7, 'CAA': 8
  };
  
  const sortedRecords = [...records]
    .filter(r => r.type !== 'SOA') // Filter out SOA records as they're now generated dynamically
    .sort((a, b) => {
      const orderA = typeOrder[a.type] || 99;
      const orderB = typeOrder[b.type] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    });
  
  // Build zone file content
  const lines: string[] = [];
  
  // Header
  lines.push(`;`);
  lines.push(`; BIND Zone File for ${zoneName}`);
  lines.push(`; Exported: ${new Date().toISOString()}`);
  lines.push(`; Records: ${sortedRecords.length + 1} (including SOA)`);
  lines.push(`;`);
  lines.push('');
  
  // Zone directives
  lines.push(`$ORIGIN ${zoneName}.`);
  lines.push(`$TTL ${defaultTTL}`);
  lines.push('');
  
  // Always generate SOA record from zone properties
  lines.push(generateSOARecord(zoneName, nameservers, soaSerial, adminEmail, negativeCachingTTL));
  lines.push('');
  
  // Group records by type for better organization
  let currentType: string | null = null;
  
  for (const record of sortedRecords) {
    // Add section headers
    if (record.type !== currentType) {
      if (currentType !== null) lines.push('');
      lines.push(`; ${record.type} Records`);
      currentType = record.type;
    }
    
    const name = formatBINDName(record.name, zoneName);
    const value = formatBINDValue(record.value, record.type, zoneName);
    const ttl = record.ttl || defaultTTL;
    
    // Format line based on record type
    // Note: MX and SRV records now have priority embedded in the value field
    if (record.type === 'CAA') {
      lines.push(`${name}\t${ttl}\tIN\t${record.type}\t${value}`);
    } else {
      lines.push(`${name}\t${ttl}\tIN\t${record.type}\t${value}`);
    }
    
    // Add comment if exists
    if (record.comment) {
      lines.push(`\t\t\t\t; ${record.comment}`);
    }
  }
  
  // Footer
  lines.push('');
  lines.push(`;`);
  lines.push(`; End of zone file for ${zoneName}`);
  lines.push(`;`);
  
  const zoneFileContent = lines.join('\n');
  const filename = options.filename || getFilename(basename, 'zone');
  
  downloadFile(zoneFileContent, filename, 'text/plain;charset=utf-8;');
}

/**
 * Export data in specified format
 */
export function exportData(
  data: any[],
  format: ExportFormat,
  basename: string,
  options: ExportOptions | BINDExportOptions = {}
): void {
  try {
    switch (format) {
      case 'csv':
        exportToCSV(data, basename, options);
        break;
      case 'json':
        exportToJSON(data, basename, options);
        break;
      case 'excel':
        exportToExcel(data, basename, options);
        break;
      case 'bind':
        // BIND export requires special handling with BINDExportOptions
        if ('zoneName' in options) {
          exportToBIND(data as DNSRecord[], basename, options as BINDExportOptions);
        } else {
          throw new Error('BIND export requires zoneName in options');
        }
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Export failed:', error);
    throw error;
  }
}

