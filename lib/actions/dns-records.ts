'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { DNSRecord, DNSRecordFormData } from '@/types/dns';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Create a new DNS record
 */
export async function createDNSRecord(
  zoneId: string,
  recordData: DNSRecordFormData
): Promise<DNSRecord> {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/dns-records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        zone_id: zoneId,
        ...recordData
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create DNS record');
    }

    const record = data.data || data;
    
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
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/dns-records/${recordId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(recordData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update DNS record');
    }

    const record = data.data || data;
    
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
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/dns-records/${recordId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to delete DNS record');
    }
    
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
      await deleteDNSRecord(recordId);
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
 * Get a DNS record by ID
 */
async function getDNSRecord(recordId: string): Promise<DNSRecord> {
  // Get session from server-side Supabase client (uses cookies)
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }

  // Make API call with auth token
  const response = await fetch(`${API_BASE_URL}/api/dns-records/${recordId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get DNS record');
  }

  return data.data || data;
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
    const originalRecord = await getDNSRecord(recordId);
    
    // Create a new record with modified name
    const duplicatedRecord = await createDNSRecord(originalRecord.zone_id, {
      name: newName.trim() || '@',
      type: originalRecord.type,
      value: originalRecord.value,
      ttl: originalRecord.ttl,
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
 * NOTE: Active field has been removed from schema. This function is deprecated.
 */
export async function toggleDNSRecordStatus(recordId: string): Promise<DNSRecord> {
  throw new Error('Toggle active status is no longer supported. Active field has been removed from schema.');
}

/**
 * Bulk toggle record active status
 * NOTE: Active field has been removed from schema. This function is deprecated.
 */
export async function bulkToggleDNSRecordStatus(
  recordIds: string[],
  active: boolean
): Promise<{ success: number; failed: number }> {
  throw new Error('Bulk toggle active status is no longer supported. Active field has been removed from schema.');
}

/**
 * Get all DNS records for a zone
 */
export async function getDNSRecords(zoneId: string): Promise<DNSRecord[]> {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/dns-records/zone/${zoneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to fetch DNS records');
    }

    return data.data || data;
  } catch (error: any) {
    console.error('Error fetching DNS records:', error);
    throw new Error(error.message || 'Failed to fetch DNS records');
  }
}
