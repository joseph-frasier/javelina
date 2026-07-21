import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CustomPricingPanel from '@/components/admin/CustomPricingPanel';
import type { PricingRule } from '@/lib/api-client';

const list = vi.fn();
const archive = vi.fn();
vi.mock('@/lib/api-client', async (orig) => ({
  ...(await orig<typeof import('@/lib/api-client')>()),
  pricingApi: { list: (...a: any[]) => list(...a), archive: (...a: any[]) => archive(...a), create: vi.fn() },
}));
vi.mock('@/lib/stores/toast-store', () => ({
  useToastStore: (selector: any) => { const s = { addToast: vi.fn() }; return selector ? selector(s) : s; },
}));

const rule = (over: Partial<PricingRule>): PricingRule => ({
  id: 'r1', org_id: 'org1', scope: 'category', category: 'domain', discount_type: 'percent',
  value_bps: 4000, value_cents: null, effective_from: '2020-01-01T00:00:00Z', effective_until: null,
  note: null, created_by: null, created_at: '2020-01-01T00:00:00Z', archived_at: null, ...over,
});

beforeEach(() => { list.mockReset(); archive.mockReset(); });

describe('CustomPricingPanel', () => {
  it('renders active rules with human-readable pricing', async () => {
    list.mockResolvedValue({ active: [rule({})], history: [] });
    render(<CustomPricingPanel orgId="org1" orgName="Acme" />);
    await waitFor(() => expect(screen.getByText('Domains')).toBeInTheDocument());
    expect(screen.getByText('40% off')).toBeInTheDocument();
  });

  it('shows an empty state when there are no active rules', async () => {
    list.mockResolvedValue({ active: [], history: [] });
    render(<CustomPricingPanel orgId="org1" orgName="Acme" />);
    await waitFor(() => expect(screen.getByText(/no custom pricing/i)).toBeInTheDocument());
  });

  it('archives a rule after confirmation and refetches', async () => {
    list.mockResolvedValueOnce({ active: [rule({})], history: [] })
        .mockResolvedValueOnce({ active: [], history: [rule({ archived_at: '2026-07-21T00:00:00Z' })] });
    archive.mockResolvedValue(undefined);
    render(<CustomPricingPanel orgId="org1" orgName="Acme" />);
    await waitFor(() => expect(screen.getByText('40% off')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /^archive$/i }));
    // ConfirmationModal renders in a portal with role="alertdialog"; scope the confirm click to it
    // to avoid ambiguity with the row's "Archive" button.
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: /confirm/i }));
    await waitFor(() => expect(archive).toHaveBeenCalledWith('org1', 'r1'));
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });
});
