'use client';

import { ReactNode, useEffect } from 'react';
import { LDProvider } from 'launchdarkly-react-client-sdk';
import type { LDContext } from 'launchdarkly-js-client-sdk';
import { useAuthStore } from '@/lib/auth-store';

interface LaunchDarklyProviderProps {
  children: ReactNode;
}

/**
 * LaunchDarkly Provider for feature flags
 * 
 * Wraps the app with LaunchDarkly context, using the authenticated user
 * and their organization as the context for flag evaluation.
 * 
 * Requires:
 * 1. npm install launchdarkly-react-client-sdk
 * 2. NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID environment variable
 */
export function LaunchDarklyProvider({ children }: LaunchDarklyProviderProps) {
  const clientSideID = process.env.NEXT_PUBLIC_LAUNCHDARKLY_CLIENT_ID;
  const user = useAuthStore((state) => state.user);

  // Debug logging
  useEffect(() => {
    if (typeof window !== 'undefined' && clientSideID) {
      console.log('🏁 LaunchDarkly Provider Initialized');
      console.log('🔑 Client ID:', clientSideID);
      console.log('👤 User Context:', user?.id || 'anonymous');
    }
  }, [clientSideID, user]);

  // If no client ID is configured, render children without LD
  if (!clientSideID) {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn('LaunchDarkly client ID not configured. Feature flags will use defaults.');
    }
    return <>{children}</>;
  }

  // Create the context for LaunchDarkly
  // We use the user ID as the key, with additional attributes for targeting
  const ldContext: LDContext = user ? {
    kind: 'user',
    key: user.id,
    email: user.email || undefined,
    // Get name from raw_user_meta_data if available
    name: (user as any).raw_user_meta_data?.name || 
          (user as any).user_metadata?.name || 
          user.email || 
          'Unknown',
    custom: {
      // Organization context is set per-request in hooks when we know which org
    }
  } : {
    kind: 'user',
    key: 'anonymous',
    anonymous: true
  };

  // Debug: Log the actual context being sent
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('🎯 LD Context being sent:', JSON.stringify(ldContext, null, 2));
    }
  }, [ldContext]);

  return (
    <LDProvider
      clientSideID={clientSideID}
      context={ldContext}
      options={{
        // Don't send analytics events in development
        sendEvents: process.env.NODE_ENV === 'production',
        // Disable localStorage bootstrap temporarily for debugging
        // This ensures we fetch fresh flags from LD servers
        // bootstrap: 'localStorage',
      }}
    >
      {children}
    </LDProvider>
  );
}

export default LaunchDarklyProvider;
