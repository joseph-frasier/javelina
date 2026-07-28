import { describe, it, expect } from 'vitest';
import { domainYearOptions } from '@/lib/domains/year-options';

describe('domainYearOptions', () => {
  it('returns the full base list when maxYears is undefined', () => {
    expect(domainYearOptions([1, 2, 3, 5, 10])).toEqual([1, 2, 3, 5, 10]);
  });
  it('locks to [1] when maxYears is 1', () => {
    expect(domainYearOptions([1, 2, 3, 5, 10], 1)).toEqual([1]);
    expect(domainYearOptions([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 1)).toEqual([1]);
  });
  it('returns the full base list when maxYears is 10', () => {
    expect(domainYearOptions([1, 2, 3, 5, 10], 10)).toEqual([1, 2, 3, 5, 10]);
  });
});
