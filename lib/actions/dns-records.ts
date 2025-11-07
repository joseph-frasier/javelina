'use server';

import { dnsRecordsApi } from '@/lib/api-client';
import { revalidatePath } from 'next/cache';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';

/**
 * Create a new DNS record
 */
export async function createDNSRecord(
  zoneId: string,
  recordData: DNSRecordFormData
): Promise<DNSRecord> {
  try {
    const record = await dnsRecordsApi.create({
      zone_id: zoneId,
      ...recordData
    });
    
    revalidatePath(`/zone/${zoneId}`);
    return record;
  } catch (error: any) {
    console.error('Error creating DNS record:', error);
    throw new Error(error.message || 'Failed to create DNS record');
  }
}

/**
 * Update an existing DNS record
 */
export async function updateDNSRecord(
  recordId: string,
  recordData: DNSRecordFormData
): Promise<DNSRecord> {
  try {
    const record = await dnsRecordsApi.update(recordId, recordData);
    
    // Revalidate zone page (we don't have zone_id here, so revalidate broadly)
    revalidatePath('/zone');
    return record;
  } catch (error: any) {
    console.error('Error updating DNS record:', error);
    throw new Error(error.message || 'Failed to update DNS record');
  }
}

/**
 * Delete a DNS record
 */
export async function deleteDNSRecord(recordId: string): Promise<void> {
  try {
    await dnsRecordsApi.delete(recordId);
    
    revalidatePath('/zone');
  } catch (error: any) {
    console.error('Error deleting DNS record:', error);
    throw new Error(error.message || 'Failed to delete DNS record');
  }
}

/**
 * Delete multiple DNS records
 */
export async function bulkDeleteDNSRecords(recordIds: string[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const recordId of recordIds) {
    try {
      await dnsRecordsApi.delete(recordId);
      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(error.message || 'Unknown error');
    }
  }

  revalidatePath('/zone');
  return results;
}

/**
 * Duplicate a DNS record
 */
export async function duplicateDNSRecord(
  recordId: string,
  newName: string
): Promise<DNSRecord> {
  try {
    // Get the original record first
    const originalRecord = await dnsRecordsApi.get(recordId);
    
    // Create a new record with modified name
    const duplicatedRecord = await dnsRecordsApi.create({
      zone_id: originalRecord.zone_id,
      name: newName.trim() || '@',
      type: originalRecord.type,
      value: originalRecord.value,
      ttl: originalRecord.ttl,
      priority: originalRecord.priority,
      active: originalRecord.active,
      comment: originalRecord.comment ? `Copy of: ${originalRecord.comment}` : 'Duplicated record',
    });

    revalidatePath(`/zone/${originalRecord.zone_id}`);
    return duplicatedRecord;
  } catch (error: any) {
    console.error('Error duplicating DNS record:', error);
    throw new Error(error.message || 'Failed to duplicate DNS record');
  }
}

/**
 * Toggle record active status
 */
export async function toggleDNSRecordStatus(recordId: string): Promise<DNSRecord> {
  try {
    // Get current record
    const record = await dnsRecordsApi.get(recordId);
    
    // Update with toggled status
    const updatedRecord = await dnsRecordsApi.update(recordId, {
      name: record.name,
      type: record.type,
      value: record.value,
      ttl: record.ttl,
      priority: record.priority,
      active: !record.active,
      comment: record.comment
    });

    revalidatePath(`/zone/${record.zone_id}`);
    return updatedRecord;
  } catch (error: any) {
    console.error('Error toggling DNS record status:', error);
    throw new Error(error.message || 'Failed to toggle record status');
  }
}

/**
 * Bulk toggle record active status
 */
export async function bulkToggleDNSRecordStatus(
  recordIds: string[],
  active: boolean
): Promise<{ success: number; failed: number }> {
  const results = { success: 0, failed: 0 };

  for (const recordId of recordIds) {
    try {
      const record = await dnsRecordsApi.get(recordId);
      await dnsRecordsApi.update(recordId, {
        name: record.name,
        type: record.type,
        value: record.value,
        ttl: record.ttl,
        priority: record.priority,
        active,
        comment: record.comment
      });
      results.success++;
    } catch (error) {
      results.failed++;
    }
  }

  revalidatePath('/zone');
  return results;
}

/**
 * Get all DNS records for a zone
 */
export async function getDNSRecords(zoneId: string): Promise<DNSRecord[]> {
  try {
    const records = await dnsRecordsApi.list(zoneId);
    return records;
  } catch (error: any) {
    console.error('Error fetching DNS records:', error);
    throw new Error(error.message || 'Failed to fetch DNS records');
  }
}
