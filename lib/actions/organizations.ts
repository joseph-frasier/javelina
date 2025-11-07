'use server'

import { organizationsApi } from '@/lib/api-client'
import { revalidatePath } from 'next/cache'

export async function createOrganization(formData: { 
  name: string
  description?: string 
}) {
  try {
    const org = await organizationsApi.create({
      name: formData.name,
      description: formData.description
    })
    
    revalidatePath('/')
    return { data: org }
  } catch (error: any) {
    return { error: error.message || 'Failed to create organization' }
  }
}

export async function updateOrganization(
  id: string, 
  formData: { name: string; description?: string }
) {
  try {
    const org = await organizationsApi.update(id, {
      name: formData.name,
      description: formData.description
    })
    
    revalidatePath(`/organization/${id}`)
    revalidatePath('/')
    return { data: org }
  } catch (error: any) {
    return { error: error.message || 'Failed to update organization' }
  }
}

export async function deleteOrganization(id: string) {
  try {
    await organizationsApi.delete(id)
    
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete organization' }
  }
}

