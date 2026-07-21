import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminOrganizationDetailPage from '@/app/admin/organizations/[id]/page';

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<any>()),
  useParams: () => ({ id: 'org1' }),
}));

const getOrganization = vi.fn();
const getOrganizationMembers = vi.fn();
const list = vi.fn();
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  adminApi: {
    getOrganization: (...a: any[]) => getOrganization(...a),
    getOrganizationMembers: (...a: any[]) => getOrganizationMembers(...a),
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
  getOrganizationMembers.mockReset();
  list.mockReset();
  getOrganization.mockResolvedValue({ id: 'org1', name: 'Acme', created_at: '2020-01-01T00:00:00Z', is_active: true });
  getOrganizationMembers.mockResolvedValue([]);
  list.mockResolvedValue({ active: [], history: [] });
});

describe('Org detail — Custom Pricing tab', () => {
  it('shows a Custom Pricing tab that renders the panel', async () => {
    render(<AdminOrganizationDetailPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    await userEvent.click(screen.getByRole('button', { name: /custom pricing/i }));
    await waitFor(() => expect(list).toHaveBeenCalledWith('org1'));
  });

  it('shows a Custom Pricing badge in header when org has active pricing', async () => {
    list.mockResolvedValue({
      active: [
        {
          id: 'r1',
          org_id: 'org1',
          scope: 'category',
          category: 'domain',
          discount_type: 'percent',
          value_bps: 4000,
          value_cents: null,
          effective_from: '2020-01-01T00:00:00Z',
          effective_until: null,
          note: null,
          created_by: null,
          created_at: '2020-01-01T00:00:00Z',
          archived_at: null,
        },
      ],
      history: [],
    });
    render(<AdminOrganizationDetailPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText('Custom Pricing').length).toBeGreaterThan(1));
  });

  it('still renders the org when the pricing fetch fails (non-fatal)', async () => {
    list.mockRejectedValue(new Error('org_pricing_rules relation does not exist'));
    render(<AdminOrganizationDetailPage />);
    await waitFor(() => expect(screen.getAllByText('Acme').length).toBeGreaterThan(0));
    await waitFor(() => expect(list).toHaveBeenCalledWith('org1'));
    expect(screen.queryByText('Failed to fetch organization data')).not.toBeInTheDocument();
  });
});
