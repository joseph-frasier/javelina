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
    await serviceClient.from('admin_audit_logs').insert({
      actor_user_id: actorId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ip,
      user_agent: userAgent
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging failures shouldn't break operations
  }
}
