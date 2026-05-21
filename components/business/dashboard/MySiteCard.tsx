'use client';

import type { CSSProperties } from 'react';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import type { BusinessDetail } from '@/lib/api/business';
import { normalizeProvisioning } from '@/lib/business/service-status';

interface Props {
  t: Tokens;
  provisioning: BusinessDetail['provisioning'];
  domain: string | undefined;
}

const ROW_MIN_HEIGHT = 80;

const EYEBROW: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.6,
  fontFamily: FONT,
};

export function MySiteCard({ t, provisioning, domain }: Props) {
  const websiteTile = normalizeProvisioning(provisioning).find(
    (tile) => tile.service === 'website',
  );
  const isLive = websiteTile?.state === 'live';
  const trimmedDomain = (domain || '').trim();
  const hasDomain = trimmedDomain.length > 0;

  if (!isLive) {
    return (
      <Card t={t}>
        <div style={{ minHeight: ROW_MIN_HEIGHT }}>
          <div style={{ ...EYEBROW, color: t.textMuted }}>
            We&apos;re building your site
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: t.text,
              fontFamily: FONT,
              lineHeight: 1.5,
            }}
          >
            We&apos;ll email you as soon as it&apos;s ready to visit.
          </div>
        </div>
      </Card>
    );
  }

  const visitButton = (
    <Button
      t={t}
      size="md"
      disabled={!hasDomain}
      iconRight={<Icon name="external" size={13} color="#fff" />}
    >
      Visit my site
    </Button>
  );

  return (
    <Card t={t}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          minHeight: ROW_MIN_HEIGHT,
        }}
      >
        <div>
          <div style={{ ...EYEBROW, color: t.textMuted }}>Your site is live</div>
          {hasDomain ? (
            <div
              style={{
                marginTop: 8,
                fontFamily: MONO,
                fontSize: 14,
                color: t.text,
              }}
            >
              {trimmedDomain}
            </div>
          ) : (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: t.textMuted,
                fontFamily: FONT,
                lineHeight: 1.5,
              }}
            >
              Domain not configured yet — contact support.
            </div>
          )}
        </div>
        {hasDomain ? (
          <a
            href={`https://${trimmedDomain}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none' }}
          >
            {visitButton}
          </a>
        ) : (
          visitButton
        )}
      </div>
    </Card>
  );
}

export default MySiteCard;
