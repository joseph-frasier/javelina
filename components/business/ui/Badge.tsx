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
  const dotColor: Record<Tone, string> = {
    neutral: t.textFaint,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
    accent: t.accent,
  };
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '3px 9px', borderRadius: 999,
        fontSize: 12, fontWeight: 550,
        background: t.surface, color: t.text,
        fontFamily: FONT, lineHeight: 1.3,
        border: `1px solid ${t.borderStrong}`,
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: 6, height: 6, borderRadius: 999, background: dotColor[tone],
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
