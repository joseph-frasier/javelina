'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Get user's role for a specific organization
 */
export async function getUserRoleInOrganization(organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  const { data, error } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  
  if (error) {
    return null
  }
  
  return data?.role || null
}

/**
 * Get all organizations with user's role
 */
export async function getUserOrganizationsWithRoles() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return []
  }
  
  const { data, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      description,
      created_at,
      updated_at,
      organization_members!inner(role)
    `)
    .eq('organization_members.user_id', user.id)
    .order('name')
  
  if (error) {
    return []
  }
  
  // Flatten the role from nested structure
  return data.map(org => ({
    ...org,
    role: org.organization_members?.[0]?.role || 'Viewer'
  }))
}

