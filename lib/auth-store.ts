import { create } from 'zustand'
import { updateProfile as updateProfileAction, getProfile } from '@/lib/actions/profile'
import { getIdleSync } from '@/lib/idle/idleSync'

// API configuration for auth endpoints
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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
  loginWithOAuth: (provider: 'google' | 'github') => void
  logout: () => Promise<void>
  signUp: (email: string, password: string, name: string, captchaToken?: string) => Promise<{ success: boolean; error?: string }>
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
          const response = await fetch(`${API_URL}/auth/me`, {
            credentials: 'include', // Send session cookie
          })

          if (response.ok) {
            // Session is valid, fetch full profile
            await get().fetchProfile()
          } else {
            // No valid session
            set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
        } finally {
          set({ isLoading: false })
        }
      },

      // Fetch user profile via Express API (uses session cookie)
      fetchProfile: async () => {
        try {
          // Fetch profile with organizations from Express API via server action
          // Session cookie is sent automatically via credentials: 'include'
          const result = await getProfile()

          if (result.error || !result.data) {
            console.error('Error fetching profile:', result.error)
            
            set({
              user: null,
              isAuthenticated: false,
              profileReady: false,
              profileError: result.error || 'We could not load your profile. Please sign out and try again.',
            })
            return
          }

          // Map organizations to Organization interface
          const organizations: Organization[] = (result.data.organizations || []).map((org) => ({
            id: org.id,
            name: org.name,
            role: org.role,
          }))

          set({
            user: {
              ...result.data,
              // Ensure required fields have non-null values
              name: result.data.name || '',
              email: result.data.email || '',
              role: (result.data.role as UserRole) || 'user',
              organizations,
            },
            isAuthenticated: true,
            profileReady: true,
            profileError: null,
          })
        } catch (error) {
          console.error('Error fetching profile:', error)
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

      // OAuth login - redirect to Auth0 (handles all OAuth providers)
      loginWithOAuth: (provider: 'google' | 'github') => {
        // Auth0 Universal Login handles all OAuth providers
        // Just redirect to the same login endpoint
        window.location.href = `${API_URL}/auth/login`
      },

      // Sign up new user
      signUp: async (email: string, password: string, name: string, captchaToken?: string) => {
        const supabase = createClient()
        set({ isLoading: true })

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name, // This will be stored in user_metadata
              },
              captchaToken,
            },
          })

          // Classify the signup result to distinguish new user, existing email, or error
          const outcome = classifySignupResult(data.user, error)

          switch (outcome) {
            case 'new_user':
              // Real successful signup - fetch profile
              if (data.user) {
                // Profile should be auto-created by database trigger
                await get().fetchProfile()
              }
              set({ isLoading: false })
              return { success: true, outcome: 'new_user' }

            case 'existing_email':
              // Email already exists - Supabase returned obfuscated user or explicit error
              set({ isLoading: false })
              return { 
                success: false, 
                error: 'A user with this email address already exists.',
                outcome: 'existing_email'
              }

            case 'error':
            default:
              // Actual error (network, validation, etc.)
              set({ isLoading: false })
              return { 
                success: false, 
                error: error?.message || 'An error occurred during signup. Please try again.',
                outcome: 'error'
              }
          }
        } catch (error: any) {
          set({ isLoading: false })
          return { 
            success: false, 
            error: error.message || 'An error occurred',
            outcome: 'error'
          }
        }
      },

      // Reset password
      resetPassword: async (email: string, captchaToken?: string) => {
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // Mock mode - simulate sending email
          await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
          
          // Check if email exists in mock users
          const userExists = mockUsers.some(u => u.email === email)
          
          if (!userExists) {
            // Still return success to prevent email enumeration
            return { success: true }
          }
          
          return { success: true }
        }
        
        // Real Supabase authentication
        const supabase = createClient()

        try {
          // Use auth callback route which will handle the code exchange and redirect to reset-password
          const resetUrl = `${window.location.origin}/auth/callback?type=recovery`

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetUrl,
            captchaToken,
          })

          if (error) {
            console.error('Password reset error:', error)
            // Return more specific error messages
            if (error.message.includes('rate limit')) {
              return { success: false, error: 'Too many requests. Please try again later.' }
            }
            if (error.message.includes('email')) {
              return { success: false, error: 'Unable to send email. Please check your email address.' }
            }
            return { success: false, error: error.message }
          }

          return { success: true }
        } catch (error: any) {
          console.error('Password reset exception:', error)
          return { 
            success: false, 
            error: error.message || 'Failed to send reset email. Please try again.' 
          }
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

      // Logout - call Express backend
      logout: async () => {
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // Mock mode - just clear the state
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
          
          return
        }
        
        // Call Express logout endpoint
        try {
          const response = await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include', // Send session cookie
          })
          
          // Clear local state
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
          
          // If backend returns Auth0 logout URL, redirect to it
          if (response.ok) {
            const data = await response.json()
            if (data.redirectUrl) {
              window.location.href = data.redirectUrl
            }
          }
        } catch (error) {
          console.error('Error logging out:', error)
          
          // Still clear state and broadcast even on error
          set({
            user: null,
            isAuthenticated: false,
            profileReady: false,
            profileError: null,
          })
          
          try {
            const sync = getIdleSync()
            sync.publishLogout()
            localStorage.removeItem('javelina-last-activity')
          } catch (broadcastError) {
            console.error('Error broadcasting logout:', broadcastError)
          }
        }
      },
}))
