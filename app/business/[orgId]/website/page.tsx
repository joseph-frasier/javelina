'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { MOCK_DEPLOYS, MOCK_PAGES } from '@/lib/business/page-mocks';

export default function BusinessWebsitePage() {
  const t = useBusinessTheme();

  return (
    <div>
      <PageHeader
        t={t}
        title="Website"
        description="Manage your managed website — content, deploys, and preview."
        actions={
          <>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="external" size={14} />}>
              Open live site
            </Button>
            <Button t={t} size="md" iconLeft={<Icon name="rocket" size={14} color="#fff" />}>
              New deploy
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Recent deploys" linkLabel="View all" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MOCK_DEPLOYS.map((d, i) => (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>{d.commit}</div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: MONO, marginTop: 2 }}>
                    {d.id} · {d.when}
                  </div>
                </div>
                <Badge t={t} tone="success" dot>Live</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Health" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatRow t={t} label="Uptime (30d)" value="99.98%" tone="success" />
            <StatRow t={t} label="SSL" value="Auto-renewing" tone="success" />
            <StatRow t={t} label="Last build" value="2 hours ago" />
            <StatRow t={t} label="Avg. response" value="142ms" />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Pages" linkLabel="Edit content" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr',
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              overflow: 'hidden',
              fontFamily: FONT,
              fontSize: 13,
            }}
          >
            <TableHeader t={t}>Page</TableHeader>
            <TableHeader t={t}>Path</TableHeader>
            <TableHeader t={t}>Words</TableHeader>
            <TableHeader t={t}>Updated</TableHeader>
            {MOCK_PAGES.map((p) => (
              <div key={p.path} style={{ display: 'contents' }}>
                <TableCell t={t}>{p.name}</TableCell>
                <TableCell t={t} mono>{p.path}</TableCell>
                <TableCell t={t}>{String(p.words)}</TableCell>
                <TableCell t={t} muted>{p.updated}</TableCell>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
