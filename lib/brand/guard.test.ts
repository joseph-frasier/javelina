import { describe, it, expect, vi, beforeEach } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const headersMock = vi.fn();

vi.mock('next/navigation', () => ({ notFound }));
vi.mock('next/headers', () => ({ headers: headersMock }));

const { guardSurface } = await import('./guard');

function onHost(brandId: string) {
  headersMock.mockResolvedValue({ get: (k: string) => (k === 'x-brand' ? brandId : null) });
}

describe('guardSurface', () => {
  beforeEach(() => vi.clearAllMocks());

  it('404s a hidden surface', async () => {
    onHost('irongrove');
    await expect(guardSurface('dns')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('allows a readonly surface through — readonly renders, it does not 404', async () => {
    onHost('irongrove');
    await expect(guardSurface('domains')).resolves.toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('allows a full surface through', async () => {
    onHost('irongrove');
    await expect(guardSurface('website')).resolves.toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('lets Javelina reach every surface', async () => {
    onHost('javelina');
    for (const surface of ['dns', 'ssl', 'domains', 'website'] as const) {
      await expect(guardSurface(surface)).resolves.toBeUndefined();
    }
    expect(notFound).not.toHaveBeenCalled();
  });

  it('an org override can open a surface the brand hides', async () => {
    onHost('irongrove');
    await expect(guardSurface('dns', { dns: 'full' })).resolves.toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('falls back to Javelina — and therefore stays open — when x-brand is absent', async () => {
    // Middleware always stamps it. If something strips the header we must not
    // start 404-ing surfaces for existing Javelina customers.
    headersMock.mockResolvedValue({ get: () => null });
    await expect(guardSurface('dns')).resolves.toBeUndefined();
    expect(notFound).not.toHaveBeenCalled();
  });
});
