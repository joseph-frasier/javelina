'use client';
import type { CSSProperties, ReactNode } from 'react';
import type { Tokens } from './tokens';

interface CardProps {
  t: Tokens;
  children: ReactNode;
  style?: CSSProperties;
  padding?: number;
}

export function Card({ t, children, style, padding = 24 }: CardProps) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 16,
        boxShadow: t.shadowSm,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default Card;
