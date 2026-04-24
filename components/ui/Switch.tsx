import React from 'react';
import { clsx } from 'clsx';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  id?: string;
  className?: string;
}

export default function Switch({
  checked,
  onChange,
  disabled,
  label,
  description,
  id,
  className,
}: SwitchProps) {
  const control = (
    <button
      type="button"
      role="switch"
      id={id}
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:shadow-focus-ring',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        checked ? 'bg-accent' : 'bg-border-strong',
        !label && className
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow-sm',
          'transition-transform duration-200 ease-[cubic-bezier(.3,.6,.3,1)]',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        )}
      />
    </button>
  );

  if (!label && !description) return control;

  return (
    <label
      htmlFor={id}
      className={clsx(
        'flex items-start gap-3 cursor-pointer',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      {control}
      <div className="flex-1 min-w-0">
        {label && (
          <div className="text-sm font-medium text-text leading-tight">{label}</div>
        )}
        {description && (
          <div className="mt-0.5 text-xs text-text-muted leading-relaxed">
            {description}
          </div>
        )}
      </div>
    </label>
  );
}
