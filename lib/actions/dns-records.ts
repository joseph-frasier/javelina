'use server';

import { createClient } from '@/lib/supabase/server';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';

/**
 * Increment SOA serial for a zone
 */
async function incrementSOASerial(zoneId: string): Promise<void> {
  const supabase = await createClient();
  
  // Increment the SOA serial using database function or direct update
  const { error } = await supabase.rpc('increment_soa_serial', { zone_id: zoneId });
  
  if (error) {
    // Fallback: increment manually if function doesn't exist
    const { data: zone } = await supabase
      .from('zones')
      .select('soa_serial')
      .eq('id', zoneId)
      .single();
    
    if (zone) {
      await supabase
        .from('zones')
        .update({ soa_serial: (zone.soa_serial || 0) + 1 })
        .eq('id', zoneId);
    }
  }
}

/**
 * Create a new DNS record
 */
export async function createDNSRecord(
  zoneId: string,
  recordData: DNSRecordFormData
): Promise<DNSRecord> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Normalize record name (empty string to @)
  const normalizedName = recordData.name.trim() || '@';
  
  // Create the record
  const { data, error } = await supabase
    .from('dns_records')
    .insert({
      zone_id: zoneId,
      name: normalizedName,
      type: recordData.type,
      value: recordData.value.trim(),
      ttl: recordData.ttl,
      priority: recordData.priority ?? null,
      active: recordData.active,
      comment: recordData.comment?.trim() || null,
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error creating DNS record:', error);
    throw new Error(error.message || 'Failed to create DNS record');
  }
  
  // Increment SOA serial
  await incrementSOASerial(zoneId);
  
  return data as DNSRecord;
}

/**
 * Update an existing DNS record
 */
export async function updateDNSRecord(
  recordId: string,
  recordData: DNSRecordFormData
): Promise<DNSRecord> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Get the record to find zone_id
  const { data: existingRecord } = await supabase
    .from('dns_records')
    .select('zone_id')
    .eq('id', recordId)
    .single();
  
  if (!existingRecord) {
    throw new Error('Record not found');
  }
  
  // Normalize record name
  const normalizedName = recordData.name.trim() || '@';
  
  // Update the record
  const { data, error } = await supabase
    .from('dns_records')
    .update({
      name: normalizedName,
      value: recordData.value.trim(),
      ttl: recordData.ttl,
      priority: recordData.priority ?? null,
      active: recordData.active,
      comment: recordData.comment?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating DNS record:', error);
    throw new Error(error.message || 'Failed to update DNS record');
  }
  
  // Increment SOA serial
  await incrementSOASerial(existingRecord.zone_id);
  
  return data as DNSRecord;
}

/**
 * Delete a DNS record
 */
export async function deleteDNSRecord(recordId: string): Promise<void> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Get the record to find zone_id before deletion
  const { data: record } = await supabase
    .from('dns_records')
    .select('zone_id, type')
    .eq('id', recordId)
    .single();
  
  if (!record) {
    throw new Error('Record not found');
  }
  
  // Prevent deletion of SOA records
  if (record.type === 'SOA') {
    throw new Error('SOA records cannot be deleted manually');
  }
  
  // Delete the record
  const { error } = await supabase
    .from('dns_records')
    .delete()
    .eq('id', recordId);
  
  if (error) {
    console.error('Error deleting DNS record:', error);
    throw new Error(error.message || 'Failed to delete DNS record');
  }
  
  // Increment SOA serial
  await incrementSOASerial(record.zone_id);
}

/**
 * Delete multiple DNS records
 */
