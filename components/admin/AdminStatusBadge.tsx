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

const DOT_COLOR: Record<AdminStatusBadgeVariant, string> = {
  success: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-red-500',
  info: 'bg-blue-electric',
  accent: 'bg-accent',
  neutral: 'bg-gray-slate',
};

export function AdminStatusBadge({
  variant = 'neutral',
  label,
  dot = true,
  animate = false,
  className,
}: AdminStatusBadgeProps) {
  return (
    <span
      role="status"
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap border',
        'bg-white dark:bg-gray-700 border-border-strong dark:border-gray-600 text-text',
        className
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={clsx(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            DOT_COLOR[variant],
            animate && 'animate-pulse'
          )}
        />
      )}
      {label}
    </span>
  );
}
