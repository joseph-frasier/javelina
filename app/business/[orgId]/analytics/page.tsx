'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatTile } from '@/components/business/dashboard/_pageBits';
import { NotAvailableYet } from '@/components/business/ui/NotAvailableYet';
import { MOCK_TRAFFIC, MOCK_TOP_PAGES, MOCK_TRAFFIC_SOURCES } from '@/lib/business/page-mocks';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';

export default function BusinessAnalyticsPage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();

  return (
    <div>
      <PageHeader
        t={t}
        title="Analytics"
        description="Traffic, engagement, and conversion metrics for your site."
        actions={
          <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="external" size={14} />}>
            Last 30 days
          </Button>
        }
      />

      {!isMock ? (
        <NotAvailableYet
          title="Analytics aren't connected yet"
          description="Once traffic starts flowing through your site, visitors, pageviews, top pages, and traffic sources will appear here automatically."
        />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <StatTile t={t} label="Visitors" value={MOCK_TRAFFIC.visitors.value.toLocaleString()} delta={MOCK_TRAFFIC.visitors.delta} />
            <StatTile t={t} label="Pageviews" value={MOCK_TRAFFIC.pageviews.value.toLocaleString()} delta={MOCK_TRAFFIC.pageviews.delta} />
            <StatTile t={t} label="Avg. session" value={MOCK_TRAFFIC.avgSession.value} delta={MOCK_TRAFFIC.avgSession.delta} />
            <StatTile t={t} label="Bounce rate" value={MOCK_TRAFFIC.bounceRate.value} delta={MOCK_TRAFFIC.bounceRate.delta} />
          </div>

          <Card t={t} style={{ marginBottom: 16 }}>
            <SectionHeader t={t} title="Visitors over time" />
            <FakeChart t={t} />
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card t={t}>
              <SectionHeader t={t} title="Top pages" linkLabel="See all" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_TOP_PAGES.map((p, i) => (
                  <BarRow key={p.path} t={t} label={p.path} sublabel={`${p.views.toLocaleString()} views`} share={p.share} index={i} mono />
                ))}
              </div>
            </Card>

            <Card t={t}>
              <SectionHeader t={t} title="Traffic sources" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MOCK_TRAFFIC_SOURCES.map((s, i) => (
                  <BarRow key={s.source} t={t} label={s.source} share={s.share} index={i} />
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function FakeChart({ t }: { t: ReturnType<typeof useBusinessTheme> }) {
  const points = [22, 28, 35, 30, 42, 48, 52, 47, 58, 65, 60, 72, 78, 70, 82, 88, 95, 90, 102, 108, 100, 115, 120, 118, 128, 135, 130, 142, 148, 155];
  const max = Math.max(...points);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 160, padding: '8px 4px' }}>
      {points.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: i === points.length - 1 ? t.accent : t.accentSoft,
            borderRadius: 3,
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

function BarRow({ t, label, sublabel, share, index, mono }: { t: ReturnType<typeof useBusinessTheme>; label: string; sublabel?: string; share: number; index: number; mono?: boolean }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: t.text, fontFamily: mono ? MONO : FONT, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
          {sublabel ? `${sublabel} · ` : ''}{share.toFixed(1)}%
        </span>
      </div>
      <div style={{ height: 6, background: t.surfaceAlt, borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${share}%`,
            height: '100%',
            background: index === 0 ? t.accent : t.accentSoftStrong,
          }}
        />
      </div>
    </div>
  );
}
