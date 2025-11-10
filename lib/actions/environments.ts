'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createEnvironment(formData: {
  organization_id: string
  name: string
  environment_type: 'production' | 'staging' | 'development'
  location?: string
  description?: string
}) {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/environments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        organization_id: formData.organization_id,
        environment_type: formData.environment_type,
        description: formData.description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create environment');
    }

    const environment = data.data || data;
    
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
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/environments/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        environment_type: formData.environment_type,
        description: formData.description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update environment');
    }

    const environment = data.data || data;
    
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
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/environments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to delete environment');
    }
    
    revalidatePath(`/organization/${organizationId}`)
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete environment' }
  }
}
