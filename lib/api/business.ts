// javelina/lib/api/business.ts
'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface BusinessSummary {
  org_id: string;
  name: string;
  intake_started_at: string | null;
  intake_completed_at: string | null;
}

export interface BusinessDetail {
  org: {
    id: string;
    name: string;
    slug: string | null;
    status: string;
    created_at: string;
  };
  intake: Record<string, unknown> | null;
  provisioning: Array<{
    service: string;
    state: string;
    internal_state: string | null;
    progress_label: string | null;
    metadata: Record<string, unknown>;
    updated_at: string;
  }>;
  events: Array<{
    id: string;
    service: string;
    previous_state: string | null;
    new_state: string;
    message: string | null;
    actor_type: string;
    created_at: string;
  }>;
}

async function authedFetch(path: string, init?: RequestInit): Promise<Response> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (sessionCookie) {
    headers.set('Cookie', `javelina_session=${sessionCookie.value}`);
  }
  return fetch(`${API_BASE_URL}${path}`, { ...init, headers });
}

export async function listMyBusinesses(): Promise<BusinessSummary[]> {
  const res = await authedFetch('/api/business/me');
  if (!res.ok) return [];
  const json = await res.json();
  return json?.data?.businesses ?? [];
}

export async function getBusiness(orgId: string): Promise<BusinessDetail | null> {
  const res = await authedFetch(`/api/business/${orgId}`);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function upsertIntakeDraft(
  orgId: string,
  patch: Record<string, unknown>
): Promise<{ intake: Record<string, unknown> } | null> {
  const res = await authedFetch(`/api/business/${orgId}/intake`, {
    method: 'POST',
    body: JSON.stringify({ intake: patch }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data ?? null;
}

export async function completeIntake(
  orgId: string
): Promise<
  | { ok: true; intake: Record<string, unknown>; submission_id?: string; already_completed?: boolean }
  | { ok: false; error: string; status: number }
> {
  const res = await authedFetch(`/api/business/${orgId}/intake/complete`, {
    method: 'POST',
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: json?.error ?? 'unknown_error', status: res.status };
  }
  return {
    ok: true,
    intake: json?.data?.intake ?? {},
    submission_id: json?.data?.submission_id,
    already_completed: json?.data?.already_completed,
  };
}
