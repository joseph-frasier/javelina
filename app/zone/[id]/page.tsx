import { cookies } from 'next/headers';
import { ZoneDetailClient } from '@/app/zone/[id]/ZoneDetailClient';
import { getUserRoleInOrganization } from '@/lib/api/roles';

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
        <h1 className="text-3xl font-bold text-text mb-4">Not Authenticated</h1>
        <p className="text-text-muted">Please log in to view this zone.</p>
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
        <h1 className="text-3xl font-bold text-text mb-4">Zone Not Found</h1>
        <p className="text-text-muted">
          {errorData.error || `The zone "${id}" does not exist or you don't have access to it.`}
        </p>
      </div>
    );
  }

  const zoneResult = await zoneResponse.json();
  const zoneData = zoneResult.data || zoneResult;

  // If backend doesn't return organization, fetch it separately
  let organization = zoneData.organization || zoneData.organizations || null;

  // Both remaining reads depend only on organization_id, so run them together
  // rather than chaining the role lookup behind the organization fetch.
  const needsOrgFetch = !organization && Boolean(zoneData.organization_id);

  const [fetchedOrg, userOrgRole] = await Promise.all([
    needsOrgFetch
      ? fetch(`${API_BASE_URL}/api/organizations/${zoneData.organization_id}`, {
          method: 'GET',
          headers: {
            'Cookie': `javelina_session=${sessionCookie.value}`,
          },
          cache: 'no-store',
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((r) => (r ? r.data || r : null))
          .catch(() => null)
      : Promise.resolve(null),
    zoneData.organization_id
      ? getUserRoleInOrganization(zoneData.organization_id)
      : Promise.resolve(null),
  ]);

  if (fetchedOrg) {
    organization = fetchedOrg;
  }

  return (
    <ZoneDetailClient 
      zone={zoneData} 
      zoneId={id}
      organization={organization}
      userOrgRole={userOrgRole}
    />
  );
}
