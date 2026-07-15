import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, domainsApi } from '@/lib/api-client';

describe('domainsApi org threading', () => {
  let getSpy: ReturnType<typeof vi.spyOn>;
  let postSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue({ domains: [] });
    postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({});
  });

  afterEach(() => {
    getSpy.mockRestore();
    postSpy.mockRestore();
  });

  it('list() with no orgId hits /domains with no query string', async () => {
    await domainsApi.list();
    expect(getSpy).toHaveBeenCalledWith('/domains');
  });

  it('list(orgId) builds /domains?org_id=<orgId>', async () => {
    await domainsApi.list('o1');
    expect(getSpy).toHaveBeenCalledWith('/domains?org_id=o1');
  });

  it('list(orgId) URL-encodes the orgId', async () => {
    await domainsApi.list('o 1/2');
    expect(getSpy).toHaveBeenCalledWith(`/domains?org_id=${encodeURIComponent('o 1/2')}`);
  });

  it('link(domain, orgId) posts { domain, org_id } to /domains/link', async () => {
    await domainsApi.link('example.com', 'o1');
    expect(postSpy).toHaveBeenCalledWith('/domains/link', { domain: 'example.com', org_id: 'o1' });
  });
});
