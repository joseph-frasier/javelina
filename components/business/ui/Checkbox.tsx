'use client';
import { FONT, type Tokens } from './tokens';
import { Icon } from './Icon';

interface CheckboxProps {
  t: Tokens;
  checked: boolean;
  onChange?: (next: boolean) => void;
  label: string;
  description?: string;
}

export function Checkbox({ t, checked, onChange, label, description }: CheckboxProps) {
  return (
    <label
      onClick={() => onChange?.(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        cursor: 'pointer', padding: '4px 0',
      }}
    >
      <div
        style={{
          width: 18, height: 18, borderRadius: 5, marginTop: 1,
          border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
          background: checked ? t.accent : t.surface,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .12s', flexShrink: 0,
        }}
      >
        {checked && <Icon name="check" size={12} color="#fff" />}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: t.text, fontFamily: FONT, fontWeight: 500 }}>{label}</div>
        {description && (
          <div style={{ fontSize: 13, color: t.textMuted, marginTop: 2, fontFamily: FONT }}>
            {description}
          </div>
        )}
      </div>
    </label>
  );
}

export default Checkbox;
