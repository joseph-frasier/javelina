import React from 'react';
import { clsx } from 'clsx';

export type AdminStatCardTone =
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface AdminStatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: AdminStatCardTone;
  description?: string;
  delta?: {
    value: string;
    direction?: 'up' | 'down' | 'flat';
  };
  className?: string;
}

const TONE_STYLES: Record<
  AdminStatCardTone,
  { iconBg: string; iconText: string; valueText: string }
> = {
  accent: {
    iconBg: 'bg-accent-soft',
    iconText: 'text-accent',
    valueText: 'text-text',
  },
  success: {
    iconBg: 'bg-green-500/10 dark:bg-green-500/15',
    iconText: 'text-green-600 dark:text-green-400',
    valueText: 'text-text',
  },
  warning: {
    iconBg: 'bg-yellow-500/10 dark:bg-yellow-500/15',
    iconText: 'text-yellow-600 dark:text-yellow-400',
    valueText: 'text-text',
  },
  danger: {
    iconBg: 'bg-red-500/10 dark:bg-red-500/15',
    iconText: 'text-red-600 dark:text-red-400',
    valueText: 'text-text',
  },
  info: {
    iconBg: 'bg-blue-500/10 dark:bg-blue-500/15',
    iconText: 'text-blue-600 dark:text-blue-400',
    valueText: 'text-text',
  },
  neutral: {
    iconBg: 'bg-surface-alt',
    iconText: 'text-text-muted',
    valueText: 'text-text',
  },
};

const DELTA_STYLES = {
  up: 'text-green-600 dark:text-green-400',
  down: 'text-red-600 dark:text-red-400',
  flat: 'text-text-muted',
};

export function AdminStatCard({
  label,
  value,
  icon,
  tone = 'accent',
  description,
  delta,
  className,
}: AdminStatCardProps) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={clsx(
        'rounded-xl bg-surface border border-border shadow-card p-5',
        'transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            {label}
          </p>
          <p
            className={clsx(
              'mt-2 text-2xl sm:text-3xl font-bold tracking-tight',
              styles.valueText
            )}
          >
            {value}
          </p>
          {(description || delta) && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              {delta && (
                <span
                  className={clsx(
                    'inline-flex items-center gap-0.5 font-medium',
                    DELTA_STYLES[delta.direction ?? 'flat']
                  )}
                >
                  {delta.direction === 'up' && '↑'}
                  {delta.direction === 'down' && '↓'}
                  {delta.value}
                </span>
              )}
              {description && (
                <span className="text-text-muted">{description}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0',
              styles.iconBg,
              styles.iconText
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
