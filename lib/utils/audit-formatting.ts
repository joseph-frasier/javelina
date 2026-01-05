/**
 * Utility functions for formatting audit log data in a user-friendly way
 */

/**
 * Format a timestamp to user's local timezone with relative time
 */
export function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  const formatted = date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  const relative = formatRelativeTime(date);
  
  return `${formatted} (${relative})`;
}

/**
 * Format a timestamp in short format (for inline diffs)
 */
export function formatTimestampShort(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format relative time (e.g., "2 minutes ago")
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHour < 24) return `${diffHour} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;
  
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;
  
  const diffYear = Math.floor(diffDay / 365);
  return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
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
  'updated_at',
  'soa_serial', // Auto-increments on zone changes
  'zone_id', // Show only for zone_records context
]);

/**
 * Fields to exclude from inline summary (more aggressive filtering)
 * These are system fields that aren't meaningful to users
 */
const EXCLUDED_FROM_SUMMARY = new Set([
  ...Array.from(EXCLUDED_FIELDS),
  'created_by',
  'user_id',
  'organization_id',
  'record_id',
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
 * Check if an audit log entry is just a system-generated change (e.g., SOA auto-increment)
 * These should be filtered out from the user-facing audit timeline
 */
export function isSystemOnlyChange(
  oldData: Record<string, any> | null,
  newData: Record<string, any> | null,
  tableName: string
): boolean {
  // If it's a delete or insert, always show it
  if (!oldData || !newData) return false;
  
  // For zones, check if only system fields changed
  if (tableName === 'zones') {
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
    const systemFields = new Set(['soa_serial', 'updated_at']);
    
    // Check if any non-system field changed
    for (const key of allKeys) {
      if (systemFields.has(key)) continue;
      
      // If a non-system field changed, this is a real user change
      if (oldData[key] !== newData[key]) {
        return false;
      }
    }
    
    // Only system fields changed - this is auto-generated
    return true;
  }
  
  return false;
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
  
  // Filter out system/metadata fields for the summary
  const meaningfulChanges = changes.filter(c => !EXCLUDED_FROM_SUMMARY.has(c.field));
  
  if (meaningfulChanges.length === 0) {
    // No meaningful user changes, provide context-aware message
    if (!newData && oldData) {
      const name = oldData.name || oldData.type || 'record';
      return `Deleted ${name}`;
    }
    if (!oldData && newData) {
      const name = newData.name || newData.type || 'record';
      return `Created ${name}`;
    }
    // Only system fields changed (e.g., SOA serial auto-increment)
    if (tableName === 'zones') return 'Zone metadata updated';
    if (tableName === 'zone_records') return 'Record metadata updated';
    return 'System fields updated';
  }
  
  // For DELETE
  if (!newData && oldData) {
    const name = oldData.name || 'record';
    return `Deleted ${name}`;
  }
  
  // For INSERT - show the created item's name/type
  if (!oldData && newData) {
    if (tableName === 'zone_records') {
      const type = newData.type || '';
      const name = newData.name || '@';
      return `Created ${type} record for ${name}`;
    }
    const name = newData.name || 'item';
    return `Created ${name}`;
  }
  
  // For UPDATE - show first few meaningful changed fields
  const summary = meaningfulChanges
    .slice(0, maxFields)
    .map(c => `${c.fieldName}: ${c.oldFormatted} → ${c.newFormatted}`)
    .join(', ');
  
  const remaining = meaningfulChanges.length - maxFields;
  if (remaining > 0) {
    return `${summary}, +${remaining} more`;
  }
  
  return summary;
}

