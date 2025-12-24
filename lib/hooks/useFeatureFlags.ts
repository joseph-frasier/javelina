'use client';

import { useLDClient } from 'launchdarkly-react-client-sdk';
import { useEffect, useState } from 'react';

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
 * IMPORTANT: These must exactly match the "Key" field in LaunchDarkly dashboard
 */
export const LD_FLAG_KEYS = {
  HIDE_PRO_PLANS: 'pricing-hide-pro-plans',
  HIDE_BUSINESS_PLANS: 'pricing-hide-business-plans',
  HIDE_UPGRADE_LIMIT_CTA: 'billing-hide-limit-upgrade-button',
  HIDE_TEAM_INVITES: 'orgs-hide-team-invites',
} as const;

/**
 * Hook to safely access LaunchDarkly feature flags
 * 
 * Uses ldClient.allFlags() directly instead of useFlags() hook,
 * as allFlags() correctly returns flag values while useFlags() returns undefined.
 * 
 * Returns typed feature flags with safe defaults when:
 * - LaunchDarkly client ID is not configured
 * - Component is not inside LaunchDarklyProvider
 * - Flags are not yet loaded
 */
export function useFeatureFlags(): FeatureFlags {
  const ldClient = useLDClient();
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    if (!ldClient) {
      return;
    }

    // Get initial flags
    const updateFlags = () => {
      try {
        const allFlags = ldClient.allFlags();
        const newFlags: FeatureFlags = {
          hideProPlans: allFlags[LD_FLAG_KEYS.HIDE_PRO_PLANS] ?? DEFAULT_FLAGS.hideProPlans,
          hideBusinessPlans: allFlags[LD_FLAG_KEYS.HIDE_BUSINESS_PLANS] ?? DEFAULT_FLAGS.hideBusinessPlans,
          hideUpgradeLimitCta: allFlags[LD_FLAG_KEYS.HIDE_UPGRADE_LIMIT_CTA] ?? DEFAULT_FLAGS.hideUpgradeLimitCta,
          hideTeamInvites: allFlags[LD_FLAG_KEYS.HIDE_TEAM_INVITES] ?? DEFAULT_FLAGS.hideTeamInvites,
        };
        setFlags(newFlags);
      } catch (err) {
        console.error('Error reading LaunchDarkly flags:', err);
      }
    };

    // Wait for initialization, then get flags
    ldClient.waitForInitialization()
      .then(() => {
        updateFlags();
        
        // Listen for flag changes
        ldClient.on('change', updateFlags);
      })
      .catch((err) => {
        console.error('LaunchDarkly initialization failed:', err);
      });

    // Cleanup listener on unmount
    return () => {
      if (ldClient && ldClient.off) {
        ldClient.off('change', updateFlags);
      }
    };
  }, [ldClient]);

  return flags;
}

/**
 * Helper function to extract typed flags from LaunchDarkly's flag object
 * 
 * @param ldFlags - The result of calling ldClient.allFlags()
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
