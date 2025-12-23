'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/auth-store';

interface LaunchDarklyProviderProps {
  children: ReactNode;
}

// Type for LD context
interface LDContext {
  kind: string;
  key: string;
  email?: string;
  name?: string;
  anonymous?: boolean;
  custom?: Record<string, unknown>;
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
  const [LDComponents, setLDComponents] = useState<{
    LDProvider: React.ComponentType<any>;
    useLDClient: () => any;
  } | null>(null);

  // Dynamically import LaunchDarkly SDK to handle case where it's not installed
  useEffect(() => {
    if (clientSideID) {
      import('launchdarkly-react-client-sdk')
        .then((module) => {
          setLDComponents({
            LDProvider: module.LDProvider,
            useLDClient: module.useLDClient,
          });
        })
        .catch((err) => {
          console.warn('LaunchDarkly SDK not installed. Run: npm install launchdarkly-react-client-sdk');
        });
    }
  }, [clientSideID]);

  // Debug logging - MUST be before conditional return (React Hook rules)
  useEffect(() => {
    if (typeof window !== 'undefined' && clientSideID && LDComponents) {
      console.log('🏁 LaunchDarkly Provider Initialized');
      console.log('🔑 Client ID:', clientSideID);
      console.log('👤 User Context:', user?.id || 'anonymous');
    }
  }, [clientSideID, LDComponents, user]);

  // If no client ID is configured or SDK not loaded, render children without LD
  if (!clientSideID || !LDComponents) {
    if (!clientSideID) {
      // Only warn once in development
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.warn('LaunchDarkly client ID not configured. Feature flags will use defaults.');
      }
    }
    return <>{children}</>;
  }

  const { LDProvider } = LDComponents;

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
        // Don't send analytics events in development
        sendEvents: process.env.NODE_ENV === 'production',
        // Bootstrap with empty flags to prevent flashing
        bootstrap: 'localStorage',
      }}
    >
      {children}
    </LDProvider>
  );
}

export default LaunchDarklyProvider;
