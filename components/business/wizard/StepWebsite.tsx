'use client';
import type { BusinessIntakeData } from '@/lib/business-intake-store';
import { FONT, MONO, type Tokens } from '@/components/business/ui/tokens';
import { StepHeader } from '@/components/business/ui/StepHeader';
import { FieldLabel } from '@/components/business/ui/FieldLabel';
import { Input } from '@/components/business/ui/Input';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { AestheticCard } from './AestheticCard';

type W = BusinessIntakeData['website'];
type Patch = { website?: Partial<W> };

interface Props {
  t: Tokens;
  data: BusinessIntakeData;
  set: (patch: Patch) => void;
}

const TONES = ['Friendly', 'Professional', 'Playful', 'Direct', 'Warm', 'Technical'] as const;

const AESTHETICS: Array<{
  id: 'bold' | 'simple' | 'choose';
  title: string;
  description: string;
  swatches: string[];
  fontLabel: string;
  sample: {
    bg: string; fg: string; font: string; weight: number;
    size: number; tracking: string; text: string;
  };
}> = [
  {
    id: 'bold',
    title: 'Bold & editorial',
    description: 'High contrast, oversized serif headlines, saturated accents.',
    swatches: ['#0f0f0f', '#f5f1e8', '#d97706', '#1e4620'],
    fontLabel: 'Fraunces / GT America',
    sample: {
      bg: '#f5f1e8', fg: '#0f0f0f', font: 'Georgia, serif',
      weight: 700, size: 26, tracking: '-0.03em',
      text: 'Made with\nintention.',
    },
  },
  {
    id: 'simple',
    title: 'Simple & professional',
    description: 'Clean sans-serif, generous whitespace, a single restrained accent.',
    swatches: ['#ffffff', '#0f1419', '#e6e8ec', '#0284c7'],
    fontLabel: 'Inter / System UI',
    sample: {
      bg: '#ffffff', fg: '#0f1419', font: 'Inter, system-ui, sans-serif',
      weight: 600, size: 22, tracking: '-0.02em',
      text: 'Clear. Competent.\nCalm.',
    },
  },
  {
    id: 'choose',
    title: 'Let me pick everything',
    description: 'Upload your own logo, pick colors and fonts yourself, and write all the copy.',
    swatches: ['#7c3aed', '#059669', '#d97706', '#e11d48'],
    fontLabel: 'Your choice',
    sample: {
      bg: 'linear-gradient(135deg, #f5f3ff, #ecfdf5)',
      fg: '#1f2937', font: 'system-ui',
      weight: 600, size: 20, tracking: '-0.02em',
      text: 'Your brand,\nyour rules.',
    },
  },
];

