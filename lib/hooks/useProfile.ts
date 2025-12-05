'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from './useUser'

export type UserRole = 'user' | 'superuser'
export type RBACRole = 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'

export interface Organization {
  id: string
  name: string
  role: RBACRole
  environments_count: number
  zones_count: number
}

export interface Profile {
  id: string
  name: string | null
  email: string | null
  display_name: string | null
  title: string | null
  phone: string | null
  timezone: string | null
  bio: string | null
  avatar_url: string | null
  role: UserRole
  mfa_enabled: boolean | null
  sso_connected: boolean | null
  last_login: string | null
  created_at: string
  updated_at: string
  organizations?: Organization[]
}

/**
 * Hook to get the current user's profile with organizations
 * 
 * Returns:
 * - profile: The user's profile data from the profiles table
 * - loading: Whether the profile is still loading
 * - error: Any error that occurred while fetching
 * - refetch: Function to manually refetch the profile
 * 
 * Automatically fetches the profile when the user changes.
 */
export function useProfile() {
  const { user } = useUser()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError) throw profileError

      // Fetch organizations the user belongs to
      const { data: memberships, error: membershipsError } = await supabase
        .from('organization_members')
        .select(
          `
          role,
          organizations:organization_id (
            id,
            name
          )
        `
        )
        .eq('user_id', user.id)

      if (membershipsError) throw membershipsError

      // Map organization memberships to Organization interface
      const organizations: Organization[] = (memberships || []).map((m: any) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        role: m.role,
        environments_count: 0, // Deprecated - will be removed
        zones_count: 0, // Will be fetched separately when needed
      }))

      setProfile({
        ...profileData,
        organizations,
      })
    } catch (err: any) {
      console.error('Error fetching profile:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  return { profile, loading, error, refetch: fetchProfile }
}

