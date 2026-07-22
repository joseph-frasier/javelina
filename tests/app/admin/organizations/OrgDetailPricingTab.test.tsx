import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AdminOrganizationDetailPage from '@/app/admin/organizations/[id]/page';

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<any>()),
  useParams: () => ({ id: 'org1' }),
}));

const getOrganization = vi.fn();
const list = vi.fn();
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  adminApi: {
    getOrganization: (...a: any[]) => getOrganization(...a),
  },
  pricingApi: { list: (...a: any[]) => list(...a), create: vi.fn(), archive: vi.fn() },
}));

vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: (s: any) => (s ? s({ addToast: vi.fn() }) : { addToast: vi.fn() }),
}));

vi.mock('@/components/admin/AdminProtectedRoute', () => ({
  AdminProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

beforeEach(() => {
  getOrganization.mockReset();
  list.mockReset();
  getOrganization.mockResolvedValue({ id: 'org1', name: 'Acme', is_active: true });
  list.mockResolvedValue({ active: [], history: [] });
});

describe('Org detail — Custom Pricing', () => {
  it('renders the Custom Pricing panel directly, with no Overview/Members tabs', async () => {
    render(<AdminOrganizationDetailPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    // The panel mounts and fetches its rules — no tab click needed.
    await waitFor(() => expect(list).toHaveBeenCalledWith('org1'));
    expect(screen.getByText('Custom Pricing')).toBeInTheDocument();
    // The redundant read-only tabs are gone.
    expect(screen.queryByRole('button', { name: /^overview$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^members$/i })).not.toBeInTheDocument();
  });

  it('still renders the org when the pricing fetch fails (panel handles it non-fatally)', async () => {
    list.mockRejectedValue(new Error('org_pricing_rules relation does not exist'));
    render(<AdminOrganizationDetailPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    await waitFor(() => expect(list).toHaveBeenCalledWith('org1'));
    expect(screen.queryByText('Failed to fetch organization data')).not.toBeInTheDocument();
  });
});
