'use server'

import { environmentsApi } from '@/lib/api-client'
import { revalidatePath } from 'next/cache'

export async function createEnvironment(formData: {
  organization_id: string
  name: string
  environment_type: 'production' | 'staging' | 'development'
  location?: string
  description?: string
}) {
  try {
    const environment = await environmentsApi.create({
      name: formData.name,
      org_id: formData.organization_id,
      type: formData.environment_type,
      description: formData.description
    });
    
    revalidatePath(`/organization/${formData.organization_id}`)
    revalidatePath('/')
    return { data: environment }
  } catch (error: any) {
    // Check if error message indicates upgrade needed
    const isLimitError = error.message?.toLowerCase().includes('limit') || 
                        error.message?.toLowerCase().includes('upgrade');
    
    return { 
      error: error.message || 'Failed to create environment',
      upgrade_required: isLimitError
    }
  }
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
  try {
    const environment = await environmentsApi.update(id, {
      name: formData.name,
      type: formData.environment_type,
      description: formData.description
    });
    
    // We need to get the org_id for revalidation - for now revalidate broadly
    revalidatePath('/organization')
    revalidatePath('/')
    return { data: environment }
  } catch (error: any) {
    return { error: error.message || 'Failed to update environment' }
  }
}

export async function deleteEnvironment(id: string, organizationId: string) {
  try {
    await environmentsApi.delete(id);
    
    revalidatePath(`/organization/${organizationId}`)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete environment' }
  }
}
