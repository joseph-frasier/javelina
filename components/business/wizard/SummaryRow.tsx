'use client';
import type { ReactNode } from 'react';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';

interface SummaryRowProps {
  t: Tokens;
  label: string;
  value: ReactNode;
  mono?: boolean;
}

export function SummaryRow({ t, label, value, mono }: SummaryRowProps) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start',
        padding: '14px 0',
        borderBottom: `1px solid ${t.border}`,
        fontFamily: FONT,
      }}
    >
      <div style={{ width: 180, fontSize: 13, color: t.textMuted, fontWeight: 500 }}>
        {label}
      </div>
      <div
        style={{
          flex: 1, fontSize: 14, color: t.text,
          fontFamily: mono ? MONO : FONT, fontWeight: 500,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default SummaryRow;
