/**
 * Utility functions for formatting audit log data in a user-friendly way
 */

import { formatDistanceToNow, format } from 'date-fns';

/**
 * Format a timestamp to user's local timezone with relative time
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const formatted = format(date, 'MMM d, yyyy \'at\' h:mm a');
  const relative = formatDistanceToNow(date, { addSuffix: true });
  
  return `${formatted} (${relative})`;
}

/**
 * Format a timestamp in short format (for inline diffs)
 */
export function formatTimestampShort(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  return format(date, 'MMM d, h:mm a');
}

/**
 * Format null/undefined/empty values
 */
export function formatEmptyValue(value: any): string {
  if (value === null || value === undefined) return 'None';
  if (value === '') return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

/**
 * Format field names from snake_case to Title Case
 */
export function formatFieldName(fieldName: string): string {
  // Special cases
  const specialCases: Record<string, string> = {
    'ttl': 'TTL',
    'soa_serial': 'SOA Serial',
    'admin_email': 'Admin Email',
    'negative_caching_ttl': 'Negative Caching TTL',
    'zone_id': 'Zone ID',
    'record_id': 'Record ID',
    'user_id': 'User ID',
    'organization_id': 'Organization ID',
  };

  if (specialCases[fieldName]) {
    return specialCases[fieldName];
  }

  // Convert snake_case to Title Case
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format TTL with human-readable units
 */
export function formatTTL(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  if (seconds < 3600) return `${seconds} seconds (${Math.floor(seconds / 60)} min)`;
  if (seconds < 86400) return `${seconds} seconds (${Math.floor(seconds / 3600)} hr)`;
  return `${seconds} seconds (${Math.floor(seconds / 86400)} days)`;
}

/**
 * Truncate long strings (like UUIDs)
 */
export function truncateString(str: string, maxLength: number = 50): string {
  if (str.length <= maxLength) return str;
  return `${str.substring(0, 8)}...${str.substring(str.length - 8)}`;
}

/**
 * Fields to exclude from diff display (internal/metadata fields)
 */
const EXCLUDED_FIELDS = new Set([
  'id',
  'created_at',
  'created_by',
  'zone_id', // Show this only for zone_records
]);

/**
 * Fields that should be formatted as timestamps
 */
const TIMESTAMP_FIELDS = new Set([
  'updated_at',
  'deleted_at',
  'last_verified_at',
]);

/**
 * Get changed fields between old and new data
 */
export interface ChangedField {
  field: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  oldFormatted: string;
  newFormatted: string;
}

export function getChangedFields(
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
  tableName: string
): ChangedField[] {
  const changes: ChangedField[] = [];
  
  // Handle DELETE (only old_data exists)
  if (oldData && !newData) {
    // For deletes, show key fields from old_data
    const keyFields = ['name', 'type', 'value', 'description'];
    keyFields.forEach(field => {
      if (oldData[field] !== undefined) {
        changes.push({
          field,
          fieldName: formatFieldName(field),
          oldValue: oldData[field],
          newValue: null,
          oldFormatted: formatValue(field, oldData[field]),
          newFormatted: '(deleted)',
        });
      }
    });
    return changes;
  }

  // Handle INSERT (only new_data exists)
  if (!oldData && newData) {
    const keyFields = ['name', 'type', 'value', 'ttl', 'description', 'comment'];
    keyFields.forEach(field => {
      if (newData[field] !== undefined && !EXCLUDED_FIELDS.has(field)) {
        changes.push({
          field,
          fieldName: formatFieldName(field),
          oldValue: null,
          newValue: newData[field],
          oldFormatted: '(new)',
          newFormatted: formatValue(field, newData[field]),
        });
      }
    });
    return changes;
  }

  // Handle UPDATE (compare old and new)
  if (oldData && newData) {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    
    allKeys.forEach(field => {
      // Skip excluded fields
      if (EXCLUDED_FIELDS.has(field)) return;
      
      // Skip if values are the same
      if (oldData[field] === newData[field]) return;
      
      // Skip if both are null/undefined
      if ((oldData[field] === null || oldData[field] === undefined) &&
          (newData[field] === null || newData[field] === undefined)) return;

      changes.push({
        field,
        fieldName: formatFieldName(field),
        oldValue: oldData[field],
        newValue: newData[field],
        oldFormatted: formatValue(field, oldData[field]),
        newFormatted: formatValue(field, newData[field]),
      });
    });
  }

  return changes;
}

/**
 * Format a value based on its field name
 */
function formatValue(field: string, value: any): string {
  if (value === null || value === undefined) return 'None';
  if (value === '') return '(empty)';
  
  // Format timestamps
  if (TIMESTAMP_FIELDS.has(field)) {
    return formatTimestampShort(value);
  }
  
  // Format TTL
  if (field === 'ttl' || field === 'negative_caching_ttl') {
    return formatTTL(Number(value));
  }
  
  // Format booleans
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  
  // Format objects/arrays
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  
  return String(value);
}

/**
 * Get a summary of changes for inline display (Option 2)
 */
export function getChangeSummary(
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
  tableName: string,
  maxFields: number = 2
): string {
  const changes = getChangedFields(oldData, newData, tableName);
  
  if (changes.length === 0) return 'No changes detected';
  
  // For DELETE
  if (!newData && oldData) {
    const name = oldData.name || 'record';
    return `Deleted ${name}`;
  }
  
  // For INSERT
  if (!oldData && newData) {
    const name = newData.name || 'record';
    return `Created ${name}`;
  }
  
  // For UPDATE - show first few changed fields
  const summary = changes
    .slice(0, maxFields)
    .map(c => `${c.fieldName}: ${c.oldFormatted} → ${c.newFormatted}`)
    .join(', ');
  
  const remaining = changes.length - maxFields;
  if (remaining > 0) {
    return `${summary}, +${remaining} more`;
  }
  
  return summary;
}

