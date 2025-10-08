import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createClient } from '@/lib/supabase/client'
import { getAuthCallbackURL } from '@/lib/utils/get-url'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export type UserRole = 'user' | 'superuser'
export type RBACRole = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'

export interface Organization {
  id: string
  name: string
  role: RBACRole
  projects_count: number
  zones_count: number
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  display_name?: string
  title?: string
  phone?: string
  timezone?: string
  bio?: string
  avatar_url?: string
  mfa_enabled?: boolean
  sso_connected?: boolean
  last_login?: string
  organizations?: Organization[]
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  loginWithOAuth: (provider: 'google' | 'github') => Promise<void>
  logout: () => Promise<void>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updateProfile: (updates: Partial<User>) => Promise<{ success: boolean; error?: string }>
  fetchProfile: () => Promise<void>
  initializeAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Initialize auth - check for existing session
      initializeAuth: async () => {
        const supabase = createClient()
        set({ isLoading: true })

        try {
          const {
            data: { user: supabaseUser },
          } = await supabase.auth.getUser()

          if (supabaseUser) {
            await get().fetchProfile()
          } else {
            set({ user: null, isAuthenticated: false })
          }
        } catch (error) {
          console.error('Error initializing auth:', error)
          set({ user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },

      // Fetch user profile from database
      fetchProfile: async () => {
        const supabase = createClient()

        try {
          const {
            data: { user: supabaseUser },
          } = await supabase.auth.getUser()

          if (!supabaseUser) {
            set({ user: null, isAuthenticated: false })
            return
          }

          // Fetch profile from profiles table
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single()

          if (profileError) {
            console.error('Error fetching profile:', profileError)
            // If profile doesn't exist yet, create a basic one
            set({
              user: {
                id: supabaseUser.id,
                name: supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || 'User',
                email: supabaseUser.email || '',
                role: 'user',
              },
              isAuthenticated: true,
            })
            return
          }

          // Fetch organizations
          const { data: memberships } = await supabase
            .from('organization_members')
            .select(
              `
              role,
              projects_count,
              zones_count,
              organizations:organization_id (
                id,
                name
              )
            `
            )
            .eq('user_id', supabaseUser.id)

          const organizations: Organization[] =
            memberships?.map((m: any) => ({
              id: m.organizations.id,
              name: m.organizations.name,
              role: m.role,
              projects_count: m.projects_count,
              zones_count: m.zones_count,
            })) || []

          set({
            user: {
              ...profileData,
              organizations,
            },
            isAuthenticated: true,
          })
        } catch (error) {
          console.error('Error fetching profile:', error)
        }
      },

      // Email/password login
      login: async (email: string, password: string) => {
        const supabase = createClient()
        set({ isLoading: true })

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

          if (error) {
            set({ isLoading: false })
            return { success: false, error: error.message }
          }

          if (data.user) {
            // Profile should be auto-created by database trigger
            await get().fetchProfile()
          }

          set({ isLoading: false })
          return { success: true }
        } catch (error: any) {
          set({ isLoading: false })
          return { success: false, error: error.message || 'An error occurred' }
        }
      },

      // Reset password
      resetPassword: async (email: string) => {
        const supabase = createClient()

        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          })

          if (error) {
            return { success: false, error: error.message }
          }

          return { success: true }
        } catch (error: any) {
          return { success: false, error: error.message || 'An error occurred' }
        }
      },

      // Update user profile
      updateProfile: async (updates: Partial<User>) => {
        const supabase = createClient()
        const currentUser = get().user

        if (!currentUser) {
          return { success: false, error: 'No user logged in' }
        }

        try {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', currentUser.id)

          if (error) {
            return { success: false, error: error.message }
          }

          // Refetch profile to get updated data
          await get().fetchProfile()

          return { success: true }
        } catch (error: any) {
          return { success: false, error: error.message || 'An error occurred' }
        }
      },

      // Logout
      logout: async () => {
        const supabase = createClient()

        try {
          await supabase.auth.signOut()
          set({
            user: null,
            isAuthenticated: false,
          })
        } catch (error) {
          console.error('Error logging out:', error)
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
