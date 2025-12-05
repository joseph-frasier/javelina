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
  const supabase = createClient();

  // Fetch zone data from Supabase
  const { data: zone } = await supabase
    .from('zones')
    .select('verification_status, last_verified_at, metadata, records_count')
    .eq('id', zoneId)
    .is('deleted_at', null)
    .single();

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
 */
export async function getZoneAuditLogs(zoneId: string, zoneName: string): Promise<AuditLog[]> {
  const supabase = createClient();

  // Fetch real audit logs from Supabase
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        name,
        email
      )
    `)
    .eq('table_name', 'zones')
    .eq('record_id', zoneId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!auditLogs || auditLogs.length === 0) {
    return [];
  }

  // Transform real audit logs
  return auditLogs.map(log => ({
    id: log.id,
    table_name: log.table_name,
    record_id: log.record_id,
    action: log.action as 'INSERT' | 'UPDATE' | 'DELETE',
    old_data: log.old_data,
    new_data: log.new_data,
    user_id: log.user_id,
    user_name: (log.profiles as any)?.name || 'Unknown User',
    user_email: (log.profiles as any)?.email || 'unknown@example.com',
    created_at: log.created_at,
    ip_address: log.metadata?.ip_address,
    user_agent: log.metadata?.user_agent,
  }));
}

/**
 * Verify zone nameservers
 * Placeholder - will trigger actual DNS verification when backend is ready
 */
export async function verifyZoneNameservers(zoneId: string): Promise<{
  success: boolean;
  status: 'verified' | 'pending' | 'failed';
  message: string;
}> {
  const supabase = createClient();

  try {
    // Update verification status to pending
    await supabase
      .from('zones')
      .update({
        verification_status: 'pending',
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', zoneId);

    // Mock verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate successful verification (90% success rate)
    const isSuccess = Math.random() > 0.1;
    const status = isSuccess ? 'verified' : 'failed';

    await supabase
      .from('zones')
      .update({
        verification_status: status,
        last_verified_at: new Date().toISOString(),
      })
      .eq('id', zoneId);

    return {
      success: isSuccess,
      status,
      message: isSuccess
        ? 'Nameservers verified successfully'
        : 'Verification failed - nameservers not yet propagated',
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      message: 'Verification failed - please try again',
    };
  }
}

/**
 * Export zone configuration as JSON
 */
export async function exportZoneJSON(zoneId: string, zoneName: string): Promise<void> {
  const supabase = createClient();

  // Fetch zone data
  const { data: zone } = await supabase
    .from('zones')
    .select('*')
    .eq('id', zoneId)
    .is('deleted_at', null)
    .single();

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

