import { useEffect, useRef, useState, useCallback } from 'react';
import { getIdleSync, type IdleSyncMessage } from '@/lib/idle/idleSync';
import { IDLE_CONFIG } from '@/lib/idle/config';

export type UseIdleLogoutOptions = {
  idleTimeoutMs?: number;
  warningMs?: number;
  onWarning?: () => void;
  onLogout?: () => void;
  enabled?: boolean;
  mode?: 'full' | 'activityOnly';
};

export type UseIdleLogoutReturn = {
  isWarning: boolean;
  reset: () => void;
  triggerLogout: () => void;
};

/**
 * Hook for idle detection with cross-tab sync
 * 
 * - 'full' mode: schedules warning + logout timers, reacts to cross-tab logout
 * - 'activityOnly' mode: only broadcasts activity, no timers or logout reaction
 */
export function useIdleLogout(options: UseIdleLogoutOptions = {}): UseIdleLogoutReturn {
  const {
    idleTimeoutMs = IDLE_CONFIG.IDLE_TIMEOUT_MS,
    warningMs = IDLE_CONFIG.WARNING_MS,
    onWarning,
    onLogout,
    enabled = true,
    mode = 'full',
  } = options;

  const [isWarning, setIsWarning] = useState(false);
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const onWarningRef = useRef(onWarning);
  const onLogoutRef = useRef(onLogout);
  
  // Keep refs up to date
  useEffect(() => {
    onWarningRef.current = onWarning;
    onLogoutRef.current = onLogout;
  }, [onWarning, onLogout]);

  /**
   * Clear all timers
   */
  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  /**
   * Trigger logout immediately
   */
  const triggerLogout = useCallback(() => {
    clearTimers();
    setIsWarning(false);
    
    if (onLogoutRef.current) {
      onLogoutRef.current();
    }
  }, [clearTimers]);

  /**
   * Schedule warning and logout timers
   */
  const scheduleTimers = useCallback(() => {
    if (mode !== 'full') return;
    
    clearTimers();
    setIsWarning(false);
    
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Schedule warning
    const warningDelay = warningMs;
    warningTimerRef.current = setTimeout(() => {
      // Validate elapsed time (handles browser sleep/throttling)
      const elapsed = Date.now() - lastActivityRef.current;
      
      if (elapsed >= warningMs) {
        setIsWarning(true);
        if (onWarningRef.current) {
          onWarningRef.current();
        }
      } else {
        // Timer fired early, reschedule
        const remaining = warningMs - elapsed;
        warningTimerRef.current = setTimeout(() => {
          setIsWarning(true);
          if (onWarningRef.current) {
            onWarningRef.current();
          }
        }, remaining);
      }
    }, warningDelay);
    
    // Schedule logout
    const logoutDelay = idleTimeoutMs;
    logoutTimerRef.current = setTimeout(() => {
      // Validate elapsed time
      const elapsed = Date.now() - lastActivityRef.current;
      
      if (elapsed >= idleTimeoutMs) {
        triggerLogout();
      } else {
        // Timer fired early, reschedule
        const remaining = idleTimeoutMs - elapsed;
        logoutTimerRef.current = setTimeout(() => {
          triggerLogout();
        }, remaining);
      }
    }, logoutDelay);
  }, [mode, warningMs, idleTimeoutMs, clearTimers, triggerLogout]);

  /**
   * Reset idle state (on activity)
   */
  const reset = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Broadcast activity to other tabs
    const sync = getIdleSync();
    sync.publishActivity();
    
    // Update shared timestamp
    sync.setLastActivityTimestamp(now);
    
    if (mode === 'full') {
      // Reschedule timers
      scheduleTimers();
    }
  }, [mode, scheduleTimers]);

  /**
   * Handle activity events (throttled to ~1s)
   */
  const lastActivityCallRef = useRef<number>(0);
  const handleActivity = useCallback(() => {
    if (!enabled) return;
    
    const now = Date.now();
    // Throttle: ignore repeats within 1 second
    if (now - lastActivityCallRef.current < 1000) return;
    
    lastActivityCallRef.current = now;
    reset();
  }, [enabled, reset]);

  /**
   * Handle cross-tab sync messages
   */
  useEffect(() => {
    if (!enabled) return;
    
    const sync = getIdleSync();
    
    const handleSyncMessage = (message: IdleSyncMessage) => {
      if (message.type === 'activity') {
        // Activity in another tab: reset our timers
        reset();
      } else if (message.type === 'logout') {
        // Logout in another tab
        if (mode === 'full') {
          // Only full mode reacts to cross-tab logout
          triggerLogout();
        }
        // activityOnly mode ignores logout events
      }
    };
    
    unsubscribeRef.current = sync.subscribe(handleSyncMessage);
    
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [enabled, mode, reset, triggerLogout]);

  /**
   * Set up activity listeners
   */
  useEffect(() => {
    if (!enabled) return;
    
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown'];
    
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    
    // Initialize timers on mount
    // Treat mounting in authenticated state as fresh activity to avoid login loops
    // after idle logout (old timestamp in localStorage would cause immediate re-logout)
    if (mode === 'full') {
      // Reset activity and schedule fresh timers
      reset();
    } else {
      // activityOnly mode: just update last activity
      reset();
    }
    
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [enabled, mode, idleTimeoutMs, handleActivity, scheduleTimers, clearTimers, triggerLogout, reset]);

  return {
    isWarning,
    reset,
    triggerLogout,
  };
}
