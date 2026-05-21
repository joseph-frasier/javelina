import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Radio } from '@/components/business/ui/Radio';
import { Checkbox } from '@/components/business/ui/Checkbox';
import { Toggle } from '@/components/business/ui/Toggle';
import { t } from '@/components/business/ui/tokens';

describe('Radio', () => {
  it('calls onChange when clicked', () => {
    const onChange = vi.fn();
    render(<Radio t={t} checked={false} onChange={onChange} label="A" description="desc" />);
    fireEvent.click(screen.getByText('A'));
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Checkbox', () => {
  it('toggles value via onChange', () => {
    const onChange = vi.fn();
    render(<Checkbox t={t} checked={false} onChange={onChange} label="Accept" />);
    fireEvent.click(screen.getByText('Accept'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Toggle', () => {
  it('flips state via onChange', () => {
    const onChange = vi.fn();
    render(<Toggle t={t} checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
