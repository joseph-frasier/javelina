import type { LeadStatus } from '@/lib/api-client';

export type { LeadStatus };

export const blockedOnLabel: Record<LeadStatus, string | null> = {
  created: 'Awaiting form submission',
  form_submitted: 'Agents running',
  agents_complete: 'Awaiting operator scope review',
  scope_confirmed: 'Provisioning starting',
  provisioning: 'Provisioning in flight',
  live: null,
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned by customer',
  failed: 'Failed',
};
