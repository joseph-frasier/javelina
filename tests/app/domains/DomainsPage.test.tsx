import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DomainsPage from '@/app/domains/page';

// Mock next/navigation
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/domains',
}));

// Mock ProtectedRoute to render children directly
vi.mock('@/components/auth/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const { checkout } = vi.hoisted(() => ({ checkout: vi.fn().mockResolvedValue({}) }));

// Mock API client
vi.mock('@/lib/api-client', () => ({
  domainsApi: {
    search: vi.fn().mockResolvedValue({ lookup: [], suggestions: [] }),
    checkTransfer: vi.fn().mockResolvedValue({ transferable: false }),
    list: vi.fn().mockResolvedValue({ domains: [] }),
    link: vi.fn().mockResolvedValue({}),
    checkout,
  },
}));

// Mock auth/hierarchy stores so MyDomainsContent renders as an org admin
// (matches a logged-in user with edit rights, consistent with pre-existing
// expectations that the "Link domain" callout is visible), and so checkout
// picks up the currently selected org (o2) per the mailbox/MyDomainsContent
// pattern.
vi.mock('@/lib/stores/hierarchy-store', () => ({
  useHierarchyStore: () => ({ currentOrgId: 'o2' }),
}));

vi.mock('@/lib/stores/auth-store', () => ({
  useAuthStore: () => ({
    user: {
      organizations: [
        { id: 'o1', name: 'Acme', role: 'Viewer' },
        { id: 'o2', name: 'Globex', role: 'Admin' },
      ],
    },
  }),
}));

// Mock child components to simplify testing
vi.mock('@/components/domains/DomainSearchBar', () => ({
  default: () => <div data-testid="domain-search-bar">DomainSearchBar</div>,
}));

vi.mock('@/components/domains/DomainSearchResults', () => ({
  default: () => <div data-testid="domain-search-results">DomainSearchResults</div>,
}));

// Mock RegisterDomainsContent with an interactive stand-in so we can trigger
// the page's onCheckout callback directly (bypassing the real search flow).
vi.mock('@/components/domains/RegisterDomainsContent', () => ({
  default: ({ onCheckout }: { onCheckout: (domain: string, price: number, currency: string) => void }) => (
    <button type="button" onClick={() => onCheckout('example.com', 12.99, 'USD')}>
      Trigger Register Checkout
    </button>
  ),
}));

// Mock DomainCheckoutForm so we can assert the org_id it forwards to the
// checkout API call without exercising the full contact-info form.
vi.mock('@/components/domains/DomainCheckoutForm', () => ({
  default: ({
    domain,
    registrationType,
    orgId,
  }: {
    domain: string;
    registrationType: string;
    orgId: string;
  }) => (
    <div data-testid="domain-checkout-form">
      DomainCheckoutForm
      <button
        type="button"
        onClick={() =>
          checkout({
            domain,
            registration_type: registrationType,
            org_id: orgId,
            contact_info: {},
          })
        }
      >
        Submit Checkout
      </button>
    </div>
  ),
}));

vi.mock('@/components/domains/DomainsList', () => ({
  default: () => <div data-testid="domains-list">DomainsList</div>,
}));

function setSearchParams(params: Record<string, string>) {
  for (const key of [...mockSearchParams.keys()]) {
    mockSearchParams.delete(key);
  }
  for (const [key, value] of Object.entries(params)) {
    mockSearchParams.set(key, value);
  }
}

describe('DomainsPage', () => {
  beforeEach(() => {
    setSearchParams({});
    checkout.mockClear();
  });

  it('renders all sections on a single page without tabs', () => {
    render(<DomainsPage />);

    // Register section
    expect(screen.getByTestId('domain-search-bar')).toBeInTheDocument();
    expect(screen.getByText('Find a domain')).toBeInTheDocument();

    // Transfer section
    expect(screen.getByText('Transfer a domain')).toBeInTheDocument();

    // My Domains section
    expect(screen.getByTestId('domains-list')).toBeInTheDocument();
    expect(screen.getByText('My Domains')).toBeInTheDocument();
  });

  it('does not render tab navigation links', () => {
    render(<DomainsPage />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    // No tab navigation links
    expect(hrefs).not.toContain('/domains?tab=transfer');
    expect(hrefs).not.toContain('/domains?tab=my-domains');
  });

  it('renders the link domain callout', () => {
    render(<DomainsPage />);

    expect(screen.getByText(/Already purchased or transferred a domain/)).toBeInTheDocument();
    expect(screen.getByText('Link domain')).toBeInTheDocument();
  });

  it('shows success banner when success param is present', () => {
    setSearchParams({ success: 'true' });
    render(<DomainsPage />);

    expect(screen.getByText(/Payment successful/)).toBeInTheDocument();
  });

  it('shows cancelled banner when cancelled param is present', () => {
    setSearchParams({ cancelled: 'true' });
    render(<DomainsPage />);

    expect(screen.getByText(/Checkout was cancelled/)).toBeInTheDocument();
  });

  it('includes org_id from the selected org when checking out a domain registration', () => {
    render(<DomainsPage />);

    fireEvent.click(screen.getByText('Trigger Register Checkout'));
    fireEvent.click(screen.getByText('Submit Checkout'));

    expect(checkout).toHaveBeenCalledWith(expect.objectContaining({ org_id: 'o2' }));
  });
});
