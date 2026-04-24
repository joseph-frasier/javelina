import React from 'react';
import { clsx } from 'clsx';

export interface DomainSearchResultProps {
  domain: string;
  available: boolean;
  price?: string;
  selected?: boolean;
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
}

export default function DomainSearchResult({
  domain,
  available,
  price,
  selected,
  onSelect,
  disabled,
  className,
}: DomainSearchResultProps) {
  const isButton = !!onSelect;
  const Element = isButton ? 'button' : 'div';

  return (
    <Element
      {...(isButton
        ? {
            type: 'button' as const,
            onClick: () => !disabled && available && onSelect?.(),
            disabled: disabled || !available,
            'aria-pressed': selected,
          }
        : {})}
      className={clsx(
        'flex items-center justify-between gap-3 w-full px-4 py-3 rounded-lg',
        'border transition-[border-color,background-color,box-shadow] duration-150',
        'text-left',
        selected
          ? 'bg-accent-soft border-accent shadow-focus-ring'
          : 'bg-surface border-border',
        isButton && available && !disabled && !selected &&
          'hover:border-border-strong hover:bg-surface-hover cursor-pointer',
        (!available || disabled) && 'opacity-70 cursor-not-allowed',
        className
      )}
    >
      <span className="flex-1 min-w-0 truncate font-mono text-sm text-text">
        {domain}
      </span>
      <span className="flex items-center gap-3 shrink-0">
        {price && available && (
          <span className="text-sm font-semibold text-text tabular-nums">
            {price}
          </span>
        )}
        <span
          className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border',
            available
              ? 'bg-success-soft border-success/30 text-success'
              : 'bg-danger-soft border-danger/30 text-danger'
          )}
        >
          <span
            aria-hidden
            className={clsx(
              'h-1.5 w-1.5 rounded-full',
              available ? 'bg-success' : 'bg-danger'
            )}
          />
          {available ? 'Available' : 'Taken'}
        </span>
      </span>
    </Element>
  );
}
