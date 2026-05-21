'use client';

import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

type ChipVariant = 'warning' | 'danger' | 'info';

const VARIANT_CLASSES: Record<ChipVariant, string> = {
  warning:
    'border-warning/40 bg-warning/10 text-warning hover:bg-warning/15',
  danger:
    'border-danger/40 bg-danger/10 text-danger hover:bg-danger/15',
  info:
    'border-info/40 bg-info/10 text-info hover:bg-info/15',
};

interface Props {
  /** Tone — drives the chip's color. */
  variant: ChipVariant;
  /** Lucide icon component (not a JSX element — we render it). */
  icon: LucideIcon;
  /** Visible label, e.g. "Awaiting review". */
  label: string;
  /** Number to display after the label. */
  count: number;
  /** Click handler — typically applies the corresponding filter. */
  onClick: () => void;
  /** Tooltip when count === 1. */
  singularTooltip: string;
  /** Tooltip when count !== 1. */
  pluralTooltip: string;
}

/**
 * Action-needed chip rendered in the queue page filter row. Surfaces a
 * filtered bucket (e.g. "Awaiting review", "Halted") with a one-click jump
 * to that filter. Caller controls visibility — render conditionally when
 * count > 0 and the chip's bucket isn't the active filter.
 */
export function CountChip({
  variant,
  icon: Icon,
  label,
  count,
  onClick,
  singularTooltip,
  pluralTooltip,
}: Props) {
  const tooltip = count === 1 ? singularTooltip : pluralTooltip;

  return (
    <Tooltip content={tooltip}>
      <button
        type="button"
        onClick={onClick}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
          'focus-visible:outline-none focus-visible:shadow-focus-ring',
          VARIANT_CLASSES[variant]
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>
          {label}: {count}
        </span>
      </button>
    </Tooltip>
  );
}
