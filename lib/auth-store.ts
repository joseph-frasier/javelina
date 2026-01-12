import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackURL } from '@/lib/utils/get-url'
import { updateProfile as updateProfileAction, getProfile } from '@/lib/actions/profile'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { classifySignupResult, type SignupOutcome } from '@/lib/utils/signup-classifier'
import { getIdleSync } from '@/lib/idle/idleSync'

// CRITICAL: Clean up old persisted auth storage IMMEDIATELY on module load
// This must happen before any Zustand store is created to prevent
// "Cannot create property 'user' on string" errors from old persist data
if (typeof window !== 'undefined') {
  try {
    const oldData = localStorage.getItem('auth-storage');
    if (oldData) {
      console.log('[Auth Store] Removing old auth-storage data');
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; outcome?: SignupOutcome }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
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

      // Initialize auth - check for existing session
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

        // Real Supabase authentication
        const supabase = createClient()

        try {
          const {
            data: { user: supabaseUser },
          } = await supabase.auth.getUser()

          if (supabaseUser) {
            await get().fetchProfile()
          } else {
            set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
        } finally {
          set({ isLoading: false })
        }
      },

      // Fetch user profile via Express API
      fetchProfile: async () => {
        const supabase = createClient()

        try {
          // Get the session first to ensure user is authenticated
          const {
            data: { session },
          } = await supabase.auth.getSession()

          if (!session?.user) {
            set({ user: null, isAuthenticated: false, profileReady: false, profileError: null })
            return
          }

          const supabaseUser = session.user

          // Fetch profile with organizations from Express API via server action
          const result = await getProfile()

          if (result.error || !result.data) {
            console.error('Error fetching profile:', result.error)
            
            // Check if this is a disabled account error
            const isDisabledError = result.error?.toLowerCase().includes('disabled')
            
            if (isDisabledError) {
              // Sign them out for disabled accounts
              await supabase.auth.signOut()
              set({
                user: null,
                isAuthenticated: false,
                profileReady: false,
                profileError: result.error || 'Your account has been disabled. Please contact support for assistance.',
              })
            } else {
              // For other errors, keep the session but show the error
              set({
                user: null,
                isAuthenticated: true, // Still have a valid Supabase session
                profileReady: false,
                profileError: result.error || 'We could not load your profile. Please sign out and try again.',
              })
            }
            return
          }

          // Check if user is disabled
          if (result.data.status === 'disabled') {
            console.log('User account is disabled')
            // Sign them out
            await supabase.auth.signOut()
            set({
              user: null,
              isAuthenticated: false,
              profileReady: false,
              profileError: 'Your account has been disabled. Please contact support for assistance.',
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
            isAuthenticated: true,
            profileReady: false,
            profileError: 'An error occurred while loading your profile. Please sign out and try again.',
          })
        }
      },

      // Email/password login
      login: async (email: string, password: string) => {
        set({ isLoading: true })
        
        // Check if we're using placeholder Supabase credentials (development mode with mock data)
        const isPlaceholderMode = process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'
        
        if (isPlaceholderMode) {
          // Use mock authentication
          await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
          
          const user = mockUsers.find(u => u.email === email)
          const correctPassword = mockPasswords[email]
          
          if (!user || password !== correctPassword) {
            set({ isLoading: false })
            return { success: false, error: 'Invalid email or password' }
          }
          
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          })
          
          return { success: true }
        }
        
        // Real Supabase authentication
        const supabase = createClient()

        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })

          if (error) {
            set({ isLoading: false })
            return { success: false, error: error.message }
          }

          if (data.user) {
            await get().fetchProfile()
            
            // Check if profile loaded successfully
            const { profileReady, user, profileError } = get()
            
            if (!profileReady || !user) {
              set({ isLoading: false })
              return { 
                success: false, 
                error: profileError || 'We could not load your profile. Please try again.' 
              }
            }
          }

          set({ isLoading: false })
          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          return { success: false, error: error.message || 'An error occurred' }
        }
      },

      // OAuth login (Google, GitHub, etc.)
      loginWithOAuth: async (provider: 'google' | 'github') => {
        const supabase = createClient()
        const redirectUrl = getAuthCallbackURL()

        await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        })
        // Note: This will redirect the user, so no return value
      },

      // Sign up new user
      signUp: async (email: string, password: string, name: string) => {
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
      resetPassword: async (email: string) => {
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
          
          console.log(`[Mock] Password reset email would be sent to: ${email}`)
          return { success: true }
        }
        
        // Real Supabase authentication
        const supabase = createClient()

        try {
          // Use auth callback route which will handle the code exchange and redirect to reset-password
          const resetUrl = `${window.location.origin}/auth/callback?type=recovery`
          console.log('Sending password reset email to:', email)
          console.log('Reset URL:', resetUrl)

          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: resetUrl,
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

          console.log('Password reset email sent successfully')
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

      // Logout
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
            // Clear stale timestamp to prevent login loops
            localStorage.removeItem('javelina-last-activity')
          } catch (error) {
            console.error('Error broadcasting logout:', error)
          }
          
          return
        }
        
        // Real Supabase logout
        const supabase = createClient()

        try {
          await supabase.auth.signOut()
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
            // Clear stale timestamp to prevent login loops
            localStorage.removeItem('javelina-last-activity')
          } catch (error) {
            console.error('Error broadcasting logout:', error)
          }
        } catch (error) {
          console.error('Error logging out:', error)
          
          // Still broadcast logout even on error
          try {
            const sync = getIdleSync()
            sync.publishLogout()
            // Clear stale timestamp to prevent login loops
            localStorage.removeItem('javelina-last-activity')
          } catch (broadcastError) {
            console.error('Error broadcasting logout:', broadcastError)
          }
        }
      },
}))
