'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';

export default function BusinessOrgDashboardPage() {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const data = useBusinessIntakeStore((s) => (orgId ? s.intakes[orgId] : undefined));

  useEffect(() => {
    if (!orgId) return;
    if (!data || !data.completedAt) {
      router.replace(`/business/setup?org_id=${orgId}&plan_code=${data?.planCode ?? 'business_starter'}`);
    }
  }, [orgId, data, router]);

  if (!orgId || !data || !data.completedAt) return null;
  return <BusinessPlaceholderDashboard data={data} />;
}
