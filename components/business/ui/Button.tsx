'use client';
import type { CSSProperties, ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  t: Tokens;
  variant?: Variant;
  size?: Size;
  children?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  type?: 'button' | 'submit';
}

const SIZES: Record<Size, { h: number; px: number; fs: number }> = {
  sm: { h: 30, px: 12, fs: 13 },
  md: { h: 38, px: 16, fs: 14 },
  lg: { h: 44, px: 20, fs: 15 },
};

export function Button({
  t, variant = 'primary', size = 'md',
  children, onClick, disabled, style,
  iconLeft, iconRight, type = 'button',
}: ButtonProps) {
  const s = SIZES[size];
  const variantStyle: CSSProperties =
    variant === 'primary'
      ? {
          background: disabled ? t.borderStrong : t.accent,
          color: '#fff',
          border: '1px solid transparent',
          boxShadow: disabled
            ? 'none'
            : '0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.15)',
        }
      : variant === 'secondary'
      ? { background: t.surface, color: t.text, border: `1px solid ${t.border}`, boxShadow: t.shadowSm }
      : variant === 'ghost'
      ? { background: 'transparent', color: t.text, border: '1px solid transparent' }
      : { background: 'transparent', color: t.accent, border: 'none', padding: 0, height: 'auto' };

  return (
    <button
      type={type}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        height: variant === 'link' ? 'auto' : s.h,
        padding: variant === 'link' ? 0 : `0 ${s.px}px`,
        fontSize: s.fs,
        fontWeight: 550,
        fontFamily: FONT,
        borderRadius: 8,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        whiteSpace: 'nowrap',
        transition: 'background .12s, box-shadow .12s, transform .05s',
        letterSpacing: -0.1,
        ...variantStyle,
        ...style,
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}

export default Button;
