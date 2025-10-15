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
  
  const { data, error } = await supabase
    .from('organizations')
    .update({ 
      name: formData.name, 
      description: formData.description 
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${id}`)
  return { data }
}

export async function deleteOrganization(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath('/')
  return { success: true }
}

