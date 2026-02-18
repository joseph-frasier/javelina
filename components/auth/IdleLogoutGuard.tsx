'use client';

import { useCallback, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { useIdleLogout } from '@/lib/hooks/useIdleLogout';
import { getIdleSync } from '@/lib/idle/idleSync';
import { clearAdminSessionToken } from '@/lib/admin-session-token';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { IDLE_CONFIG } from '@/lib/idle/config';

/**
 * IdleLogoutGuard - Monitors user activity and logs out after inactivity
 * 
 * Behavior:
 * - Normal routes: Auto-logs out at 60 minutes (no warning modal)
 * - Admin routes (/admin/*): Logs out at 15 minutes with no warning
 * - Auth pages (/login, /signup, etc.): Completely disabled
 * 
 * Note: Admin routes use separate cookie-based auth (not useAuthStore), 
 * so we enable the guard based on route protection rather than auth state.
 * 
 * Warning modal UI is preserved below for future repurposing but is not currently shown.
 */
export function IdleLogoutGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [showWarningModal, setShowWarningModal] = useState(false);

  // Determine if we should enable idle monitoring and which mode
  const isAdminRoute = pathname.startsWith('/admin');
  const isAdminLoginPage = pathname === '/admin/login';
  const isAuthPage = [
    '/login',
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
  // Warning modal disabled - preserved for future use
  // const warningTimeout = isAdminRoute ? undefined : IDLE_CONFIG.WARNING_MS;

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
      clearAdminSessionToken();
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

    // Normal routes: Use Auth0 logout flow
    try {
      // Broadcast logout to other tabs
      const sync = getIdleSync();
      sync.publishLogout();
      
      // Clear activity timestamp
      localStorage.removeItem('javelina-last-activity');
    } catch (error) {
      console.error('[IdleLogoutGuard] Failed to clear activity:', error);
    }

    // Redirect to /api/logout which handles Auth0 logout
    // This route calls Express /auth/logout and redirects to Auth0 logout URL
    window.location.href = '/api/logout';
  }, [isAdminRoute, router]);

  /**
   * Use idle logout hook
   * Note: warningMs and onWarning not passed - warning modal disabled but preserved for future use
   */
  const { reset, triggerLogout } = useIdleLogout({
    enabled,
    mode,
    idleTimeoutMs: idleTimeout,
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
