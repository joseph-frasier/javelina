'use client';

import React from 'react';
import { clsx } from 'clsx';
import { useWizardStore, type ToneOption, type AestheticId } from '@/lib/wizard-store';
import WizardShell, { StepHeader } from './WizardShell';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';

const TONES: ToneOption[] = [
  'Friendly',
  'Professional',
  'Playful',
  'Direct',
  'Warm',
  'Technical',
];

const AESTHETICS: Array<{
  id: AestheticId;
  title: string;
  description: string;
  fontLabel: string;
  sample: {
    bg: string;
    fg: string;
    font: string;
    text: string;
  };
  swatches: string[];
}> = [
  {
    id: 'bold',
    title: 'Bold & editorial',
    description:
      'High contrast, oversized serif headlines, saturated accents. For studios and brands with a story.',
    fontLabel: 'Fraunces / GT America',
    sample: {
      bg: '#f5f1e8',
      fg: '#0f0f0f',
      font: 'Georgia, serif',
      text: 'Made with\nintention.',
    },
    swatches: ['#0f0f0f', '#f5f1e8', '#d97706', '#1e4620'],
  },
  {
    id: 'simple',
    title: 'Simple & professional',
    description:
      'Clean sans-serif, generous whitespace, a single restrained accent. Reliable for consultants and SaaS.',
    fontLabel: 'Inter / Inter',
    sample: {
      bg: '#ffffff',
      fg: '#0f1419',
      font: 'Inter, sans-serif',
      text: 'Work that\nships.',
    },
    swatches: ['#0f1419', '#ffffff', '#0284c7', '#e6e8ec'],
  },
  {
    id: 'playful',
    title: 'Playful & warm',
    description:
      'Rounded shapes, pastel palette, quirky details. For products that want to feel human and approachable.',
    fontLabel: 'DM Sans / DM Sans',
    sample: {
      bg: '#fef3ec',
      fg: '#7a3607',
      font: 'DM Sans, sans-serif',
      text: 'Hi there,\nwe’re glad\nyou’re here.',
    },
    swatches: ['#ef7215', '#fef3ec', '#7a3607', '#fce5d0'],
  },
];

export default function StepWebsite() {
  const businessName = useWizardStore((s) => s.businessName);
  const tagline = useWizardStore((s) => s.tagline);
  const description = useWizardStore((s) => s.description);
  const tones = useWizardStore((s) => s.tones);
  const aesthetic = useWizardStore((s) => s.aesthetic);
  const setField = useWizardStore((s) => s.setField);
  const toggleTone = useWizardStore((s) => s.toggleTone);

  const canContinue = businessName.trim().length > 0 && !!aesthetic;

  return (
    <WizardShell canContinue={canContinue}>
      <StepHeader
        eyebrow="Step 2 of 5"
        title="Tell us about your site"
        subtitle="Just the basics. You'll be able to refine everything once we've spun up your draft."
      />

      <div className="grid gap-5">
        <Input
          label="Business name"
          value={businessName}
          onChange={(e) => setField('businessName', e.target.value)}
          placeholder="e.g. Mesa Roasters"
        />
        <Input
          label="Tagline"
          value={tagline}
          onChange={(e) => setField('tagline', e.target.value)}
          placeholder="A short sentence that captures what you do"
          helperText="Optional — we'll draft one if you leave it blank."
        />
        <Textarea
          label="Describe what you do"
          value={description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="A sentence or two about your product, service, or space."
          rows={3}
        />

        <div>
          <label className="block text-sm font-semibold text-text mb-2">
            Voice & tone
          </label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => {
              const on = tones.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleTone(t)}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border',
                    on
                      ? 'bg-accent-soft border-accent text-accent'
                      : 'bg-surface border-border text-text-muted hover:text-text hover:border-border-strong'
                  )}
                  aria-pressed={on}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text mb-2">
            Aesthetic
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            {AESTHETICS.map((a) => {
              const on = aesthetic === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setField('aesthetic', a.id)}
                  className={clsx(
                    'text-left rounded-xl overflow-hidden transition-[border-color,box-shadow] duration-150',
                    'border',
                    on
                      ? 'bg-accent-soft border-accent shadow-focus-ring'
                      : 'bg-surface border-border hover:border-border-strong'
                  )}
                  aria-pressed={on}
                >
                  <div
                    className="h-24 px-4 py-3 flex flex-col justify-between"
                    style={{
                      backgroundColor: a.sample.bg,
                      color: a.sample.fg,
                      fontFamily: a.sample.font,
                    }}
                  >
                    <div className="text-[20px] leading-tight font-bold whitespace-pre-line">
                      {a.sample.text}
                    </div>
                    <div className="flex gap-1.5">
                      {a.swatches.map((c, i) => (
                        <span
                          key={i}
                          className="inline-block w-3.5 h-3.5 rounded-sm"
                          style={{
                            backgroundColor: c,
                            boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-semibold text-text leading-tight">
                      {a.title}
                    </div>
                    <div className="text-[12.5px] text-text-muted mt-1 leading-snug">
                      {a.description}
                    </div>
                    <div className="text-[11px] font-mono text-text-faint mt-2">
                      {a.fontLabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </WizardShell>
  );
}
