import React from 'react';
import { clsx } from 'clsx';

export interface RadioCardProps {
  checked: boolean;
  onChange: () => void;
  label: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  name?: string;
  value?: string;
  disabled?: boolean;
  className?: string;
}

export default function RadioCard({
  checked,
  onChange,
  label,
  description,
  icon,
  name,
  value,
  disabled,
  className,
}: RadioCardProps) {
  return (
    <label
      className={clsx(
        'relative flex items-start gap-3.5 p-4 rounded-lg cursor-pointer',
        'border transition-[border-color,background-color,box-shadow] duration-150',
        checked
          ? 'bg-accent-soft border-accent shadow-focus-ring'
          : 'bg-surface border-border hover:border-border-strong',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="sr-only"
      />
      <span
        aria-hidden
        className={clsx(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
          'border-[1.5px] transition-colors duration-150',
          checked
            ? 'bg-accent border-accent'
            : 'bg-surface border-border-strong'
        )}
      >
        {checked && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          {icon && (
            <span
              className={clsx(
                'inline-flex',
                checked ? 'text-accent' : 'text-text-muted'
              )}
              aria-hidden
            >
              {icon}
            </span>
          )}
          <span className="text-sm font-semibold text-text leading-tight">
            {label}
          </span>
        </span>
        {description && (
          <span className="mt-1 block text-[13px] text-text-muted leading-relaxed">
            {description}
          </span>
        )}
      </span>
    </label>
  );
}
