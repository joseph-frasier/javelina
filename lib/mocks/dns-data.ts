/**
 * Mock DNS data utilities for Zone Control Center
 * Generates realistic DNS records, TTL distributions, and audit logs
 * until dns_records table is implemented
 */

export interface DNSRecord {
  id: string;
  name: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS' | 'TXT' | 'SOA' | 'SRV' | 'CAA';
  value: string;
  ttl: number;
  priority?: number;
  status: 'active' | 'inactive';
}

export interface RecordTypeCount {
  type: string;
  count: number;
  color: string;
}

export interface TTLBucket {
  bucket: string;
  count: number;
  percentage: number;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: any;
  new_data: any;
  user_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

// Color palette for record types
const RECORD_TYPE_COLORS: Record<string, string> = {
  A: '#FF6B35',        // orange
  AAAA: '#004E89',     // blue-electric
  CNAME: '#1B998B',    // teal
  MX: '#9B59B6',       // purple
  NS: '#E74C3C',       // red
  TXT: '#F39C12',      // amber
  SOA: '#16A085',      // green
  SRV: '#8E44AD',      // dark purple
  CAA: '#D35400',      // dark orange
};

/**
 * Generate mock DNS records for a zone
 */
export function generateMockDNSRecords(zoneName: string, count: number = 50): DNSRecord[] {
  const records: DNSRecord[] = [];
  const recordTypes: DNSRecord['type'][] = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT', 'SOA', 'SRV', 'CAA'];
  const ttlValues = [60, 300, 600, 1800, 3600, 7200, 14400, 28800, 43200, 86400];
  
  // Always include SOA and NS records
  records.push({
    id: `soa-${Date.now()}`,
    name: zoneName,
    type: 'SOA',
    value: `ns1.${zoneName} admin.${zoneName} ${Date.now()} 3600 600 604800 86400`,
    ttl: 3600,
    status: 'active',
  });

  for (let i = 0; i < 4; i++) {
    records.push({
      id: `ns-${i}-${Date.now()}`,
      name: zoneName,
      type: 'NS',
      value: `ns${i + 1}.${zoneName}`,
      ttl: 86400,
      status: 'active',
    });
  }

  // Generate remaining records
  for (let i = records.length; i < count; i++) {
    const type = recordTypes[Math.floor(Math.random() * recordTypes.length)];
    const subdomain = Math.random() > 0.3 ? `${['www', 'api', 'mail', 'app', 'cdn', 'blog', 'shop', 'dev'][Math.floor(Math.random() * 8)]}.` : '';
    
    let value = '';
    let priority: number | undefined;

    switch (type) {
      case 'A':
        value = `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        break;
      case 'AAAA':
        value = `2001:db8::${Math.floor(Math.random() * 65536).toString(16)}`;
        break;
      case 'CNAME':
        value = `${subdomain || 'target.'}${zoneName}`;
        break;
      case 'MX':
        value = `mail${Math.floor(Math.random() * 3) + 1}.${zoneName}`;
        priority = (Math.floor(Math.random() * 3) + 1) * 10;
        break;
      case 'TXT':
        value = `"v=spf1 include:_spf.${zoneName} ~all"`;
        break;
      case 'SRV':
        value = `10 ${Math.floor(Math.random() * 10000)} ${zoneName}`;
        priority = 10;
        break;
      case 'CAA':
        value = `0 issue "letsencrypt.org"`;
        break;
      default:
        value = 'default-value';
    }

    records.push({
      id: `${type.toLowerCase()}-${i}-${Date.now()}`,
      name: `${subdomain}${zoneName}`,
      type,
      value,
      ttl: ttlValues[Math.floor(Math.random() * ttlValues.length)],
      priority,
      status: Math.random() > 0.95 ? 'inactive' : 'active',
    });
  }

  return records;
}

/**
 * Calculate record type distribution for donut chart
 */
export function calculateRecordTypeCounts(records: DNSRecord[]): RecordTypeCount[] {
  const counts = records.reduce((acc, record) => {
    acc[record.type] = (acc[record.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(counts)
    .map(([type, count]) => ({
      type,
      count,
      color: RECORD_TYPE_COLORS[type] || '#95A5A6',
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate TTL distribution for heatmap
 */
export function calculateTTLDistribution(records: DNSRecord[]): TTLBucket[] {
  const buckets = {
    '< 60s': 0,
    '60-300s': 0,
    '300-3600s': 0,
    '3600-86400s': 0,
    '> 86400s': 0,
  };

  records.forEach(record => {
    if (record.ttl < 60) buckets['< 60s']++;
    else if (record.ttl <= 300) buckets['60-300s']++;
    else if (record.ttl <= 3600) buckets['300-3600s']++;
    else if (record.ttl <= 86400) buckets['3600-86400s']++;
    else buckets['> 86400s']++;
  });

  const total = records.length;

  return Object.entries(buckets).map(([bucket, count]) => ({
    bucket,
    count,
    percentage: Math.round((count / total) * 100),
  }));
}

/**
 * Generate mock audit log entries
 */
export function generateMockAuditLogs(zoneId: string, zoneName: string, count: number = 20): AuditLog[] {
  const logs: AuditLog[] = [];
  const actions: AuditLog['action'][] = ['INSERT', 'UPDATE', 'DELETE'];
  const users = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
  ];

  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];
    const user = users[Math.floor(Math.random() * users.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(Math.random() * 24));
    date.setMinutes(Math.floor(Math.random() * 60));

    let old_data = null;
    let new_data = null;

    if (action === 'INSERT') {
      new_data = {
        name: `record-${i}.${zoneName}`,
        type: 'A',
        value: '192.0.2.1',
        ttl: 3600,
      };
    } else if (action === 'UPDATE') {
      old_data = {
        name: `record-${i}.${zoneName}`,
        type: 'A',
        value: '192.0.2.1',
        ttl: 3600,
      };
      new_data = {
        name: `record-${i}.${zoneName}`,
        type: 'A',
        value: '192.0.2.2',
        ttl: 7200,
      };
    } else {
      old_data = {
        name: `record-${i}.${zoneName}`,
        type: 'A',
        value: '192.0.2.1',
        ttl: 3600,
      };
    }

    logs.push({
      id: `audit-${i}-${Date.now()}`,
      table_name: 'zone_records',
      record_id: `record-${i}`,
      action,
      old_data,
      new_data,
      user_id: user.id,
      user_name: user.name,
      user_email: user.email,
      created_at: date.toISOString(),
      ip_address: `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`,
      user_agent: 'Mozilla/5.0 (compatible)',
    });
  }

  return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

/**
 * Format relative time (e.g., "2h ago", "3d ago")
 */
export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

