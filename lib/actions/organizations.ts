'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: { 
  name: string
  description?: string 
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ 
      name: formData.name, 
      description: formData.description,
      owner_id: user.id
    })
    .select()
    .single()
  
  if (orgError) {
    return { error: orgError.message }
  }
  
  // Add creator as SuperAdmin
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: user.id,
      role: 'SuperAdmin',
      environments_count: 0,
      zones_count: 0
    })
  
  if (memberError) {
    return { error: memberError.message }
  }
  
  revalidatePath('/')
  return { data: org }
}

export async function updateOrganization(
  id: string, 
  formData: { name: string; description?: string }
) {
  const supabase = await createClient()
  
  // First, check if user has permission to update this organization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Verify user has permission by checking membership
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', id)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin'].includes(membership.role)) {
    return { error: 'You do not have permission to update this organization. Only SuperAdmin and Admin roles can edit organizations.' }
  }
  
  // Perform the update
  const { data: updateData, error, count } = await supabase
    .from('organizations')
    .update({ 
      name: formData.name, 
      description: formData.description,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
  
  if (error) {
    return { error: error.message }
  }
  
  if (!updateData || updateData.length === 0) {
    return { error: 'Failed to update organization. Please check your permissions.' }
  }
  
  // Fetch the updated organization
  const { data: org, error: fetchError } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single()
  
  if (fetchError || !org) {
    // Update succeeded but fetch failed - still return success
    revalidatePath(`/organization/${id}`)
    revalidatePath('/')
    return { data: { id, name: formData.name, description: formData.description } }
  }
  
  revalidatePath(`/organization/${id}`)
  revalidatePath('/')
  return { data: org }
}

export async function deleteOrganization(id: string) {
  const supabase = await createClient()
  
  // First, check if user has permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Verify user has SuperAdmin or Admin permission
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', id)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin'].includes(membership.role)) {
    return { error: 'You do not have permission to delete this organization. Only SuperAdmin and Admin roles can delete organizations.' }
  }
  
  // Attempt to delete the organization
  const { error, count } = await supabase
    .from('organizations')
    .delete({ count: 'exact' })
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  // Check if any rows were actually deleted
  if (count === 0) {
    return { error: 'Failed to delete organization. It may have already been deleted or you lack permission.' }
  }
  
  revalidatePath('/')
  return { success: true }
}