export async function bulkDeleteDNSRecords(recordIds: string[]): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  if (recordIds.length === 0) {
    return { success: 0, failed: 0, errors: [] };
  }
  
  // Get all records to check types and zone_ids
  const { data: records } = await supabase
    .from('dns_records')
    .select('id, zone_id, type')
    .in('id', recordIds);
  
  if (!records || records.length === 0) {
    throw new Error('No records found');
  }
  
  // Filter out SOA records
  const deletableRecords = records.filter(r => r.type !== 'SOA');
  const soaRecords = records.filter(r => r.type === 'SOA');
  
  const errors: string[] = [];
  
  if (soaRecords.length > 0) {
    errors.push(`Skipped ${soaRecords.length} SOA record(s) - cannot be deleted manually`);
  }
  
  if (deletableRecords.length === 0) {
    return { success: 0, failed: soaRecords.length, errors };
  }
  
  // Delete records
  const { error } = await supabase
    .from('dns_records')
    .delete()
    .in('id', deletableRecords.map(r => r.id));
  
  if (error) {
    console.error('Error bulk deleting DNS records:', error);
    return {
      success: 0,
      failed: deletableRecords.length,
      errors: [...errors, error.message || 'Failed to delete records'],
    };
  }
  
  // Increment SOA serial for affected zones (deduplicate zone_ids)
  const affectedZones = [...new Set(deletableRecords.map(r => r.zone_id))];
  await Promise.all(affectedZones.map(zoneId => incrementSOASerial(zoneId)));
  
  return {
    success: deletableRecords.length,
    failed: soaRecords.length,
    errors,
  };
}

/**
 * Duplicate a DNS record
 */
export async function duplicateDNSRecord(
  recordId: string,
  newName: string
): Promise<DNSRecord> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Get the original record
  const { data: originalRecord, error: fetchError } = await supabase
    .from('dns_records')
    .select('*')
    .eq('id', recordId)
    .single();
  
  if (fetchError || !originalRecord) {
    throw new Error('Record not found');
  }
  
  // Create the duplicate with new name
  const normalizedName = newName.trim() || '@';
  
  const { data, error } = await supabase
    .from('dns_records')
    .insert({
      zone_id: originalRecord.zone_id,
      name: normalizedName,
      type: originalRecord.type,
      value: originalRecord.value,
      ttl: originalRecord.ttl,
      priority: originalRecord.priority,
      active: originalRecord.active,
      comment: originalRecord.comment ? `Copy of: ${originalRecord.comment}` : 'Duplicated record',
      created_by: user.id,
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error duplicating DNS record:', error);
    throw new Error(error.message || 'Failed to duplicate DNS record');
  }
  
  // Increment SOA serial
  await incrementSOASerial(originalRecord.zone_id);
  
  return data as DNSRecord;
}

/**
 * Toggle record active status
 */
export async function toggleDNSRecordStatus(recordId: string): Promise<DNSRecord> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  // Get current status and zone_id
  const { data: record } = await supabase
    .from('dns_records')
    .select('active, zone_id')
    .eq('id', recordId)
    .single();
  
  if (!record) {
    throw new Error('Record not found');
  }
  
  // Toggle status
  const { data, error } = await supabase
    .from('dns_records')
    .update({
      active: !record.active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .select()
    .single();
  
  if (error) {
    console.error('Error toggling DNS record status:', error);
    throw new Error(error.message || 'Failed to toggle record status');
  }
  
  // Increment SOA serial
  await incrementSOASerial(record.zone_id);
  
  return data as DNSRecord;
}

/**
 * Bulk toggle record active status
 */
export async function bulkToggleDNSRecordStatus(
  recordIds: string[],
  active: boolean
): Promise<{ success: number; failed: number }> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }
  
  if (recordIds.length === 0) {
    return { success: 0, failed: 0 };
  }
  
  // Get zone_ids for affected records
  const { data: records } = await supabase
    .from('dns_records')
    .select('zone_id')
    .in('id', recordIds);
  
  // Update status
  const { error } = await supabase
    .from('dns_records')
    .update({
      active,
      updated_at: new Date().toISOString(),
    })
    .in('id', recordIds);
  
  if (error) {
    console.error('Error bulk toggling DNS record status:', error);
    return { success: 0, failed: recordIds.length };
  }
  
  // Increment SOA serial for affected zones
  if (records) {
    const affectedZones = [...new Set(records.map(r => r.zone_id))];
    await Promise.all(affectedZones.map(zoneId => incrementSOASerial(zoneId)));
  }
  
  return { success: recordIds.length, failed: 0 };
}

/**
 * Get all DNS records for a zone
 */
export async function getDNSRecords(zoneId: string): Promise<DNSRecord[]> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('dns_records')
    .select('*')
    .eq('zone_id', zoneId)
    .order('name', { ascending: true })
    .order('type', { ascending: true });
  
  if (error) {
    console.error('Error fetching DNS records:', error);
    throw new Error(error.message || 'Failed to fetch DNS records');
  }
  
  return (data || []) as DNSRecord[];
}

