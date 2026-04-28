'use client';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { Icon } from '@/components/business/ui/Icon';

export interface AestheticSample {
  bg: string;
  fg: string;
  font: string;
  weight: number;
  size: number;
  tracking: string;
  text: string;
}

interface AestheticCardProps {
  t: Tokens;
  id: 'bold' | 'simple' | 'choose';
  selected: 'bold' | 'simple' | 'choose';
  onClick: (id: 'bold' | 'simple' | 'choose') => void;
  title: string;
  description: string;
  swatches: string[];
  fontLabel: string;
  sample: AestheticSample;
}

export function AestheticCard({
  t, id, selected, onClick, title, description, swatches, fontLabel, sample,
}: AestheticCardProps) {
  const on = selected === id;
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      style={{
        textAlign: 'left', padding: 0, cursor: 'pointer',
        background: on ? t.accentSoft : t.surface,
        border: `1.5px solid ${on ? t.accent : t.border}`,
        borderRadius: 12, overflow: 'hidden', fontFamily: FONT,
        boxShadow: on ? `0 0 0 3px ${t.ring}` : 'none',
        transition: 'all .12s',
      }}
    >
      <div
        style={{
          height: 108, padding: '16px 18px',
          background: sample.bg,
          borderBottom: `1px solid ${on ? t.accent : t.border}`,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}
      >
        <div
          style={{
            fontFamily: sample.font, fontWeight: sample.weight,
            fontSize: sample.size, letterSpacing: sample.tracking,
            color: sample.fg, lineHeight: 1.1, whiteSpace: 'pre-line',
          }}
        >
          {sample.text}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {swatches.map((c, i) => (
            <div
              key={`${c}-${i}`}
              style={{
                width: 18, height: 18, borderRadius: 5, background: c,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
              }}
            />
          ))}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text, letterSpacing: -0.1 }}>
            {title}
          </div>
          {on && <Icon name="check" size={13} color={t.accent} />}
        </div>
        <div style={{ fontSize: 12.5, color: t.textMuted, marginTop: 4, lineHeight: 1.45 }}>
          {description}
        </div>
        <div
          style={{
            fontSize: 11, color: t.textFaint, marginTop: 8,
            fontFamily: MONO, letterSpacing: 0.2,
          }}
        >
          {fontLabel}
        </div>
      </div>
    </button>
  );
}

export default AestheticCard;
