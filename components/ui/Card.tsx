import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function Card({
  title,
  description,
  children,
  className,
  icon,
  action,
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl bg-white dark:bg-gray-slate p-6 shadow-md border border-gray-light hover:shadow-lg transition-shadow',
        className
      )}
    >
      {(title || icon || action) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            {title && (
              <h3 className="font-bold text-orange text-lg mb-1">{title}</h3>
            )}
            {description && (
              <p className="text-gray-slate dark:text-gray-100 font-light text-sm">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {icon && <div>{icon}</div>}
            {action && <div>{action}</div>}
          </div>
        </div>
      )}
      <div className="text-gray-slate dark:text-gray-100 font-light">{children}</div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
}: StatCardProps) {
  const changeColors = {
    positive: 'text-blue-teal',
    negative: 'text-red-500',
    neutral: 'text-gray-slate',
  };

  return (
    <Card className="hover:border-orange transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-regular text-gray-slate dark:text-gray-100 mb-1">{title}</p>
          <p className="text-3xl font-black text-orange-dark">{value}</p>
          {change && (
            <p
              className={clsx(
                'text-sm font-medium mt-2 dark:text-gray-100',
                changeColors[changeType]
              )}
            >
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-orange-light rounded-lg text-orange">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}
