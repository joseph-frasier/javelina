'use client';

import { ReactNode } from 'react';
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

  return (
    <LDProvider
      clientSideID={clientSideID}
      context={ldContext}
      options={{
        sendEvents: process.env.NODE_ENV === 'production',
      }}
    >
      {children}
    </LDProvider>
  );
}

export default LaunchDarklyProvider;
