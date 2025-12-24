'use client';

import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';

interface UpgradeLimitBannerProps {
  /** Resource type being limited */
  resourceType: 'zones' | 'records' | 'members';
  /** Current count of the resource */
  currentCount: number;
  /** Maximum allowed by the plan (-1 for unlimited) */
  maxCount: number;
  /** Current plan tier name for display */
  planTier?: string;
  /** Whether the user is at the limit (blocks creation) */
  isAtLimit?: boolean;
  /** Custom message to display */
  customMessage?: string;
  /** Whether to show inline (smaller) or as a full banner */
  variant?: 'inline' | 'banner';
  /** Organization ID for upgrade link */
  organizationId?: string;
}

const RESOURCE_LABELS: Record<string, { singular: string; plural: string }> = {
  zones: { singular: 'zone', plural: 'zones' },
  records: { singular: 'record', plural: 'records' },
  members: { singular: 'team member', plural: 'team members' },
};

/**
 * Reusable component for showing plan limit warnings and upgrade prompts
 * 
 * @example
 * ```tsx
 * // Warning when approaching limit
 * <UpgradeLimitBanner
 *   resourceType="zones"
 *   currentCount={4}
 *   maxCount={5}
 *   planTier="Pro"
 * />
 * 
 * // Block when at limit
 * <UpgradeLimitBanner
 *   resourceType="zones"
 *   currentCount={5}
 *   maxCount={5}
 *   isAtLimit={true}
 *   planTier="Pro"
 * />
 * ```
 */
export function UpgradeLimitBanner({
  resourceType,
  currentCount,
  maxCount,
  planTier = 'your current plan',
  isAtLimit = false,
  customMessage,
  variant = 'banner',
  organizationId,
}: UpgradeLimitBannerProps) {
  const router = useRouter();
  const labels = RESOURCE_LABELS[resourceType] || { singular: resourceType, plural: resourceType };
  
  // Feature flags for starter-only launch
  const { hideUpgradeLimitCta } = useFeatureFlags();
  
  // Determine if we should hide the upgrade CTA for this resource type
  // Only hide for zones and records when the flag is true; keep CTA for members
  const shouldHideUpgradeCta = hideUpgradeLimitCta && (resourceType === 'zones' || resourceType === 'records');
  
  // Navigate to billing page with modal open, or pricing page if no org
  const handleUpgradeClick = () => {
    if (organizationId) {
      router.push(`/settings/billing/${organizationId}?openModal=true`);
    } else {
      router.push('/pricing');
    }
  };
  
  // Don't show for unlimited plans
  if (maxCount === -1) {
    return null;
  }
  
  const remaining = Math.max(0, maxCount - currentCount);
  const percentUsed = (currentCount / maxCount) * 100;
  const isNearLimit = percentUsed >= 80 && !isAtLimit;
  
  // Don't show if plenty of room left
  if (!isAtLimit && percentUsed < 80) {
    return null;
  }

  const message = customMessage || (isAtLimit
    ? `You've reached the ${labels.singular} limit for ${planTier}. Upgrade to add more ${labels.plural}.`
    : `You're approaching your ${labels.singular} limit. ${remaining} ${remaining === 1 ? labels.singular : labels.plural} remaining on ${planTier}.`
  );

  const bgColor = isAtLimit 
    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' 
    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
  
  const textColor = isAtLimit
    ? 'text-red-800 dark:text-red-200'
    : 'text-amber-800 dark:text-amber-200';

  const iconColor = isAtLimit
    ? 'text-red-500'
    : 'text-amber-500';

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${bgColor} ${textColor}`}>
        <svg 
          className={`w-4 h-4 flex-shrink-0 ${iconColor}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isAtLimit ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          )}
        </svg>
        <span className="flex-1">{message}</span>
        {!shouldHideUpgradeCta && (
          <button 
            onClick={handleUpgradeClick}
            className="font-medium underline hover:no-underline"
          >
            Upgrade
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <svg 
          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          {isAtLimit ? (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          ) : (
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          )}
        </svg>
        
        <div className="flex-1">
          <h4 className={`font-medium ${textColor}`}>
            {isAtLimit ? `${labels.singular.charAt(0).toUpperCase() + labels.singular.slice(1)} Limit Reached` : 'Approaching Limit'}
          </h4>
          <p className={`mt-1 text-sm ${textColor} opacity-90`}>
            {message}
          </p>
          
          {/* Progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className={textColor}>{currentCount} / {maxCount} {labels.plural}</span>
              <span className={textColor}>{Math.round(percentUsed)}% used</span>
            </div>
            <div className="w-full bg-white/50 dark:bg-black/20 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, percentUsed)}%` }}
              />
            </div>
          </div>
          
          {!shouldHideUpgradeCta && (
            <div className="mt-4">
              <Button variant="primary" size="sm" onClick={handleUpgradeClick}>
                Upgrade Plan
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple usage indicator without upgrade prompt
 * Shows current/max count
 */
export function UsageIndicator({
  resourceType,
  currentCount,
  maxCount,
}: {
  resourceType: 'zones' | 'records' | 'members';
  currentCount: number;
  maxCount: number;
}) {
  const labels = RESOURCE_LABELS[resourceType] || { singular: resourceType, plural: resourceType };
  
  if (maxCount === -1) {
    return (
      <span className="text-sm text-gray-slate">
        {currentCount} {currentCount === 1 ? labels.singular : labels.plural} (unlimited)
      </span>
    );
  }
  
  const percentUsed = (currentCount / maxCount) * 100;
  const colorClass = percentUsed >= 100 
    ? 'text-red-600' 
    : percentUsed >= 80 
      ? 'text-amber-600' 
      : 'text-gray-slate';
  
  return (
    <span className={`text-sm ${colorClass}`}>
      {currentCount} / {maxCount} {labels.plural}
    </span>
  );
}

export default UpgradeLimitBanner;

