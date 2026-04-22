'use client';
import { Fragment } from 'react';
import { FONT, type Tokens } from '@/components/business/ui/tokens';
import { Icon } from '@/components/business/ui/Icon';

interface StepperProps {
  t: Tokens;
  steps: string[];
  current: number;
}

export function Stepper({ t, steps, current }: StepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: FONT }}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={`${s}-${i}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: done ? t.accent : active ? t.surface : t.surfaceAlt,
                  border: `1.5px solid ${done || active ? t.accent : t.border}`,
                  color: done ? '#fff' : active ? t.accent : t.textMuted,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 600,
                  boxShadow: active ? `0 0 0 3px ${t.ring}` : 'none',
                  transition: 'all .15s',
                }}
              >
                {done ? <Icon name="check" size={14} color="#fff" /> : i + 1}
              </div>
              <div
                style={{
                  fontSize: 13, fontWeight: active ? 600 : 500,
                  color: active || done ? t.text : t.textMuted,
                  letterSpacing: -0.1,
                }}
              >
                {s}
              </div>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1, height: 1,
                  background: done ? t.accent : t.border,
                  transition: 'background .15s', minWidth: 20, maxWidth: 60,
                }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

export default Stepper;
