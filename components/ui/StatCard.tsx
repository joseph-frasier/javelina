import React from 'react';
import { clsx } from 'clsx';
import { Card } from './Card';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'orange' | 'red' | 'gray';
}

const iconTone: Record<NonNullable<StatCardProps['color']>, string> = {
  blue: 'bg-info-soft text-info',
  green: 'bg-success-soft text-success',
  orange: 'bg-accent-soft text-accent',
  red: 'bg-danger-soft text-danger',
  gray: 'bg-surface-alt text-text-muted',
};

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'orange',
}: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold text-text tracking-tight tabular-nums">
            {value}
          </p>
          {trend && (
            <p
              className={clsx(
                'mt-2 text-sm font-medium flex items-center gap-1',
                trend.isPositive ? 'text-success' : 'text-danger'
              )}
            >
              <span aria-hidden>{trend.isPositive ? '↑' : '↓'}</span>
              {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'p-2.5 rounded-lg shrink-0',
              iconTone[color]
            )}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
