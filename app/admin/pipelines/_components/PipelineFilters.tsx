'use client';

import Switch from '@/components/ui/Switch';
import { Tooltip } from '@/components/ui/Tooltip';
import type { LeadStatus, LeadPackage } from '@/lib/api-client';

export interface PipelineFiltersValue {
  status: LeadStatus | 'all';
  pkg: LeadPackage | 'all';
  needsHuman: boolean;
  stuck24h: boolean;
  order: 'oldest' | 'newest';
}

interface Props {
  value: PipelineFiltersValue;
  onChange: (next: PipelineFiltersValue) => void;
}

const STATUS_OPTIONS: Array<{ value: LeadStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'agents_complete', label: 'Awaiting review' },
  { value: 'provisioning', label: 'Provisioning' },
  { value: 'failed', label: 'Failed' },
  { value: 'routed_to_custom', label: 'Routed to custom' },
  { value: 'live', label: 'Live' },
  { value: 'abandoned', label: 'Abandoned' },
];

const PACKAGE_OPTIONS: Array<{ value: LeadPackage | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'business_starter', label: 'Starter' },
  { value: 'business_pro', label: 'Pro' },
];

export function PipelineFilters({ value, onChange }: Props) {
  const statusDisabled = value.needsHuman;

  const statusSelect = (
    <select
      disabled={statusDisabled}
      value={value.status}
      onChange={(e) => onChange({ ...value, status: e.target.value as LeadStatus | 'all' })}
      className="px-2 py-1 rounded border border-border bg-surface text-text disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-surface rounded-lg border border-border">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Status</span>
        {statusDisabled ? (
          <Tooltip content='"Needs human action" forces status = Awaiting review'>
            {statusSelect}
          </Tooltip>
        ) : (
          statusSelect
        )}
      </label>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Package</span>
        <select
          value={value.pkg}
          onChange={(e) => onChange({ ...value, pkg: e.target.value as LeadPackage | 'all' })}
          className="px-2 py-1 rounded border border-border bg-surface text-text"
        >
          {PACKAGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={value.needsHuman}
          onChange={(checked) => onChange({ ...value, needsHuman: checked })}
        />
        <span>Needs human action</span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={value.stuck24h}
          onChange={(checked) => onChange({ ...value, stuck24h: checked })}
        />
        <span>Stuck &gt; 24h</span>
      </label>

      <div className="ml-auto flex items-center gap-1 text-sm">
        <span className="text-text-muted mr-1">Sort</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'oldest' })}
          className={`px-2 py-1 rounded ${value.order === 'oldest' ? 'bg-accent-light text-text' : 'text-text-muted'}`}
        >
          Oldest first
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'newest' })}
          className={`px-2 py-1 rounded ${value.order === 'newest' ? 'bg-accent-light text-text' : 'text-text-muted'}`}
        >
          Newest first
        </button>
      </div>
    </div>
  );
}
