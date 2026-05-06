'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ZoneRow {
  id: string;
  name: string;
  organization_id: string;
  status?: string | null;
  soa_serial?: number | null;
  last_valid_serial?: number | null;
  created_at?: string | null;
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

export async function listZonesForOrg(orgId: string): Promise<ZoneRow[]> {
  try {
    const res = await authedFetch(`/api/zones/organization/${orgId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.zones ?? json?.zones ?? [];
  } catch (err) {
    console.error('[zones api]', err);
    return [];
  }
}
