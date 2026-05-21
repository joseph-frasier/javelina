'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { EmptyCardState } from '@/components/business/ui/EmptyCardState';
import { MOCK_DNS_RECORDS } from '@/lib/business/page-mocks';
import { JAVELINA_NAMESERVERS } from '@/lib/domain-constants';
import { useDashboardMode } from '@/lib/hooks/useDashboardMode';
import { listZonesForOrg, type ZoneRow } from '@/lib/api/zones';
import { listDnsRecordsForZone, type DnsRecordRow } from '@/lib/api/dns-records';

export default function BusinessDnsPage() {
  const t = useBusinessTheme();
  const { isMock } = useDashboardMode();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId ?? '';

  const zonesQuery = useQuery({
    queryKey: ['zones', orgId],
    queryFn: () => listZonesForOrg(orgId),
    enabled: !!orgId && !isMock,
  });
  const primaryZone: ZoneRow | undefined = zonesQuery.data?.[0];

  const recordsQuery = useQuery({
    queryKey: ['dns-records', primaryZone?.id ?? ''],
    queryFn: () => listDnsRecordsForZone(primaryZone!.id),
    enabled: !!primaryZone?.id && !isMock,
  });

  const recordsCount = isMock
    ? MOCK_DNS_RECORDS.length
    : recordsQuery.data?.length ?? 0;
  const primaryDomain = isMock
    ? 'acmebusiness.com'
    : primaryZone?.name ?? '—';

  return (
    <div>
      <PageHeader
        t={t}
        title="DNS"
        description="Records, nameservers, and propagation status for your zones."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Zone status" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatRow t={t} label="Primary domain" value={primaryDomain} />
            <StatRow
              t={t}
              label="Resolution"
              value={isMock ? 'Healthy' : (primaryZone ? 'Healthy' : '—')}
              tone={primaryZone || isMock ? 'success' : undefined}
            />
            <StatRow
              t={t}
              label="Propagation"
              value={isMock ? '100%' : '—'}
              tone={isMock ? 'success' : undefined}
            />
            <StatRow t={t} label="Records" value={`${recordsCount} active`} />
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Nameservers" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {JAVELINA_NAMESERVERS.map((ns) => (
              <div
                key={ns}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: t.surfaceAlt,
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                }}
              >
                <span style={{ fontFamily: MONO, fontSize: 13, color: t.text }}>{ns}</span>
                <Badge t={t} tone="success" dot>Active</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Records" />
          {(() => {
            if (isMock) {
              return (
                <RecordsTable
                  t={t}
                  records={MOCK_DNS_RECORDS.map((r) => ({
                    type: r.type,
                    name: r.name,
                    value: r.value,
                    ttl: r.ttl,
                  }))}
                />
              );
            }
            if (!primaryZone) {
              return (
                <EmptyCardState message="Your zone hasn't been created yet. It will appear here once provisioning completes." />
              );
            }
            const real = (recordsQuery.data ?? []).map((r: DnsRecordRow) => ({
              type: r.type,
              name: r.name,
              value: r.content,
              ttl: r.ttl != null ? String(r.ttl) : '—',
            }));
            if (real.length === 0) {
              return <EmptyCardState message="No DNS records yet." />;
            }
            return <RecordsTable t={t} records={real} />;
          })()}
          <div style={{ marginTop: 12, fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
            Changes propagate globally within 5–15 minutes.
          </div>
        </Card>
      </div>
    </div>
  );
}

function RecordsTable({
  t,
  records,
}: {
  t: ReturnType<typeof useBusinessTheme>;
  records: Array<{ type: string; name: string; value: string; ttl: string }>;
}) {
  return (
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
      {records.map((r, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <TableCell t={t} accent mono>{r.type}</TableCell>
          <TableCell t={t} mono>{r.name}</TableCell>
          <TableCell t={t} mono>{r.value}</TableCell>
          <TableCell t={t} muted mono>{r.ttl}</TableCell>
        </div>
      ))}
    </div>
  );
}
