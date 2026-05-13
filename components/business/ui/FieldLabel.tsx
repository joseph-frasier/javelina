'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface FieldLabelProps {
  t: Tokens;
  children: ReactNode;
  hint?: string;
  optional?: boolean;
}

export function FieldLabel({ t, children, hint, optional }: FieldLabelProps) {
  return (
    <div
      style={{
        marginBottom: 8,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <label
        style={{
          fontSize: 14, fontWeight: 600, color: t.text,
          fontFamily: FONT, letterSpacing: -0.1,
        }}
      >
        {children}
        {optional && (
          <span
            style={{
              color: t.textFaint, fontWeight: 500, marginLeft: 6, fontSize: 13,
            }}
          >
            optional
          </span>
        )}
      </label>
      {hint && (
        <span style={{ fontSize: 12, color: t.textMuted, fontFamily: FONT }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export default FieldLabel;
