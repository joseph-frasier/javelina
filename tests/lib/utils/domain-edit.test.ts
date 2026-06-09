import { describe, it, expect } from 'vitest';
import { isDomainEditable, EDITABLE_DOMAIN_STATUSES } from '@/lib/utils/domain-edit';

describe('isDomainEditable', () => {
  it('exposes exactly the editable statuses', () => {
    expect([...EDITABLE_DOMAIN_STATUSES].sort()).toEqual(
      ['active', 'transfer_complete'].sort()
    );
  });

  it.each(['active', 'transfer_complete'] as const)('returns true for %s', (status) => {
    expect(isDomainEditable(status)).toBe(true);
  });

  it.each(['pending', 'processing', 'transferring', 'expired', 'failed', 'cancelled'])(
    'returns false for %s',
    (status) => {
      expect(isDomainEditable(status)).toBe(false);
    }
  );

  it('returns false for undefined', () => {
    expect(isDomainEditable(undefined)).toBe(false);
  });
});
