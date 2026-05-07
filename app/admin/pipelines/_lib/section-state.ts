import type { LeadDetail, LeadService } from '@/lib/api-client';
import type { AdminStatusBadgeVariant } from '@/components/admin/AdminStatusBadge';
import { deriveAgentStatus } from './agent-status';
import type { ServiceKey } from './runner-registry';

export type ServiceState =
  | 'not_started'
  | 'in_progress'
  | 'needs_input'
  | 'failed'
  | 'live'
  | 'not_applicable';

export const SERVICE_STATE_VARIANT: Record<ServiceState, AdminStatusBadgeVariant> = {
  not_started: 'neutral',
  in_progress: 'info',
  needs_input: 'warning',
  failed: 'danger',
  live: 'success',
  not_applicable: 'neutral',
};

function deriveFoundationState(lead: LeadDetail): ServiceState {
  const statuses = [
    deriveAgentStatus(lead, '1'),
    deriveAgentStatus(lead, '2'),
    deriveAgentStatus(lead, '3'),
    deriveAgentStatus(lead, '5'),
  ];
  if (statuses.every((s) => s === 'done')) return 'live';
  if (statuses.some((s) => s === 'failed')) return 'failed';
  if (statuses.some((s) => s === 'running')) return 'in_progress';
  return 'not_started';
}

export function getServiceState(
  service: ServiceKey,
  lead: LeadDetail,
  services: LeadService[]
): ServiceState {
  if (service === 'foundation') {
    return deriveFoundationState(lead);
  }
  const row = services.find((s) => s.service === service);
  if (!row) return 'not_started';
  const state = row.state as ServiceState;
  // Guard against unknown state strings from intake
  const known: ServiceState[] = [
    'not_started',
    'in_progress',
    'needs_input',
    'failed',
    'live',
    'not_applicable',
  ];
  return known.includes(state) ? state : 'not_started';
}

export function getServiceProgressLabel(
  service: ServiceKey,
  lead: LeadDetail,
  services: LeadService[]
): string {
  if (service === 'foundation') {
    const statuses = [
      deriveAgentStatus(lead, '1'),
      deriveAgentStatus(lead, '2'),
      deriveAgentStatus(lead, '3'),
      deriveAgentStatus(lead, '5'),
    ];
    const doneCount = statuses.filter((s) => s === 'done').length;
    if (doneCount === 0) return '—';
    if (doneCount === 4) return '4/4 agents complete';
    return `${doneCount}/4 agents complete`;
  }
  const row = services.find((s) => s.service === service);
  return row?.progress_label || '';
}

export function getServiceUpdatedAt(
  service: ServiceKey,
  lead: LeadDetail,
  services: LeadService[]
): { label: string; iso: string } {
  if (service === 'foundation') {
    const allFoundationDone = !!(
      lead.lead_record &&
      lead.research_report &&
      lead.similarity_report &&
      lead.upsell_risk_report
    );

    const fallback = lead.form_submitted_at
      ? { label: 'Last activity', iso: lead.updated_at }
      : { label: 'Created', iso: lead.created_at };

    if (allFoundationDone && lead.agents_completed_at) {
      return { label: 'Completed', iso: lead.agents_completed_at };
    }
    return fallback;
  }

  const row = services.find((s) => s.service === service);
  if (row) {
    return { label: 'Updated', iso: row.updated_at };
  }
  return { label: 'Last activity', iso: lead.updated_at };
}
