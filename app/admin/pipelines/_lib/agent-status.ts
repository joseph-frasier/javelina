import type { LeadDetail } from '@/lib/api-client';

export type RunnerStatus = 'done' | 'running' | 'queued' | 'failed' | 'skipped' | 'not_built';

export type AgentId = '1' | '2' | '3' | '5' | '10' | '11' | '12';

// Maps AgentId → the LeadDetail jsonb column that proves the agent ran.
// Agent 11 (Structurer) writes structure_prep but is treated as "not yet built"
// for now per the spec — it's not user-surfaced.
const AGENT_TO_COLUMN: Record<AgentId, keyof LeadDetail | null> = {
  '1': 'lead_record',
  '2': 'research_report',
  '3': 'similarity_report',
  '5': 'upsell_risk_report',
  '10': 'copy_prep',
  '11': 'structure_prep',
  '12': 'design_prep',
};

// TODO: when intake adds agent_runs[] to GET /api/internal/leads/:leadId
// (per JAV-119 §6 of admin-pipeline-detail-redesign.md), swap this body for
// a direct read of run.status. The signature does not change.
export function deriveAgentStatus(lead: LeadDetail, agentId: AgentId): RunnerStatus {
  const column = AGENT_TO_COLUMN[agentId];
  if (column && lead[column] != null) return 'done';
  if (lead.status === 'created') return 'queued';
  if (lead.status === 'form_submitted') return 'running';
  if (
    lead.status === 'failed' ||
    lead.status === 'routed_to_custom' ||
    lead.status === 'abandoned'
  )
    return 'skipped';
  // agents_complete / scope_confirmed / provisioning / live with null column = defensive failed
  return 'failed';
}
