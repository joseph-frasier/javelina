'use client';

import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { AdminStatusBadge } from '@/components/admin/AdminStatusBadge';
import type { LeadDetail, LeadStatus } from '@/lib/api-client';
import { formatAge } from '../_lib/age';
import { blockedOnLabel } from '../_lib/blocked-on';
import { STATUS_VARIANT } from '../_lib/status-variant';
import { formatDateWithRelative } from '@/lib/utils/time';

const STATUS_LABEL: Record<LeadStatus, string> = {
  created: 'Created',
  form_submitted: 'Form submitted',
  agents_complete: 'Awaiting review',
  scope_confirmed: 'Scope confirmed',
  provisioning: 'Provisioning',
  live: 'Live',
  routed_to_custom: 'Routed to custom',
  abandoned: 'Abandoned',
  failed: 'Halted',
};

function fmtCost(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || !Number.isFinite(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

interface Row {
  label: string;
  iso: string | null;
}

function TimestampGrid({ rows }: { rows: Row[] }) {
  return (
    <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 mt-4">
      {rows.map((row) => {
        if (!row.iso) {
          return (
            <div key={row.label}>
              <dt className="text-xs text-text-muted">{row.label}</dt>
              <dd className="text-sm text-text-faint">—</dd>
            </div>
          );
        }
        const f = formatDateWithRelative(row.iso);
        return (
          <div key={row.label}>
            <dt className="text-xs text-text-muted">{row.label}</dt>
            <Tooltip content={f.absolute}>
              <dd className="text-sm cursor-help">{f.relative}</dd>
            </Tooltip>
          </div>
        );
      })}
    </dl>
  );
}

export function LeadStateHeader({ lead }: { lead: LeadDetail }) {
  const blockedOn = blockedOnLabel[lead.status];
  const closingTimestamp: Row = lead.scope_confirmed_at
    ? { label: 'Scope confirmed', iso: lead.scope_confirmed_at }
    : { label: 'Scope rejected', iso: lead.scope_rejected_at };

  return (
    <Card title="Lead state">
      <div className="flex flex-wrap items-center gap-3">
        <AdminStatusBadge
          variant={STATUS_VARIANT[lead.status] ?? 'neutral'}
          label={STATUS_LABEL[lead.status] ?? lead.status ?? 'Unknown'}
        />
        <Tooltip content={lead.created_at}>
          <span className="text-sm text-text-muted cursor-help">
            Age: {formatAge(lead.created_at)}
          </span>
        </Tooltip>
        {blockedOn && (
          <span className="text-sm text-text-muted">· {blockedOn}</span>
        )}
        <span className="ml-auto text-sm text-text-muted">
          Total cost:{' '}
          <span className="text-text">{fmtCost(lead.total_cost_cents)}</span>
        </span>
      </div>

      <TimestampGrid
        rows={[
          { label: 'Created', iso: lead.created_at },
          { label: 'Form submitted', iso: lead.form_submitted_at },
          { label: 'Agents complete', iso: lead.agents_completed_at },
          closingTimestamp,
        ]}
      />

      {lead.scope_rejection_reason && (
        <div className="mt-4 p-3 rounded border border-border bg-surface-alt text-sm">
          <span className="font-medium text-text">Rejected reason:</span>{' '}
          <span className="text-text-muted">{lead.scope_rejection_reason}</span>
        </div>
      )}
    </Card>
  );
}
