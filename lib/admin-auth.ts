'use server';

import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { SignJWT, jwtVerify } from 'jose';

// Admin authentication using Supabase with superadmin flag verification
// Only users with profiles.superadmin = true can access the admin panel
//
// The admin session is stored as a JWT in a cookie so that BOTH the Next.js
// frontend and the Express backend can independently verify it using the
// shared ADMIN_JWT_SECRET. This is a bandaid until admin is migrated to Auth0.

// Use __Host- prefix only in production (requires HTTPS)
// In development, use regular cookie name
const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';
const SESSION_DURATION = 3600; // 1 hour

// Shared secret for signing/verifying admin JWTs
// Must be the same value in both Next.js and Express backend
function getJwtSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET environment variable is required');
  }
  return new TextEncoder().encode(secret);
}

async function signAdminJwt(payload: {
  userId: string;
  email: string;
  name: string | null;
}): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    email: payload.email,
    name: payload.name,
    isSuperAdmin: true,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .setIssuer('javelina-admin')
    .sign(getJwtSecret());
}

async function verifyAdminJwt(token: string): Promise<{
  userId: string;
  email: string;
  name: string | null;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      issuer: 'javelina-admin',
    });
    
    if (!payload.userId || !payload.email || payload.isSuperAdmin !== true) {
      return null;
    }

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
    };
  } catch {
    // Token expired, invalid signature, etc.
    return null;
  }
}

export async function loginAdmin(
  email: string,
  password: string,
  captchaToken?: string | null,
  ip?: string,
  userAgent?: string
) {
  const supabase = await createClient();

  // Authenticate with Supabase (including captcha token if provided)
  const authOptions: any = {
    email,
    password,
  };

  // Add captcha token if provided
  if (captchaToken) {
    authOptions.options = {
      captchaToken,
    };
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword(authOptions);

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

  // Create signed JWT session token
  const token = await signAdminJwt({
    userId: profile.id,
    email: profile.email,
    name: profile.name,
  });

  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    expires: expiresAt,
    path: '/' // Allow cookie to be sent to all routes including /api
  });

  return {
    success: true,
    admin: { id: profile.id, email: profile.email, name: profile.name || 'Admin User' },
    token, // Returned so the client can store it for Authorization header (cross-domain)
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  // Verify JWT and extract user data
  const userData = await verifyAdminJwt(token);
  if (!userData) return null;

  return {
    token,
    admin_users: {
      id: userData.userId,
      email: userData.email,
      name: userData.name || 'Admin User'
    }
  };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
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
  const result = await verifyAdminJwt(token);
  return result !== null;
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
