import { beforeEach, describe, expect, it } from 'vitest';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

describe('business intake store', () => {
  beforeEach(() => {
    useBusinessIntakeStore.setState({ intakes: {} });
    localStorage.clear();
  });

  it('initialises a new intake with defaults seeded from bizName', () => {
    useBusinessIntakeStore.getState().init('org_1', 'business_starter', 'Keller Studio');
    const data = useBusinessIntakeStore.getState().get('org_1');
    expect(data).not.toBeNull();
    expect(data!.planCode).toBe('business_starter');
    expect(data!.website.bizName).toBe('Keller Studio');
    expect(data!.dns.mode).toBe('jbp');
    expect(data!.currentStep).toBe(0);
    expect(data!.completedAt).toBeNull();
  });

  it('applies deep-merged updates via update()', () => {
    useBusinessIntakeStore.getState().init('org_2', 'business_pro', 'Acme');
    useBusinessIntakeStore.getState().update('org_2', { domain: { mode: 'register', search: 'acme' } });
    const data = useBusinessIntakeStore.getState().get('org_2');
    expect(data!.domain.mode).toBe('register');
    expect(data!.domain.search).toBe('acme');
    expect(data!.website.bizName).toBe('Acme');
  });

  it('setStep clamps to the wizard range', () => {
    useBusinessIntakeStore.getState().init('org_3', 'business_starter', 'Test');
    useBusinessIntakeStore.getState().setStep('org_3', 7);
    expect(useBusinessIntakeStore.getState().get('org_3')!.currentStep).toBe(4);
    useBusinessIntakeStore.getState().setStep('org_3', -1);
    expect(useBusinessIntakeStore.getState().get('org_3')!.currentStep).toBe(0);
  });

  it('complete() stamps completedAt', () => {
    useBusinessIntakeStore.getState().init('org_4', 'business_starter', 'Test');
    useBusinessIntakeStore.getState().complete('org_4');
    const data = useBusinessIntakeStore.getState().get('org_4');
    expect(data!.completedAt).not.toBeNull();
    expect(() => new Date(data!.completedAt!)).not.toThrow();
  });
});
