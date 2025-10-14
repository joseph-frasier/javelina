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
 */
export async function getOrganizationAuditLogs(organizationId: string, limit: number = 10) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      profiles(name, email)
    `)
    .eq('table_name', 'organizations')
    .eq('record_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit)
  
  if (error) {
    // Silently fail and return empty array if audit logs aren't available yet
    return []
  }
  
  return data || []
}

/**
 * Get recent audit logs for environments and zones in an organization
 */
export async function getOrganizationActivityLogs(organizationId: string, limit: number = 10) {
  const supabase = await createClient()
  
  // Get all audit logs related to this organization's resources
  const { data, error } = await supabase.rpc('get_organization_activity', {
    org_id: organizationId,
    log_limit: limit
  })
  
  // If the RPC function doesn't exist yet, fall back to fetching org logs only
  if (error) {
    return getOrganizationAuditLogs(organizationId, limit)
  }
  
  return data || []
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