export function StepWebsite({ t, data, set }: Props) {
  const w = data.website;
  const update = (patch: Partial<W>) => set({ website: patch });

  return (
    <div>
      <StepHeader
        t={t}
        eyebrow="Step 2 of 5"
        title="Let's build your website"
        subtitle="Tell us about your business. We'll generate the first draft — you can tweak anything after launch."
      />

      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <FieldLabel t={t}>Business name</FieldLabel>
          <Input t={t} value={w.bizName} onChange={(v) => update({ bizName: v })} placeholder="Keller Studio" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <FieldLabel t={t}>What do you do?</FieldLabel>
            <Input
              t={t}
              value={w.bizType}
              onChange={(v) => update({ bizType: v })}
              placeholder="Design studio, coffee shop, contractor…"
            />
          </div>
          <div>
            <FieldLabel t={t} optional>Tagline</FieldLabel>
            <Input
              t={t}
              value={w.tagline}
              onChange={(v) => update({ tagline: v })}
              placeholder="A short, memorable one-liner"
            />
          </div>
        </div>

        <div>
          <FieldLabel t={t} hint={`${(w.description || '').length}/280`}>
            Describe your business in a few sentences
          </FieldLabel>
          <textarea
            value={w.description || ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Independent studio helping small teams ship products that feel considered."
            rows={3}
            style={{
              width: '100%', padding: '10px 12px',
              fontSize: 14, fontFamily: FONT,
              borderRadius: 8, border: `1px solid ${t.border}`,
              background: t.surface, color: t.text, resize: 'vertical',
              outline: 'none', lineHeight: 1.5, boxShadow: t.shadowSm,
            }}
          />
        </div>

        <div>
          <FieldLabel t={t} optional>Logo</FieldLabel>
          <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
            <div
              style={{
                width: 80, height: 80, borderRadius: 10,
                border: `1.5px dashed ${t.borderStrong}`,
                background: t.surfaceAlt,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted, fontSize: 11, fontFamily: MONO,
                textAlign: 'center', padding: 6,
              }}
            >
              {w.logoName ? (
                <div style={{ color: t.text, fontWeight: 600, wordBreak: 'break-all' }}>
                  ✓<br />{w.logoName}
                </div>
              ) : (
                'no file'
              )}
            </div>
            <div
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', gap: 8,
              }}
            >
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  t={t}
                  variant="secondary"
                  size="sm"
                  onClick={() => update({ logoName: 'logo-mark.svg' })}
                  iconLeft={<Icon name="plus" size={13} />}
                >
                  Upload logo
                </Button>
                <Button
                  t={t}
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ logoName: null })}
                >
                  Skip — use text wordmark
                </Button>
              </div>
              <div style={{ fontSize: 12, color: t.textMuted }}>
                SVG or PNG, transparent background works best. We'll generate favicons automatically.
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel t={t} optional>Photos &amp; imagery</FieldLabel>
          <div
            style={{
              padding: 16, borderRadius: 10,
              border: `1.5px dashed ${t.borderStrong}`,
              background: t.surfaceAlt,
              display: 'flex', alignItems: 'center', gap: 14,
            }}
          >
            <div
              style={{
                width: 38, height: 38, borderRadius: 8,
                background: t.surface, border: `1px solid ${t.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: t.textMuted,
              }}
            >
              <Icon name="plus" size={16} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text }}>
                {w.photoCount
                  ? `${w.photoCount} photos ready`
                  : 'Drop product shots, team photos, or work samples'}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
                Up to 20 files. We'll optimize and lay them out.
              </div>
            </div>
            <Button
              t={t}
              variant="secondary"
              size="sm"
              onClick={() => update({ photoCount: (w.photoCount || 0) + 6 })}
            >
              Browse files
            </Button>
          </div>
        </div>

        <div>
          <FieldLabel t={t}>Copy tone</FieldLabel>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {TONES.map((tn) => {
              const on = w.tone === tn;
              return (
                <button
                  key={tn}
                  type="button"
                  onClick={() => update({ tone: tn })}
                  style={{
                    padding: '7px 13px', borderRadius: 999,
                    cursor: 'pointer',
                    fontFamily: FONT, fontSize: 13, fontWeight: 550,
                    background: on ? t.accentSoft : t.surface,
                    border: `1.5px solid ${on ? t.accent : t.border}`,
                    color: on ? t.accent : t.text,
                  }}
                >
                  {tn}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 4 }}>
          <FieldLabel t={t} hint="We'll handle typography, color, spacing">
            Pick an aesthetic direction
          </FieldLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {AESTHETICS.map((a) => (
              <AestheticCard
                key={a.id}
                t={t}
                id={a.id}
                selected={w.aesthetic}
                onClick={(v) => update({ aesthetic: v })}
                title={a.title}
                description={a.description}
                swatches={a.swatches}
                fontLabel={a.fontLabel}
                sample={a.sample}
              />
            ))}
          </div>
        </div>

        {w.aesthetic === 'choose' && (
          <div
            style={{
              marginTop: 4, padding: 16, borderRadius: 10,
              background: t.surfaceAlt, border: `1px solid ${t.border}`,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <FieldLabel t={t}>Primary color</FieldLabel>
                <Input
                  t={t}
                  value={w.customColor}
                  onChange={(v) => update({ customColor: v })}
                  placeholder="#EF7215"
                  prefix={
                    <div
                      style={{
                        width: 14, height: 14, borderRadius: 4,
                        background: w.customColor || t.accent,
                        border: `1px solid ${t.border}`,
                      }}
                    />
                  }
                />
              </div>
              <div>
                <FieldLabel t={t}>Font family</FieldLabel>
                <Input
                  t={t}
                  value={w.customFont}
                  onChange={(v) => update({ customFont: v })}
                  placeholder="Inter, Fraunces, IBM Plex…"
                />
              </div>
            </div>
          </div>
        )}

        <Checkbox
          t={t}
          checked={!!w.letUsWrite}
          onChange={(v) => update({ letUsWrite: v })}
          label="Write the copy for me"
          description="We'll draft the homepage, about, and contact sections based on what you told us."
        />
      </div>
    </div>
  );
}

export default StepWebsite;
