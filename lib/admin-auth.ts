'use server';

import { cookies } from 'next/headers';
import { createServiceRoleClient } from './supabase/service-role';

const ADMIN_COOKIE_NAME = '__Host-admin_session';
const SESSION_DURATION = 3600; // 1 hour

export async function loginAdmin(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  const serviceClient = createServiceRoleClient();

  // Find admin user
  const { data: admin, error } = await serviceClient
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !admin) {
    return { error: 'Invalid credentials' };
  }

  // Verify password using Supabase auth
  const { data: authData, error: authError } = await serviceClient.auth.signInWithPassword({
    email,
    password
  });

  if (authError || !authData.session) {
    return { error: 'Invalid credentials' };
  }

  // Create session token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  await serviceClient.from('admin_sessions').insert({
    admin_user_id: admin.id,
    token,
    expires_at: expiresAt.toISOString(),
    ip_address: ip,
    user_agent: userAgent
  });

  // Update last login
  await serviceClient
    .from('admin_users')
    .update({
      last_login: new Date().toISOString()
    })
    .eq('id', admin.id);

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/admin'
  });

  return {
    success: true,
    admin: { id: admin.id, email: admin.email, name: admin.name }
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const serviceClient = createServiceRoleClient();
  const { data: session, error } = await serviceClient
    .from('admin_sessions')
    .select('*, admin_users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !session) return null;

  return session;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  
  if (token) {
    const serviceClient = createServiceRoleClient();
    await serviceClient.from('admin_sessions').delete().eq('token', token);
  }
  
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function verifyAdminAndGetClient() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Not authenticated as admin');
  }
  return { client: createServiceRoleClient(), admin: session.admin_users };
}

export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;
  return session.admin_users;
}
