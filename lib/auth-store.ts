import { create } from 'zustand'
import { updateProfile as updateProfileAction, getProfile } from '@/lib/actions/profile'
import { getIdleSync } from '@/lib/idle/idleSync'

// API configuration for auth endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Production-safe logger: suppress auth debug logs in production to prevent PII/session data exposure
const authLog = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') console.log(...args)
  },
  error: (...args: any[]) => {
    // Always log errors, but strip potential PII in production
    if (process.env.NODE_ENV !== 'production') {
      console.error(...args)
    } else {
      console.error(args[0]) // Only log the message prefix in production
    }
  },
}

// CRITICAL: Clean up old persisted auth storage IMMEDIATELY on module load
// This must happen before any Zustand store is created to prevent
// "Cannot create property 'user' on string" errors from old persist data
if (typeof window !== 'undefined') {
  try {
    const oldData = localStorage.getItem('auth-storage');
    if (oldData) {
      localStorage.removeItem('auth-storage');
    }
  } catch (error) {
    // Silently fail if localStorage is not available
  }
}

export type UserRole = 'user' | 'superuser';
export type RBACRole = 'SuperAdmin' | 'Admin' | 'BillingContact' | 'Editor' | 'Viewer';

export interface Organization {
  id: string;
  name: string;
  role: RBACRole;
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  display_name?: string | null
  title?: string | null
  phone?: string | null
  timezone?: string | null
  bio?: string | null
  avatar_url?: string | null
  mfa_enabled?: boolean | null
  sso_connected?: boolean | null
  last_login?: string | null
  organizations?: Organization[]
  // Additional profile fields from database
  preferences?: Record<string, any> | null
  onboarding_completed?: boolean | null
  email_verified?: boolean | null
  notification_preferences?: Record<string, any> | null
  language?: string | null
  status?: string | null
  superadmin?: boolean | null
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  profileReady: boolean
  profileError: string | null
  login: () => void
  signup: () => void
  loginWithOAuth: (provider: 'google' | 'github') => void
  logout: () => Promise<void>
  signUp: (email: string, password: string, name: string, captchaToken?: string) => Promise<{ success: boolean; error?: string; outcome?: string }>
  resetPassword: (email: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
  fetchProfile: () => Promise<void>
  initializeAuth: () => Promise<void>
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
      },
      {
        id: 'org_personal',
        name: 'Personal Projects',
        role: 'Admin',
      }
    ]
  }
];

