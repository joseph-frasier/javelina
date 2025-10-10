'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createZone(formData: {
  environment_id: string
  name: string
  zone_type: 'primary' | 'secondary' | 'redirect'
  description?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  const { data, error } = await supabase
    .from('zones')
    .insert({
      environment_id: formData.environment_id,
      name: formData.name,
      zone_type: formData.zone_type,
      description: formData.description,
      active: true,
      created_by: user.id
    })
    .select('*, environments(organization_id)')
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  const orgId = data.environments?.organization_id
  revalidatePath(`/organization/${orgId}`)
  revalidatePath(`/organization/${orgId}/environment/${formData.environment_id}`)
  return { data }
}

export async function updateZone(
  id: string,
  formData: {
    name: string
    zone_type: 'primary' | 'secondary' | 'redirect'
    description?: string
    active?: boolean
  }
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('zones')
    .update(formData)
    .eq('id', id)
    .select('*, environments(organization_id)')
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  const orgId = data.environments?.organization_id
  revalidatePath(`/organization/${orgId}`)
  revalidatePath(`/organization/${orgId}/environment/${data.environment_id}`)
  revalidatePath(`/zone/${id}`)
  return { data }
}

export async function deleteZone(id: string, environmentId: string, organizationId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('zones')
    .delete()
    .eq('id', id)
  
  if (error) {
    return { error: error.message }
  }
  
  revalidatePath(`/organization/${organizationId}`)
  revalidatePath(`/organization/${organizationId}/environment/${environmentId}`)
  return { success: true }
}

