import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DomainCheckoutForm from '@/components/domains/DomainCheckoutForm';

const { checkout } = vi.hoisted(() => ({
  checkout: vi.fn().mockResolvedValue({ checkout_url: '' }),
}));

vi.mock('@/lib/api-client', () => ({
  domainsApi: { checkout },
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
