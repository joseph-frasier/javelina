import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessPlaceholderDashboard } from '@/components/business/dashboard/BusinessPlaceholderDashboard';
import type { BusinessIntakeData } from '@/lib/business-intake-store';

// Prevent real network calls from DNSStatusCard / BillingCard queries
vi.mock('@/lib/api/zones', () => ({ listZonesForOrg: vi.fn().mockResolvedValue([]) }));
vi.mock('@/lib/api/dns-records', () => ({ listDnsRecordsForZone: vi.fn().mockResolvedValue([]) }));

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const data: BusinessIntakeData = {
  orgId: 'o1',
  planCode: 'business_starter',
  currentStep: 4,
  dns: { mode: 'jbp' },
  website: {
    bizName: 'Acme', bizType: '', industry: '',
    tagline: '', description: '', services: '',
    pages: ['Home', 'Services', 'About', 'Contact'],
    logo: null, photos: [],
    tone: 'Friendly', aesthetic: 'simple', letUsWrite: true,
  },
  domain: { mode: 'connect', domain: 'acme.com' },
  contact: {
    firstName: 'Pat', lastName: 'Lee',
    email: 'pat@acme.com', phone: '',
    address: '', city: '', state: '', zip: '', whois: true,
  },
  completedAt: '2026-04-22T00:00:00.000Z',
};

describe('BusinessPlaceholderDashboard', () => {
  it('renders the MySiteCard building state when no website tile is live', () => {
    render(<BusinessPlaceholderDashboard data={data} provisioning={[]} />, { wrapper });
    expect(screen.getByText(/We're building your site/i)).toBeTruthy();
    expect(screen.getByText(/What happens next/i)).toBeTruthy();
    expect(screen.queryByRole('link', { name: /visit my site/i })).toBeNull();
  });

  it('renders the MySiteCard live state with a Visit my site link when website is live', () => {
    render(
      <BusinessPlaceholderDashboard
        data={data}
        provisioning={[
          {
            service: 'website',
            state: 'live',
            internal_state: null,
            progress_label: 'Live',
            metadata: {},
            updated_at: '2026-05-19T00:00:00.000Z',
          },
        ]}
      />,
      { wrapper },
    );
    const link = screen.getByRole('link', { name: /visit my site/i });
    expect(link.getAttribute('href')).toBe('https://acme.com');
    expect(link.getAttribute('target')).toBe('_blank');
  });
});
