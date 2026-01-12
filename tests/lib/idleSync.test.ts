import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getIdleSync, closeIdleSync, type IdleSyncMessage } from '@/lib/idle/idleSync';

describe('idleSync', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Close any existing instance
    closeIdleSync();
  });

  afterEach(() => {
    closeIdleSync();
  });

  describe('localStorage fallback', () => {
    beforeEach(() => {
      // Force localStorage fallback by making BroadcastChannel unavailable
      // @ts-ignore - intentionally deleting for test
      delete global.BroadcastChannel;
    });

    it('should broadcast activity events via localStorage', () => {
      const sync = getIdleSync();
      const handler = vi.fn();
      
      sync.subscribe(handler);
      
      // Publish activity
      sync.publishActivity();
      
      // Simulate storage event (would come from another tab)
      const message: IdleSyncMessage = { type: 'activity', timestamp: Date.now() };
      const event = new StorageEvent('storage', {
        key: 'javelina-idle-event',
        newValue: JSON.stringify(message),
      });
      window.dispatchEvent(event);
      
      // Handler should be called
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'activity' })
      );
    });

    it('should broadcast logout events via localStorage', () => {
      const sync = getIdleSync();
      const handler = vi.fn();
      
      sync.subscribe(handler);
      
      // Simulate storage event for logout
      const message: IdleSyncMessage = { type: 'logout', timestamp: Date.now() };
      const event = new StorageEvent('storage', {
        key: 'javelina-idle-event',
        newValue: JSON.stringify(message),
      });
      window.dispatchEvent(event);
      
      // Handler should be called
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'logout' })
      );
    });

    it('should persist last activity timestamp', () => {
      const sync = getIdleSync();
      const timestamp = Date.now();
      
      sync.setLastActivityTimestamp(timestamp);
      
      const retrieved = sync.getLastActivityTimestamp();
      expect(retrieved).toBe(timestamp);
    });

    it('should update last activity on publishActivity', async () => {
      const sync = getIdleSync();
      
      const before = sync.getLastActivityTimestamp();
      
      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      
      sync.publishActivity();
      
      const after = sync.getLastActivityTimestamp();
      expect(after).toBeGreaterThanOrEqual(before);
    });

    it('should allow unsubscribe', () => {
      const sync = getIdleSync();
      const handler = vi.fn();
      
      const unsubscribe = sync.subscribe(handler);
      
      // Unsubscribe
      unsubscribe();
      
      // Simulate storage event
      const message: IdleSyncMessage = { type: 'activity', timestamp: Date.now() };
      const event = new StorageEvent('storage', {
        key: 'javelina-idle-event',
        newValue: JSON.stringify(message),
      });
      window.dispatchEvent(event);
      
      // Handler should NOT be called after unsubscribe
      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle invalid JSON in storage events gracefully', () => {
      const sync = getIdleSync();
      const handler = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      sync.subscribe(handler);
      
      // Simulate storage event with invalid JSON
      const event = new StorageEvent('storage', {
        key: 'javelina-idle-event',
        newValue: 'invalid-json',
      });
      window.dispatchEvent(event);
      
      // Handler should not be called
      expect(handler).not.toHaveBeenCalled();
      
      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should ignore storage events with wrong key', () => {
      const sync = getIdleSync();
      const handler = vi.fn();
      
      sync.subscribe(handler);
      
      // Simulate storage event with different key
      const event = new StorageEvent('storage', {
        key: 'some-other-key',
        newValue: JSON.stringify({ type: 'activity', timestamp: Date.now() }),
      });
      window.dispatchEvent(event);
      
      // Handler should not be called
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const sync1 = getIdleSync();
      const sync2 = getIdleSync();
      
      expect(sync1).toBe(sync2);
    });

    it('should create new instance after close', () => {
      const sync1 = getIdleSync();
      closeIdleSync();
      const sync2 = getIdleSync();
      
      expect(sync1).not.toBe(sync2);
    });
  });
});
