'use server';

import { verifyAdminAndGetClient } from '@/lib/admin-auth';
import { logAdminAction } from './audit';

export async function createOrganization(name: string, description?: string) {
  try {
    if (!name.trim()) {
      return { error: 'Organization name is required' };
    }

    const { client, admin } = await verifyAdminAndGetClient();

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' };
    }

    // Create the organization
    const { data, error } = await client!
      .from('organizations')
      .insert({
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'org.create',
      resourceType: 'organization',
      resourceId: data.id,
      details: { name, description }
    });

    return { success: true, data };
  } catch (error) {
    console.error('Failed to create organization:', error);
    return { error: 'Failed to create organization' };
  }
}

export async function softDeleteOrganization(orgId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient();

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' };
    }

    // Soft delete the organization
    const { error } = await client!
      .from('organizations')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', orgId);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'org.soft_delete',
      resourceType: 'organization',
      resourceId: orgId,
      details: { deleted_at: new Date().toISOString() }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to soft delete organization:', error);
    return { error: 'Failed to soft delete organization' };
  }
}

export async function addMemberToOrganization(orgId: string, userId: string, role: string) {
  try {
    if (!['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'].includes(role)) {
      return { error: 'Invalid role' };
    }

    const { client, admin } = await verifyAdminAndGetClient();

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' };
    }

    // Note: Member limits are now managed by Launch Darkly, not enforced here
    
    // Add member to organization
    const { error } = await client!
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role
      });

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'org.member_add',
      resourceType: 'organization_membership',
      details: { orgId, userId, role }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to add member:', error);
    return { error: 'Failed to add member' };
  }
}

export async function removeMemberFromOrganization(orgId: string, userId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient();

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' };
    }

    // Remove member from organization
    const { error } = await client!
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'org.member_remove',
      resourceType: 'organization_membership',
      details: { orgId, userId }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to remove member:', error);
    return { error: 'Failed to remove member' };
  }
}

export async function changeMemberRole(orgId: string, userId: string, newRole: string) {
  try {
    if (!['SuperAdmin', 'Admin', 'BillingContact', 'Editor', 'Viewer'].includes(newRole)) {
      return { error: 'Invalid role' };
    }

    const { client, admin } = await verifyAdminAndGetClient();

    if (!client) {
      return { error: 'Admin backend functionality not yet available in development mode' };
    }

    // Update member role
    const { error } = await client!
      .from('organization_members')
      .update({ role: newRole })
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'org.member_role_changed',
      resourceType: 'organization_membership',
      details: { orgId, userId, newRole }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to change member role:', error);
    return { error: 'Failed to change member role' };
  }
}
