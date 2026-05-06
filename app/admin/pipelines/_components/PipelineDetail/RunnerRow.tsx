'use client';

import { useState } from 'react';
import {
  Check,
  Loader2,
  Clock,
  XCircle,
  MinusCircle,
  Circle,
  ChevronDown,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import type { LeadDetail } from '@/lib/api-client';
import type { Runner } from '@/app/admin/pipelines/_lib/runner-registry';
import type { RunnerStatus } from '@/app/admin/pipelines/_lib/agent-status';
import { deriveAgentStatus } from '@/app/admin/pipelines/_lib/agent-status';
import { ScribeCard } from '../AgentCards/ScribeCard';
import { ScoutCard } from '../AgentCards/ScoutCard';
import { MatchmakerCard } from '../AgentCards/MatchmakerCard';
import { StrategistCard } from '../AgentCards/StrategistCard';
import { ComposerCard } from '../AgentCards/ComposerCard';
import { StylistCard } from '../AgentCards/StylistCard';
import { GenericAgentCard } from '../AgentCards/GenericAgentCard';

interface RunnerRowProps {
  runner: Runner;
  lead: LeadDetail;
}

const STATUS_ICON: Record<RunnerStatus, React.ReactNode> = {
  done: <Check className="w-3.5 h-3.5 text-success" />,
  running: <Loader2 className="w-3.5 h-3.5 text-info animate-spin" />,
  queued: <Clock className="w-3.5 h-3.5 text-text-muted" />,
  failed: <XCircle className="w-3.5 h-3.5 text-danger" />,
  skipped: <MinusCircle className="w-3.5 h-3.5 text-text-faint" />,
  not_built: <Circle className="w-3.5 h-3.5 text-text-faint" />,
};

const STATUS_LABEL: Record<RunnerStatus, string> = {
  done: 'done',
  running: 'running',
  queued: 'queued',
  failed: 'failed',
  skipped: 'skipped',
  not_built: '— not yet built',
};

function ArtifactBody({
  outputColumn,
  lead,
}: {
  outputColumn: NonNullable<Extract<Runner, { kind: 'agent' }>['outputColumn']>;
  lead: LeadDetail;
}) {
  switch (outputColumn) {
    case 'lead_record':
      return lead.lead_record ? <ScribeCard data={lead.lead_record} /> : null;
    case 'research_report':
      return lead.research_report ? <ScoutCard data={lead.research_report} /> : null;
    case 'similarity_report':
      return lead.similarity_report ? (
        <MatchmakerCard data={lead.similarity_report} />
      ) : null;
    case 'upsell_risk_report':
      return lead.upsell_risk_report ? (
        <StrategistCard data={lead.upsell_risk_report} />
      ) : null;
    case 'copy_prep':
      return lead.copy_prep ? <ComposerCard data={lead.copy_prep} /> : null;
    case 'design_prep':
      return lead.design_prep ? <StylistCard data={lead.design_prep} /> : null;
    case 'structure_prep':
      return lead.structure_prep != null ? (
        <GenericAgentCard
          agentName="Structurer"
          field="structure_prep"
          data={lead.structure_prep}
        />
      ) : null;
    default:
      return null;
  }
}

export function RunnerRow({ runner, lead }: RunnerRowProps) {
  const [open, setOpen] = useState(false);

  const status: RunnerStatus =
    runner.kind === 'agent' ? deriveAgentStatus(lead, runner.agentId) : 'not_built';

  const canExpand =
    runner.kind === 'agent' && status === 'done' && runner.outputColumn != null;

  const isNotBuilt = status === 'not_built';
  const isMuted = isNotBuilt || status === 'skipped';

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 py-2.5 px-1">
        {/* Status icon */}
        <span className="flex-shrink-0 w-4 flex justify-center">
          {STATUS_ICON[status]}
        </span>

        {/* Display name + identifier */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isNotBuilt ? (
            <Tooltip content="Worker not yet implemented (JAV-121)">
              <span className="text-sm italic text-text-faint cursor-default">
                {runner.displayName}
              </span>
            </Tooltip>
          ) : (
            <span className={`text-sm font-medium ${isMuted ? 'text-text-muted' : 'text-text'}`}>
              {runner.displayName}
            </span>
          )}
          <span className="text-xs text-text-faint hidden sm:inline">
            {runner.kind === 'agent'
              ? `Agent ${runner.agentId}${runner.outputColumn ? ` · ${runner.outputColumn}` : ''}`
              : `Worker · ${runner.reference}`}
          </span>
        </div>

        {/* Status text + optional disclosure */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={`text-xs ${
              status === 'done'
                ? 'text-success'
                : status === 'failed'
                  ? 'text-danger'
                  : status === 'running'
                    ? 'text-info'
                    : 'text-text-muted'
            }`}
          >
            {STATUS_LABEL[status]}
          </span>
          {canExpand && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex items-center justify-center w-6 h-6 rounded text-text-muted hover:text-text hover:bg-surface-alt transition-colors"
              aria-label={open ? 'Collapse artifact' : 'Expand artifact'}
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>
      </div>

      {/* Expanded artifact body */}
      {canExpand && open && runner.kind === 'agent' && runner.outputColumn && (
        <div className="pb-3 px-1">
          <ArtifactBody outputColumn={runner.outputColumn} lead={lead} />
        </div>
      )}
    </div>
  );
}
