import React from 'react';
import { clsx } from 'clsx';

export type AdminStatusBadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent'
  | 'neutral';

interface AdminStatusBadgeProps {
  variant?: AdminStatusBadgeVariant;
  label: string;
  dot?: boolean;
  animate?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<
  AdminStatusBadgeVariant,
  { pill: string; dot: string }
> = {
  success: {
    pill: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    dot: 'bg-green-600 dark:bg-green-400',
  },
  warning: {
    pill: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    dot: 'bg-yellow-600 dark:bg-yellow-400',
  },
  danger: {
    pill: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    dot: 'bg-red-600 dark:bg-red-400',
  },
  info: {
    pill: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    dot: 'bg-blue-600 dark:bg-blue-400',
  },
  accent: {
    pill: 'bg-accent-soft text-accent dark:text-accent',
    dot: 'bg-accent',
  },
  neutral: {
    pill: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    dot: 'bg-gray-500 dark:bg-gray-300',
  },
};

export function AdminStatusBadge({
  variant = 'neutral',
  label,
  dot = true,
  animate = false,
  className,
}: AdminStatusBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <span
      role="status"
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap',
        styles.pill,
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            styles.dot,
            animate && 'animate-pulse'
          )}
        />
      )}
      {label}
    </span>
  );
}
