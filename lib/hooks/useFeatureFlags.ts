'use client';

import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';
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
  HIDE_UPGRADE_LIMIT_CTA: 'billing-hide-limit-upgrade-button', // Matches actual LD key
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
 * Waits for LaunchDarkly client to be ready before returning flag values.
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
  const ldClient = useLDClient();
  const ldFlags = useFlags();
  const [isReady, setIsReady] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    if (!ldClient) {
      console.warn('⚠️ No LaunchDarkly client available');
      setIsReady(true);
      return;
    }

    console.log('⏳ Waiting for LaunchDarkly initialization...');
    
    // Check if already ready
    if (ldClient.waitForInitialization) {
      ldClient.waitForInitialization().then(() => {
        console.log('✅ LaunchDarkly client initialized successfully');
        
        // Get all flags after initialization
        const allFlags = ldClient.allFlags();
        console.log('📦 All flags from allFlags():', allFlags);
        console.log('📦 All flags stringified:', JSON.stringify(allFlags, null, 2));
        
        setIsReady(true);
      }).catch((err) => {
        console.error('❌ LaunchDarkly initialization failed:', err);
        setIsReady(true);
      });
    } else {
      console.log('⚠️ Client missing waitForInitialization, assuming ready');
      setIsReady(true);
    }
  }, [ldClient]);

  // Update flags state whenever ldFlags or isReady changes
  useEffect(() => {
    if (isReady) {
      const newFlags = getFeatureFlags(ldFlags);
      console.log('🔄 Updating flags state:', newFlags);
      setFlags(newFlags);
    }
  }, [isReady, ldFlags]);

  // Debug logging (temporary)
  useEffect(() => {
    if (isReady && typeof window !== 'undefined') {
      console.log('🚀 LaunchDarkly Ready');
      console.log('📦 Raw LD Flags:', ldFlags);
      console.log('🔑 Flag Keys:', LD_FLAG_KEYS);
      
      // Check each individual flag
      console.log('🔍 Individual Flag Values:');
      console.log('  - pricing-hide-pro-plans:', ldFlags['pricing-hide-pro-plans']);
      console.log('  - pricing-hide-business-plans:', ldFlags['pricing-hide-business-plans']);
      console.log('  - billing-hide-limit-upgrade-button:', ldFlags['billing-hide-limit-upgrade-button']);
      console.log('  - orgs-hide-team-invites:', ldFlags['orgs-hide-team-invites']);
      
      const parsed = getFeatureFlags(ldFlags);
      console.log('✅ Parsed Feature Flags:', parsed);
    }
  }, [isReady, ldFlags]);

  return flags;
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
