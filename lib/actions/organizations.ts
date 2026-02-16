'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createOrganization(formData: { 
  name: string
  description?: string
  billing_phone?: string
  billing_email?: string
  billing_address?: string
  billing_city?: string
  billing_state?: string
  billing_zip?: string
  admin_contact_email?: string
  admin_contact_phone?: string
}) {
  try {
    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('javelina_session')
    
    if (!sessionCookie) {
      throw new Error('Not authenticated')
    }

    // Make API call with session cookie
    const response = await fetch(`${API_BASE_URL}/api/organizations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        billing_phone: formData.billing_phone,
        billing_email: formData.billing_email,
        billing_address: formData.billing_address,
        billing_city: formData.billing_city,
        billing_state: formData.billing_state,
        billing_zip: formData.billing_zip,
        admin_contact_email: formData.admin_contact_email,
        admin_contact_phone: formData.admin_contact_phone,
      }),
      cache: 'no-store',
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
  formData: { 
    name?: string; 
    description?: string;
    billing_phone?: string;
    billing_email?: string;
    billing_address?: string;
    billing_city?: string;
    billing_state?: string;
    billing_zip?: string;
    admin_contact_email?: string;
    admin_contact_phone?: string;
  }
) {
  try {
    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('javelina_session')
    
    if (!sessionCookie) {
      throw new Error('Not authenticated')
    }

    // Make API call with session cookie
    const response = await fetch(`${API_BASE_URL}/api/organizations/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      body: JSON.stringify({
        name: formData.name,
        description: formData.description,
        billing_phone: formData.billing_phone,
        billing_email: formData.billing_email,
        billing_address: formData.billing_address,
        billing_city: formData.billing_city,
        billing_state: formData.billing_state,
        billing_zip: formData.billing_zip,
        admin_contact_email: formData.admin_contact_email,
        admin_contact_phone: formData.admin_contact_phone,
      }),
      cache: 'no-store',
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
    // Get session cookie
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('javelina_session')
    
    if (!sessionCookie) {
      throw new Error('Not authenticated')
    }

    // Make API call with session cookie
    const response = await fetch(`${API_BASE_URL}/api/organizations/${id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
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
