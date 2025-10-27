'use client';

import { formatLimit, isUnlimited } from '@/types/billing';

interface UsageMeterProps {
  current: number;
  limit: number | null;
  label: string;
  resourceType: 'environment' | 'zone' | 'member' | 'record';
  onUpgrade?: () => void;
}

export function UsageMeter({
  current,
  limit,
  label,
  resourceType,
  onUpgrade,
}: UsageMeterProps) {
  // Calculate percentage
  const percentage = limit && limit > 0 && !isUnlimited(limit)
    ? Math.min((current / limit) * 100, 100)
    : 0;

  // Determine warning state
  const isAtLimit = limit && limit > 0 && !isUnlimited(limit) && current >= limit;
  const isNearLimit = limit && limit > 0 && !isUnlimited(limit) && percentage >= 80;
  const unlimited = isUnlimited(limit);

  // Color classes
  let progressColor = 'bg-green-500';
  let textColor = 'text-gray-slate';
  
  if (isAtLimit) {
    progressColor = 'bg-red-500';
    textColor = 'text-red-600';
  } else if (isNearLimit) {
    progressColor = 'bg-yellow-500';
    textColor = 'text-yellow-600';
  }

  return (
    <div className="space-y-2">
      {/* Label and Usage */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-orange-dark">{label}</span>
        <span className={`text-sm font-regular ${textColor}`}>
          {unlimited ? (
            <span className="text-green-600 font-medium">Unlimited</span>
          ) : limit !== null ? (
            <>
              {current} <span className="text-gray-slate/60">of</span> {formatLimit(limit)}
            </>
          ) : (
            <span className="text-gray-slate/60">No limit set</span>
          )}
        </span>
      </div>

      {/* Progress Bar (only show if not unlimited) */}
      {!unlimited && limit !== null && limit > 0 && (
        <div className="w-full bg-gray-light rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${progressColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Warning/Upgrade Messages */}
      {isAtLimit && onUpgrade && (
        <div className="flex items-start space-x-2 p-2 bg-red-50 border border-red-200 rounded-md">
          <svg
            className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div className="flex-1">
            <p className="text-xs font-medium text-red-800">
              {resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} limit reached
            </p>
            <button
              onClick={onUpgrade}
              className="mt-1 text-xs font-medium text-red-600 hover:text-red-700 underline"
            >
              Upgrade your plan
            </button>
          </div>
        </div>
      )}

      {isNearLimit && !isAtLimit && (
        <p className="text-xs text-yellow-600 font-regular">
          You're approaching your {resourceType} limit
        </p>
      )}
    </div>
  );
}

