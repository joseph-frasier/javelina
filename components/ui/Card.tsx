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
        'rounded-xl bg-surface border border-border shadow-card p-6',
        'transition-shadow duration-200',
        className
      )}
    >
      {(title || icon || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="font-semibold text-text text-base leading-tight mb-1">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-text-muted font-normal text-sm leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {(icon || action) && (
            <div className="flex items-center gap-2 shrink-0">
              {icon && <div className="text-text-muted">{icon}</div>}
              {action && <div>{action}</div>}
            </div>
          )}
        </div>
      )}
      <div className="text-text">{children}</div>
    </div>
  );
}
