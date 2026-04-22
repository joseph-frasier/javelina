import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepContact } from '@/components/business/wizard/StepContact';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = {
  contact: {
    firstName: '', lastName: '',
    email: '', phone: '',
    address: '', city: '', state: '', zip: '',
    whois: true,
  },
} as BusinessIntakeData;

describe('StepContact', () => {
  it('updates firstName on input', () => {
    const set = vi.fn();
    render(<StepContact t={t} data={data} set={set} />);
    fireEvent.change(screen.getByPlaceholderText('Jordan'), { target: { value: 'Pat' } });
    expect(set).toHaveBeenCalledWith({ contact: { firstName: 'Pat' } });
  });

  it('toggles WHOIS privacy', () => {
    const set = vi.fn();
    render(<StepContact t={t} data={data} set={set} />);
    const toggles = screen.getAllByRole('button');
    fireEvent.click(toggles[toggles.length - 1]);
    expect(set).toHaveBeenCalledWith({ contact: { whois: false } });
  });
});
