import { describe, it, expect } from 'vitest';
import { summarizeRules, summarizeDuration } from '@/lib/discounts/format';

describe('summarizeRules', () => {
  it('summarizes an all-products percent rule', () => {
    expect(summarizeRules([{ scope: 'all', category: null, discount_type: 'percent', value_bps: 2000 }]))
      .toBe('20% off all products');
  });

  it('summarizes a single category rule', () => {
    expect(summarizeRules([{ scope: 'category', category: 'domain', discount_type: 'waive' }]))
      .toBe('Waived (100% off) on domains');
  });

  it('joins multiple category rules', () => {
    expect(
      summarizeRules([
        { scope: 'category', category: 'plan', discount_type: 'percent', value_bps: 2000 },
        { scope: 'category', category: 'domain', discount_type: 'waive' },
      ]),
    ).toBe('20% off on plan, Waived (100% off) on domains');
  });

  it('handles an empty rule set', () => {
    expect(summarizeRules([])).toBe('No discount');
  });
});

describe('summarizeDuration', () => {
  it('describes a relative duration', () => {
    expect(summarizeDuration({ duration_months: 3, grant_ends_at: null })).toBe('for 3 months');
  });

  it('uses the singular for one month', () => {
    expect(summarizeDuration({ duration_months: 1, grant_ends_at: null })).toBe('for 1 month');
  });

  it('describes an absolute end date', () => {
    expect(summarizeDuration({ duration_months: null, grant_ends_at: '2027-01-01T00:00:00.000Z' }))
      .toBe('through Dec 31, 2026');
  });

  it('describes an open-ended grant', () => {
    expect(summarizeDuration({ duration_months: null, grant_ends_at: null })).toBe('ongoing');
  });
});
