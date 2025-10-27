'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canCreateResource } from '@/lib/entitlements'

export async function createEnvironment(formData: {
  organization_id: string
  name: string
  environment_type: 'production' | 'staging' | 'development'
  location?: string
  description?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Verify user has permission (SuperAdmin, Admin, or Editor)
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', formData.organization_id)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin', 'Editor'].includes(membership.role)) {
    return { error: 'You do not have permission to create environments. Only SuperAdmin, Admin, and Editor roles can create environments.' }
  }
  
  // Check entitlement limits
  const limitCheck = await canCreateResource(formData.organization_id, 'environment')
  if (!limitCheck.canCreate) {
    return { 
      error: limitCheck.reason || 'Environment limit reached. Please upgrade your plan to create more environments.',
      upgrade_required: true 
    }
  }
  
  // Validate environment name
  if (!formData.name.trim()) {
    return { error: 'Environment name is required' }
  }
  
  if (formData.name.length > 100) {
    return { error: 'Environment name must be 100 characters or less' }
  }
  
  // Check for duplicate environment name within the organization
  const { data: existingEnv, error: checkError } = await supabase
    .from('environments')
    .select('id')
    .eq('organization_id', formData.organization_id)
    .ilike('name', formData.name.trim())
    .limit(1)
  
  if (checkError) {
    return { error: `Failed to check for duplicates: ${checkError.message}` }
  }
  
  if (existingEnv && existingEnv.length > 0) {
    return { error: `An environment with the name "${formData.name}" already exists in this organization` }
  }
  
  // Validate environment_type
  const validTypes = ['production', 'staging', 'development']
  if (!validTypes.includes(formData.environment_type)) {
    return { error: 'Environment type must be production, staging, or development' }
  }
  
  // Create environment
  const { data, error } = await supabase
    .from('environments')
    .insert({
      organization_id: formData.organization_id,
      name: formData.name.trim(),
      environment_type: formData.environment_type,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      status: 'active',
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${formData.organization_id}`)
  revalidatePath('/')
  return { data }
}

export async function updateEnvironment(
  id: string,
  formData: {
    name: string
    environment_type: 'production' | 'staging' | 'development'
    location?: string
    description?: string
    status?: 'active' | 'disabled' | 'archived'
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // First, get the environment to find its organization
  const { data: environment, error: envFetchError } = await supabase
    .from('environments')
    .select('organization_id')
    .eq('id', id)
    .single()
  
  if (envFetchError || !environment) {
    return { error: 'Environment not found' }
  }
  
  // Verify user has permission (SuperAdmin, Admin, or Editor)
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', environment.organization_id)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin', 'Editor'].includes(membership.role)) {
    return { error: 'You do not have permission to update environments. Only SuperAdmin, Admin, and Editor roles can update environments.' }
  }
  
  // Validate environment name
  if (!formData.name.trim()) {
    return { error: 'Environment name is required' }
  }
  
  if (formData.name.length > 100) {
    return { error: 'Environment name must be 100 characters or less' }
  }
  
  // Check for duplicate environment name within the organization (excluding current environment)
  const { data: existingEnv, error: checkError } = await supabase
    .from('environments')
    .select('id')
    .eq('organization_id', environment.organization_id)
    .ilike('name', formData.name.trim())
    .neq('id', id)
    .limit(1)
  
  if (checkError) {
    return { error: `Failed to check for duplicates: ${checkError.message}` }
  }
  
  if (existingEnv && existingEnv.length > 0) {
    return { error: `An environment with the name "${formData.name}" already exists in this organization` }
  }
  
  // Validate environment_type
  const validTypes = ['production', 'staging', 'development']
  if (!validTypes.includes(formData.environment_type)) {
    return { error: 'Environment type must be production, staging, or development' }
  }
  
  // Validate status if provided
  if (formData.status) {
    const validStatuses = ['active', 'disabled', 'archived']
    if (!validStatuses.includes(formData.status)) {
      return { error: 'Status must be active, disabled, or archived' }
    }
  }
  
  // Perform the update
  const { data: updateData, error } = await supabase
    .from('environments')
    .update({
      name: formData.name.trim(),
      environment_type: formData.environment_type,
      location: formData.location?.trim() || null,
      description: formData.description?.trim() || null,
      status: formData.status || 'active',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
  
  if (error) {
    return { error: error.message }
  }
  
  if (!updateData || updateData.length === 0) {
    return { error: 'Failed to update environment. Please check your permissions.' }
  }
  
  // Fetch the updated environment
  const { data: updatedEnv, error: fetchError } = await supabase
    .from('environments')
    .select('*')
    .eq('id', id)
    .single()
  
  if (fetchError || !updatedEnv) {
    // Update succeeded but fetch failed - still return success
    revalidatePath(`/organization/${environment.organization_id}`)
    revalidatePath(`/organization/${environment.organization_id}/environment/${id}`)
    revalidatePath('/')
    return { data: { id, ...formData } }
  }
  
  revalidatePath(`/organization/${environment.organization_id}`)
  revalidatePath(`/organization/${environment.organization_id}/environment/${id}`)
  revalidatePath('/')
  return { data: updatedEnv }
}

export async function deleteEnvironment(id: string, organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Verify user has permission (SuperAdmin or Admin only)
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin'].includes(membership.role)) {
    return { error: 'You do not have permission to delete environments. Only SuperAdmin and Admin roles can delete environments.' }
  }
  
  // Attempt to delete the environment (zones will be cascade deleted)
  const { error, count } = await supabase
    .from('environments')
    .delete({ count: 'exact' })
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  // Check if any rows were actually deleted
  if (count === 0) {
    return { error: 'Failed to delete environment. It may have already been deleted or you lack permission.' }
  }
  
  revalidatePath(`/organization/${organizationId}`)
  revalidatePath('/')
  return { success: true }
}

