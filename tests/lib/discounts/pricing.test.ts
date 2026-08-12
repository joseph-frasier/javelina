import { describe, it, expect } from 'vitest';
import {
  isPlanOrAllRule,
  priceAfterRule,
  computeDiscountedTotal,
  type DiscountRuleForMath,
} from '@/lib/discounts/pricing';

const rule = (over: Partial<DiscountRuleForMath>): DiscountRuleForMath => ({
  scope: 'all',
  category: null,
  discount_type: 'percent',
  value_bps: 2000,
  value_cents: null,
  ...over,
});

describe('priceAfterRule', () => {
  it('applies a percent discount in integer cents', () => {
    expect(priceAfterRule(rule({ value_bps: 2000 }), 10000)).toBe(8000);
  });

  // The load-bearing case. The backend's amountFor multiplies by the remaining
  // fraction; subtracting a separately-rounded discount instead diverges by a
  // cent on an exact half-cent, and the preview would then disagree with the
  // invoice Stripe actually issues.
  it('rounds the same way the backend does on an exact half-cent', () => {
    // 1999 * (10000 - 5000) / 10000 = 999.5 -> 1000 (round-half-up).
    // The subtract-a-rounded-discount form gives 1999 - round(999.5) = 999.
    expect(priceAfterRule(rule({ value_bps: 5000 }), 1999)).toBe(1000);
    expect(priceAfterRule(rule({ value_bps: 5000 }), 1999)).not.toBe(999);
  });

  it('treats a 100% percent rule as free', () => {
    expect(priceAfterRule(rule({ value_bps: 10000 }), 4999)).toBe(0);
  });

  it('waives the whole amount', () => {
    expect(priceAfterRule(rule({ discount_type: 'waive', value_bps: null }), 12345)).toBe(0);
  });

  it('applies a price_override as an absolute price', () => {
    expect(
      priceAfterRule(
        rule({ discount_type: 'price_override', value_bps: null, value_cents: 500 }),
        10000,
      ),
    ).toBe(500);
  });

  // A negotiated override can legitimately sit above catalog price; it is a
  // price, not a discount, so it must not be clamped down to the original.
  it('honours a price_override above the catalog price', () => {
    expect(
      priceAfterRule(
        rule({ discount_type: 'price_override', value_bps: null, value_cents: 15000 }),
        10000,
      ),
    ).toBe(15000);
  });

  it('never returns a negative amount', () => {
    expect(
      priceAfterRule(
        rule({ discount_type: 'price_override', value_bps: null, value_cents: -100 }),
        10000,
      ),
    ).toBe(0);
  });
});

describe('isPlanOrAllRule', () => {
  it('counts an all-scoped rule', () => {
    expect(isPlanOrAllRule({ scope: 'all', category: null })).toBe(true);
  });
  it('counts a plan-scoped rule', () => {
    expect(isPlanOrAllRule({ scope: 'category', category: 'plan' })).toBe(true);
  });
  it('excludes domain and mailbox rules', () => {
    expect(isPlanOrAllRule({ scope: 'category', category: 'domain' })).toBe(false);
    expect(isPlanOrAllRule({ scope: 'category', category: 'mailbox' })).toBe(false);
  });
});

describe('computeDiscountedTotal', () => {
  it('leaves the total untouched when there are no rules', () => {
    expect(computeDiscountedTotal(10000, null)).toMatchObject({
      originalCents: 10000,
      discountedCents: 10000,
      discountAmountCents: 0,
      planDiscountRule: null,
      includedBenefitRules: [],
    });
  });

  // The case that would silently overcharge or undercharge on the review step:
  // a code granting only domain/mailbox rules has nothing on THIS invoice to
  // discount, so the plan total must not move.
  it('does not change the plan total for a domain/mailbox-only code', () => {
    const rules = [
      rule({ scope: 'category', category: 'domain', discount_type: 'waive', value_bps: null }),
      rule({ scope: 'category', category: 'mailbox', value_bps: 5000 }),
    ];
    const result = computeDiscountedTotal(10000, rules);

    expect(result.discountedCents).toBe(10000);
    expect(result.discountAmountCents).toBe(0);
    expect(result.planDiscountRule).toBeNull();
    expect(result.includedBenefitRules).toHaveLength(2);
  });

  it('applies the plan-scoped rule and reports the rest as benefits', () => {
    const planRule = rule({ scope: 'category', category: 'plan', value_bps: 2500 });
    const domainRule = rule({
      scope: 'category',
      category: 'domain',
      discount_type: 'waive',
      value_bps: null,
    });
    const result = computeDiscountedTotal(10000, [domainRule, planRule]);

    expect(result.planDiscountRule).toBe(planRule);
    expect(result.discountedCents).toBe(7500);
    expect(result.discountAmountCents).toBe(2500);
    expect(result.includedBenefitRules).toEqual([domainRule]);
  });

  it('reports the full amount as the discount when the plan is waived', () => {
    const result = computeDiscountedTotal(
      4999,
      [rule({ discount_type: 'waive', value_bps: null })],
    );
    expect(result.discountedCents).toBe(0);
    expect(result.discountAmountCents).toBe(4999);
  });

  it('reports a negative discount amount when an override exceeds catalog price', () => {
    const result = computeDiscountedTotal(
      10000,
      [rule({ discount_type: 'price_override', value_bps: null, value_cents: 12000 })],
    );
    expect(result.discountedCents).toBe(12000);
    expect(result.discountAmountCents).toBe(-2000);
  });
});
