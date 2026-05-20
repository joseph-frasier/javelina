'use client';

import type { ReactNode } from 'react';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { HoverArrowLink } from '@/components/business/ui/HoverArrowLink';

export function SectionHeader({ t, title, linkLabel, linkHref }: { t: Tokens; title: string; linkLabel?: string; linkHref?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: FONT }}>
        {title}
      </h3>
      {linkLabel && <HoverArrowLink t={t} href={linkHref}>{linkLabel}</HoverArrowLink>}
    </div>
  );
}

export function PageHeader({ t, title, description, actions }: { t: Tokens; title: string; description?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: t.text, letterSpacing: -0.6, fontFamily: FONT }}>
          {title}
        </h1>
        {description && (
          <p style={{ margin: '6px 0 0', fontSize: 14, color: t.textMuted, fontFamily: FONT }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 10 }}>{actions}</div>}
    </div>
  );
}

export function StatRow({ t, label, value, tone }: { t: Tokens; label: string; value: string; tone?: 'success' | 'warning' | 'danger' }) {
  const color = tone === 'success' ? t.success : tone === 'warning' ? t.warning : tone === 'danger' ? t.danger : t.text;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: 13, color: t.textMuted, fontFamily: FONT }}>{label}</span>
      <span style={{ fontSize: 14, color, fontWeight: 600, fontFamily: FONT }}>{value}</span>
    </div>
  );
}

export function TableHeader({ t, children }: { t: Tokens; children: ReactNode }) {
  return (
    <div style={{ padding: '10px 12px', background: t.surfaceAlt, fontSize: 12, color: t.textMuted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, fontFamily: FONT, borderBottom: `1px solid ${t.border}` }}>
      {children}
    </div>
  );
}

export function TableCell({ t, children, mono, muted, accent }: { t: Tokens; children: ReactNode; mono?: boolean; muted?: boolean; accent?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        fontSize: 13,
        fontFamily: mono ? MONO : FONT,
        color: accent ? t.accent : muted ? t.textMuted : t.text,
        fontWeight: accent ? 600 : 500,
        borderTop: `1px solid ${t.border}`,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={typeof children === 'string' ? children : undefined}
    >
      {children}
    </div>
  );
}

export function StatTile({ t, label, value, delta }: { t: Tokens; label: string; value: string | number; delta?: number }) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div style={{ flex: 1, padding: 16, border: `1px solid ${t.border}`, borderRadius: 12, background: t.surfaceAlt }}>
      <div style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 700, color: t.text, fontFamily: FONT, letterSpacing: -0.3 }}>{value}</div>
      {delta !== undefined && (
        <div style={{ marginTop: 4, fontSize: 12, color: positive ? t.success : t.danger, fontFamily: FONT, fontWeight: 600 }}>
          {positive ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
        </div>
      )}
    </div>
  );
}
