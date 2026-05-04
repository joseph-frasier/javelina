'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow } from '@/components/business/dashboard/_pageBits';
import { MOCK_DOMAINS } from '@/lib/business/page-mocks';

export default function BusinessDomainsPage() {
  const t = useBusinessTheme();
  const primary = MOCK_DOMAINS.find((d) => d.primary);

  return (
    <div>
      <PageHeader
        t={t}
        title="Domains"
        description="Domains attached to this business — registration, transfer, and renewal."
        actions={
          <>
            <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="refresh" size={14} />}>
              Transfer in
            </Button>
            <Button t={t} size="md" iconLeft={<Icon name="plus" size={14} color="#fff" />}>
              Register domain
            </Button>
          </>
        }
      />

      {primary && (
        <Card t={t} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                Primary domain
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: MONO, fontSize: 22, fontWeight: 600, color: t.text, letterSpacing: -0.3 }}>
                  {primary.name}
                </span>
                <Badge t={t} tone="success" dot>Active</Badge>
                {primary.autoRenew && <Badge t={t} tone="accent">Auto-renew on</Badge>}
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Registered</div>
                  <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{formatDate(primary.registered)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Renews</div>
                  <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{formatDate(primary.expires)}</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="All domains" linkLabel="Manage" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {MOCK_DOMAINS.map((d, i) => (
              <div
                key={d.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : `1px solid ${t.border}`,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontSize: 14, fontWeight: 600, color: t.text }}>{d.name}</span>
                    {d.primary && <Badge t={t} tone="accent">Primary</Badge>}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
                    Renews {formatDate(d.expires)} · {d.autoRenew ? 'Auto-renew on' : 'Manual'}
                  </div>
                </div>
                <Badge t={t} tone="success" dot>Active</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Registration" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <StatRow t={t} label="Owner" value="Acme Business LLC" />
            <StatRow t={t} label="Registrar" value="Javelina (OpenSRS)" />
            <StatRow t={t} label="Privacy" value="Enabled" tone="success" />
            <StatRow t={t} label="Lock" value="On" tone="success" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}
