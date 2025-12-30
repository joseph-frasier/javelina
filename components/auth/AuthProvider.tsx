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
        initializeAuth();
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

