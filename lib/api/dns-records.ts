'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface DnsRecordRow {
  id: string;
  zone_id: string;
  type: string;
  name: string;
  content: string;
  ttl: number | null;
  priority?: number | null;
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

export async function listDnsRecordsForZone(zoneId: string): Promise<DnsRecordRow[]> {
  try {
    const res = await authedFetch(`/api/dns-records/zone/${zoneId}`);
    if (!res.ok) return [];
    const json = await res.json();
    return json?.data?.records ?? json?.records ?? [];
  } catch (err) {
    console.error('[dns-records api]', err);
    return [];
  }
}
