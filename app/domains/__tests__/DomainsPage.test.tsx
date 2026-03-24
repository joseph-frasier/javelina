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
  // Clear existing params
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

  it('renders Register tab by default when no ?tab param', () => {
    render(<DomainsPage />);

    // Register tab content should be visible
    const panels = screen.getAllByTestId('domain-search-bar');
    expect(panels).toHaveLength(1);

    // The register panel should not be hidden
    const registerPanel = screen.getByTestId('domain-search-bar').closest('[class]');
    expect(registerPanel?.className).not.toContain('hidden');
  });

  it('renders Transfer tab when ?tab=transfer', () => {
    setSearchParams({ tab: 'transfer' });
    render(<DomainsPage />);

    // Transfer content should be visible (contains "Transfer a domain" card title)
    expect(screen.getByText('Transfer a domain')).toBeInTheDocument();

    // The transfer panel's parent should not be hidden
    const transferText = screen.getByText('Transfer a domain');
    const transferPanel = transferText.closest('.space-y-6')?.parentElement;
    expect(transferPanel?.className).not.toContain('hidden');
  });

  it('renders My Domains tab when ?tab=my-domains', () => {
    setSearchParams({ tab: 'my-domains' });
    render(<DomainsPage />);

    // My Domains content should be visible
    expect(screen.getByTestId('domains-list')).toBeInTheDocument();

    // The my-domains panel's parent should not be hidden
    const domainsList = screen.getByTestId('domains-list');
    const myDomainsPanel = domainsList.closest('.space-y-6')?.parentElement;
    expect(myDomainsPanel?.className).not.toContain('hidden');
  });

  it('tab navigation links have correct hrefs', () => {
    render(<DomainsPage />);

    const links = screen.getAllByRole('link');
    const hrefs = links.map((link) => link.getAttribute('href'));

    expect(hrefs).toContain('/domains');
    expect(hrefs).toContain('/domains?tab=transfer');
    expect(hrefs).toContain('/domains?tab=my-domains');
  });

  it('all three tab panels are in the DOM (mounted but hidden)', () => {
    render(<DomainsPage />);

    // Register panel content (search bar)
    expect(screen.getByTestId('domain-search-bar')).toBeInTheDocument();

    // Transfer panel content
    expect(screen.getByText('Transfer a domain')).toBeInTheDocument();

    // My Domains panel content
    expect(screen.getByTestId('domains-list')).toBeInTheDocument();
  });
});
