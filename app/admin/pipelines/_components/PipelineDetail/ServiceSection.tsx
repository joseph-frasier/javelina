'use client';

import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import type { LeadDetail, LeadService } from '@/lib/api-client';
import type { ServiceKey } from '@/app/admin/pipelines/_lib/runner-registry';
import { RUNNERS } from '@/app/admin/pipelines/_lib/runner-registry';
import {
  getServiceState,
  getServiceProgressLabel,
  getServiceUpdatedAt,
} from '@/app/admin/pipelines/_lib/section-state';
import {
  shouldExpandFoundation,
  shouldExpandService,
} from '@/app/admin/pipelines/_lib/should-expand';
import { ServiceSectionHeader } from './ServiceSectionHeader';
import { RunnerRow } from './RunnerRow';

interface ServiceSectionProps {
  serviceKey: ServiceKey;
  lead: LeadDetail;
  services: LeadService[];
  leadId: string;
}

export function ServiceSection({ serviceKey, lead, services, leadId }: ServiceSectionProps) {
  const state = getServiceState(serviceKey, lead, services);
  const progressLabel = getServiceProgressLabel(serviceKey, lead, services);
  const updatedAt = getServiceUpdatedAt(serviceKey, lead, services);

  const defaultExpanded =
    serviceKey === 'foundation'
      ? shouldExpandFoundation(lead.status, state)
      : shouldExpandService(state, lead.status);

  // Filter runners by packageGate
  const runners = RUNNERS[serviceKey].filter((runner) => {
    if (!runner.packageGate) return true;
    return runner.packageGate === lead.package;
  });

  const header = (
    <ServiceSectionHeader
      serviceKey={serviceKey}
      state={state}
      progressLabel={progressLabel}
      updatedAt={updatedAt}
    />
  );

  return (
    <CollapsibleCard
      title={header}
      storageKey={`pipeline:${leadId}:section:${serviceKey}`}
      defaultExpanded={defaultExpanded}
    >
      <div className="divide-y divide-border">
        {runners.map((runner) => (
          <RunnerRow
            key={runner.kind === 'agent' ? `agent-${runner.agentId}` : `worker-${runner.workerId}`}
            runner={runner}
            lead={lead}
          />
        ))}
      </div>
    </CollapsibleCard>
  );
}
