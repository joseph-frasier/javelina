'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Card } from '@/components/business/ui/Card';

interface DNSStatusCardProps {
  t: Tokens;
  data: BusinessIntakeData;
}

function resolveDomain(data: BusinessIntakeData): string {
  if (data.domain.mode === 'register') return `${data.domain.search || 'your-domain'}.com`;
  return data.domain.domain || 'your-domain.com';
}

function cell(t: Tokens, first: boolean, variant?: 'accent'): CSSProperties {
  return {
    padding: '8px 12px',
    borderTop: first ? 'none' : `1px solid ${t.border}`,
    color: variant === 'accent' ? t.accent : t.text,
    fontWeight: variant === 'accent' ? 600 : 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    background: t.surfaceAlt,
  };
}

const RECORDS: [string, string, string, string][] = [
  ['A', '@', '76.76.21.21', '3600'],
  ['AAAA', '@', '2606:4700::1111', '3600'],
  ['CNAME', 'www', 'cname.vercel-dns', '3600'],
  ['MX', '@', '10 mx.javelina.app', '3600'],
  ['TXT', '@', 'v=spf1 include:_spf…', '3600'],
];

export function DNSStatusCard({ t, data }: DNSStatusCardProps) {
  const domain = resolveDomain(data);
  const managed = data.dns.mode === 'jbp';

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
          Domain &amp; DNS
        </h3>
        <Link
          href={`/organization/${data.orgId}`}
          style={{
            color: t.accent,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
            fontFamily: FONT,
          }}
        >
          Open zone editor →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Primary domain</div>
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 15, color: t.text, fontWeight: 500 }}>
              {domain}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 9px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 550,
                background: 'rgba(5,150,105,0.10)',
                color: t.success,
                fontFamily: FONT,
                border: `1px solid ${t.border}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: 999, background: t.success }} />
              Resolving
            </span>
          </div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 8, fontFamily: FONT }}>
            SSL certificate auto-renewed · expires Feb 17, 2027
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>Nameservers</div>
          <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {managed ? (
              <>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.text }}>ns1.javelina.app</span>
                <span style={{ fontFamily: MONO, fontSize: 12.5, color: t.text }}>ns2.javelina.app</span>
              </>
            ) : (
              <span style={{ fontSize: 12.5, color: t.textMuted, fontFamily: FONT }}>
                Managed by {data.dns.provider || 'your provider'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, borderTop: `1px solid ${t.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, marginBottom: 10 }}>
          Active records <span style={{ color: t.text, fontWeight: 500 }}>· {RECORDS.length}</span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '60px 1fr 1fr 60px',
            gap: 0,
            border: `1px solid ${t.border}`,
            borderRadius: 8,
            overflow: 'hidden',
            fontFamily: MONO,
            fontSize: 12,
          }}
        >
          {RECORDS.map((r, i) => (
            <div key={i} style={{ display: 'contents' }}>
              <div style={cell(t, i === 0, 'accent')}>{r[0]}</div>
              <div style={cell(t, i === 0)}>{r[1]}</div>
              <div style={cell(t, i === 0)} title={r[2]}>
                {r[2]}
              </div>
              <div style={{ ...cell(t, i === 0), color: t.textMuted }}>{r[3]}</div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export default DNSStatusCard;
