'use server'

import { createClient } from '@/lib/supabase/server'

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: any
  new_data: any
  user_id: string | null
  created_at: string
}

/**
 * Get recent audit logs for an organization
 * Routes through Express API for proper authorization
 */
export async function getOrganizationAuditLogs(organizationId: string, limit: number = 10) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return [];
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${API_BASE_URL}/api/organizations/${organizationId}/audit-logs?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const result = await response.json();
    return result.data || result || [];
  } catch (error) {
    console.error('Error fetching organization audit logs:', error);
    return [];
  }
}

/**
 * Get recent audit logs for environments and zones in an organization
 * Routes through Express API for proper authorization
 */
export async function getOrganizationActivityLogs(organizationId: string, limit: number = 10) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return [];
    }

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const response = await fetch(`${API_BASE_URL}/api/organizations/${organizationId}/activity?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      // Fallback to audit logs if activity endpoint not available
      return getOrganizationAuditLogs(organizationId, limit);
    }

    const result = await response.json();
    return result.data || result || [];
  } catch (error) {
    console.error('Error fetching organization activity logs:', error);
    // Fallback to audit logs on error
    return getOrganizationAuditLogs(organizationId, limit);
  }
}

/**
 * Format audit log for display
 */
export async function formatAuditLog(log: AuditLog & { profiles?: { name?: string; email?: string } }) {
  const action = log.action === 'INSERT' ? 'Created' : log.action === 'UPDATE' ? 'Updated' : 'Deleted'
  const target = log.new_data?.name || log.old_data?.name || 'Unknown'
  const user = log.profiles?.name || log.profiles?.email || 'System'
  const timestamp = new Date(log.created_at).toLocaleString()
  
  return {
    action: `${action} ${log.table_name.slice(0, -1)}`, // Remove trailing 's' from table name
    target,
    user,
    timestamp
  }
}

