'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createOrganization(formData: { 
  name: string
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
    const response = await fetch(`${API_BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to create organization');
    }

    const org = data.data || data;
    
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
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to update organization');
    }

    const org = data.data || data;
    
    revalidatePath(`/organization/${id}`)
    revalidatePath('/')
    return { data: org }
  } catch (error: any) {
    return { error: error.message || 'Failed to update organization' }
  }
}

export async function deleteOrganization(id: string) {
  try {
    // Get session from server-side Supabase client (uses cookies)
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }

    // Make API call with auth token
    const response = await fetch(`${API_BASE_URL}/api/organizations/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || data.message || 'Failed to delete organization');
    }
    
    revalidatePath('/')
    return { success: true }
  } catch (error: any) {
    return { error: error.message || 'Failed to delete organization' }
  }
}
