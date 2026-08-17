import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const { middleware } = await import('../../middleware');

/**
 * Next exposes middleware-set request headers on the response as
 * `x-middleware-request-<name>`; that is what the app later reads via
 * headers(). Asserting on it is asserting on the real mechanism.
 */
function brandHeaderOf(response: Response): string | null {
  return response.headers.get('x-middleware-request-x-brand');
}

function requestFor(host: string, path = '/') {
  return new NextRequest(`https://${host}${path}`, {
    method: 'GET',
    headers: { host },
  });
}

describe('middleware brand stamping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('stamps irongrove on requests to the Irongrove host', async () => {
    const response = await middleware(requestFor('app.irongrove.com'));
    expect(brandHeaderOf(response)).toBe('irongrove');
  });

  it('stamps javelina on requests to the Javelina host', async () => {
    const response = await middleware(requestFor('app.javelina.cloud'));
    expect(brandHeaderOf(response)).toBe('javelina');
  });

  it('stamps javelina on an unrecognised host rather than leaving it unset', async () => {
    const response = await middleware(requestFor('preview-abc123.vercel.app'));
    expect(brandHeaderOf(response)).toBe('javelina');
  });

  it('stamps the brand on protected routes too, not just public ones', async () => {
    // The redirect for an unauthenticated user must still carry the brand, or
    // the login page it lands on renders unbranded.
    const response = await middleware(
      requestFor('app.irongrove.com', '/organization/org-123')
    );
    expect(brandHeaderOf(response)).toBe('irongrove');
  });
});
