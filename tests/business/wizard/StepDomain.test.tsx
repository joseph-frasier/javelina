// tests/business/wizard/StepDomain.test.tsx
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepDomain } from '@/components/business/wizard/StepDomain';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = { domain: { mode: 'connect' as const } } as BusinessIntakeData;

describe('StepDomain', () => {
  it('switches to transfer mode', () => {
    const set = vi.fn();
    render(<StepDomain t={t} data={data} set={set} />);
    fireEvent.click(screen.getByText(/Transfer a domain I already own/));
    expect(set).toHaveBeenCalledWith({ domain: { mode: 'transfer' } });
  });

  it('renders mock availability results when registering', () => {
    render(
      <StepDomain
        t={t}
        data={{ domain: { mode: 'register', search: 'myco' } } as BusinessIntakeData}
        set={() => {}}
      />,
    );
    expect(screen.getByText(/\.com/)).toBeTruthy();
    expect(screen.getAllByText(/Available|Taken/).length).toBeGreaterThan(0);
  });
});
