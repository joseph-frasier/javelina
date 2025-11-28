'use server';

import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

// Admin authentication using Supabase with superadmin flag verification
// Only users with profiles.superadmin = true can access the admin panel

// Use __Host- prefix only in production (requires HTTPS)
// In development, use regular cookie name
const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';
const SESSION_DURATION = 3600; // 1 hour

// Dev-only bypass credentials (only works in development)
const DEV_ADMIN_EMAIL = 'admin@irongrove.com';
const DEV_ADMIN_PASSWORD = 'admin123';

// In-memory store for valid admin sessions with user data
// Use global to persist across module reloads in development
declare global {
  var __adminSessions: Map<string, { id: string; email: string; name: string | null }> | undefined;
}

// Ensure we always have a Map (not a Set from old code)
if (!global.__adminSessions || !(global.__adminSessions instanceof Map)) {
  global.__adminSessions = new Map<string, { id: string; email: string; name: string | null }>();
}
const validAdminSessions = global.__adminSessions;

export async function loginAdmin(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  // DEV-ONLY: Bypass Supabase auth for quick development access
  if (process.env.NODE_ENV === 'development' && 
      email === DEV_ADMIN_EMAIL && 
      password === DEV_ADMIN_PASSWORD) {
    console.log('[Admin Auth] DEV MODE: Bypassing Supabase authentication');
    
    // Create a fake dev admin session
    const devAdminId = 'dev-admin-00000000-0000-0000-0000-000000000000';
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

    // Store token with dev user data in memory
    validAdminSessions.set(token, {
      id: devAdminId,
      email: DEV_ADMIN_EMAIL,
      name: 'Dev Admin',
    });

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Dev mode
      sameSite: 'strict',
      expires: expiresAt,
      path: '/'
    });

    return {
      success: true,
      admin: { id: devAdminId, email: DEV_ADMIN_EMAIL, name: 'Dev Admin' }
    };
  }

  const supabase = await createClient();

  // Authenticate with Supabase
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: 'Invalid credentials' };
  }

  // Check if user has superadmin flag
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, name, superadmin')
    .eq('id', authData.user.id)
    .single();

  if (profileError || !profile) {
    // Sign out the user since they can't access admin panel
    await supabase.auth.signOut();
    return { error: 'Failed to verify admin status' };
  }

  if (!profile.superadmin) {
    // Sign out the user since they're not a superadmin
    await supabase.auth.signOut();
    return { error: 'Access denied: SuperAdmin privileges required' };
  }

  // Create session token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  // Store token with user data in memory
  validAdminSessions.set(token, {
    id: profile.id,
    email: profile.email,
    name: profile.name,
  });

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/' // Allow cookie to be sent to all routes including /api
  });

  return {
    success: true,
    admin: { id: profile.id, email: profile.email, name: profile.name || 'Admin User' }
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  // Check if token exists in memory and get user data
  const userData = validAdminSessions.get(token);
  if (userData) {
    return {
      token,
      admin_users: {
        id: userData.id,
        email: userData.email,
        name: userData.name || 'Admin User'
      }
    };
  }

  return null;
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  
  if (token) {
    // Remove token from memory
    validAdminSessions.delete(token);
  }
  
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

export async function verifyAdminAndGetClient(): Promise<{ 
  client: SupabaseClient | null; 
  admin: { id: string; email: string } 
}> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Not authenticated as admin');
  }
  
  // Use regular authenticated client - admins have access to all orgs via RLS
  const client = await createClient();
  return { client, admin: session.admin_users };
}

export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;
  return session.admin_users;
}

// Helper function to check if a token is valid (for API routes)
export async function isValidAdminToken(token: string): Promise<boolean> {
  return validAdminSessions.has(token);
}

// Log admin action to audit_logs table
export async function logAdminAction(params: {
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
}) {
  try {
    const client = await createClient();

    await client.from('audit_logs').insert({
      table_name: params.resourceType,
      record_id: params.resourceId,
      action: params.action,
      user_id: params.actorId,
      metadata: params.details || {},
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
}
