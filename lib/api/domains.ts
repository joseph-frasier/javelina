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
  organization_id: string | null;
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

// Returns domains for the given org (and the caller's own legacy domains). With no
// orgId, returns just the caller's own domains (legacy behavior).
export async function listUserDomains(orgId?: string): Promise<DomainRow[]> {
  try {
    const path = orgId ? `/api/domains?org_id=${encodeURIComponent(orgId)}` : '/api/domains';
    const res = await authedFetch(path);
    if (!res.ok) return [];
    const json = await res.json();
    const all: DomainRow[] = json?.data?.domains ?? json?.domains ?? [];
    return all;
  } catch (err) {
    console.error('[domains api]', err);
    return [];
  }
}
