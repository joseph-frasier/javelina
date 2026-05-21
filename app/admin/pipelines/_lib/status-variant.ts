import type { AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import type { LeadStatus } from './blocked-on';

export const STATUS_VARIANT: Record<LeadStatus, AdminStatusBadgeVariant> = {
  created: 'neutral',
  form_submitted: 'info',
  agents_complete: 'warning',
  scope_confirmed: 'accent',
  provisioning: 'accent',
  live: 'success',
  routed_to_custom: 'neutral',
  abandoned: 'neutral',
  failed: 'danger',
};
