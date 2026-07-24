import { describe, it, expect } from 'vitest';
import { formatUsdCents } from '@/lib/billing/format';

describe('formatUsdCents', () => {
  it('formats whole and fractional dollars', () => {
    expect(formatUsdCents(4900)).toBe('$49.00');
    expect(formatUsdCents(3920)).toBe('$39.20');
  });
  it('formats zero (waive) as $0.00', () => {
    expect(formatUsdCents(0)).toBe('$0.00');
  });
});
