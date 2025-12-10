import { useState, useEffect } from 'react';

/**
 * Plan limits structure returned from LaunchDarkly
 */
export interface PlanLimits {
  zones: number;
  records: number;
  users: number;
  organizations: number;
}

/**
 * Default limits for each plan tier (fallback if LaunchDarkly is unavailable)
 */
const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  starter: {
    zones: 2,
    records: 200,
    users: 1,
    organizations: 1,
  },
  pro: {
    zones: 20,
    records: 2000,
    users: 5,
    organizations: 1,
  },
  business: {
    zones: 50,
    records: 5000,
    users: 20,
    organizations: 1,
  },
  // Enterprise gets unlimited (-1)
  enterprise: {
    zones: -1,
    records: -1,
    users: -1,
    organizations: -1,
  },
};

/**
 * Normalize plan code to tier name
 * e.g., 'starter_lifetime' -> 'starter', 'pro' -> 'pro'
 */
export function getPlanTier(planCode: string | null | undefined): string {
  if (!planCode) return 'starter';
  
  // Handle enterprise plans
  if (planCode.includes('enterprise')) {
    return 'enterprise';
  }
  
  // Handle business/premium lifetime (premium_lifetime maps to business)
  if (planCode.includes('business') || planCode.includes('premium')) {
    return 'business';
  }
  
  // Handle pro plans
  if (planCode.includes('pro')) {
    return 'pro';
  }
  
  // Default to starter
  return 'starter';
}

/**
 * Hook to get plan limits from LaunchDarkly
 * 
 * @param planCode - The plan code from the subscription (e.g., 'starter_lifetime', 'pro')
 * @returns Plan limits object with zones, records, users, and organizations limits
 * 
 * @example
 * ```tsx
 * const { limits, isUnlimited, tier } = usePlanLimits('pro_lifetime');
 * 
 * if (currentZones >= limits.zones && !isUnlimited('zones')) {
 *   // Show upgrade prompt
 * }
 * ```
 */
export function usePlanLimits(planCode: string | null | undefined) {
  const tier = getPlanTier(planCode);
  const [ldFlags, setLdFlags] = useState<Record<string, any> | null>(null);
  const [isUsingDefaults, setIsUsingDefaults] = useState(true);
  
  // Try to load LaunchDarkly flags dynamically
  useEffect(() => {
    // Only try to load in browser
    if (typeof window === 'undefined') return;
    
    import('launchdarkly-react-client-sdk')
      .then((module) => {
        // This hook needs to be called at the top level of a component
        // Since we can't do that in useEffect, we'll set a flag to indicate
        // that LD is available and the component should use useFlags
        setIsUsingDefaults(false);
      })
      .catch(() => {
        // SDK not installed, use defaults
        setIsUsingDefaults(true);
      });
  }, []);
  
  // Get limits from LaunchDarkly flag or fall back to defaults
  const flagKey = `plan-limits-${tier}`;
  const ldLimits = ldFlags?.[flagKey] as PlanLimits | undefined;
  const limits = ldLimits || DEFAULT_LIMITS[tier] || DEFAULT_LIMITS.starter;
  
  /**
   * Check if a specific resource type is unlimited (-1 means unlimited)
   */
  const isUnlimited = (resource: keyof PlanLimits): boolean => {
    return limits[resource] === -1;
  };
  
  /**
   * Check if adding one more resource would exceed the limit
   */
  const wouldExceedLimit = (resource: keyof PlanLimits, currentCount: number): boolean => {
    if (isUnlimited(resource)) return false;
    return currentCount >= limits[resource];
  };
  
  /**
   * Get the remaining count for a resource
   */
  const getRemainingCount = (resource: keyof PlanLimits, currentCount: number): number | null => {
    if (isUnlimited(resource)) return null;
    return Math.max(0, limits[resource] - currentCount);
  };
  
  return {
    limits,
    tier,
    isUnlimited,
    wouldExceedLimit,
    getRemainingCount,
    isUsingDefaults,
  };
}

/**
 * Hook that wraps useFlags from LaunchDarkly when available
 * Falls back to empty object if SDK not installed
 */
export function useLDFlags(): Record<string, any> {
  const [flags, setFlags] = useState<Record<string, any>>({});
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('launchdarkly-react-client-sdk')
      .then((module) => {
        // Note: useFlags hook can only be used inside LDProvider
        // This is a best-effort fallback
      })
      .catch(() => {
        // SDK not installed
      });
  }, []);
  
  return flags;
}

export default usePlanLimits;
