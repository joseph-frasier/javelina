'use server'

import { zonesApi } from '@/lib/api-client'
import { revalidatePath } from 'next/cache'

export async function createZone(formData: {
  environment_id: string
  name: string
  zone_type: 'primary' | 'secondary' | 'redirect'
  description?: string
}) {
  try {
    const zone = await zonesApi.create({
      name: formData.name,
      env_id: formData.environment_id,
      type: formData.zone_type,
      description: formData.description
    });
    
    revalidatePath('/zone')
    revalidatePath('/organization')
    return { data: zone }
  } catch (error: any) {
    // Check if error message indicates upgrade needed
    const isLimitError = error.message?.toLowerCase().includes('limit') || 
                        error.message?.toLowerCase().includes('upgrade');
    
    return { 
      error: error.message || 'Failed to create zone',
      upgrade_required: isLimitError
    }
  }
}

export async function updateZone(
  id: string,
  formData: {
    name: string
    zone_type: 'primary' | 'secondary' | 'redirect'
    description?: string
    status?: 'active' | 'disabled' | 'archived'
  }
) {
  try {
    const zone = await zonesApi.update(id, {
      name: formData.name,
      type: formData.zone_type,
      description: formData.description
    });
    
    revalidatePath(`/zone/${id}`)
    revalidatePath('/zone')
    return { data: zone }
  } catch (error: any) {
    return { error: error.message || 'Failed to update zone' }
  }
}

export async function deleteZone(id: string) {
  try {
    await zonesApi.delete(id);
    
    revalidatePath('/zone')
    revalidatePath('/organization')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete zone' }
  }
}
