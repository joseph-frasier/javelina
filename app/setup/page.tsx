'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWizardStore, WIZARD_STEP_COUNT } from '@/lib/wizard-store';
import StepDNS from '@/components/wizard/StepDNS';
import StepWebsite from '@/components/wizard/StepWebsite';
import StepDomain from '@/components/wizard/StepDomain';
import StepContact from '@/components/wizard/StepContact';
import StepConfirm from '@/components/wizard/StepConfirm';

const STEPS = [StepDNS, StepWebsite, StepDomain, StepContact, StepConfirm];

export default function SetupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStep = useWizardStore((s) => s.currentStep);
  const setStep = useWizardStore((s) => s.setStep);

  // Sync ?step=N (1-indexed) into the store on mount / param change.
  useEffect(() => {
    const raw = searchParams.get('step');
    if (!raw) return;
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const target = Math.max(0, Math.min(WIZARD_STEP_COUNT - 1, parsed - 1));
    if (target !== currentStep) {
      setStep(target);
    }
  }, [searchParams, currentStep, setStep]);

  // Keep ?step=N in the URL as the user navigates through steps.
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('step', String(currentStep + 1));
    window.history.replaceState(null, '', url.toString());
  }, [currentStep]);

  const StepComponent = STEPS[currentStep] ?? STEPS[0];
  return <StepComponent />;
}
