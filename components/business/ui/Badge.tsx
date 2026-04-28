'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent';

interface BadgeProps {
  t: Tokens;
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}

export function Badge({ t, tone = 'neutral', children, dot }: BadgeProps) {
  const tones: Record<Tone, { bg: string; fg: string; dc: string }> = {
    neutral: { bg: t.surfaceAlt, fg: t.textMuted, dc: t.textFaint },
    success: { bg: 'rgba(5,150,105,0.10)', fg: t.success, dc: t.success },
    warning: { bg: 'rgba(217,119,6,0.12)', fg: t.warning, dc: t.warning },
    danger: { bg: 'rgba(220,38,38,0.10)', fg: t.danger, dc: t.danger },
    accent: { bg: t.accentSoft, fg: t.accent, dc: t.accent },
  };
  const tn = tones[tone];
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999,
        fontSize: 12, fontWeight: 550,
        background: tn.bg, color: tn.fg,
        fontFamily: FONT, lineHeight: 1.3,
        border: `1px solid ${t.border}`,
      }}
    >
      {dot && (
        <span
          style={{
            width: 6, height: 6, borderRadius: 999, background: tn.dc,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
