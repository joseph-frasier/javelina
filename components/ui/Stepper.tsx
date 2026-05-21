import React from 'react';
import { clsx } from 'clsx';

export interface StepperStep {
  label: string;
  description?: string;
}

export interface StepperProps {
  steps: StepperStep[];
  currentStep: number; // 0-indexed
  onStepClick?: (index: number) => void;
  className?: string;
}

export default function Stepper({
  steps,
  currentStep,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <ol
      aria-label="Progress"
      className={clsx('flex items-center w-full', className)}
    >
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isClickable = !!onStepClick && index <= currentStep;
        const isLast = index === steps.length - 1;

        return (
          <li
            key={step.label}
            className={clsx(
              'flex items-center',
              !isLast && 'flex-1'
            )}
          >
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick?.(index)}
              aria-current={isActive ? 'step' : undefined}
              className={clsx(
                'flex items-center gap-3 group',
                isClickable && 'cursor-pointer',
                !isClickable && 'cursor-default'
              )}
            >
              <span
                className={clsx(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  'text-sm font-semibold transition-colors duration-150',
                  'border',
                  isCompleted &&
                    'bg-accent border-accent text-white',
                  isActive &&
                    'bg-accent border-accent text-white shadow-[0_0_0_3px_var(--ring)]',
                  !isCompleted && !isActive &&
                    'bg-surface border-border text-text-muted group-hover:border-border-strong'
                )}
                aria-hidden
              >
                {isCompleted ? (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3,8 7,12 13,4" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="flex flex-col items-start text-left">
                <span
                  className={clsx(
                    'text-sm font-medium leading-tight',
                    isActive || isCompleted ? 'text-text' : 'text-text-muted'
                  )}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className="text-xs text-text-muted mt-0.5 hidden sm:block">
                    {step.description}
                  </span>
                )}
              </span>
            </button>
            {!isLast && (
              <span
                aria-hidden
                className={clsx(
                  'flex-1 h-px mx-3 transition-colors duration-150',
                  isCompleted ? 'bg-accent' : 'bg-border'
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
