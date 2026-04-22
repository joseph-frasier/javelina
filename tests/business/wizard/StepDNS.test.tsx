import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDNS } from '@/components/business/wizard/StepDNS';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const base: Pick<BusinessIntakeData, 'dns'> = { dns: { mode: 'jbp' } };

describe('StepDNS', () => {
  it('calls set with new dns mode when a different radio is clicked', () => {
    const set = vi.fn();
    render(<StepDNS t={t} data={base as BusinessIntakeData} set={set} />);
    fireEvent.click(screen.getByText(/I'll manage my own DNS/));
    expect(set).toHaveBeenCalledWith({ dns: { mode: 'self' } });
  });

  it('shows the provider picker when mode is self', () => {
    render(<StepDNS t={t} data={{ dns: { mode: 'self' } } as BusinessIntakeData} set={() => {}} />);
    expect(screen.getByText('Cloudflare')).toBeTruthy();
    expect(screen.getByText('Route 53')).toBeTruthy();
  });
});
