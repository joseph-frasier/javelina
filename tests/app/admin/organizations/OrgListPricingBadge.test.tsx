import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { pricingStatusBadge } from '@/app/admin/organizations/pricingBadge';

describe('pricingStatusBadge', () => {
  it('returns a Custom Pricing badge when flagged', () => {
    render(<>{pricingStatusBadge({ has_custom_pricing: true } as any)}</>);
    expect(screen.getByText('Custom Pricing')).toBeInTheDocument();
  });
  it('returns null when not flagged', () => {
    const { container } = render(<>{pricingStatusBadge({ has_custom_pricing: false } as any)}</>);
    expect(container.textContent).toBe('');
  });
});
