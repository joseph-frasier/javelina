import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepWebsite } from '@/components/business/wizard/StepWebsite';
import { t } from '@/components/business/ui/tokens';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

const data = {
  website: {
    bizName: '', bizType: '', tagline: '', description: '',
    logo: null, photos: [],
    tone: 'Friendly', aesthetic: 'simple' as const,
    letUsWrite: true,
  },
} as unknown as BusinessIntakeData;

describe('StepWebsite', () => {
  it('updates bizName on input', () => {
    const set = vi.fn();
    render(<StepWebsite t={t} data={data} set={set} />);
    fireEvent.change(screen.getByPlaceholderText(/Keller Studio/), { target: { value: 'Acme' } });
    expect(set).toHaveBeenCalledWith({ website: { bizName: 'Acme' } });
  });

  it('switches aesthetic when a card is clicked', () => {
    const set = vi.fn();
    render(<StepWebsite t={t} data={data} set={set} />);
    fireEvent.click(screen.getByText('Bold & editorial'));
    expect(set).toHaveBeenCalledWith({ website: { aesthetic: 'bold' } });
  });
});
