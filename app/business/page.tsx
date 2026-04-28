'use client';

import Link from 'next/link';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';

export default function BusinessIndexPage() {
  const t = useBusinessTheme();
  const intakes = useBusinessIntakeStore((s) => s.intakes);
  const entries = Object.values(intakes);
  const completed = entries.filter((i) => i.completedAt !== null);
  const inProgress = entries.filter((i) => i.completedAt === null);

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

      {entries.length === 0 && (
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
          {completed.map((intake) => {
            const planLabel = intake.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter';
            const domain = intake.domain.domain || '—';
            return (
              <Link
                key={intake.orgId}
                href={`/business/${intake.orgId}`}
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
                          {intake.website.bizName || 'Untitled business'}
                        </span>
                        <Badge t={t} tone="accent" dot>{planLabel}</Badge>
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
            {inProgress.map((intake) => (
              <Link
                key={intake.orgId}
                href={`/business/setup?org_id=${intake.orgId}&plan_code=${intake.planCode}&org_name=${encodeURIComponent(intake.website.bizName || '')}`}
                style={{ textDecoration: 'none' }}
              >
                <Card t={t} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>
                        {intake.website.bizName || 'Untitled business'}
                      </div>
                      <div style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>
                        Resume setup · step {intake.currentStep + 1} of 5
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
