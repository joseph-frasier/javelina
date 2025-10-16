'use server';

import { verifyAdminAndGetClient, getAdminSession } from '@/lib/admin-auth';
import { logAdminAction } from './audit';

export async function disableUser(userId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient();

    // Disable the user
    const { error } = await client
      .from('profiles')
      .update({ status: 'disabled' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'user.disable',
      resourceType: 'user',
      resourceId: userId,
      details: { status: 'disabled' }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to disable user:', error);
    return { error: 'Failed to disable user' };
  }
}

export async function enableUser(userId: string) {
  try {
    const { client, admin } = await verifyAdminAndGetClient();

    // Enable the user
    const { error } = await client
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'user.enable',
      resourceType: 'user',
      resourceId: userId,
      details: { status: 'active' }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to enable user:', error);
    return { error: 'Failed to enable user' };
  }
}

export async function sendPasswordResetEmail(email: string) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return { error: 'Not authenticated as admin' };
    }

    const { client, admin } = await verifyAdminAndGetClient();

    // Use Supabase admin API to trigger password reset
    const { error } = await client.auth.admin.resetPasswordForEmail(email);

    if (error) {
      return { error: error.message };
    }

    // Log the action
    await logAdminAction({
      actorId: admin.id,
      action: 'user.password_reset_sent',
      resourceType: 'user',
      details: { email }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { error: 'Failed to send password reset email' };
  }
}
