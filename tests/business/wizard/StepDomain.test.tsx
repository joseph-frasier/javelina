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

  it('renders the search input when registering', () => {
    render(
      <StepDomain
        t={t}
        data={{ domain: { mode: 'register', search: 'myco' } } as BusinessIntakeData}
        set={() => {}}
      />,
    );
    // Real availability results are fetched on Search click; the entry UI
    // should be present even before any API call.
    expect(screen.getByText(/Find a domain/)).toBeTruthy();
    expect(screen.getByText(/Search/)).toBeTruthy();
  });

  it('locks register and transfer modes when entitlement is already redeemed', () => {
    const set = vi.fn();
    render(
      <StepDomain
        t={t}
        data={{ domain: { mode: 'connect' } } as BusinessIntakeData}
        set={set}
        entitlement={{
          eligible: true,
          redeemed: true,
          redeemed_at: '2026-04-27T12:00:00.000Z',
          available: false,
        }}
      />,
    );
    expect(screen.getByText(/bundled domain has already been used/i)).toBeTruthy();
    // Clicking the locked register radio should not fire the set callback.
    fireEvent.click(screen.getByText(/Register a new domain/));
    expect(set).not.toHaveBeenCalledWith({ domain: { mode: 'register' } });
  });
});
