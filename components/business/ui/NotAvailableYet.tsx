'use client';

import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Icon } from '@/components/business/ui/Icon';

interface Props {
  title: string;
  description: string;
}

export function NotAvailableYet({ title, description }: Props) {
  const t = useBusinessTheme();
  return (
    <Card t={t}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          textAlign: 'center',
          fontFamily: FONT,
          gap: 12,
        }}
      >
        <div style={{ color: t.textMuted }}>
          <Icon name="info" size={20} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, color: t.text, letterSpacing: -0.2 }}>
          {title}
        </div>
        <div style={{ fontSize: 13, color: t.textMuted, lineHeight: 1.55, maxWidth: 460 }}>
          {description}
        </div>
      </div>
    </Card>
  );
}
