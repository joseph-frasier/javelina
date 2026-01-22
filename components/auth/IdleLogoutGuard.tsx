'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useIdleLogout } from '@/lib/hooks/useIdleLogout';
import { createClient } from '@/lib/supabase/client';
import { getIdleSync } from '@/lib/idle/idleSync';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { IDLE_CONFIG } from '@/lib/idle/config';

/**
 * IdleLogoutGuard - Monitors user activity and logs out after inactivity
 * 
 * Behavior:
 * - Normal routes: Shows warning at 58 minutes, logs out at 60 minutes
 * - Admin routes (/admin/*): Logs out at 15 minutes with no warning
 * - Auth pages (/login, /signup, etc.): Completely disabled
 * 
 * Note: Admin routes use separate cookie-based auth (not useAuthStore), 
 * so we enable the guard based on route protection rather than auth state.
 */
export function IdleLogoutGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout: authStoreLogout } = useAuthStore();
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Determine if we should enable idle monitoring and which mode
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLoginPage = pathname === '/admin/login';
  const isAuthPage = [
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
    '/email-verified',
  ].includes(pathname) || pathname.startsWith('/auth/');

  // Enable when:
  // 1. Regular authenticated user on non-auth pages, OR
  // 2. On admin routes (already protected by AdminProtectedRoute) but not the login page
  const enabled = (isAuthenticated && !isAuthPage) || (isAdminRoute && !isAdminLoginPage);
  
  // All routes use full mode (with logout), but admin routes use shorter timeout
  const mode = 'full';
  
  // Configure timeout based on route type
  const idleTimeout = isAdminRoute ? IDLE_CONFIG.ADMIN_IDLE_TIMEOUT_MS : IDLE_CONFIG.IDLE_TIMEOUT_MS;
  const warningTimeout = isAdminRoute ? undefined : IDLE_CONFIG.WARNING_MS;

  /**
   * Handle warning (58 minutes idle for normal routes, no warning for admin)
   */
  const handleWarning = useCallback(() => {
    if (!isAdminRoute) {
      setShowWarningModal(true);
    }
  }, [isAdminRoute]);

  /**
   * Handle logout (60 minutes idle for normal routes, 15 minutes for admin)
   */
  const handleLogout = useCallback(async () => {
    setShowWarningModal(false);

    if (isAdminRoute) {
      // Admin routes: Set inactivity flag and redirect to admin login
      try {
        localStorage.setItem('admin-logout-reason', 'inactivity');
        localStorage.removeItem('javelina-last-activity');
      } catch (error) {
        console.error('[IdleLogoutGuard] Failed to set logout reason:', error);
      }
      
      // Admin logout happens via middleware checking the cookie expiration
      // Just redirect to admin login page
      router.replace('/admin/login');
      return;
    }

    // Normal routes: Attempt to sign out of Supabase
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

    // Small delay to ensure session is fully cleared before redirect
    // This prevents middleware from seeing stale authenticated session
    await new Promise(resolve => setTimeout(resolve, 100));

    // Redirect to login
    router.replace('/login');
  }, [isAdminRoute, authStoreLogout, router]);

  /**
   * Use idle logout hook
   */
  const { reset, triggerLogout } = useIdleLogout({
    enabled,
    mode,
    idleTimeoutMs: idleTimeout,
    warningMs: warningTimeout,
    onWarning: handleWarning,
    onLogout: handleLogout,
  });

  /**
   * Handle "Stay signed in" button
   */
  const handleStaySignedIn = useCallback(() => {
    setShowWarningModal(false);
    reset();
  }, [reset]);

  /**
   * Handle "Log out now" button
   */
  const handleLogoutNow = useCallback(() => {
    setShowWarningModal(false);
    triggerLogout();
  }, [triggerLogout]);

  /**
   * Close modal via X button - just close, let timer continue
   */
  const handleCloseModal = useCallback(() => {
    setShowWarningModal(false);
    // Don't reset - timer continues, will auto-logout
  }, []);

  // Don't render anything (this is just a guard)
  // But we do render the warning modal when needed (not for admin routes)
  return (
    <>
      {!isAdminRoute && (
        <ConfirmationModal
          isOpen={showWarningModal}
          onClose={handleStaySignedIn}
          onConfirm={handleLogoutNow}
          title="Session Timeout Warning"
          message="You'll be logged out in 2 minutes due to inactivity. Would you like to stay signed in?"
          confirmText="Log out now"
          cancelText="Stay signed in"
          variant="warning"
        />
      )}
    </>
  );
}
