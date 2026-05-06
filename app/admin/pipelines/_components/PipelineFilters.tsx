'use client';

import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Tooltip } from '@/components/ui/Tooltip';
import type { LeadStatus, LeadPackage } from '@/lib/api-client';

export interface PipelineFiltersValue {
  status: LeadStatus | 'all';
  pkg: LeadPackage | 'all';
  order: 'oldest' | 'newest';
}

interface Props {
  value: PipelineFiltersValue;
  onChange: (next: PipelineFiltersValue) => void;
  /**
   * Total leads in the `agents_complete` bucket — operator scope review queue.
   * Surfaced as an amber chip when > 0 and not the active filter.
   */
  awaitingReviewCount?: number | null;
  /**
   * Total leads in the `failed` bucket — engineering investigation queue.
   * Surfaced as a red chip when > 0 and not the active filter.
   */
  failedCount?: number | null;
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

export function PipelineFilters({
  value,
  onChange,
  awaitingReviewCount,
  failedCount,
}: Props) {
  const showAwaitingChip =
    typeof awaitingReviewCount === 'number' &&
    awaitingReviewCount > 0 &&
    value.status !== 'agents_complete';
  const showFailedChip =
    typeof failedCount === 'number' &&
    failedCount > 0 &&
    value.status !== 'failed';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 p-4 bg-surface rounded-lg border border-border">
      <label className="flex items-center gap-2 text-sm">
        <span className="text-text-muted">Status</span>
        <select
          value={value.status}
          onChange={(e) => onChange({ ...value, status: e.target.value as LeadStatus | 'all' })}
          className="px-2 py-1 rounded border border-border bg-surface text-text"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
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

      {showAwaitingChip && (
        <Tooltip
          content={`${awaitingReviewCount} lead${awaitingReviewCount === 1 ? '' : 's'} awaiting scope review — click to view`}
        >
          <button
            type="button"
            onClick={() => onChange({ ...value, status: 'agents_complete' })}
            className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Awaiting review: {awaitingReviewCount}</span>
          </button>
        </Tooltip>
      )}

      {showFailedChip && (
        <Tooltip
          content={`${failedCount} lead${failedCount === 1 ? '' : 's'} in the failed bin — click to view`}
        >
          <button
            type="button"
            onClick={() => onChange({ ...value, status: 'failed' })}
            className="inline-flex items-center gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger transition-colors hover:bg-danger/15 focus-visible:outline-none focus-visible:shadow-focus-ring"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Failed: {failedCount}</span>
          </button>
        </Tooltip>
      )}

      <div className="ml-auto flex items-center gap-1 text-sm">
        <span className="text-text-muted mr-1">Sort</span>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'oldest' })}
          className={`px-2 py-1 rounded ${value.order === 'oldest' ? 'bg-accent-soft text-text' : 'text-text-muted'}`}
        >
          Oldest first
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, order: 'newest' })}
          className={`px-2 py-1 rounded ${value.order === 'newest' ? 'bg-accent-soft text-text' : 'text-text-muted'}`}
        >
          Newest first
        </button>
      </div>
    </div>
  );
}
