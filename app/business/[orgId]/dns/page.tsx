'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { MOCK_DNS_RECORDS } from '@/lib/business/page-mocks';

export default function BusinessDnsPage() {
  const t = useBusinessTheme();

  return (
    <div>
      <PageHeader
        t={t}
        title="DNS"
        description="Records, nameservers, and propagation status for your zones."
        actions={
          <>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="refresh" size={14} />}>
              Recheck propagation
            </Button>
            <Button t={t} size="md" iconLeft={<Icon name="plus" size={14} color="#fff" />}>
              Add record
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Zone status" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatRow t={t} label="Primary domain" value="acmebusiness.com" />
            <StatRow t={t} label="Resolution" value="Healthy" tone="success" />
            <StatRow t={t} label="Propagation" value="100%" tone="success" />
            <StatRow t={t} label="Records" value={`${MOCK_DNS_RECORDS.length} active`} />
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Nameservers" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['ns1.javelina.app', 'ns2.javelina.app', 'ns3.javelina.app', 'ns4.javelina.app'].map((ns) => (
              <div key={ns} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: t.surfaceAlt, border: `1px solid ${t.border}`, borderRadius: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 13, color: t.text }}>{ns}</span>
                <Badge t={t} tone="success" dot>Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Records" linkLabel="Open zone editor" />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 140px 1fr 80px',
              border: `1px solid ${t.border}`,
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <TableHeader t={t}>Type</TableHeader>
            <TableHeader t={t}>Name</TableHeader>
            <TableHeader t={t}>Value</TableHeader>
            <TableHeader t={t}>TTL</TableHeader>
            {MOCK_DNS_RECORDS.map((r, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <TableCell t={t} accent mono>{r.type}</TableCell>
                <TableCell t={t} mono>{r.name}</TableCell>
                <TableCell t={t} mono>{r.value}</TableCell>
                <TableCell t={t} muted mono>{r.ttl}</TableCell>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
            Changes propagate globally within 5–15 minutes.
          </div>
        </Card>
      </div>
    </div>
  );
}
