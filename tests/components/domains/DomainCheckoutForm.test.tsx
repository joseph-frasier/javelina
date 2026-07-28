import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';

const { checkout, getPricing } = vi.hoisted(() => ({
  checkout: vi.fn().mockResolvedValue({ checkout_url: '' }),
  getPricing: vi.fn().mockResolvedValue({
    domain: 'example.com',
    available: true,
    pricing: { price: 12.99, currency: 'USD', tld: 'com' },
    maxYears: undefined,
  }),
}));

vi.mock('@/lib/api-client', () => ({
  domainsApi: { checkout, getPricing },
}));

const { organizations } = vi.hoisted(() => ({
  organizations: [
    { id: 'o1', name: 'Acme', role: 'Admin' },
    { id: 'o2', name: 'Globex', role: 'Viewer' },
    { id: 'o3', name: 'Initech', role: 'Editor' },
  ],
}));

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({ user: { organizations } }),
}));

const renderForm = () =>
  render(
    <DomainCheckoutForm
      domain="example.com"
      registrationType="new"
      price={12.99}
      currency="USD"
      onCancel={() => {}}
      onSuccess={() => {}}
    />
  );

describe('DomainCheckoutForm organization selection', () => {
  beforeEach(() => {
    checkout.mockClear();
    organizations.length = 0;
    organizations.push(
      { id: 'o1', name: 'Acme', role: 'Admin' },
      { id: 'o2', name: 'Globex', role: 'Viewer' },
      { id: 'o3', name: 'Initech', role: 'Editor' }
    );
  });

  // The whole point: no default, so a domain can't land in the wrong org silently.
  it('starts blank rather than defaulting to an organization', () => {
    renderForm();

    expect(screen.getByText('Select an organization...')).toBeInTheDocument();
    expect(screen.queryByText('Acme')).toBeNull();
  });

  it('offers only orgs where the user can register (SuperAdmin/Admin/Editor)', () => {
    renderForm();

    fireEvent.click(screen.getByText('Select an organization...'));

    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('Initech')).toBeInTheDocument();
    // Viewer on Globex - would 403 at the API, so it must not be offered.
    expect(screen.queryByText('Globex')).toBeNull();
  });

  it('stays blank for a single-org user instead of auto-selecting', () => {
    organizations.length = 0;
    organizations.push({ id: 'o1', name: 'Acme', role: 'Admin' });

    renderForm();

    expect(screen.getByText('Select an organization...')).toBeInTheDocument();
  });

  it('tells a user with no eligible org why they cannot continue', () => {
    organizations.length = 0;
    organizations.push({ id: 'o2', name: 'Globex', role: 'Viewer' });

    renderForm();

    expect(
      screen.getByText(/don't have permission to register domains/i)
    ).toBeInTheDocument();
    expect(screen.queryByText('Select an organization...')).toBeNull();
  });
});

describe('DomainCheckoutForm org-aware pricing', () => {
  beforeEach(() => {
    checkout.mockClear();
    // mockClear leaves the previous test's implementation in place; reset it so
    // each case starts from catalog pricing.
    getPricing.mockReset();
    getPricing.mockResolvedValue({
      domain: 'example.com',
      available: true,
      pricing: { price: 12.99, currency: 'USD', tld: 'com' },
      maxYears: undefined,
    });
    organizations.length = 0;
    organizations.push({ id: 'o1', name: 'Acme', role: 'Admin' });
  });

  const selectAcme = async () => {
    fireEvent.click(screen.getByText('Select an organization...'));
    fireEvent.click(screen.getByText('Acme'));
    await waitFor(() => expect(getPricing).toHaveBeenCalled());
  };

  it('shows the org discounted price rather than the catalog price', async () => {
    // The endpoint already returns org-aware pricing alongside maxYears; the
    // form kept only maxYears, so a discounted org saw the full catalog total
    // and was then charged less at Stripe.
    getPricing.mockResolvedValue({
      domain: 'example.com',
      available: true,
      pricing: { price: 5, currency: 'USD', tld: 'com' },
      maxYears: 1,
    });

    renderForm();
    await selectAcme();

    await waitFor(() => expect(screen.getByText('$5.00/yr')).toBeInTheDocument());
    expect(screen.queryByText('$12.99/yr')).toBeNull();
  });

  it('multiplies the discounted price by the selected years', async () => {
    getPricing.mockResolvedValue({
      domain: 'example.com',
      available: true,
      pricing: { price: 5, currency: 'USD', tld: 'com' },
      maxYears: undefined,
    });

    renderForm();
    await selectAcme();

    await waitFor(() => expect(screen.getByText('$5.00')).toBeInTheDocument());
  });

  it('falls back to the catalog price when the org has no special pricing', async () => {
    renderForm();
    await selectAcme();

    await waitFor(() => expect(screen.getByText('$12.99/yr')).toBeInTheDocument());
  });

  it('reverts to the catalog price when the pricing lookup fails', async () => {
    getPricing.mockRejectedValue(new Error('network'));

    renderForm();
    await selectAcme();

    await waitFor(() => expect(screen.getByText('$12.99/yr')).toBeInTheDocument());
  });
});
