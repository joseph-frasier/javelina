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

// MyDomainsContent still reads these to scope the list it shows. The page itself
// no longer derives a checkout org from them - that is the point of these tests.
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

// Capture the props the page hands the checkout form, so we can assert the page
// supplies no organization of its own. Org selection belongs to the form now -
// see tests/components/domains/DomainCheckoutForm.test.tsx.
const formProps = vi.hoisted(() => ({ current: null as Record<string, unknown> | null }));

vi.mock('@/components/domains/DomainCheckoutForm', () => ({
  default: (props: Record<string, unknown>) => {
    formProps.current = props;
    return <div data-testid="domain-checkout-form">DomainCheckoutForm</div>;
  },
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

  it('does not render the link domain callout (link is hidden for now)', () => {
    render(<DomainsPage />);

    expect(screen.queryByText(/Already purchased or transferred a domain/)).toBeNull();
    expect(screen.queryByText('Link domain')).toBeNull();
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

  // Regression guard: the page used to compute checkoutOrgId from the persisted
  // currentOrgId (mocked here as 'o2') or orgs[0], and inject it silently. The org
  // must be chosen explicitly in the form, so the page must supply none.
  it('supplies no organization to the checkout form', () => {
    render(<DomainsPage />);

    fireEvent.click(screen.getByText('Trigger Register Checkout'));

    expect(screen.getByTestId('domain-checkout-form')).toBeInTheDocument();
    expect(formProps.current).not.toBeNull();
    expect(formProps.current).not.toHaveProperty('orgId');
    expect(Object.values(formProps.current ?? {})).not.toContain('o2');
  });
});
