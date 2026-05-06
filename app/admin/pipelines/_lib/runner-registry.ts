import type { AgentId } from './agent-status';

export type ServiceKey = 'foundation' | 'website' | 'dns' | 'email' | 'domain';

export type Runner =
  | {
      kind: 'agent';
      agentId: AgentId;
      displayName: string;
      // Output column on LeadDetail. Used to render the artifact body when expanded.
      outputColumn:
        | 'lead_record'
        | 'research_report'
        | 'similarity_report'
        | 'upsell_risk_report'
        | 'copy_prep'
        | 'structure_prep'
        | 'design_prep'
        | null;
      // Optional package gate — if present and lead.package doesn't match, runner is hidden.
      packageGate?: 'business_starter' | 'business_pro';
    }
  | {
      kind: 'worker';
      workerId: string; // unique key for storage / list keys
      displayName: string;
      // Citation back to the JAV-121 sub-issue, e.g. "JAV-121 §3.5"
      reference: string;
      packageGate?: 'business_starter' | 'business_pro';
    };

export const RUNNERS: Record<ServiceKey, Runner[]> = {
  foundation: [
    { kind: 'agent', agentId: '1', displayName: 'Scribe', outputColumn: 'lead_record' },
    { kind: 'agent', agentId: '2', displayName: 'Scout', outputColumn: 'research_report' },
    { kind: 'agent', agentId: '3', displayName: 'Matchmaker', outputColumn: 'similarity_report' },
    { kind: 'agent', agentId: '5', displayName: 'Strategist', outputColumn: 'upsell_risk_report' },
  ],
  website: [
    { kind: 'agent', agentId: '10', displayName: 'Composer', outputColumn: 'copy_prep' },
    { kind: 'agent', agentId: '11', displayName: 'Structurer', outputColumn: 'structure_prep' },
    { kind: 'agent', agentId: '12', displayName: 'Stylist', outputColumn: 'design_prep' },
    {
      kind: 'worker',
      workerId: 'site-builder',
      displayName: 'Site Builder',
      reference: 'JAV-121',
    },
    {
      kind: 'worker',
      workerId: 'certificate-issuer',
      displayName: 'Certificate Issuer',
      reference: 'JAV-121 §3.5',
    },
  ],
  dns: [
    {
      kind: 'worker',
      workerId: 'zone-configurator',
      displayName: 'Zone Configurator',
      reference: 'JAV-121 §3.3',
    },
    {
      kind: 'worker',
      workerId: 'propagation-verifier',
      displayName: 'Propagation Verifier',
      reference: 'JAV-121 §3.4',
    },
  ],
  email: [
    {
      kind: 'worker',
      workerId: 'oma-provisioner',
      displayName: 'OMA Provisioner',
      reference: 'JAV-121 §3.6',
      packageGate: 'business_starter',
    },
    {
      kind: 'worker',
      workerId: 'pax8-escalator',
      displayName: 'Pax8 Escalator',
      reference: 'JAV-121 §3.7',
      packageGate: 'business_pro',
    },
    {
      kind: 'worker',
      workerId: 'domain-verification',
      displayName: 'Domain Verification',
      reference: 'JAV-121 §3.8',
    },
  ],
  domain: [
    {
      kind: 'worker',
      workerId: 'domain-provisioner',
      displayName: 'Domain Provisioner',
      reference: 'JAV-121 §3.1',
    },
    {
      kind: 'worker',
      workerId: 'transfer-coordinator',
      displayName: 'Transfer Coordinator',
      reference: 'JAV-121 §3.2',
    },
  ],
};

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  foundation: 'Foundation',
  website: 'Website',
  dns: 'DNS',
  email: 'Email',
  domain: 'Domain',
};
