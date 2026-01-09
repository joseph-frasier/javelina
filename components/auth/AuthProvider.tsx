'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { createClient } from '@/lib/supabase/client';

/**
 * AuthProvider - Initializes authentication state on app load
 * This component checks the Supabase session and updates the auth store
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from Supabase session
    initializeAuth();

    // Listen for auth changes
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Only re-initialize if we don't have a user yet (actual login)
        // Skip re-initialization on token refresh when user is already authenticated
        const currentUser = useAuthStore.getState().user;
        if (!currentUser) {
          initializeAuth();
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // Token refresh doesn't need profile refetch
        // User is already authenticated and profile is loaded
        // This prevents page "reload" appearance when switching tabs
        console.log('[AuthProvider] Token refreshed - skipping re-initialization');
      } else if (event === 'SIGNED_OUT') {
        // Clear ALL auth state fields
        useAuthStore.setState({
          user: null,
          isAuthenticated: false,
          profileReady: false,
          profileError: null,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [initializeAuth]);

  return <>{children}</>;
}

