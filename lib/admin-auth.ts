'use server';

import { cookies } from 'next/headers';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'javelina_session';

/**
 * Check if the current user has an active Auth0 session and is a superadmin.
 * Calls the backend /api/admin/me endpoint which validates the session cookie
 * and checks profiles.superadmin in the database.
 */
export async function getAdminSession(): Promise<{
  admin_users: { id: string; email: string; name: string };
} | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) return null;

  try {
    const response = await fetch(`${API_URL}/api/admin/me`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie}`,
      },
      cache: 'no-store',
    });

    if (!response.ok) return null;

    const result = await response.json();
    const data = result.data;

    return {
      admin_users: {
        id: data.id,
        email: data.email,
        name: data.name,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get the admin user from the current session.
 */
export async function getAdminUser() {
  const session = await getAdminSession();
  if (!session) return null;
  return session.admin_users;
}
