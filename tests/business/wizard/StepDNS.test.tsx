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
    fireEvent.click(screen.getByText(/Skip for now/));
    expect(set).toHaveBeenCalledWith({ dns: { mode: 'skip' } });
  });

  it('does not render the removed self-managed option', () => {
    render(<StepDNS t={t} data={base as BusinessIntakeData} set={() => {}} />);
    expect(screen.queryByText(/I'll manage my own DNS/)).toBeNull();
  });
});
