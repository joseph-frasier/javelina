import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'user' | 'superuser';
export type RBACRole = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer';
export type EnvironmentType = 'production' | 'staging' | 'development';

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  zones_count: number;
  role?: RBACRole; // Optional: environment-level role override
}

export interface Organization {
  id: string;
  name: string;
  role: RBACRole;
  environments_count: number;
  environments?: Environment[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  display_name?: string;
  title?: string;
  phone?: string;
  timezone?: string;
  bio?: string;
  avatar_url?: string;
  mfa_enabled?: boolean;
  sso_connected?: boolean;
  last_login?: string;
  organizations?: Organization[];
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

// Mock users with real names and extended data
const mockUsers: User[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'user',
    display_name: 'Sarah',
    title: 'DevOps Engineer',
    phone: '+1-555-555-0101',
    timezone: 'America/New_York',
    bio: 'DNS enthusiast. I manage company domains.',
    avatar_url: '',
    mfa_enabled: true,
    sso_connected: false,
    last_login: '2025-10-06T18:12:30Z',
    organizations: [
      {
        id: 'org_company',
        name: 'Company Corp',
        role: 'Editor',
        environments_count: 3,
        environments: [
          {
            id: 'env_prod',
            name: 'Production',
            type: 'production',
            zones_count: 25,
            role: 'Editor'
          },
          {
            id: 'env_staging',
            name: 'Staging',
            type: 'staging',
            zones_count: 15,
            role: 'Editor'
          },
          {
            id: 'env_dev',
            name: 'Development',
            type: 'development',
            zones_count: 5,
            role: 'Admin'
          }
        ]
      }
    ]
  },
  {
    id: '2', 
    name: 'Marcus Rodriguez',
    email: 'marcus.rodriguez@company.com',
    role: 'superuser',
    display_name: 'Marcus',
    title: 'Senior DevOps Engineer',
    phone: '+1-555-555-0102',
    timezone: 'America/Los_Angeles',
    bio: 'Senior engineer with full system access and domain expertise.',
    avatar_url: '',
    mfa_enabled: true,
    sso_connected: true,
    last_login: '2025-10-06T19:45:15Z',
    organizations: [
      {
        id: 'org_company',
        name: 'Company Corp',
        role: 'SuperAdmin',
        environments_count: 3,
        environments: [
          {
            id: 'env_prod',
            name: 'Production',
            type: 'production',
            zones_count: 120,
            role: 'SuperAdmin'
          },
          {
            id: 'env_staging',
            name: 'Staging',
            type: 'staging',
            zones_count: 80,
            role: 'SuperAdmin'
          },
          {
            id: 'env_dev',
            name: 'Development',
            type: 'development',
            zones_count: 34,
            role: 'SuperAdmin'
          }
        ]
      },
      {
        id: 'org_personal',
        name: 'Personal Projects',
        role: 'Admin',
        environments_count: 2,
        environments: [
          {
            id: 'env_personal_prod',
            name: 'Production',
            type: 'production',
            zones_count: 5,
            role: 'Admin'
          },
          {
            id: 'env_personal_dev',
            name: 'Development',
            type: 'development',
            zones_count: 3,
            role: 'Admin'
          }
        ]
      }
    ]
  }
];

// Mock passwords (in real app, these would be hashed)
const mockPasswords: Record<string, string> = {
  'sarah.chen@company.com': 'password123',
  'marcus.rodriguez@company.com': 'admin2024'
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const user = mockUsers.find(u => u.email === email);
        const correctPassword = mockPasswords[email];
        
        if (!user || password !== correctPassword) {
          set({ isLoading: false });
          return { success: false, error: 'Invalid email or password' };
        }
        
        set({ 
          user, 
          isAuthenticated: true, 
          isLoading: false 
        });
        
        return { success: true };
      },

      logout: () => {
        set({ 
          user: null, 
          isAuthenticated: false 
        });
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);
