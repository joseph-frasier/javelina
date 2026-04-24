import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import DomainsPage from '../page';

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

// Mock API client
vi.mock('@/lib/api-client', () => ({
  domainsApi: {
    search: vi.fn().mockResolvedValue({ lookup: [], suggestions: [] }),
    checkTransfer: vi.fn().mockResolvedValue({ transferable: false }),
    list: vi.fn().mockResolvedValue({ domains: [] }),
    link: vi.fn().mockResolvedValue({}),
  },
}));

// Mock child components to simplify testing
vi.mock('@/components/domains/DomainSearchBar', () => ({
  default: () => <div data-testid="domain-search-bar">DomainSearchBar</div>,
}));

vi.mock('@/components/domains/DomainSearchResults', () => ({
  default: () => <div data-testid="domain-search-results">DomainSearchResults</div>,
}));

vi.mock('@/components/domains/DomainCheckoutForm', () => ({
  default: () => <div data-testid="domain-checkout-form">DomainCheckoutForm</div>,
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
});
