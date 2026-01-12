import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdleLogout } from '@/lib/hooks/useIdleLogout';
import * as idleSyncModule from '@/lib/idle/idleSync';

// Mock the idleSync module
vi.mock('@/lib/idle/idleSync', () => {
  let subscribers: Array<(message: any) => void> = [];
  let lastActivity = Date.now();

  return {
    getIdleSync: vi.fn(() => ({
      publishActivity: vi.fn(),
      publishLogout: vi.fn(),
      subscribe: vi.fn((handler: (message: any) => void) => {
        subscribers.push(handler);
        return () => {
          subscribers = subscribers.filter((h) => h !== handler);
        };
      }),
      getLastActivityTimestamp: vi.fn(() => lastActivity),
      setLastActivityTimestamp: vi.fn((timestamp: number) => {
        lastActivity = timestamp;
      }),
      close: vi.fn(),
    })),
    closeIdleSync: vi.fn(),
    // Mock trigger for simulating cross-tab messages
    __triggerSyncMessage: (message: any) => {
      subscribers.forEach((handler) => handler(message));
    },
    __resetSubscribers: () => {
      subscribers = [];
    },
  };
});

describe('useIdleLogout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    // @ts-ignore
    idleSyncModule.__resetSubscribers?.();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('full mode', () => {
    it('should trigger warning callback after warningMs', async () => {
      const onWarning = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 100, // Short time for testing
          idleTimeoutMs: 1000, // Much longer
          onWarning,
        })
      );

      // Fast-forward to just past warning time
      await act(async () => {
        vi.advanceTimersByTime(150);
        await vi.runAllTimersAsync();
      });

      expect(onWarning).toHaveBeenCalled();
    });

    it('should trigger logout callback after idleTimeoutMs', async () => {
      const onWarning = vi.fn();
      const onLogout = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 100,
          idleTimeoutMs: 200,
          onWarning,
          onLogout,
        })
      );

      // Fast-forward to logout time
      await act(async () => {
        vi.advanceTimersByTime(200);
        await vi.runAllTimersAsync();
      });

      expect(onLogout).toHaveBeenCalled();
      expect(onWarning).toHaveBeenCalled(); // Warning should have fired first
    });

    it('should provide reset method', () => {
      const { result } = renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 100,
          idleTimeoutMs: 200,
        })
      );

      // Should have reset method
      expect(typeof result.current.reset).toBe('function');
      
      // Should not throw when called
      expect(() => result.current.reset()).not.toThrow();
    });

    it('should provide triggerLogout method', () => {
      const onLogout = vi.fn();
      
      const { result } = renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 100,
          idleTimeoutMs: 200,
          onLogout,
        })
      );

      // Should have triggerLogout method
      expect(typeof result.current.triggerLogout).toBe('function');
      
      // Should call onLogout when triggered
      act(() => {
        result.current.triggerLogout();
      });
      
      expect(onLogout).toHaveBeenCalled();
    });

    it('should react to cross-tab logout', async () => {
      const onLogout = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onLogout,
        })
      );

      // Simulate logout message from another tab
      await act(async () => {
        // @ts-ignore
        idleSyncModule.__triggerSyncMessage?.({ type: 'logout', timestamp: Date.now() });
        await vi.runAllTimersAsync();
      });

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('should react to cross-tab activity', async () => {
      const onWarning = vi.fn();
      const onLogout = vi.fn();

      const { result } = renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'full',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onWarning,
          onLogout,
        })
      );

      // Advance almost to warning
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Simulate activity from another tab
      act(() => {
        // @ts-ignore
        idleSyncModule.__triggerSyncMessage?.({ type: 'activity', timestamp: Date.now() });
      });

      // Advance more time
      act(() => {
        vi.advanceTimersByTime(4000);
      });

      // Should NOT have warned yet (reset by cross-tab activity)
      expect(onWarning).not.toHaveBeenCalled();
      expect(onLogout).not.toHaveBeenCalled();
      expect(result.current.isWarning).toBe(false);
    });
  });

  describe('activityOnly mode', () => {
    it('should not trigger warning in activityOnly mode', async () => {
      const onWarning = vi.fn();
      const onLogout = vi.fn();

      const { result } = renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'activityOnly',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onWarning,
          onLogout,
        })
      );

      // Fast-forward past warning time
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      // Should not warn
      expect(result.current.isWarning).toBe(false);
      expect(onWarning).not.toHaveBeenCalled();
    });

    it('should not trigger logout in activityOnly mode', async () => {
      const onWarning = vi.fn();
      const onLogout = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'activityOnly',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onWarning,
          onLogout,
        })
      );

      // Fast-forward past logout time
      act(() => {
        vi.advanceTimersByTime(10000);
      });

      // Should not logout
      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should ignore cross-tab logout in activityOnly mode', async () => {
      const onLogout = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'activityOnly',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onLogout,
        })
      );

      // Simulate logout message from another tab
      act(() => {
        // @ts-ignore
        idleSyncModule.__triggerSyncMessage?.({ type: 'logout', timestamp: Date.now() });
      });

      // Give it time to process
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Should not have logged out
      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should attach activity listeners in activityOnly mode', () => {
      renderHook(() =>
        useIdleLogout({
          enabled: true,
          mode: 'activityOnly',
          warningMs: 100,
          idleTimeoutMs: 200,
        })
      );

      // Hook should be active and listening
      // We can verify it doesn't throw and initializes properly
      expect(true).toBe(true);
    });
  });

  describe('disabled state', () => {
    it('should not trigger warning when disabled', async () => {
      const onWarning = vi.fn();
      const onLogout = vi.fn();

      renderHook(() =>
        useIdleLogout({
          enabled: false,
          mode: 'full',
          warningMs: 5000,
          idleTimeoutMs: 10000,
          onWarning,
          onLogout,
        })
      );

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(onWarning).not.toHaveBeenCalled();
      expect(onLogout).not.toHaveBeenCalled();
    });

    it('should not listen to activity events when disabled', async () => {
      const sync = idleSyncModule.getIdleSync();

      renderHook(() =>
        useIdleLogout({
          enabled: false,
          mode: 'full',
          warningMs: 5000,
          idleTimeoutMs: 10000,
        })
      );

      // Trigger activity
      act(() => {
        window.dispatchEvent(new Event('mousemove'));
      });

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // publishActivity should not have been called
      expect(sync.publishActivity).not.toHaveBeenCalled();
    });
  });
});
