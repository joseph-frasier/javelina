import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pricingApi } from '@/lib/api-client';

const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

function ok(data: unknown) {
  return {
    ok: true,
    status: 200,
    headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
    json: async () => ({ data }),
  } as unknown as Response;
}

describe('pricingApi', () => {
  it('lists rules for an org', async () => {
    fetchMock.mockResolvedValue(ok({ active: [], history: [] }));
    const result = await pricingApi.list('org1');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/backend/admin/organizations/org1/pricing-rules',
      expect.objectContaining({ credentials: 'include' }),
    );
    expect(result).toEqual({ active: [], history: [] });
  });

  it('creates a rule via POST with the input body', async () => {
    fetchMock.mockResolvedValue(ok({ id: 'rule1' }));
    const input = { scope: 'category', category: 'domain', discount_type: 'percent', value_bps: 4000 } as const;
    await pricingApi.create('org1', input);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/backend/admin/organizations/org1/pricing-rules');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual(input);
  });

  it('archives a rule via DELETE', async () => {
    fetchMock.mockResolvedValue(ok(null));
    await pricingApi.archive('org1', 'rule1');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/backend/admin/organizations/org1/pricing-rules/rule1');
    expect(opts.method).toBe('DELETE');
  });
});
