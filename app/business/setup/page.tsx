'use client';
import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BusinessWizardShell } from '@/components/business/wizard/BusinessWizardShell';
import {
  useBusinessIntakeStore,
  type BusinessPlanCode,
} from '@/lib/business-intake-store';

function SetupInner() {
  const router = useRouter();
  const params = useSearchParams();
  const orgId = params.get('org_id');
  const planCode = params.get('plan_code') as BusinessPlanCode | null;
  const bizName = params.get('org_name') || 'My business';
  const initStore = useBusinessIntakeStore((s) => s.init);
  const get = useBusinessIntakeStore((s) => s.get);

  useEffect(() => {
    if (!orgId || !planCode) {
      router.push('/pricing');
      return;
    }
    if (!get(orgId)) {
      initStore(orgId, planCode, bizName);
    }
  }, [orgId, planCode, bizName, get, initStore, router]);

  if (!orgId) return null;
  return <BusinessWizardShell orgId={orgId} />;
}

export default function BusinessSetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupInner />
    </Suspense>
  );
}
