import React from 'react';
import { clsx } from 'clsx';

export interface InfoCalloutProps {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const toneClasses: Record<NonNullable<InfoCalloutProps['tone']>, string> = {
  info: 'bg-accent-soft border-accent/25 text-text',
  success: 'bg-success-soft border-success/30 text-text',
  warning: 'bg-warning-soft border-warning/30 text-text',
  danger: 'bg-danger-soft border-danger/30 text-text',
};

const iconTone: Record<NonNullable<InfoCalloutProps['tone']>, string> = {
  info: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

const DefaultIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="8" cy="8" r="6" />
    <line x1="8" y1="7" x2="8" y2="11" />
    <circle cx="8" cy="5" r="0.5" fill="currentColor" />
  </svg>
);

export default function InfoCallout({
  tone = 'info',
  icon,
  title,
  children,
  className,
}: InfoCalloutProps) {
  return (
    <div
      role="note"
      className={clsx(
        'flex items-start gap-3 p-3.5 rounded-lg border',
        toneClasses[tone],
        className
      )}
    >
      <span className={clsx('mt-0.5 shrink-0', iconTone[tone])}>
        {icon ?? <DefaultIcon />}
      </span>
      <div className="flex-1 min-w-0 text-[13px] leading-relaxed">
        {title && (
          <div className="font-semibold text-text leading-tight mb-0.5">
            {title}
          </div>
        )}
        <div className="text-text-muted [&_code]:font-mono [&_code]:text-[12px] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-surface [&_code]:border [&_code]:border-border [&_code]:text-text">
          {children}
        </div>
      </div>
    </div>
  );
}
