'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createZone(formData: {
  organization_id: string
  name: string
  description?: string
  admin_email?: string
  negative_caching_ttl?: number
}) {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/zones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        organization_id: formData.organization_id,
        description: formData.description,
        admin_email: formData.admin_email,
        negative_caching_ttl: formData.negative_caching_ttl
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create zone');
    }

    const zone = data.data || data;
    
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
    description?: string
    admin_email?: string
    negative_caching_ttl?: number
  }
) {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/zones/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        admin_email: formData.admin_email,
        negative_caching_ttl: formData.negative_caching_ttl
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update zone');
    }

    const zone = data.data || data;
    
    revalidatePath(`/zone/${id}`)
    revalidatePath('/zone')
    return { data: zone }
  } catch (error: any) {
    return { error: error.message || 'Failed to update zone' }
  }
}

export async function deleteZone(id: string) {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/zones/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to delete zone');
    }
    
    revalidatePath('/zone')
    revalidatePath('/organization')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete zone' }
  }
}
