import { describe, it, expect } from 'vitest';
import { getPlanTier } from '@/lib/hooks/usePlanLimits';

describe('getPlanTier — business-line plans resolve to starter', () => {
  it('maps business_starter to starter tier', () => {
    expect(getPlanTier('business_starter')).toBe('starter');
  });

  it('maps business_pro to starter tier', () => {
    expect(getPlanTier('business_pro')).toBe('starter');
  });

  it('still maps business to business tier', () => {
    expect(getPlanTier('business')).toBe('business');
  });

  it('still maps premium_lifetime to business tier', () => {
    expect(getPlanTier('premium_lifetime')).toBe('business');
  });

  it('still maps pro to pro tier', () => {
    expect(getPlanTier('pro')).toBe('pro');
  });
});
