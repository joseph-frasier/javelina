'use server';

import { cookies } from 'next/headers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface SubscriptionRow {
  id?: string;
  org_id?: string;
  stripe_subscription_id?: string;
  status?: string;
  current_period_start?: string | null;
  current_period_end?: string | null;
  trial_start?: string | null;
  trial_end?: string | null;
  cancel_at?: string | null;
  cancel_at_period_end?: boolean | null;
  plan_code?: string | null;
}

export interface PlanRow {
  id?: string;
  code?: string;
  name?: string;
  billing_interval?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type SubscriptionResult =
  | { kind: 'ok'; subscription: SubscriptionRow | null; plan: PlanRow | null }
  | { kind: 'error'; reason: string };

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

export async function getCurrentSubscription(orgId: string): Promise<SubscriptionResult> {
  try {
    const res = await authedFetch(`/api/subscriptions/current?org_id=${encodeURIComponent(orgId)}`);
    if (!res.ok) return { kind: 'error', reason: `http_${res.status}` };
    const json = await res.json();
    const data = json?.data ?? null;
    return {
      kind: 'ok',
      subscription: (data?.subscription ?? null) as SubscriptionRow | null,
      plan: (data?.plan ?? null) as PlanRow | null,
    };
  } catch (err) {
    console.error('[subscriptions api] getCurrentSubscription', err);
    return { kind: 'error', reason: 'network_error' };
  }
}

export async function createBillingPortalSession(orgId: string): Promise<{ url: string } | { error: string }> {
  try {
    const res = await authedFetch(`/api/stripe/portal-session`, {
      method: 'POST',
      body: JSON.stringify({ org_id: orgId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: json?.error ?? `http_${res.status}` };
    }
    const url = json?.data?.url;
    if (typeof url !== 'string') return { error: 'invalid_response' };
    return { url };
  } catch (err) {
    console.error('[subscriptions api] createBillingPortalSession', err);
    return { error: 'network_error' };
  }
}
