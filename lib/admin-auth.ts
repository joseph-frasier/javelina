'use server';

import { cookies } from 'next/headers';

// Use __Host- prefix only in production (requires HTTPS)
// In development, use regular cookie name
const ADMIN_COOKIE_NAME = process.env.NODE_ENV === 'production' 
  ? '__Host-admin_session' 
  : 'admin_session';
const SESSION_DURATION = 3600; // 1 hour
const ADMIN_EMAIL = 'admin@irongrove.com';
const ADMIN_PASSWORD = 'admin123';

// In-memory store for valid admin sessions (development use only)
// Use global to persist across module reloads in development
declare global {
  var __adminSessions: Set<string> | undefined;
}

const validAdminSessions = global.__adminSessions || new Set<string>();
global.__adminSessions = validAdminSessions;

export async function loginAdmin(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  // Hardcoded admin credentials check
  if (email.toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return { error: 'Invalid credentials' };
  }

  // Create session token
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

  // Store token in memory
  validAdminSessions.add(token);

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
    admin: { id: 'admin-user', email: ADMIN_EMAIL, name: 'Admin User' }
  };
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  // Check if token exists in memory
  if (validAdminSessions.has(token)) {
    return {
      token,
      admin_users: {
        id: 'admin-user',
        email: ADMIN_EMAIL,
        name: 'Admin User'
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

export async function verifyAdminAndGetClient() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Not authenticated as admin');
  }
  return { client: null, admin: session.admin_users };
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
