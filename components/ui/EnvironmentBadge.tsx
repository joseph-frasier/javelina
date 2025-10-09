import { EnvironmentType } from '@/lib/auth-store';

interface EnvironmentBadgeProps {
  type: EnvironmentType;
  className?: string;
}

export function EnvironmentBadge({ type, className = '' }: EnvironmentBadgeProps) {
  const getBadgeStyles = () => {
    switch (type) {
      case 'production':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'development':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDisplayText = () => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyles()} ${className}`}
    >
      {getDisplayText()}
    </span>
  );
}

