import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface NotificationSettings {
  email: {
    dns_updates: boolean;
    project_changes: boolean;
    system_alerts: boolean;
  };
  browser_push: boolean;
}

export interface GeneralSettings {
  theme: 'light' | 'dark';
  language: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  defaultLandingPage: string;
  itemsPerPage: number;
  autoRefreshInterval: number; // in seconds, 0 = off
  defaultDnsTtl: number; // in seconds
  notifications: NotificationSettings;
}

export interface MFASettings {
  enabled: boolean;
  method: 'authenticator_app' | 'sms';
  last_verified: string;
}

export interface SSOSettings {
  provider: string;
  status: 'connected' | 'disconnected';
  last_sync: string;
}

export interface SecuritySettings {
  mfa: MFASettings;
  sso: SSOSettings;
  ip_allowlist: string[];
  sessions: Array<{
    device: string;
    location: string;
    last_login: string;
    status: 'active' | 'inactive';
  }>;
}

export interface Member {
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  last_active: string;
}

export interface AccessSettings {
  members: Member[];
  environment_overrides: Record<string, { role: string }>;
}

export interface IntegrationSettings {
  slack: {
    status: 'connected' | 'disconnected';
    workspace: string | null;
    connected_on: string | null;
  };
  microsoft_teams: {
    status: 'connected' | 'disconnected';
    channel: string | null;
  };
  pagerduty: {
    status: 'connected' | 'disconnected';
    service_name: string | null;
  };
}

export interface AuditLogEntry {
  timestamp: string;
  user: string;
  category: 'Security' | 'Access' | 'Billing' | 'Integrations' | 'General';
  action: string;
}

export interface SettingsState {
  general: GeneralSettings;
  security: SecuritySettings;
  access: AccessSettings;
  integrations: IntegrationSettings;
  auditLogs: AuditLogEntry[];
  
  // Actions
  updateGeneralSettings: (settings: Partial<GeneralSettings>) => void;
  updateSecuritySettings: (settings: Partial<SecuritySettings>) => void;
  updateAccessSettings: (settings: Partial<AccessSettings>) => void;
  updateIntegrationSettings: (settings: Partial<IntegrationSettings>) => void;
  addAuditLog: (entry: Omit<AuditLogEntry, 'timestamp'>) => void;
  
  // Theme-specific actions
  setTheme: (theme: 'light' | 'dark') => void;
  getResolvedTheme: () => 'light' | 'dark';
}

// Mock data
const mockGeneralSettings: GeneralSettings = {
  theme: 'light',
  language: 'English',
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  defaultLandingPage: 'dashboard',
  itemsPerPage: 25,
  autoRefreshInterval: 60, // 1 minute
  defaultDnsTtl: 3600, // 1 hour
  notifications: {
    email: {
      dns_updates: true,
      project_changes: false,
      system_alerts: true
    },
    browser_push: true
  }
};

const mockSecuritySettings: SecuritySettings = {
  mfa: {
    enabled: false,
    method: 'authenticator_app',
    last_verified: new Date().toISOString()
  },
  sso: {
    provider: 'Not configured',
    status: 'disconnected',
    last_sync: new Date().toISOString()
  },
  ip_allowlist: [],
  sessions: []
};

const mockAccessSettings: AccessSettings = {
  members: [],
  environment_overrides: {}
};

const mockIntegrationSettings: IntegrationSettings = {
  slack: {
    status: 'disconnected',
    workspace: null,
    connected_on: null
  },
  microsoft_teams: {
    status: 'disconnected',
    channel: null
  },
  pagerduty: {
    status: 'disconnected',
    service_name: null
  }
};

const mockAuditLogs: AuditLogEntry[] = [];

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      general: mockGeneralSettings,
      security: mockSecuritySettings,
      access: mockAccessSettings,
      integrations: mockIntegrationSettings,
      auditLogs: mockAuditLogs,

      updateGeneralSettings: (settings) => {
        set((state) => ({
          general: { ...state.general, ...settings }
        }));
        // Audit logging removed - should be handled by backend for proper user attribution and persistence
      },

      updateSecuritySettings: (settings) => {
        set((state) => ({
          security: { ...state.security, ...settings }
        }));
        // Audit logging removed - should be handled by backend for proper user attribution and persistence
      },

      updateAccessSettings: (settings) => {
        set((state) => ({
          access: { ...state.access, ...settings }
        }));
        // Audit logging removed - should be handled by backend for proper user attribution and persistence
      },

      updateIntegrationSettings: (settings) => {
        set((state) => ({
          integrations: { ...state.integrations, ...settings }
        }));
        // Audit logging removed - should be handled by backend for proper user attribution and persistence
      },

      addAuditLog: (entry) => {
        set((state) => ({
          auditLogs: [
            {
              ...entry,
              timestamp: new Date().toISOString()
            },
            ...state.auditLogs
          ]
        }));
      },

      setTheme: (theme) => {
        const state = get();
        const oldTheme = state.general.theme;
        
        // Update store
        set((state) => ({
          general: { ...state.general, theme }
        }));
        
      // Persist to localStorage
      try {
        localStorage.setItem('javelina:theme', theme);
      } catch (e) {
        // Silently fail if localStorage is not available
      }
        
        // Apply to document
        if (typeof window !== 'undefined') {
          const resolved = get().getResolvedTheme();
          document.documentElement.classList.remove('theme-light', 'theme-dark');
          document.documentElement.classList.add(`theme-${resolved}`);
        }
      },

      getResolvedTheme: () => {
        const state = get();
        return state.general.theme;
      }
    }),
    {
      name: 'settings-storage',
      version: 1, // Increment this to force reset of persisted data
      partialize: (state) => ({
        general: state.general,
        security: state.security,
        access: state.access,
        integrations: state.integrations
      }),
      migrate: (persistedState: any, version: number) => {
        // Force reset to new defaults by returning current state defaults
        if (version === 0) {
          return {
            general: mockGeneralSettings,
            security: mockSecuritySettings,
            access: mockAccessSettings,
            integrations: mockIntegrationSettings
          };
        }
        return persistedState as any;
      },
    }
  )
);
