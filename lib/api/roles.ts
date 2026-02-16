'use server'

import { cookies } from 'next/headers'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Get user's role for a specific organization via Express API
 */
export async function getUserRoleInOrganization(organizationId: string) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('javelina_session')
    
    if (!sessionCookie) {
      return null
    }

    const response = await fetch(`${API_BASE_URL}/api/organizations/${organizationId}/role`, {
      method: 'GET',
      headers: {
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return null
    }

    const result = await response.json()
    return result.role || result.data?.role || null
  } catch (error) {
    console.error('Error fetching user role:', error)
    return null
  }
}

/**
 * Get all organizations with user's role via Express API
 */
export async function getUserOrganizationsWithRoles() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('javelina_session')
    
    if (!sessionCookie) {
      return []
    }

    const response = await fetch(`${API_BASE_URL}/api/organizations`, {
      method: 'GET',
      headers: {
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.data || result || []
  } catch (error) {
    console.error('Error fetching organizations with roles:', error)
    return []
  }
}

