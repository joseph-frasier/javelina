'use client';

import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { ServiceStatusTile } from './ServiceStatusTile';
import { normalizeProvisioning, summaryHeadline } from '@/lib/business/service-status';
import type { BusinessDetail } from '@/lib/api/business';

interface Props {
  t: Tokens;
  provisioning: BusinessDetail['provisioning'];
}

export function ServiceStatusGrid({ t, provisioning }: Props) {
  const tiles = normalizeProvisioning(provisioning);
  const headline = summaryHeadline(tiles);

  return (
    <Card t={t}>
      <style>{`@keyframes jav-spin { to { transform: rotate(360deg); } }`}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
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
            Build progress
          </h3>
          <div
            style={{
              marginTop: 6,
              fontSize: 18,
              fontWeight: 600,
              color: t.text,
              fontFamily: FONT,
              letterSpacing: -0.2,
            }}
          >
            {headline}
          </div>
        </div>
        <div style={{ fontSize: 12, color: t.textFaint, fontFamily: FONT }}>
          Updates live as we work
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {tiles.map((tile) => (
          <ServiceStatusTile key={tile.service} t={t} tile={tile} />
        ))}
      </div>
    </Card>
  );
}

export default ServiceStatusGrid;
