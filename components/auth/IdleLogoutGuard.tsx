'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useIdleLogout } from '@/lib/hooks/useIdleLogout';
import { createClient } from '@/lib/supabase/client';
import { getIdleSync } from '@/lib/idle/idleSync';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

/**
 * IdleLogoutGuard - Monitors user activity and logs out after 60 minutes of inactivity
 * 
 * Behavior:
 * - Normal routes: Shows warning at 58 minutes, logs out at 60 minutes
 * - Admin routes (/admin/*): Only broadcasts activity, no logout
 * - Auth pages (/login, /signup, etc.): Completely disabled
 */
export function IdleLogoutGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout: authStoreLogout } = useAuthStore();
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Determine if we should enable idle monitoring and which mode
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthPage = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/email-verified',
  ].includes(pathname) || pathname.startsWith('/auth/');

  // Enable only when authenticated and not on auth pages
  const enabled = isAuthenticated && !isAuthPage;
  
  // Admin routes use activityOnly mode, others use full mode
  const mode = isAdminRoute ? 'activityOnly' : 'full';

  /**
   * Handle warning (58 minutes idle)
   */
  const handleWarning = useCallback(() => {
    if (mode === 'full') {
      setShowWarningModal(true);
    }
  }, [mode]);

  /**
   * Handle logout (60 minutes idle)
   */
  const handleLogout = useCallback(async () => {
    if (mode === 'activityOnly') {
      // Admin routes don't logout
      return;
    }

    setShowWarningModal(false);

    // Attempt to sign out of Supabase
    try {
      // Check if we're in placeholder mode
      const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co';
      
      if (isPlaceholderMode) {
        // Use auth store logout for placeholder mode
        await authStoreLogout();
      } else {
        // Real Supabase sign out
        const supabase = createClient();
        await supabase.auth.signOut();
        
        // Also clear auth store
        await authStoreLogout();
      }
    } catch (error) {
      console.error('[IdleLogoutGuard] Sign out error:', error);
      // Continue with redirect even on error
    }

    // Broadcast logout to other tabs and clear stale timestamp
    const sync = getIdleSync();
    sync.publishLogout();
    
    // Clear the stale lastActivityAt timestamp to prevent login loops
    try {
      localStorage.removeItem('javelina-last-activity');
    } catch (error) {
      console.error('[IdleLogoutGuard] Failed to clear last activity:', error);
    }

    // Redirect to login
    router.replace('/login');
  }, [mode, authStoreLogout, router]);

  /**
   * Use idle logout hook
   */
  const { isWarning, reset } = useIdleLogout({
    enabled,
    mode,
    onWarning: handleWarning,
    onLogout: handleLogout,
  });

  /**
   * Sync warning state with hook
   */
  useEffect(() => {
    if (isWarning && mode === 'full') {
      setShowWarningModal(true);
    } else {
      setShowWarningModal(false);
    }
  }, [isWarning, mode]);

  /**
   * Handle "Stay signed in" button
   */
  const handleStaySignedIn = useCallback(() => {
    setShowWarningModal(false);
    reset();
  }, [reset]);

  /**
   * Close modal (treat as "Stay signed in")
   */
  const handleCloseModal = useCallback(() => {
    setShowWarningModal(false);
    reset();
  }, [reset]);

  // Don't render anything (this is just a guard)
  // But we do render the warning modal when needed
  return (
    <>
      {showWarningModal && (
        <ConfirmationModal
          isOpen={showWarningModal}
          onClose={handleCloseModal}
          onConfirm={handleStaySignedIn}
          title="Session Timeout Warning"
          message="You'll be logged out in 2 minutes due to inactivity. Would you like to stay signed in?"
          confirmText="Stay signed in"
          cancelText="Log out now"
          variant="warning"
        />
      )}
    </>
  );
}
