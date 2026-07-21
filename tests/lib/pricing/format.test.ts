import { describe, it, expect } from 'vitest';
import { categoryLabel, formatRule, isRuleActive, hasActivePricing } from '@/lib/pricing/format';
import type { PricingRule } from '@/lib/api-client';

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: 'r', org_id: 'o', scope: 'all', category: null, discount_type: 'percent',
  value_bps: 1500, value_cents: null, effective_from: '2020-01-01T00:00:00Z',
  effective_until: null, note: null, created_by: null,
  created_at: '2020-01-01T00:00:00Z', archived_at: null, ...over,
});
const AT = new Date('2026-07-21T00:00:00Z');

describe('categoryLabel', () => {
  it('labels the baseline and categories', () => {
    expect(categoryLabel(null)).toBe('All products');
    expect(categoryLabel('plan')).toBe('Plan');
    expect(categoryLabel('mailbox')).toBe('Mailboxes');
    expect(categoryLabel('domain')).toBe('Domains');
  });
});

describe('formatRule', () => {
  it('formats each discount type', () => {
    expect(formatRule(rule({ discount_type: 'percent', value_bps: 1500 }))).toBe('15% off');
    expect(formatRule(rule({ discount_type: 'percent', value_bps: 4050 }))).toBe('40.5% off');
    expect(formatRule(rule({ discount_type: 'waive', value_bps: null }))).toBe('Waived (100% off)');
    expect(formatRule(rule({ discount_type: 'price_override', value_bps: null, value_cents: 9900 }))).toBe('$99.00 flat');
  });
});

describe('isRuleActive / hasActivePricing', () => {
  it('excludes archived, future, and expired rules', () => {
    expect(isRuleActive(rule({ archived_at: '2025-01-01T00:00:00Z' }), AT)).toBe(false);
    expect(isRuleActive(rule({ effective_from: '2027-01-01T00:00:00Z' }), AT)).toBe(false);
    expect(isRuleActive(rule({ effective_until: '2026-01-01T00:00:00Z' }), AT)).toBe(false);
    expect(isRuleActive(rule({}), AT)).toBe(true);
  });
  it('hasActivePricing is true when any rule is active', () => {
    expect(hasActivePricing([rule({ archived_at: '2025-01-01T00:00:00Z' }), rule({})], AT)).toBe(true);
    expect(hasActivePricing([rule({ archived_at: '2025-01-01T00:00:00Z' })], AT)).toBe(false);
  });
});
