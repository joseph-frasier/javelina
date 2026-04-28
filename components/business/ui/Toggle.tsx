'use client';
import type { Tokens } from './tokens';

interface ToggleProps {
  t: Tokens;
  checked: boolean;
  onChange?: (next: boolean) => void;
}

export function Toggle({ t, checked, onChange }: ToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange?.(!checked)}
      style={{
        width: 40, height: 24, borderRadius: 999, padding: 2, border: 'none',
        cursor: 'pointer',
        background: checked ? t.accent : t.borderStrong,
        transition: 'background .15s',
        display: 'flex', alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 20, height: 20, borderRadius: 999, background: '#fff',
          transform: `translateX(${checked ? 16 : 0}px)`,
          transition: 'transform .18s cubic-bezier(.3,.6,.3,1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
        }}
      />
    </button>
  );
}

export default Toggle;
