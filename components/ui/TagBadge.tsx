'use client';

import { clsx } from 'clsx';

interface TagBadgeProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
  onRemove?: () => void;
  isActive?: boolean;
  showRemove?: boolean;
  className?: string;
}

export function TagBadge({
  name,
  color,
  size = 'sm',
  onClick,
  onRemove,
  isActive = false,
  showRemove = false,
  className = '',
}: TagBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium border text-text',
        sizeClasses[size],
        isActive
          ? 'border-accent'
          : 'bg-white dark:bg-gray-700 border-border-strong dark:border-gray-600',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors',
        className
      )}
      style={isActive ? { backgroundColor: `${color}26` } : undefined}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <span
        aria-hidden="true"
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-surface-hover p-0.5 transition-colors"
          aria-label={`Remove ${name} tag`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}
