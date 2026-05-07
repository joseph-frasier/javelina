'use client';

import { useState } from 'react';
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
import {
  ServiceOverrideMenu,
  type OverrideTargetState,
} from './ServiceOverrideMenu';
import { ServiceOverrideModal } from './ServiceOverrideModal';

interface ServiceSectionProps {
  serviceKey: ServiceKey;
  lead: LeadDetail;
  services: LeadService[];
  leadId: string;
  onRefresh?: () => void | Promise<void>;
}

export function ServiceSection({
  serviceKey,
  lead,
  services,
  leadId,
  onRefresh,
}: ServiceSectionProps) {
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

  const [overrideState, setOverrideState] = useState<OverrideTargetState | null>(null);

  // Foundation is internal — no override surface (per JAV-128 spec).
  const isCustomerService = serviceKey !== 'foundation';

  const header = (
    <ServiceSectionHeader
      serviceKey={serviceKey}
      state={state}
      progressLabel={progressLabel}
      updatedAt={updatedAt}
    />
  );

  return (
    <>
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

        {isCustomerService && (
          <div className="mt-2 pt-2 border-t border-border flex justify-end">
            <ServiceOverrideMenu
              triggerVariant="inline"
              placement="top"
              onSelect={(s) => setOverrideState(s)}
            />
          </div>
        )}
      </CollapsibleCard>

      {isCustomerService && overrideState && (
        <ServiceOverrideModal
          isOpen
          onClose={() => setOverrideState(null)}
          leadId={leadId}
          service={serviceKey as 'website' | 'dns' | 'email' | 'domain'}
          state={overrideState}
          onApplied={async () => {
            if (onRefresh) await onRefresh();
          }}
        />
      )}
    </>
  );
}
