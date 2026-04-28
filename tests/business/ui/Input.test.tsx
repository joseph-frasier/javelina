import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '@/components/business/ui/Input';
import { t } from '@/components/business/ui/tokens';

describe('Input', () => {
  it('calls onChange with the new value', () => {
    const onChange = vi.fn();
    render(<Input t={t} value="" onChange={onChange} placeholder="name" />);
    fireEvent.change(screen.getByPlaceholderText('name'), { target: { value: 'hi' } });
    expect(onChange).toHaveBeenCalledWith('hi');
  });

  it('renders prefix and suffix slots', () => {
    render(
      <Input t={t} value="" onChange={() => {}} prefix={<span>PRE</span>} suffix={<span>SUF</span>} />,
    );
    expect(screen.getByText('PRE')).toBeTruthy();
    expect(screen.getByText('SUF')).toBeTruthy();
  });
});
