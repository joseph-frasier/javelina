'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import { IntakeIncompleteState } from './IntakeIncompleteState';

export default function BusinessOrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
  });

  if (isLoading || !data) return null;

  const intake = (data.intake ?? null) as Record<string, any> | null;
  const completed = !!intake?.completed_at;

  if (!completed) {
    return (
      <IntakeIncompleteState
        orgId={orgId}
        orgName={data.org.name}
        planCode={intake?.planCode}
      />
    );
  }

  // Build the BusinessIntakeData-shaped object the existing component expects.
  // This is a thin adapter; once the full dashboard is wired to server data,
  // this shape can move into a dedicated selector.
  const adapted = {
    orgId,
    planCode: intake.planCode ?? 'business_starter',
    currentStep: 4,
    dns: intake.dns ?? { mode: 'jbp' },
    website: intake.website ?? { bizName: data.org.name, pages: [] },
    domain: intake.domain ?? { mode: 'connect' },
    contact: intake.contact ?? { firstName: '', lastName: '', email: '', phone: '', address: '', city: '', state: '', zip: '', whois: true },
    completedAt: intake.completed_at ?? null,
  } as any;

  return <BusinessPlaceholderDashboard data={adapted} />;
}
