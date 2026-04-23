'use client';

import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';

interface BillingCardProps {
  t: Tokens;
  data: BusinessIntakeData;
}

export function BillingCard({ t, data }: BillingCardProps) {
  const planLabel = data.planCode === 'business_pro' ? 'Business Pro' : 'Business Starter';
  const planPrice = data.planCode === 'business_pro' ? '$89.00' : '$49.00';

  return (
    <Card t={t}>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 14,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: t.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            fontFamily: FONT,
          }}
        >
          Plan &amp; billing
        </h3>
        <Button t={t} variant="link">Manage billing →</Button>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 17,
                fontWeight: 600,
                color: t.text,
                fontFamily: FONT,
                letterSpacing: -0.2,
              }}
            >
              {planLabel}
            </span>
            <Badge t={t} tone="accent">Monthly</Badge>
          </div>
          <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, fontFamily: FONT }}>
            Next invoice{' '}
            <span style={{ color: t.text, fontWeight: 500 }}>May 14 · {planPrice}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="credit" size={16} color={t.textMuted} />
          <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.textMuted }}>•••• 4242</span>
        </div>
      </div>
    </Card>
  );
}

export default BillingCard;
