'use client';

import { useEffect, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { FONT } from '@/components/business/ui/tokens';
import { SideNav } from '@/components/business/dashboard/SideNav';

export default function BusinessOrgLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const data = useBusinessIntakeStore((s) => (orgId ? s.intakes[orgId] : undefined));
  const t = useBusinessTheme();

  useEffect(() => {
    if (!orgId) return;
    if (!data || !data.completedAt) {
      router.replace(
        `/business/setup?org_id=${orgId}&plan_code=${data?.planCode ?? 'business_starter'}`,
      );
    }
  }, [orgId, data, router]);

  if (!orgId || !data || !data.completedAt) return null;

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <SideNav t={t} data={data} />
      <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto' }}>{children}</main>
    </div>
  );
}
