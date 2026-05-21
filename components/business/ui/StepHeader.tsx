'use client';
import { FONT, type Tokens } from './tokens';

interface StepHeaderProps {
  t: Tokens;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export function StepHeader({ t, eyebrow, title, subtitle }: StepHeaderProps) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div
        style={{
          fontSize: 12, fontWeight: 600, color: t.accent,
          fontFamily: FONT, textTransform: 'uppercase',
          letterSpacing: 0.6, marginBottom: 8,
        }}
      >
        {eyebrow}
      </div>
      <h1
        style={{
          margin: 0, fontSize: 28, fontWeight: 700, color: t.text,
          letterSpacing: -0.6, fontFamily: FONT, lineHeight: 1.15,
        }}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          style={{
            margin: '10px 0 0', fontSize: 15, color: t.textMuted,
            fontFamily: FONT, lineHeight: 1.55, maxWidth: 560,
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

export default StepHeader;
