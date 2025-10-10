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
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
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
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  getResolvedTheme: () => 'light' | 'dark';
}

// Mock data
const mockGeneralSettings: GeneralSettings = {
  theme: 'system',
  language: 'English',
  timezone: 'America/New_York',
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
    enabled: true,
    method: 'authenticator_app',
    last_verified: '2025-10-06T18:23:41Z'
  },
  sso: {
    provider: 'Okta',
    status: 'connected',
    last_sync: '2025-10-07T09:00:00Z'
  },
  ip_allowlist: [
    '192.168.1.12/32',
    '10.0.0.0/24'
  ],
  sessions: [
    {
      device: 'MacBook Pro 16"',
      location: 'New York, USA',
      last_login: '2025-10-07T14:10:22Z',
      status: 'active'
    },
    {
      device: 'iPhone 15',
      location: 'Boston, USA',
      last_login: '2025-10-06T20:32:10Z',
      status: 'active'
    }
  ]
};

const mockAccessSettings: AccessSettings = {
  members: [
    {
      name: 'John Doe',
      email: 'john@acme.com',
      role: 'Admin',
      last_active: '2025-10-07T11:12:30Z'
    },
    {
      name: 'Sarah Miller',
      email: 'sarah@acme.com',
      role: 'Editor',
      last_active: '2025-10-06T22:00:41Z'
    },
    {
      name: 'Mark Tran',
      email: 'mark@acme.com',
      role: 'Viewer',
      last_active: '2025-10-05T16:42:00Z'
    }
  ],
  environment_overrides: {
    staging: {
      role: 'Editor'
    },
    production: {
      role: 'Viewer'
    }
  }
};

const mockIntegrationSettings: IntegrationSettings = {
  slack: {
    status: 'connected',
    workspace: 'Acme DevOps',
    connected_on: '2025-10-01T10:11:00Z'
  },
  microsoft_teams: {
    status: 'disconnected',
    channel: null
  },
  pagerduty: {
    status: 'connected',
    service_name: 'DNS Monitoring Alerts'
  }
};

const mockAuditLogs: AuditLogEntry[] = [
  {
    timestamp: '2025-10-07T10:20:30Z',
    user: 'john@acme.com',
    category: 'Security',
    action: 'Enabled MFA'
  },
  {
    timestamp: '2025-10-06T18:45:12Z',
    user: 'sarah@acme.com',
    category: 'Access',
    action: 'Changed role from Viewer to Editor'
  },
  {
    timestamp: '2025-10-05T14:30:00Z',
    user: 'mark@acme.com',
    category: 'Integrations',
    action: 'Connected Slack workspace'
  }
];

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
        get().addAuditLog({
          user: 'current@user.com',
          category: 'General',
          action: 'Updated general settings'
        });
      },

      updateSecuritySettings: (settings) => {
        set((state) => ({
          security: { ...state.security, ...settings }
        }));
        get().addAuditLog({
          user: 'current@user.com',
          category: 'Security',
          action: 'Updated security settings'
        });
      },

      updateAccessSettings: (settings) => {
        set((state) => ({
          access: { ...state.access, ...settings }
        }));
        get().addAuditLog({
          user: 'current@user.com',
          category: 'Access',
          action: 'Updated access settings'
        });
      },

      updateIntegrationSettings: (settings) => {
        set((state) => ({
          integrations: { ...state.integrations, ...settings }
        }));
        get().addAuditLog({
          user: 'current@user.com',
          category: 'Integrations',
          action: 'Updated integration settings'
        });
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
        if (state.general.theme === 'system') {
          if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          }
          return 'light'; // fallback
        }
        return state.general.theme;
      }
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        general: state.general,
        security: state.security,
        access: state.access,
        integrations: state.integrations
      }),
    }
  )
);
