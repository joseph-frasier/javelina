'use client';

import { useParams } from 'next/navigation';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';

export default function BusinessOrgDashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const data = useBusinessIntakeStore((s) => (orgId ? s.intakes[orgId] : undefined));

  if (!data || !data.completedAt) return null;
  return <BusinessPlaceholderDashboard data={data} />;
}
