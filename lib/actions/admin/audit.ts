'use server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function logAdminAction({
  actorId,
  action,
  resourceType,
  resourceId,
  details = {},
  ip,
  userAgent
}: {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    const serviceClient = createServiceRoleClient();
    // Log to the regular audit_logs table (admin_audit_logs has been deprecated)
    await serviceClient.from('audit_logs').insert({
      user_id: actorId,
      action,
      table_name: resourceType,
      record_id: resourceId,
      metadata: details,
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failures shouldn't break operations
  }
}
