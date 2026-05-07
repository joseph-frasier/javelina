import type { LeadStatus } from '@/lib/api-client';
import type { ServiceState } from './section-state';

export function shouldExpandFoundation(
  leadStatus: LeadStatus,
  foundationState: ServiceState
): boolean {
  // Force-expand if failed
  if (foundationState === 'failed') return true;
  // Default-expand for these lead statuses
  return (
    leadStatus === 'created' ||
    leadStatus === 'form_submitted' ||
    leadStatus === 'agents_complete' ||
    leadStatus === 'routed_to_custom' ||
    leadStatus === 'abandoned'
  );
}

export function shouldExpandService(
  serviceState: ServiceState,
  leadStatus: LeadStatus
): boolean {
  // Override: failed or needs_input always force-expands
  if (serviceState === 'failed' || serviceState === 'needs_input') return true;
  // Default-expand when in_progress
  if (serviceState === 'in_progress') return true;
  // For scope_confirmed / provisioning lead, expand in_progress/needs_input/failed (handled above)
  // For failed lead status, force-expand any failed service (handled above)
  void leadStatus; // leadStatus consumed by the checks above
  return false;
}
