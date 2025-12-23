'use client';

import { useFlags } from 'launchdarkly-react-client-sdk';

/**
 * Feature flags for the starter-only launch
 */
export interface FeatureFlags {
  /** Hide Pro monthly and Pro Lifetime plans from pricing/upgrade UIs */
  hideProPlans: boolean;
  /** Hide Business monthly and Business Lifetime plans from pricing/upgrade UIs */
  hideBusinessPlans: boolean;
  /** Hide upgrade CTA button in zone/record limit banners (keep warning visible) */
  hideUpgradeLimitCta: boolean;
  /** Hide team member invite/management UI for all orgs */
  hideTeamInvites: boolean;
}

/**
 * Default flag values when LaunchDarkly is unavailable or not configured
 * All default to false to preserve existing behavior
 */
const DEFAULT_FLAGS: FeatureFlags = {
  hideProPlans: false,
  hideBusinessPlans: false,
  hideUpgradeLimitCta: false,
  hideTeamInvites: false,
};

/**
 * LaunchDarkly flag keys
 */
export const LD_FLAG_KEYS = {
  HIDE_PRO_PLANS: 'pricing-hide-pro-plans',
  HIDE_BUSINESS_PLANS: 'pricing-hide-business-plans',
  HIDE_UPGRADE_LIMIT_CTA: 'billing-hide-upgrade-limit-cta',
  HIDE_TEAM_INVITES: 'orgs-hide-team-invites',
} as const;

/**
 * Hook to safely access LaunchDarkly feature flags
 * 
 * Returns typed feature flags with safe defaults when:
 * - LaunchDarkly client ID is not configured
 * - Component is not inside LaunchDarklyProvider
 * - Flags are not yet loaded
 * 
 * Usage:
 * ```tsx
 * import { useFeatureFlags } from '@/lib/hooks/useFeatureFlags';
 * 
 * function MyComponent() {
 *   const { hideProPlans, hideBusinessPlans, hideUpgradeLimitCta, hideTeamInvites } = useFeatureFlags();
 *   
 *   if (!hideProPlans) {
 *     // Show Pro plans
 *   }
 * }
 * ```
 */
export function useFeatureFlags(): FeatureFlags {
  // Call useFlags from LaunchDarkly
  // This is safe because our app is wrapped in LaunchDarklyProvider
  const ldFlags = useFlags();

  return getFeatureFlags(ldFlags);
}

/**
 * Helper function to extract typed flags from LaunchDarkly's useFlags result
 * Use this if you're already calling useFlags directly
 * 
 * @param ldFlags - The result of calling useFlags() from launchdarkly-react-client-sdk
 * @returns {FeatureFlags} Typed feature flags with safe defaults
 */
export function getFeatureFlags(ldFlags: Record<string, any> = {}): FeatureFlags {
  return {
    hideProPlans: ldFlags[LD_FLAG_KEYS.HIDE_PRO_PLANS] ?? DEFAULT_FLAGS.hideProPlans,
    hideBusinessPlans: ldFlags[LD_FLAG_KEYS.HIDE_BUSINESS_PLANS] ?? DEFAULT_FLAGS.hideBusinessPlans,
    hideUpgradeLimitCta: ldFlags[LD_FLAG_KEYS.HIDE_UPGRADE_LIMIT_CTA] ?? DEFAULT_FLAGS.hideUpgradeLimitCta,
    hideTeamInvites: ldFlags[LD_FLAG_KEYS.HIDE_TEAM_INVITES] ?? DEFAULT_FLAGS.hideTeamInvites,
  };
}
