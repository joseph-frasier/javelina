import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import MyDomainsContent from '@/components/domains/MyDomainsContent';

const { list } = vi.hoisted(() => ({ list: vi.fn().mockResolvedValue({ domains: [] }) }));
vi.mock('@/lib/api-client', () => ({ domainsApi: { list, link: vi.fn() } }));
vi.mock('@/lib/stores/toast-store', () => ({ useToastStore: () => ({ addToast: vi.fn() }) }));
vi.mock('@/lib/stores/hierarchy-store', () => ({ useHierarchyStore: () => ({ currentOrgId: 'o2' }) }));
vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: { organizations: [
      { id: 'o1', name: 'Acme', role: 'Viewer' },
      { id: 'o2', name: 'Globex', role: 'Admin' },
    ] },
  }),
}));

describe('MyDomainsContent org scoping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists domains for the current org by default', async () => {
    render(<MyDomainsContent />);
    await waitFor(() => expect(list).toHaveBeenCalledWith('o2'));
  });
});
