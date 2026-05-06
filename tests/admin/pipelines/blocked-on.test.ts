import { describe, it, expect } from 'vitest';
import { blockedOnLabel } from '@/app/admin/pipelines/_lib/blocked-on';

describe('blockedOnLabel', () => {
  it('maps agents_complete to "Awaiting operator scope review"', () => {
    expect(blockedOnLabel.agents_complete).toBe('Awaiting operator scope review');
  });

  it('returns null for live (not in queue)', () => {
    expect(blockedOnLabel.live).toBeNull();
  });

  it('has an entry for every status', () => {
    const expected = [
      'created', 'form_submitted', 'agents_complete', 'scope_confirmed',
      'provisioning', 'live', 'routed_to_custom', 'abandoned', 'failed',
    ];
    for (const s of expected) {
      expect(blockedOnLabel).toHaveProperty(s);
    }
  });
});
