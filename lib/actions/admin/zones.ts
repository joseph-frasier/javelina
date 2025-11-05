'use server'

import { verifyAdminAndGetClient, logAdminAction } from '@/lib/admin-auth'

/**
 * Approve a flagged zone (set live = true)
 */
export async function approveFlaggedZone(zoneId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient()

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' }
    }

    // Update the zone to set live = true
    const { data, error } = await client
      .from('zones')
      .update({ live: true, updated_at: new Date().toISOString() })
      .eq('id', zoneId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    // Log the admin action
    await logAdminAction({
      actorId: admin.id,
      action: 'zone.approved',
      resourceType: 'zone',
      resourceId: zoneId,
      details: { zone_name: data.name, approved_at: new Date().toISOString() }
    })

    // Create audit log entry for zone approval
    await client
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: zoneId,
        action: 'zone.approved',
        new_data: data,
        metadata: {
          approved_by_admin: admin.id,
          approved_at: new Date().toISOString(),
          previous_live_status: false
        }
      })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to approve flagged zone:', error)
    return { error: 'Failed to approve flagged zone' }
  }
}

/**
 * Rename a flagged zone
 */
export async function renameFlaggedZone(zoneId: string, newName: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient()

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' }
    }

    // Check if new name already exists globally
    const { data: existingZone } = await client
      .from('zones')
      .select('id')
      .eq('name', newName)
      .is('deleted_at', null)
      .limit(1)
      .single()

    if (existingZone) {
      return { error: `A zone with the name "${newName}" already exists` }
    }

    // Get the old zone data
    const { data: oldZone } = await client
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    // Update the zone name
    const { data, error } = await client
      .from('zones')
      .update({ 
        name: newName, 
        live: true, // Also approve it when renaming
        updated_at: new Date().toISOString() 
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    // Log the admin action
    await logAdminAction({
      actorId: admin.id,
      action: 'zone.renamed',
      resourceType: 'zone',
      resourceId: zoneId,
      details: { 
        old_name: oldZone?.name, 
        new_name: newName,
        renamed_at: new Date().toISOString() 
      }
    })

    // Create audit log entry for zone renaming
    await client
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: zoneId,
        action: 'zone.renamed',
        old_data: oldZone,
        new_data: data,
        metadata: {
          renamed_by_admin: admin.id,
          renamed_at: new Date().toISOString(),
          old_name: oldZone?.name,
          new_name: newName
        }
      })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to rename flagged zone:', error)
    return { error: 'Failed to rename flagged zone' }
  }
}

/**
 * Delete a flagged zone (soft delete)
 */
export async function deleteFlaggedZone(zoneId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient()

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' }
    }

    // Get zone data before deletion
    const { data: zone } = await client
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    // Soft delete the zone
    const { data, error } = await client
      .from('zones')
      .update({ 
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    // Log the admin action
    await logAdminAction({
      actorId: admin.id,
      action: 'zone.deleted',
      resourceType: 'zone',
      resourceId: zoneId,
      details: { 
        zone_name: zone?.name, 
        deleted_at: new Date().toISOString() 
      }
    })

    // Create audit log entry for zone deletion
    await client
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: zoneId,
        action: 'zone.archived',
        old_data: zone,
        new_data: data,
        metadata: {
          deleted_by_admin: admin.id,
          deleted_at: new Date().toISOString(),
          reason: 'admin_deleted_flagged_zone'
        }
      })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to delete flagged zone:', error)
    return { error: 'Failed to delete flagged zone' }
  }
}

/**
 * Restore a soft-deleted zone
 */
export async function restoreZone(zoneId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient()

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' }
    }

    // Get zone data before restoration
    const { data: zone } = await client
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .single()

    // Restore the zone
    const { data, error } = await client
      .from('zones')
      .update({ 
        deleted_at: null,
        updated_at: new Date().toISOString() 
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (error) {
      return { error: error.message }
    }

    // Log the admin action
    await logAdminAction({
      actorId: admin.id,
      action: 'zone.restored',
      resourceType: 'zone',
      resourceId: zoneId,
      details: { 
        zone_name: zone?.name, 
        restored_at: new Date().toISOString() 
      }
    })

    // Create audit log entry for zone restoration
    await client
      .from('audit_logs')
      .insert({
        table_name: 'zones',
        record_id: zoneId,
        action: 'zone.restored',
        old_data: zone,
        new_data: data,
        metadata: {
          restored_by_admin: admin.id,
          restored_at: new Date().toISOString()
        }
      })

    return { success: true, data }
  } catch (error) {
    console.error('Failed to restore zone:', error)
    return { error: 'Failed to restore zone' }
  }
}

/**
 * Get all flagged zones (live = false)
 */
export async function getFlaggedZones() {
  try {
    const { client } = await verifyAdminAndGetClient()

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' }
    }

    const { data, error } = await client
      .from('zones')
      .select(`
        *,
        environments!inner(
          id,
          name,
          environment_type,
          organization_id,
          organizations!inner(
            id,
            name
          )
        )
      `)
      .eq('live', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) {
      return { error: error.message }
    }

    return { data }
  } catch (error) {
    console.error('Failed to get flagged zones:', error)
    return { error: 'Failed to get flagged zones' }
  }
}

