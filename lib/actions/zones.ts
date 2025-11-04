'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { canCreateResource } from '@/lib/entitlements'

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
  
  // Get organization ID from environment
  const { data: environment, error: envError } = await supabase
    .from('environments')
    .select('organization_id, org_id')
    .eq('id', formData.environment_id)
    .single()
  
  if (envError || !environment) {
    return { error: 'Environment not found' }
  }
  
  const orgId = environment.organization_id || environment.org_id
  
  // Verify user has permission
  const { data: membership, error: memberError } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .single()
  
  if (memberError || !membership) {
    return { error: 'You do not have access to this organization' }
  }
  
  if (!['SuperAdmin', 'Admin', 'Editor'].includes(membership.role)) {
    return { error: 'You do not have permission to create zones' }
  }
  
  // Check entitlement limits
  const limitCheck = await canCreateResource(orgId, 'zone')
  if (!limitCheck.canCreate) {
    return { 
      error: limitCheck.reason || 'Zone limit reached. Please upgrade your plan to create more zones.',
      upgrade_required: true 
    }
  }
  
  // Validate zone name
  if (!formData.name.trim()) {
    return { error: 'Zone name is required' }
  }
  
  // Check for global zone name uniqueness
  const { data: nameExists } = await supabase
    .rpc('check_zone_name_exists', { zone_name: formData.name.trim() })
  
  const isLive = !nameExists
  
  // Create the zone
  const { data, error } = await supabase
    .from('zones')
    .insert({
      environment_id: formData.environment_id,
      name: formData.name.trim(),
      zone_type: formData.zone_type,
      description: formData.description?.trim() || null,
      active: true,
      live: isLive,
      created_by: user.id
    })
    .select('*, environments(organization_id, org_id)')
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  // If zone was flagged for review (live=false), create audit log entry
  if (!isLive) {
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: data.id,
        action: 'zone.flagged_for_review',
        new_data: data,
        user_id: user.id,
        metadata: {
          reason: 'duplicate_name',
          zone_name: formData.name.trim(),
          flagged_at: new Date().toISOString()
        }
      })
  }
  
  const returnedOrgId = data.environments?.organization_id || data.environments?.org_id
  revalidatePath(`/organization/${returnedOrgId}`)
  revalidatePath(`/organization/${returnedOrgId}/environment/${formData.environment_id}`)
  return { data, flagged: !isLive }
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
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Validate zone name
  if (!formData.name.trim()) {
    return { error: 'Zone name is required' }
  }
  
  // Update zone
  const { data, error } = await supabase
    .from('zones')
    .update({
      name: formData.name.trim(),
      zone_type: formData.zone_type,
      description: formData.description?.trim() || null,
      active: formData.active ?? true,
      updated_at: new Date().toISOString()
    })
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
  revalidatePath('/')
  return { data }
}

export async function deleteZone(id: string, environmentId: string, organizationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: 'Not authenticated' }
  }
  
  // Soft delete the zone by setting deleted_at timestamp
  const { data, error } = await supabase
    .from('zones')
    .update({ 
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    return { error: error.message }
  }
  
  // Create audit log entry for zone archival
  await supabase
    .from('audit_logs')
    .insert({
      table_name: 'zones',
      record_id: id,
      action: 'zone.archived',
      old_data: data,
      user_id: user.id,
      metadata: {
        archived_at: new Date().toISOString(),
        environment_id: environmentId,
        organization_id: organizationId
      }
    })
  
  revalidatePath(`/organization/${organizationId}`)
  revalidatePath(`/organization/${organizationId}/environment/${environmentId}`)
  return { success: true }
}

