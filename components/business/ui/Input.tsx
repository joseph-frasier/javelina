'use client';
import { useState, type CSSProperties, type ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface InputProps {
  t: Tokens;
  value: string | number | undefined;
  onChange?: (v: string) => void;
  placeholder?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
  style?: CSSProperties;
  type?: 'text' | 'email' | 'tel';
  readOnly?: boolean;
}

export function Input({ t, value, onChange, placeholder, prefix, suffix, style, type = 'text', readOnly }: InputProps) {
  const [focus, setFocus] = useState(false);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'stretch',
        height: 40,
        borderRadius: 8,
        background: readOnly ? t.surfaceAlt : t.surface,
        border: `1px solid ${focus ? t.accent : t.border}`,
        boxShadow: focus ? `0 0 0 3px ${t.ring}` : t.shadowSm,
        transition: 'border-color .12s, box-shadow .12s',
        fontFamily: FONT,
        overflow: 'hidden',
        ...style,
      }}
    >
      {prefix != null && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 10px 0 12px',
            color: t.textMuted, fontSize: 13,
            borderRight: `1px solid ${t.border}`,
            background: t.surfaceAlt,
          }}
        >
          {prefix}
        </div>
      )}
      <input
        type={type}
        value={value ?? ''}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder={placeholder}
        style={{
          flex: 1, border: 'none', outline: 'none',
          padding: '0 12px',
          background: 'transparent', color: t.text,
          fontSize: 14, fontFamily: FONT,
        }}
      />
      {suffix != null && (
        <div
          style={{
            display: 'flex', alignItems: 'center',
            padding: '0 12px',
            color: t.textMuted, fontSize: 13,
            borderLeft: `1px solid ${t.border}`,
            background: t.surfaceAlt,
          }}
        >
          {suffix}
        </div>
      )}
    </div>
  );
}

export default Input;
