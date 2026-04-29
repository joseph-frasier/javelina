'use client';

import { type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { getBusiness } from '@/lib/api/business';
import { adaptDetailToLegacyIntake } from '@/lib/api/business-adapters';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { FONT } from '@/components/business/ui/tokens';
import { SideNav } from '@/components/business/dashboard/SideNav';

export default function BusinessOrgLayout({ children }: { children: ReactNode }) {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';
  const t = useBusinessTheme();

  const { data: result, isLoading } = useQuery({
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

  if (result?.kind === 'not_found') {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>
          Business not found.
        </main>
      </div>
    );
  }

  if (!result || result.kind === 'error') {
    return (
      <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
        <main style={{ flex: 1, padding: '28px 32px 60px', color: t.textMuted }}>
          Couldn&rsquo;t load this business right now. Please refresh.
        </main>
      </div>
    );
  }

  const sideNavData = adaptDetailToLegacyIntake(result.data) as any;

  return (
    <div style={{ display: 'flex', minHeight: '100%', background: t.bg, fontFamily: FONT }}>
      <SideNav t={t} data={sideNavData} />
      <main style={{ flex: 1, padding: '28px 32px 60px', overflow: 'auto' }}>{children}</main>
    </div>
  );
}
