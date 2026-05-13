'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { adaptDetailToLegacyIntake } from '@/lib/api/business-adapters';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import { IntakeIncompleteState } from './IntakeIncompleteState';

export default function BusinessOrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const { data: result, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
  });

  if (isLoading || !result) return null;
  if (result.kind === 'not_found') {
    return <div style={{ padding: '28px 32px 60px' }}>Business not found.</div>;
  }
  if (result.kind === 'error') {
    return (
      <div style={{ padding: '28px 32px 60px' }}>
        Couldn&rsquo;t load this business right now. Please refresh.
      </div>
    );
  }

  const intake = (result.data.intake ?? null) as Record<string, any> | null;
  const completed = !!intake?.completed_at;

  if (!completed) {
    return (
      <IntakeIncompleteState
        orgId={orgId}
        orgName={result.data.org.name}
        planCode={intake?.planCode}
      />
    );
  }

  const adapted = adaptDetailToLegacyIntake(result.data) as any;

  return <BusinessPlaceholderDashboard data={adapted} />;
}
