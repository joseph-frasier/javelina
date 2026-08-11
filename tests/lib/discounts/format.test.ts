import { describe, it, expect } from 'vitest';
import {
  summarizeRules,
  summarizeDuration,
  alreadyAppliedDetail,
  ALREADY_APPLIED_SUMMARY,
} from '@/lib/discounts/format';
import { activeRules } from '@/lib/pricing/format';
import type { PricingRule } from '@/lib/api-client';

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

describe('alreadyAppliedDetail', () => {
  const threeMonths = { duration_months: 3, grant_ends_at: null };

  // The regression: a re-entered code on an org that still holds live rules
  // used to render the rule summary as the headline, which is exactly what a
  // fresh redemption renders. The two states were indistinguishable, so a
  // second attempt read as a second grant. The "already applied" sentence is
  // the headline now, and the rules are detail.
  it('keeps the rule summary as detail when live rules exist', () => {
    expect(
      alreadyAppliedDetail(
        [{ scope: 'all', category: null, discount_type: 'percent', value_bps: 2500 }],
        threeMonths,
      ),
    ).toBe('25% off all products for 3 months');
  });

  it('falls back to the duration alone when the grant has been archived', () => {
    expect(alreadyAppliedDetail([], threeMonths)).toBe('for 3 months');
  });

  it('never describes an archived grant as "No discount"', () => {
    expect(alreadyAppliedDetail([], threeMonths)).not.toContain('No discount');
  });

  it('states plainly that the code was already applied', () => {
    expect(ALREADY_APPLIED_SUMMARY).toBe('Already applied to this organization.');
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
      .toBe('through Jan 1, 2027');
  });

  it('renders the same end date regardless of the viewer timezone', () => {
    // Grants are stored as UTC instants. Rendering in local time puts customers
    // in negative-offset zones a day behind the date the grant actually ends.
    expect(summarizeDuration({ duration_months: null, grant_ends_at: '2027-01-01T00:00:00.000Z' }))
      .toBe('through Jan 1, 2027');
  });

  it('describes an open-ended grant', () => {
    expect(summarizeDuration({ duration_months: null, grant_ends_at: null })).toBe('ongoing');
  });
});

describe('activeRules composed with alreadyAppliedDetail', () => {
  // The seam both already_applied handlers use (checkout review + billing
  // settings). The backend's already_applied response returns every unarchived
  // rule with no effective-window filter, and nothing archives a rule when
  // effective_until passes — so an expired grant arrives in that list. Passing
  // it straight to alreadyAppliedDetail describes a discount the customer no
  // longer has, next to a total Stripe will not charge.
  const CODE = { duration_months: 3, grant_ends_at: null };

  function rule(overrides: Partial<PricingRule>): PricingRule {
    return {
      id: 'r1',
      org_id: 'org1',
      scope: 'all',
      category: null,
      discount_type: 'percent',
      value_bps: 2000,
      value_cents: null,
      effective_from: '2026-01-01T00:00:00.000Z',
      effective_until: null,
      note: null,
      created_by: null,
      created_at: '2026-01-01T00:00:00.000Z',
      archived_at: null,
      ...overrides,
    } as PricingRule;
  }

  const NOW = new Date('2026-08-11T00:00:00.000Z');

  it('describes a rule that is still in effect', () => {
    const rules = activeRules([rule({ effective_until: '2026-12-01T00:00:00.000Z' })], NOW);
    expect(alreadyAppliedDetail(rules, CODE)).toBe('20% off all products for 3 months');
  });

  it('drops an expired-but-unarchived rule, leaving the duration alone', () => {
    const rules = activeRules([rule({ effective_until: '2026-07-01T00:00:00.000Z' })], NOW);
    expect(rules).toHaveLength(0);
    expect(alreadyAppliedDetail(rules, CODE)).toBe('for 3 months');
  });

  it('drops a rule a superadmin archived', () => {
    const rules = activeRules([rule({ archived_at: '2026-07-01T00:00:00.000Z' })], NOW);
    expect(alreadyAppliedDetail(rules, CODE)).toBe('for 3 months');
  });
});
