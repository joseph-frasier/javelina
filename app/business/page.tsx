'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { listMyBusinesses, type BusinessSummary } from '@/lib/api/business';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';

function planLabelFor(planCode: BusinessSummary['plan_code']): string | null {
  if (planCode === 'business_pro') return 'Business Pro';
  if (planCode === 'business_starter') return 'Business Starter';
  return null;
}

export default function BusinessIndexPage() {
  const t = useBusinessTheme();
  const { data: businesses, isLoading } = useQuery({
    queryKey: ['business', 'me'],
    queryFn: () => listMyBusinesses(),
    staleTime: 60_000,
  });

  const entries = businesses ?? [];
  const completed = entries.filter((b) => b.intake_completed_at !== null);
  const inProgress = entries.filter((b) => b.intake_completed_at === null);

  return (
    <div
      style={{
        maxWidth: 820, margin: '0 auto',
        padding: '40px 24px 80px', fontFamily: FONT,
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
          Javelina Business
        </div>
        <h1
          style={{
            margin: '4px 0 0', fontSize: 28, fontWeight: 700,
            color: t.text, letterSpacing: -0.6,
          }}
        >
          My businesses
        </h1>
      </div>

      {!isLoading && entries.length === 0 && (
        <Card t={t}>
          <div style={{ fontSize: 14, color: t.textMuted, lineHeight: 1.55 }}>
            You haven&apos;t started a Javelina Business plan yet.{' '}
            <Link href="/pricing" style={{ color: t.accent, fontWeight: 600, textDecoration: 'none' }}>
              Browse plans →
            </Link>
          </div>
        </Card>
      )}

      {completed.length > 0 && (
        <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
          {completed.map((b) => {
            const planLabel = planLabelFor(b.plan_code);
            const domain = b.domain || 'Not set';
            return (
              <Link
                key={b.org_id}
                href={`/business/${b.org_id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card t={t} style={{ cursor: 'pointer', transition: 'box-shadow .12s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span
                          style={{
                            fontSize: 16, fontWeight: 600, color: t.text,
                            letterSpacing: -0.2,
                          }}
                        >
                          {b.name || 'Untitled business'}
                        </span>
                        {planLabel && <Badge t={t} tone="accent">{planLabel}</Badge>}
                      </div>
                      <div style={{ fontSize: 13, color: t.textMuted }}>
                        {domain}
                      </div>
                    </div>
                    <Icon name="arrowRight" size={16} color={t.textMuted} />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {inProgress.length > 0 && (
        <>
          <h2
            style={{
              margin: '24px 0 12px', fontSize: 13, fontWeight: 600,
              color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6,
            }}
          >
            In progress
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {inProgress.map((b) => (
              <Link
                key={b.org_id}
                href={`/business/${b.org_id}`}
                style={{ textDecoration: 'none' }}
              >
                <Card t={t} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>
                        {b.name || 'Untitled business'}
                      </div>
                      <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
                        {b.intake_started_at ? 'Resume setup' : 'Start setup'}
                      </div>
                    </div>
                    <Icon name="arrowRight" size={16} color={t.textMuted} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
