import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from '@/components/business/wizard/Stepper';
import { t } from '@/components/business/ui/tokens';

describe('Stepper', () => {
  it('renders each step label', () => {
    render(<Stepper t={t} steps={['DNS', 'Website', 'Domain']} current={1} />);
    expect(screen.getByText('DNS')).toBeTruthy();
    expect(screen.getByText('Website')).toBeTruthy();
    expect(screen.getByText('Domain')).toBeTruthy();
  });
});
