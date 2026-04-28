// components/business/wizard/BusinessWizardShell.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FONT } from '@/components/business/ui/tokens';
import { useBusinessTheme } from '@/lib/business-theme-store';
import { Card } from '@/components/business/ui/Card';
import { Button } from '@/components/business/ui/Button';
import { Icon } from '@/components/business/ui/Icon';
import { Stepper } from './Stepper';
import { StepDNS } from './StepDNS';
import { StepWebsite } from './StepWebsite';
import { StepDomain, type BundledDomainStatus } from './StepDomain';
import { StepContact } from './StepContact';
import { StepConfirm } from './StepConfirm';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';
import { organizationsApi } from '@/lib/api-client';

const STEP_LABELS = ['DNS', 'Website', 'Domain', 'Contact', 'Confirm'] as const;

interface Props {
  orgId: string;
}

export function BusinessWizardShell({ orgId }: Props) {
  const router = useRouter();
  const t = useBusinessTheme();
  const data = useBusinessIntakeStore((s) => s.intakes[orgId]);
  const update = useBusinessIntakeStore((s) => s.update);
  const setStep = useBusinessIntakeStore((s) => s.setStep);
  const complete = useBusinessIntakeStore((s) => s.complete);

  const [entitlement, setEntitlement] = useState<BundledDomainStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    organizationsApi
      .getBundledDomainStatus(orgId)
      .then((res) => {
        if (!cancelled) setEntitlement(res);
      })
      .catch(() => {
        // Non-fatal: wizard still works, but mode-gating won't apply.
        if (!cancelled) setEntitlement(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  if (!data) {
    return (
      <div style={{ padding: 48, fontFamily: FONT, color: t.textMuted }}>
        Loading your setup…
      </div>
    );
  }

  const step = data.currentStep;
  const set = (patch: Parameters<typeof update>[1]) => update(orgId, patch);

  const onLaunch = () => {
    // eslint-disable-next-line no-console
    console.info('[business-intake] launch payload', data);
    complete(orgId);
    router.push(`/business/${orgId}`);
  };

  const stepContent =
    step === 0 ? <StepDNS t={t} data={data} set={set} /> :
    step === 1 ? <StepWebsite t={t} data={data} set={set} /> :
    step === 2 ? <StepDomain t={t} data={data} set={set} entitlement={entitlement} /> :
    step === 3 ? <StepContact t={t} data={data} set={set} /> :
                 <StepConfirm t={t} data={data} />;

  return (
    <div style={{ minHeight: '100%', background: t.surfaceAlt, fontFamily: FONT }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '36px 32px 60px' }}>
        <div
          style={{
            background: t.surface, borderRadius: 14, padding: '18px 24px',
            border: `1px solid ${t.border}`, boxShadow: t.shadowSm,
            marginBottom: 28,
          }}
        >
          <Stepper t={t} steps={[...STEP_LABELS]} current={step} />
        </div>

        <Card t={t} padding={36}>{stepContent}</Card>

        <div
          style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 24,
          }}
        >
          <Button
            t={t}
            variant="ghost"
            onClick={() => (step > 0 ? setStep(orgId, step - 1) : undefined)}
            disabled={step === 0}
            iconLeft={<Icon name="arrowLeft" size={14} />}
          >
            Back
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: t.textMuted }}>
              Step {step + 1} of {STEP_LABELS.length}
            </span>
            {step < STEP_LABELS.length - 1 ? (
              <Button
                t={t}
                onClick={() => setStep(orgId, step + 1)}
                iconRight={<Icon name="arrowRight" size={14} color="#fff" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                t={t}
                onClick={onLaunch}
                iconRight={<Icon name="rocket" size={14} color="#fff" />}
              >
                Launch my site
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BusinessWizardShell;
