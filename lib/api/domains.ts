'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DomainRow {
  id: string;
  domain_name: string;
  status: string | null;
  registered_at: string | null;
  expires_at: string | null;
  auto_renew: boolean | null;
  is_primary: boolean | null;
  registrar: string | null;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers, cache: 'no-store' });
}

// Returns all domains owned by the authenticated user. The domains table
// has no organization_id column, so callers wanting to scope to an org
// must filter client-side using the org's intake-recorded domain.
export async function listUserDomains(): Promise<DomainRow[]> {
  try {
    const res = await authedFetch('/api/domains');
    if (!res.ok) return [];
    const json = await res.json();
    const all: DomainRow[] = json?.data?.domains ?? json?.domains ?? [];
    return all;
  } catch (err) {
    console.error('[domains api]', err);
    return [];
  }
}
