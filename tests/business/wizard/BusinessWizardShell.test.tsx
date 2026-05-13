// tests/business/wizard/BusinessWizardShell.test.tsx
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BusinessWizardShell } from '@/components/business/wizard/BusinessWizardShell';
import { useBusinessIntakeStore } from '@/lib/business-intake-store';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('BusinessWizardShell', () => {
  beforeEach(() => {
    useBusinessIntakeStore.setState({ intakes: {} });
    useBusinessIntakeStore.getState().init('o1', 'business_starter', 'Acme');
  });

  it('advances step when Continue is clicked', () => {
    render(<BusinessWizardShell orgId="o1" />);
    fireEvent.click(screen.getByText('Continue'));
    expect(useBusinessIntakeStore.getState().get('o1')!.currentStep).toBe(1);
  });

  it('shows Launch button on last step', () => {
    useBusinessIntakeStore.getState().setStep('o1', 4);
    render(<BusinessWizardShell orgId="o1" />);
    expect(screen.getByText(/Launch my site/)).toBeTruthy();
  });
});
