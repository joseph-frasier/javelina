'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';

interface Props {
  t: Tokens;
}

export function AnalyticsPlaceholder({ t }: Props) {
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
          Last 14 days
        </h3>
        <Button t={t} variant="link">View analytics →</Button>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 8px',
          gap: 8,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: t.accentSoft,
            color: t.accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="chart" size={18} color={t.accent} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: t.text, fontFamily: FONT }}>
          Analytics will appear here
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: t.textMuted,
            fontFamily: FONT,
            maxWidth: 280,
            lineHeight: 1.5,
          }}
        >
          Visitors, pageviews, and uptime start populating once your site goes live.
        </div>
      </div>
    </Card>
  );
}

export default AnalyticsPlaceholder;
