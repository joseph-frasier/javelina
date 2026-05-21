'use client';

import type { ReactNode } from 'react';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export function PlaceholderSection({ title, description, children }: Props) {
  const t = useBusinessTheme();
  return (
    <div>
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          color: t.text,
          letterSpacing: -0.6,
          fontFamily: FONT,
        }}
      >
        {title}
      </h1>
      {description && (
        <p
          style={{
            margin: '6px 0 24px',
            fontSize: 14,
            color: t.textMuted,
            fontFamily: FONT,
          }}
        >
          {description}
        </p>
      )}
      <Card t={t}>
        <div
          style={{
            padding: '32px 8px',
            textAlign: 'center',
            color: t.textMuted,
            fontFamily: FONT,
            fontSize: 14,
          }}
        >
          {children ?? 'This section is coming soon.'}
        </div>
      </Card>
    </div>
  );
}

export default PlaceholderSection;
