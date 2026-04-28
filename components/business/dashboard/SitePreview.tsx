'use client';

import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';
import { Badge } from '@/components/business/ui/Badge';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';

interface SitePreviewProps {
  t: Tokens;
  data: BusinessIntakeData;
}

function resolveDomain(data: BusinessIntakeData): string {
  return data.domain.domain || 'your-domain.com';
}

export function SitePreview({ t, data }: SitePreviewProps) {
  const domain = resolveDomain(data);
  const isBold = data.website.aesthetic === 'bold';
  const headlineFont = isBold ? 'Georgia, serif' : 'Inter, system-ui, sans-serif';
  const headlineColor = isBold ? '#0f0f0f' : t.text;
  const headlineBg = isBold ? '#f5f1e8' : t.surface;
  const eyebrow = (data.website.bizName || 'Your business').toUpperCase();
  const headline =
    data.website.tagline ||
    (data.website.bizType
      ? `${data.website.bizType} done right.`
      : 'Made with intention.');
  const subline =
    data.website.description ||
    "Independent studio. Currently booking new projects. Let's make something good.";

  return (
    <Card t={t} padding={0} style={{ overflow: 'hidden' }}>
      <div style={{ padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Badge t={t} tone="success" dot>Live</Badge>
            <span style={{ fontFamily: MONO, fontSize: 13, color: t.text, fontWeight: 500 }}>
              {domain}
            </span>
            <a style={{ color: t.textMuted, display: 'flex', cursor: 'pointer' }}>
              <Icon name="external" size={14} />
            </a>
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginTop: 6 }}>
            Last deployed <span style={{ color: t.text, fontWeight: 500 }}>3 minutes ago</span>
            {' · '}
            <span style={{ fontFamily: MONO }}>main@a7f91c3</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button t={t} variant="secondary" size="sm" iconLeft={<Icon name="refresh" size={13} />}>
            Redeploy
          </Button>
          <Button t={t} size="sm" iconRight={<Icon name="external" size={13} color="#fff" />}>
            Visit site
          </Button>
        </div>
      </div>

      <div style={{ padding: '0 20px 20px' }}>
        <div
          style={{
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            overflow: 'hidden',
            background: t.surface,
          }}
        >
          <div
            style={{
              height: 28,
              borderBottom: `1px solid ${t.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '0 12px',
              background: t.surface,
            }}
          >
            <div style={{ display: 'flex', gap: 4 }}>
              {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                <div
                  key={c}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: c,
                    opacity: 0.8,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                flex: 1,
                height: 16,
                borderRadius: 999,
                background: t.bg,
                border: `1px solid ${t.border}`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                fontFamily: MONO,
                fontSize: 10,
                color: t.textMuted,
                marginLeft: 10,
              }}
            >
              https://{domain}
            </div>
          </div>
          <div
            style={{
              padding: '38px 44px',
              minHeight: 260,
              position: 'relative',
              background: isBold ? headlineBg : t.surface,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.accent,
                letterSpacing: 1,
                fontFamily: FONT,
              }}
            >
              {eyebrow}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 700,
                color: headlineColor,
                letterSpacing: -0.8,
                fontFamily: headlineFont,
                maxWidth: 440,
                lineHeight: 1.15,
              }}
            >
              {headline}
            </div>
            <div
              style={{
                marginTop: 14,
                fontSize: 13,
                color: t.textMuted,
                fontFamily: FONT,
                maxWidth: 440,
                lineHeight: 1.6,
              }}
            >
              {subline}
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <div
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  background: t.text,
                  color: t.bg,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT,
                }}
              >
                See work
              </div>
              <div
                style={{
                  padding: '7px 14px',
                  borderRadius: 6,
                  border: `1px solid ${t.border}`,
                  color: t.text,
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: FONT,
                }}
              >
                Start a project →
              </div>
            </div>

            <div
              style={{
                position: 'absolute',
                right: 44,
                top: 38,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                width: 180,
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1 / 1',
                    borderRadius: 6,
                    background: `repeating-linear-gradient(${45 + i * 30}deg, ${t.border}, ${t.border} 4px, ${t.surfaceAlt} 4px, ${t.surfaceAlt} 8px)`,
                    border: `1px solid ${t.border}`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default SitePreview;
