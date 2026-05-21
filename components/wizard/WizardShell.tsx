'use client';

import React from 'react';
import { clsx } from 'clsx';
import Stepper from '@/components/ui/Stepper';
import Button from '@/components/ui/Button';
import { useWizardStore, WIZARD_STEP_COUNT } from '@/lib/wizard-store';

const STEPS = [
  { label: 'DNS', description: 'How records are managed' },
  { label: 'Website', description: 'Content & look' },
  { label: 'Domain', description: 'Pick a domain' },
  { label: 'Contact', description: 'Registrant details' },
  { label: 'Confirm', description: 'Review & launch' },
];

export interface WizardShellProps {
  children: React.ReactNode;
  canContinue?: boolean;
  continueLabel?: string;
  onContinue?: () => void;
  onBack?: () => void;
  hideBack?: boolean;
  finalStep?: boolean;
}

export default function WizardShell({
  children,
  canContinue = true,
  continueLabel,
  onContinue,
  onBack,
  hideBack,
  finalStep,
}: WizardShellProps) {
  const currentStep = useWizardStore((s) => s.currentStep);
  const next = useWizardStore((s) => s.next);
  const back = useWizardStore((s) => s.back);
  const setStep = useWizardStore((s) => s.setStep);
  const completedSteps = useWizardStore((s) => s.completedSteps);

  const handleBack = onBack ?? back;
  const handleContinue = () => {
    onContinue?.();
    if (!finalStep) next();
  };

  const defaultContinueLabel = finalStep
    ? 'Launch'
    : currentStep === WIZARD_STEP_COUNT - 2
      ? 'Review'
      : 'Continue';

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <Stepper
            steps={STEPS}
            currentStep={currentStep}
            onStepClick={(i) => {
              if (i <= currentStep || completedSteps.includes(i - 1)) {
                setStep(i);
              }
            }}
          />
        </div>

        <div className="rounded-2xl border border-border bg-surface shadow-card">
          <div className="px-6 sm:px-10 py-8 sm:py-10">{children}</div>

          <div
            className={clsx(
              'flex items-center justify-between gap-3 border-t border-border bg-surface-alt px-6 sm:px-10 py-4 rounded-b-2xl'
            )}
          >
            <div>
              {!hideBack && currentStep > 0 && (
                <Button variant="ghost" size="md" onClick={handleBack}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="3" y1="8" x2="13" y2="8" />
                    <polyline points="7,4 3,8 7,12" />
                  </svg>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-text-faint">
                Step {currentStep + 1} of {WIZARD_STEP_COUNT}
              </span>
              <Button
                variant="primary"
                size="md"
                onClick={handleContinue}
                disabled={!canContinue}
              >
                {continueLabel ?? defaultContinueLabel}
                {!finalStep && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <line x1="3" y1="8" x2="13" y2="8" />
                    <polyline points="9,4 13,8 9,12" />
                  </svg>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StepHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-7">
      <div className="text-[11px] font-semibold tracking-[0.18em] uppercase text-accent mb-2">
        {eyebrow}
      </div>
      <h1 className="text-[26px] sm:text-[30px] font-bold text-text tracking-tight leading-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2.5 text-[15px] text-text-muted leading-relaxed max-w-[52ch]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
