import React from 'react';
import { clsx } from 'clsx';
import { Breadcrumb, type BreadcrumbItem } from '@/components/ui/Breadcrumb';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function AdminPageHeader({
  title,
  subtitle,
  eyebrow,
  breadcrumb,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div className={clsx('mb-6 sm:mb-8', className)}>
      {breadcrumb && breadcrumb.length > 0 && (
        <div className="mb-3">
          <Breadcrumb items={breadcrumb} />
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-accent">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-text break-words">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm sm:text-base text-text-muted leading-relaxed max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
