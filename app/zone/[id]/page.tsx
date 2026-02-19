import { cookies } from 'next/headers';
import { ZoneDetailClient } from '@/app/zone/[id]/ZoneDetailClient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Zone Page - BFF Architecture
 * 
 * Fetches zone and organization data through the Express API backend.
 * This ensures Auth0 users can access zones without Supabase Auth sessions.
 * 
 * Authentication: Uses session cookie set by Express backend
 * Authorization: Handled by Express API using service role key
 */
export default async function ZonePage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('javelina_session');

  // Check for session cookie
  if (!sessionCookie) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Not Authenticated</h1>
        <p className="text-gray-slate">Please log in to view this zone.</p>
      </div>
    );
  }

  // Fetch zone data from Express API (should include organization)
  const zoneResponse = await fetch(`${API_BASE_URL}/api/zones/${id}`, {
    method: 'GET',
    headers: {
      'Cookie': `javelina_session=${sessionCookie.value}`,
    },
    cache: 'no-store',
  });

  // If zone not found or error, show error
  if (!zoneResponse.ok) {
    const errorData = await zoneResponse.json().catch(() => ({}));
    
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-orange-dark mb-4">Zone Not Found</h1>
        <p className="text-gray-slate">
          {errorData.error || `The zone "${id}" does not exist or you don't have access to it.`}
        </p>
      </div>
    );
  }

  const zoneResult = await zoneResponse.json();
  const zoneData = zoneResult.data || zoneResult;

  // If backend doesn't return organization, fetch it separately
  let organization = zoneData.organization || zoneData.organizations || null;
  
  if (!organization && zoneData.organization_id) {
    const orgResponse = await fetch(`${API_BASE_URL}/api/organizations/${zoneData.organization_id}`, {
      method: 'GET',
      headers: {
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (orgResponse.ok) {
      const orgResult = await orgResponse.json();
      organization = orgResult.data || orgResult;
    }
  }

  // Fetch subscription status for the zone's organization
  const orgIdForSub = organization?.id || zoneData.organization_id;
  let subscriptionStatus: string | null = null;
  let pendingPlanCode: string | null = null;
  let pendingPriceId: string | null = null;
  let pendingPlanName: string | null = null;
  let pendingPlanPrice: number | null = null;
  let pendingBillingInterval: string | null = null;

  if (orgIdForSub) {
    const subResponse = await fetch(`${API_BASE_URL}/api/subscriptions/current?org_id=${orgIdForSub}`, {
      method: 'GET',
      headers: {
        'Cookie': `javelina_session=${sessionCookie.value}`,
      },
      cache: 'no-store',
    });

    if (subResponse.ok) {
      const subResult = await subResponse.json();
      subscriptionStatus = subResult?.subscription?.status ?? null;
    }

    pendingPlanCode = organization?.pending_plan_code ?? null;
    pendingPriceId = organization?.pending_price_id ?? null;
    pendingPlanName = organization?.pending_plan_name ?? null;
    pendingPlanPrice = organization?.pending_plan_price != null
      ? Number(organization.pending_plan_price)
      : null;
    pendingBillingInterval = organization?.pending_billing_interval ?? null;
  }

  return (
    <ZoneDetailClient 
      zone={zoneData} 
      zoneId={id}
      organization={organization}
      subscriptionStatus={subscriptionStatus}
      pendingPlanCode={pendingPlanCode}
      pendingPriceId={pendingPriceId}
      pendingPlanName={pendingPlanName}
      pendingPlanPrice={pendingPlanPrice}
      pendingBillingInterval={pendingBillingInterval}
    />
  );
}
