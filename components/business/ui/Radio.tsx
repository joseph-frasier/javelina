'use client';
import type { ReactNode } from 'react';
import { FONT, type Tokens } from './tokens';

interface RadioProps {
  t: Tokens;
  checked: boolean;
  onChange?: () => void;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export function Radio({ t, checked, onChange, label, description, icon, disabled }: RadioProps) {
  return (
    <label
      onClick={() => {
        if (disabled) return;
        onChange?.();
      }}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14, padding: 16,
        borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer',
        background: checked ? t.accentSoft : t.surface,
        border: `1.5px solid ${checked ? t.accent : t.border}`,
        boxShadow: checked ? `0 0 0 3px ${t.ring}` : 'none',
        transition: 'border-color .12s, box-shadow .12s, background .12s',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: 999, marginTop: 2,
          border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
          background: checked ? t.accent : t.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {checked && <div style={{ width: 6, height: 6, borderRadius: 999, background: '#fff' }} />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <div style={{ color: checked ? t.accent : t.textMuted }}>{icon}</div>}
          <div style={{ fontWeight: 600, color: t.text, fontSize: 14, fontFamily: FONT }}>{label}</div>
        </div>
        {description && (
          <div
            style={{
              marginTop: 4, fontSize: 13, color: t.textMuted, fontFamily: FONT, lineHeight: 1.5,
            }}
          >
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

export default Radio;