// Mock passwords (in real app, these would be hashed)
const mockPasswords: Record<string, string> = {
  'sarah.chen@company.com': 'password123',
  'marcus.rodriguez@company.com': 'admin2024'
};

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  profileReady: false,
  profileError: null,

      // Initialize auth - check for existing session via Express /auth/me
      initializeAuth: async () => {
        // Check if we just logged out (flag set by logout function)
        try {
          const justLoggedOut = sessionStorage.getItem('just-logged-out') === 'true'
          if (justLoggedOut) {
            authLog.log('[AUTH] Just logged out, skipping session check')
            sessionStorage.removeItem('just-logged-out')
            set({ 
              user: null, 
              isAuthenticated: false, 
              profileReady: false, 
              profileError: null,
              isLoading: false 
            })
            return
          }
        } catch (error) {
          // Ignore sessionStorage errors
        }
        
        set({ isLoading: true, profileReady: false, profileError: null })
        
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // In mock mode, check if there's a persisted user from previous login
          const currentUser = get().user
          if (currentUser) {
            set({ isAuthenticated: true })
          }
          set({ isLoading: false })
          return
        }

        // Check session with Express backend
        try {
          authLog.log('[AUTH] Checking session with backend')
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include', // Send session cookie
          })

          authLog.log('[AUTH] Session check response:', response.status)

          if (response.ok) {
            // Session is valid, fetch full profile
            await get().fetchProfile()
          } else {
            // No valid session
            authLog.log('[AUTH] No valid session, setting unauthenticated state')
            set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
          }
        } catch (error) {
          authLog.error('[AUTH] Error initializing auth:', error)
          set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
        } finally {
          authLog.log('[AUTH] Setting isLoading to false')
          set({ isLoading: false })
        }
      },

      // Fetch user profile via Express API (uses session cookie)
      fetchProfile: async () => {
        try {
          authLog.log('[AUTH] Fetching profile from:', `${API_URL}/api/users/profile`)
          
          // Call backend API directly with credentials to send session cookie
          const response = await fetch(`${API_URL}/api/users/profile`, {
            credentials: 'include', // Send session cookie
          })

          authLog.log('[AUTH] Profile response status:', response.status)

          if (!response.ok) {
            const errorText = await response.text()
            authLog.error('[AUTH] Error fetching profile:', response.status, errorText)
            
            set({
              user: null,
              isAuthenticated: false,
              profileReady: false,
              profileError: 'We could not load your profile. Please sign out and try again.',
            })
            return
          }

          const result = await response.json()
          authLog.log('[AUTH] Profile data received:', result)

          // Handle different response formats from backend
          // Backend might return { data: {...} } or just {...}
          const profileData = result.data || result

          authLog.log('[AUTH] Profile data after unwrapping:', profileData)

          // Map organizations to Organization interface
          const organizations: Organization[] = (profileData.organizations || []).map((org: any) => ({
            id: org.id,
            name: org.name,
            role: org.role,
          }))

          const userProfile = {
            ...profileData,
            // Ensure required fields have non-null values
            name: profileData.name || '',
            email: profileData.email || '',
            role: (profileData.role as UserRole) || 'user',
            organizations,
          }

          authLog.log('[AUTH] Setting user profile:', userProfile)

          set({
            user: userProfile,
            isAuthenticated: true,
            profileReady: true,
            profileError: null,
          })
        } catch (error) {
          authLog.error('[AUTH] Error fetching profile:', error)
          set({
            user: null,
            isAuthenticated: false,
            profileReady: false,
            profileError: 'An error occurred while loading your profile. Please sign out and try again.',
          })
        }
      },

      // Login - redirect to Auth0 via Express
      login: () => {
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // Mock mode - no-op for now (would need custom mock login flow)
          console.warn('Mock mode login not implemented for Auth0 migration')
          return
        }
        
        // Redirect to Express auth endpoint which will redirect to Auth0
        window.location.href = `${API_URL}/auth/login`
      },

      // Signup - redirect to Auth0 via Express with screen_hint=signup
      signup: () => {
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // Mock mode - no-op for now (would need custom mock signup flow)
          console.warn('Mock mode signup not implemented for Auth0 migration')
          return
        }
        
        // Redirect to Express auth endpoint with screen_hint=signup parameter
        // This tells Auth0 to show the signup screen instead of login screen
        window.location.href = `${API_URL}/auth/login?screen_hint=signup`
      },

      // OAuth login - redirect to Auth0 (handles all OAuth providers)
      loginWithOAuth: (provider: 'google' | 'github') => {
        // Auth0 Universal Login handles all OAuth providers
        // Just redirect to the same login endpoint
        window.location.href = `${API_URL}/auth/login`
      },

      // Sign up new user - Auth0 handles this via Universal Login
      signUp: async (email: string, password: string, name: string, captchaToken?: string) => {
        // With Auth0 migration, signup happens through Auth0's Universal Login UI
        // This function is kept for backwards compatibility but should not be used
        console.warn('Direct signup not supported with Auth0 - use Universal Login instead');
        return { 
          success: false, 
          error: 'Please use the login page to sign up',
          outcome: 'error'
        }
      },

      // Reset password - Auth0 handles this via Universal Login
      resetPassword: async (email: string, captchaToken?: string) => {
        // With Auth0 migration, password resets happen through Auth0's password reset flow
        // Users should use the "Forgot Password" link on the Auth0 login page
        console.warn('Direct password reset not supported with Auth0 - use Universal Login forgot password flow');
        return { 
          success: false, 
          error: 'Please use the forgot password link on the login page'
        }
      },

      // Update user profile via Express API
      updateProfile: async (updates: Partial<User>) => {
        const currentUser = get().user

        if (!currentUser) {
          return { success: false, error: 'No user logged in' }
        }

        // Call server action which routes through Express API
        const result = await updateProfileAction(updates)

        if (result.error) {
          return { success: false, error: result.error }
        }

        // Refetch profile to get updated data
        await get().fetchProfile()

        return { success: true }
      },

      // Logout - navigate directly to Express backend (same pattern as login)
      logout: async () => {
        authLog.log('[AUTH] Logout initiated')
        
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        // CRITICAL: Set flag to prevent re-initialization after logout
        // This allows AuthProvider to skip session check when page reloads after logout
        try {
          sessionStorage.setItem('just-logged-out', 'true')
        } catch (error) {
          authLog.error('[AUTH] Could not set logout flag:', error)
        }
        
        if (isPlaceholderMode) {
          // Mock mode - clear state and redirect
          set({
            user: null,
            isAuthenticated: false,
            profileReady: false,
            profileError: null,
          })
          
          // Broadcast logout to other tabs
          try {
            const sync = getIdleSync()
            sync.publishLogout()
            localStorage.removeItem('javelina-last-activity')
          } catch (error) {
            console.error('Error broadcasting logout:', error)
          }
          
          // Redirect to root
          window.location.href = '/'
          return
        }
        
        // Broadcast logout to other tabs (non-blocking, fires before navigation)
        try {
          const sync = getIdleSync()
          sync.publishLogout()
          localStorage.removeItem('javelina-last-activity')
        } catch (error) {
          // Ignore broadcast errors to avoid delaying logout
        }
        
        // Navigate to Next.js logout API route (NOT directly to Express)
        // This ensures the frontend-domain cookie is cleared before Auth0 logout
        // Flow: /api/logout → clears frontend cookie → Express /auth/logout → Auth0 → /
        // When page loads at /, AuthProvider sees 'just-logged-out' flag and skips auth check
        authLog.log('[AUTH] Navigating to frontend logout route: /api/logout')
        window.location.href = '/api/logout'
      },
}))
