'use client';

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

  // Calculate if we need dark or light text based on background color
  const getContrastColor = (hexColor: string): string => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
  };

  const textColor = getContrastColor(color);

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
        ${isActive ? 'ring-2 ring-offset-1 ring-white' : ''}
        ${className}
      `}
      style={{
        backgroundColor: color,
        color: textColor,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      {name}
      {showRemove && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-black/20 p-0.5 transition-colors"
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

