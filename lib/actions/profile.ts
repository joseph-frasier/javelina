'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Profile data interface - matches the profiles table schema
 */
export interface ProfileData {
  id: string
  name: string | null
  email: string | null
  display_name?: string | null
  title?: string | null
  phone?: string | null
  timezone?: string | null
  bio?: string | null
  avatar_url?: string | null
  role: string
  mfa_enabled?: boolean | null
  sso_connected?: boolean | null
  last_login?: string | null
  created_at?: string
  updated_at?: string
  preferences?: Record<string, any> | null
  onboarding_completed?: boolean | null
  email_verified?: boolean | null
  notification_preferences?: Record<string, any> | null
  language?: string | null
  status?: string | null
  superadmin?: boolean | null
}

export interface OrganizationMembership {
  id: string
  name: string
  role: 'SuperAdmin' | 'Admin' | 'Editor' | 'Viewer'
}

export interface ProfileWithOrganizations extends ProfileData {
  organizations: OrganizationMembership[]
}

/**
 * Get the current user's profile with organization memberships
 * Express API Required: GET /api/users/profile
 */
export async function getProfile(): Promise<{ data?: ProfileWithOrganizations; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || data.message || 'Failed to fetch profile' }
    }

    return { data: data.data || data }
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch profile' }
  }
}

/**
 * Update the current user's profile
 * Express API Required: PUT /api/users/profile
 * 
 * Updatable fields (matching profiles table):
 * - name, display_name, title, phone, timezone, bio, avatar_url
 * - preferences, notification_preferences, language
 */
export async function updateProfile(formData: Partial<ProfileData>): Promise<{ data?: ProfileData; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      return { error: 'Not authenticated' }
    }

    const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || data.message || 'Failed to update profile' }
    }

    revalidatePath('/profile')
    revalidatePath('/')
    return { data: data.data || data }
  } catch (error: any) {
    return { error: error.message || 'Failed to update profile' }
  }
}
