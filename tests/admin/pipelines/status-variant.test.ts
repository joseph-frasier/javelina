import { describe, it, expect } from 'vitest';
import { STATUS_VARIANT } from '@/app/admin/pipelines/_lib/status-variant';

describe('STATUS_VARIANT', () => {
  it('uses "warning" for agents_complete (operator action needed)', () => {
    expect(STATUS_VARIANT.agents_complete).toBe('warning');
  });

  it('uses "danger" for failed', () => {
    expect(STATUS_VARIANT.failed).toBe('danger');
  });

  it('uses "success" for live', () => {
    expect(STATUS_VARIANT.live).toBe('success');
  });

  it('has an entry for every status', () => {
    const statuses = [
      'created', 'form_submitted', 'agents_complete', 'scope_confirmed',
      'provisioning', 'live', 'routed_to_custom', 'abandoned', 'failed',
    ];
    for (const s of statuses) expect(STATUS_VARIANT).toHaveProperty(s);
  });
});
