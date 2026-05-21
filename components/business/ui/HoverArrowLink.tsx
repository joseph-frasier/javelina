'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface Props {
  t: Tokens;
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}

export function HoverArrowLink({ t, href, onClick, children, style }: Props) {
  const [hovered, setHovered] = useState(false);

  const content = (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={href ? undefined : onClick}
      style={{
        color: t.accent,
        fontSize: 13,
        fontWeight: 600,
        fontFamily: FONT,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...style,
      }}
    >
      {children}
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          transform: hovered ? 'translateX(3px)' : 'translateX(0)',
          transition: 'transform .2s ease',
        }}
      >
        →
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}

export default HoverArrowLink;
