import { createClient } from '@/lib/supabase/client';
import {
  generateMockDNSRecords,
  calculateRecordTypeCounts,
  calculateTTLDistribution,
  generateMockAuditLogs,
  DNSRecord,
  RecordTypeCount,
  TTLBucket,
  AuditLog,
} from '@/lib/mock-dns-data';

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
 * Currently mocked - will be replaced with real API when dns_records table exists
 */
export async function getZoneSummary(zoneId: string, zoneName: string, recordsCount: number = 50): Promise<ZoneSummary> {
  const supabase = createClient();

  // Fetch zone data from Supabase
  const { data: zone } = await supabase
    .from('zones')
    .select('verification_status, last_verified_at, metadata')
    .eq('id', zoneId)
    .single();

  // Fetch environment data for health_status and last_deployed_at
  const { data: zoneWithEnv } = await supabase
    .from('zones')
    .select('environment_id')
    .eq('id', zoneId)
    .single();

  let healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown' = 'unknown';
  let lastDeployedAt: string | null = null;

  if (zoneWithEnv) {
    const { data: environment } = await supabase
      .from('environments')
      .select('health_status, last_deployed_at')
      .eq('id', zoneWithEnv.environment_id)
      .single();

    if (environment) {
      healthStatus = (environment.health_status as any) || 'unknown';
      lastDeployedAt = environment.last_deployed_at;
    }
  }

  // Generate mock DNS records (until dns_records table exists)
  const mockRecords = generateMockDNSRecords(zoneName, recordsCount);
  const recordTypeCounts = calculateRecordTypeCounts(mockRecords);
  const ttlDistribution = calculateTTLDistribution(mockRecords);

  return {
    recordTypeCounts,
    ttlDistribution,
    totalRecords: mockRecords.length,
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

  if (auditLogs && auditLogs.length > 0) {
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

  // Fallback to mock data if no real logs exist
  return generateMockAuditLogs(zoneId, zoneName, 20);
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
    .single();

  // Generate mock records for export
  const mockRecords = generateMockDNSRecords(zoneName, 50);

  const exportData = {
    zone: zone || {},
    records: mockRecords,
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
 * Currently mocked - will fetch from dns_records table when it exists
 */
export async function getZoneDNSRecords(zoneId: string, zoneName: string): Promise<DNSRecord[]> {
  // TODO: Replace with real query when dns_records table exists
  // const { data } = await supabase
  //   .from('dns_records')
  //   .select('*')
  //   .eq('zone_id', zoneId);
  
  return generateMockDNSRecords(zoneName, 50);
}

