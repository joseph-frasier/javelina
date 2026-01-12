/**
 * Cross-tab idle synchronization
 * Uses BroadcastChannel when available, falls back to localStorage + storage events
 */

const CHANNEL_NAME = 'javelina-idle-sync';
const STORAGE_KEY = 'javelina-idle-event';
const LAST_ACTIVITY_KEY = 'javelina-last-activity';

export type IdleSyncMessage = 
  | { type: 'activity'; timestamp: number }
  | { type: 'logout'; timestamp: number };

export type IdleSyncHandler = (message: IdleSyncMessage) => void;

class IdleSync {
  private channel: BroadcastChannel | null = null;
  private subscribers: Set<IdleSyncHandler> = new Set();
  private storageListenerBound: ((e: StorageEvent) => void) | null = null;

  constructor() {
    if (typeof window === 'undefined') return;

    // Try BroadcastChannel first
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event) => {
          this.notifySubscribers(event.data);
        };
      } catch (error) {
        console.warn('[IdleSync] BroadcastChannel failed, using localStorage fallback:', error);
        this.setupLocalStorageFallback();
      }
    } else {
      this.setupLocalStorageFallback();
    }
  }

  private setupLocalStorageFallback() {
    if (typeof window === 'undefined') return;

    this.storageListenerBound = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const message: IdleSyncMessage = JSON.parse(event.newValue);
          this.notifySubscribers(message);
        } catch (error) {
          console.error('[IdleSync] Failed to parse storage event:', error);
        }
      }
    };

    window.addEventListener('storage', this.storageListenerBound);
  }

  private notifySubscribers(message: IdleSyncMessage) {
    this.subscribers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error('[IdleSync] Subscriber error:', error);
      }
    });
  }

  /**
   * Publish an activity event to all tabs
   */
  publishActivity() {
    const timestamp = Date.now();
    const message: IdleSyncMessage = { type: 'activity', timestamp };
    
    // Update shared last activity timestamp
    this.setLastActivityTimestamp(timestamp);
    
    // Broadcast to other tabs
    this.broadcast(message);
  }

  /**
   * Publish a logout event to all tabs
   */
  publishLogout() {
    const message: IdleSyncMessage = { type: 'logout', timestamp: Date.now() };
    this.broadcast(message);
  }

  private broadcast(message: IdleSyncMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('[IdleSync] BroadcastChannel postMessage failed:', error);
      }
    } else if (typeof window !== 'undefined') {
      // localStorage fallback
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(message));
        // Clear it immediately so the next event triggers storage listeners
        setTimeout(() => {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 100);
      } catch (error) {
        console.error('[IdleSync] localStorage broadcast failed:', error);
      }
    }
  }

  /**
   * Subscribe to idle sync events
   */
  subscribe(handler: IdleSyncHandler): () => void {
    this.subscribers.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(handler);
    };
  }

  /**
   * Get the last activity timestamp from localStorage
   */
  getLastActivityTimestamp(): number {
    if (typeof window === 'undefined') return Date.now();
    
    try {
      const stored = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (stored) {
        const timestamp = parseInt(stored, 10);
        if (!isNaN(timestamp) && timestamp > 0) {
          return timestamp;
        }
      }
    } catch (error) {
      console.error('[IdleSync] Failed to read last activity:', error);
    }
    
    return Date.now();
  }

  /**
   * Set the last activity timestamp in localStorage
   */
  setLastActivityTimestamp(timestamp: number) {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, timestamp.toString());
    } catch (error) {
      console.error('[IdleSync] Failed to write last activity:', error);
    }
  }

  /**
   * Close the sync channel and cleanup
   */
  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    if (this.storageListenerBound && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListenerBound);
      this.storageListenerBound = null;
    }
    
    this.subscribers.clear();
  }
}

// Singleton instance
let idleSyncInstance: IdleSync | null = null;

export function getIdleSync(): IdleSync {
  if (!idleSyncInstance) {
    idleSyncInstance = new IdleSync();
  }
  return idleSyncInstance;
}

export function closeIdleSync() {
  if (idleSyncInstance) {
    idleSyncInstance.close();
    idleSyncInstance = null;
  }
}
