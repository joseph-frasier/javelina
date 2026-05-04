'use client';

import { FONT, MONO } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Badge } from '@/components/business/ui/Badge';
import { Icon } from '@/components/business/ui/Icon';
import { PageHeader, SectionHeader, StatRow, TableHeader, TableCell } from '@/components/business/dashboard/_pageBits';
import { MOCK_INVOICES } from '@/lib/business/page-mocks';

export default function BusinessBillingPage() {
  const t = useBusinessTheme();

  return (
    <div>
      <PageHeader
        t={t}
        title="Billing"
        description="Plan, payment method, invoices, and add-ons."
        actions={
          <Button t={t} variant="secondary" size="md" iconLeft={<Icon name="external" size={14} />}>
            Open billing portal
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card t={t}>
          <SectionHeader t={t} title="Plan" linkLabel="Change plan" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, letterSpacing: -0.3 }}>
                Javelina Business Starter
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: t.textMuted, fontFamily: FONT }}>
                Managed website + domain + business email
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <Badge t={t} tone="success" dot>Active</Badge>
                <Badge t={t}>Monthly</Badge>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: t.text, fontFamily: FONT }}>
                $99.88
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>per month</div>
              <div style={{ marginTop: 8, fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
                Next charge <strong style={{ color: t.text, fontWeight: 600 }}>Jun 1, 2026</strong>
              </div>
            </div>
          </div>
        </Card>

        <Card t={t}>
          <SectionHeader t={t} title="Payment method" linkLabel="Update" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 56,
                height: 38,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${t.text} 0%, ${t.textMuted} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 1,
                fontFamily: FONT,
                flexShrink: 0,
              }}
            >
              VISA
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: MONO, letterSpacing: 1 }}>
                •••• •••• •••• 4242
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Expires 09/29</div>
            </div>
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <StatRow t={t} label="Billing email" value="billing@acme.com" />
            <StatRow t={t} label="Tax status" value="Not exempt" />
          </div>
        </Card>
      </div>

      <Card t={t}>
        <SectionHeader t={t} title="Invoices" linkLabel="Download all" />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr 100px',
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}
        >
          <TableHeader t={t}>Invoice</TableHeader>
          <TableHeader t={t}>Date</TableHeader>
          <TableHeader t={t}>Amount</TableHeader>
          <TableHeader t={t}>Status</TableHeader>
          {MOCK_INVOICES.map((inv) => (
            <div key={inv.id} style={{ display: 'contents' }}>
              <TableCell t={t} mono accent>{inv.id}</TableCell>
              <TableCell t={t}>{new Date(inv.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
              <TableCell t={t}>{inv.amount}</TableCell>
              <TableCell t={t}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: t.success, fontFamily: FONT, textTransform: 'capitalize' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: t.success, display: 'inline-block' }} />
                  {inv.status}
                </span>
              </TableCell>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
