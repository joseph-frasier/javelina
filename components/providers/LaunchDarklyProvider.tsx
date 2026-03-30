'use client';

import { ReactNode, useEffect } from 'react';
import { LDProvider, useLDClient } from 'launchdarkly-react-client-sdk';
import type { LDContext } from 'launchdarkly-js-client-sdk';
import { useAuthStore } from '@/lib/auth-store';

interface LaunchDarklyProviderProps {
  children: ReactNode;
}

function buildUserContext(user: { id: string; auth0_user_id?: string | null; email: string; name: string } | null): LDContext {
  if (user) {
    return {
      kind: 'user',
      key: user.auth0_user_id || user.id,
      email: user.email || undefined,
      name: user.name || user.email || 'Unknown',
    };
  }
  return {
    kind: 'user',
    key: 'anonymous',
    anonymous: true,
  };
}

/**
 * Re-identifies the LD client when the user logs in or out.
 * LDProvider sets the initial context, but if the user is null at first
 * render (auth not yet resolved), the context starts as anonymous.
 * This component calls identify() once the user is available.
 */
function LDIdentify() {
  const ldClient = useLDClient();
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!ldClient || !user) return;
    const context = buildUserContext(user);
    ldClient.identify(context);
  }, [ldClient, user]);

  return null;
}

/**
 * LaunchDarkly Provider for feature flags
 *
 * Wraps the app with LaunchDarkly context, using the authenticated user
 * for flag evaluation and targeting.
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

  const ldContext = buildUserContext(user);

  return (
    <LDProvider
      clientSideID={clientSideID}
      context={ldContext}
      options={{
        sendEvents: true,
      }}
    >
      <LDIdentify />
      {children}
    </LDProvider>
  );
}

export default LaunchDarklyProvider;
