import { zonesApi, apiClient } from '@/lib/api-client';
import { createClient } from '@/lib/supabase/client';
import {
  calculateRecordTypeCounts,
  calculateTTLDistribution,
  RecordTypeCount,
  TTLBucket,
  AuditLog,
} from '@/lib/mock-dns-data';
import type { DNSRecord } from '@/types/dns';

export interface ZoneSummary {
  recordTypeCounts: RecordTypeCount[];
  ttlDistribution: TTLBucket[];
  totalRecords: number;
  verificationStatus: 'verified' | 'pending' | 'failed' | 'unverified';
  lastVerifiedAt: string | null;
  healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastDeployedAt: string | null;
}

/**
 * Get zone summary with aggregated data for visualizations
 * Uses real DNS records from zone_records table
 */
export async function getZoneSummary(zoneId: string, zoneName: string, recordsCount: number = 50): Promise<ZoneSummary> {
  // Fetch zone data from Express API
  const zone = await zonesApi.get(zoneId);

  // Health status and last deployed are now zone-level (simplified after removing environments)
  const healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown';
  const lastDeployedAt: string | null = null;

  // Fetch DNS records through Express API for consistency
  const dnsRecords = await getZoneDNSRecords(zoneId, zoneName);
  
  const realRecords = (dnsRecords || []) as any[];
  const recordTypeCounts = realRecords.length > 0 ? calculateRecordTypeCounts(realRecords) : [];
  const ttlDistribution = realRecords.length > 0 ? calculateTTLDistribution(realRecords) : [];

  return {
    recordTypeCounts,
    ttlDistribution,
    totalRecords: zone?.records_count || realRecords.length,
    verificationStatus: (zone?.verification_status as any) || 'unverified',
    lastVerifiedAt: zone?.last_verified_at || null,
    healthStatus,
    lastDeployedAt,
  };
}

/**
 * Get audit logs for a zone
 * Routes through Express API for proper authorization
 */
export async function getZoneAuditLogs(zoneId: string, zoneName: string): Promise<AuditLog[]> {
  try {
    // Fetch audit logs through Express API
    const result = await apiClient.get(`/zones/${zoneId}/audit-logs`);
    return (result.data || result || []) as AuditLog[];
  } catch (error) {
    console.error('Error fetching zone audit logs:', error);
    return [];
  }
}

/**
 * Verify zone nameservers
 * Routes through Express API via server action
 * Express API Required: PUT /api/zones/:id/verification
 */
export { verifyZoneNameservers } from '@/lib/actions/zones';

/**
 * Export zone configuration as JSON
 */
export async function exportZoneJSON(zoneId: string, zoneName: string): Promise<void> {
  // Fetch zone data from Express API
  const zone = await zonesApi.get(zoneId);

  // Fetch DNS records through Express API for consistency
  const dnsRecords = await getZoneDNSRecords(zoneId, zoneName);

  const exportData = {
    zone: zone || {},
    records: dnsRecords || [],
    exported_at: new Date().toISOString(),
  };

  // Create and download JSON file
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${zoneName}-config-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Get DNS records for a zone
 * Routes through Express API for consistent authorization and error handling
 */
export async function getZoneDNSRecords(zoneId: string, zoneName: string): Promise<DNSRecord[]> {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      console.error('Not authenticated');
      return [];
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    const response = await fetch(`${API_BASE_URL}/api/dns-records/zone/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      cache: 'no-store', // Ensure fresh data
    });

    if (!response.ok) {
      console.error('Failed to fetch DNS records:', response.statusText);
      return [];
    }

    const result = await response.json();
    return (result.data || result || []) as DNSRecord[];
  } catch (error) {
    console.error('Error fetching DNS records:', error);
    return [];
  }
}

