'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

/**
 * AuthProvider - Initializes authentication state on app load
 * This component checks the session via Express backend and updates the auth store
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    // Initialize auth state from Express session cookie
    initializeAuth();
  }, [initializeAuth]);

  return <>{children}</>;
}

