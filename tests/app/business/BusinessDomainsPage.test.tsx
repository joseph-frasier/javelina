import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock request cookies used by server actions
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'fake-session-cookie' })),
  })),
}));

import { listUserDomains } from '@/lib/api/domains';

describe('listUserDomains (org-scoped)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { domains: [] } }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches /api/domains?org_id=<id> when an orgId is passed', async () => {
    await listUserDomains('o1');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain('/api/domains?org_id=o1');
  });

  it('fetches /api/domains with no query when orgId is omitted (legacy behavior)', async () => {
    await listUserDomains();

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toMatch(/\/api\/domains$/);
  });
});
