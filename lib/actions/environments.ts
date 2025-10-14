'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  
  const { data, error } = await supabase
    .from('environments')
    .insert({
      organization_id: formData.organization_id,
      name: formData.name,
      environment_type: formData.environment_type,
      location: formData.location,
      description: formData.description,
      status: 'active',
      created_by: user.id
    })
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${formData.organization_id}`)
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
  
  const { data, error } = await supabase
    .from('environments')
    .update(formData)
    .eq('id', id)
    .select('*, organizations(*)')
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${data.organization_id}`)
  revalidatePath(`/organization/${data.organization_id}/environment/${id}`)
  return { data }
}

export async function deleteEnvironment(id: string, organizationId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('environments')
    .delete()
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${organizationId}`)
  return { success: true }
}

