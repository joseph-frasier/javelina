'use client';

import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { FONT } from '@/components/business/ui/tokens';
import { SideNav } from '@/components/business/dashboard/SideNav';

export default function BusinessOrgLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const t = useBusinessTheme();

  const { data, isLoading } = useQuery({
    queryKey: ['business', orgId],
    queryFn: () => getBusiness(orgId),
    enabled: !!orgId,
  });

  if (!orgId || isLoading) {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>Loading…</main>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>
          Business not found.
        </main>
      </div>
    );
  }

  // Build a minimal BusinessIntakeData-shaped object for the SideNav so it can
  // continue to read website.bizName / planCode without the local store.
  const intake = (data.intake ?? {}) as Record<string, any>;
  const sideNavData = {
    orgId,
    planCode: (intake.planCode ?? 'business_starter') as 'business_starter' | 'business_pro',
    website: { bizName: intake.website?.bizName ?? data.org.name },
  } as any;

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <SideNav t={t} data={sideNavData} />
      <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto' }}>{children}</main>
    </div>
  );
}
