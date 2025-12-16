import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { AddZoneModal } from './AddZoneModal';
import { useZones } from '@/lib/hooks/useZones';
import * as createZoneAction from '@/lib/actions/zones';

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

// Mock the createZone server action
vi.mock('@/lib/actions/zones', () => ({
  createZone: vi.fn(),
}));

// Mock Supabase client for useZones hook
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: {
          session: { access_token: 'fake-token' },
        },
      }),
    },
  })),
}));

// Mock toast store
vi.mock('@/lib/toast-store', () => ({
  useToastStore: () => ({
    addToast: vi.fn(),
  }),
}));

// Mock plan limits hooks
vi.mock('@/lib/hooks/usePlanLimits', () => ({
  usePlanLimits: () => ({
    limits: { zones: 10 },
    tier: 'pro',
    wouldExceedLimit: () => false,
  }),
}));

vi.mock('@/lib/hooks/useUsageCounts', () => ({
  useUsageCounts: () => ({
    usage: { zones: 0 },
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

// Mock UI components
vi.mock('@/components/ui/Modal', () => ({
  Modal: ({ children, isOpen, title }: any) =>
    isOpen ? (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/Button', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/Input', () => ({
  default: ({ ...props }: any) => <input {...props} />,
}));

vi.mock('@/components/ui/UpgradeLimitBanner', () => ({
  UpgradeLimitBanner: () => null,
}));

// MSW server setup
const mockZonesInitial: any[] = [];
const mockNewZone = {
  id: 'zone-new-123',
  name: 'newzone.com',
  organization_id: 'org-123',
  records_count: 0,
};

const server = setupServer(
  // GET zones - returns empty initially, then includes new zone after creation
  http.get('http://localhost:3001/api/zones/organization/:orgId', () => {
    return HttpResponse.json({ data: mockZonesInitial });
  })
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
});
afterAll(() => server.close());

// Wrapper component that shows modal + zones list
function TestWrapper({ organizationId }: { organizationId: string }) {
  const { data: zones, isLoading } = useZones(organizationId);

  return (
    <div>
      <AddZoneModal
        isOpen={true}
        onClose={() => {}}
        organizationId={organizationId}
        organizationName="Test Org"
        planCode="pro"
      />
      <div data-testid="zones-display">
        {isLoading && <div>Loading zones...</div>}
        {zones && zones.length === 0 && <div>No zones yet</div>}
        {zones && zones.length > 0 && (
          <ul>
            {zones.map((zone: any) => (
              <li key={zone.id} data-testid={`zone-${zone.id}`}>
                {zone.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

describe('AddZoneModal - Create Zone Flow', () => {
  it('creates a zone and displays it in the zones list', async () => {
    const user = userEvent.setup();

    // Mock createZone action to return success
    const mockCreateZone = vi.spyOn(createZoneAction, 'createZone');
    mockCreateZone.mockResolvedValue({
      data: mockNewZone,
    });

    // Update MSW to return the new zone after creation
    let zonesData = [...mockZonesInitial];
    server.use(
      http.get('http://localhost:3001/api/zones/organization/:orgId', () => {
        return HttpResponse.json({ data: zonesData });
      })
    );

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Render the component
    render(
      <QueryClientProvider client={queryClient}>
        <TestWrapper organizationId="org-123" />
      </QueryClientProvider>
    );

    // Step 1: Verify modal is open
    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Add Zone')).toBeInTheDocument();

    // Step 2: Wait for zones to load, then verify list is initially empty
    await waitFor(() => {
      expect(screen.queryByText('Loading zones...')).not.toBeInTheDocument();
    });
    expect(screen.getByText('No zones yet')).toBeInTheDocument();

    // Step 3: Fill in the zone name (required field)
    const nameInput = screen.getByLabelText(/Zone Name/i);
    await user.type(nameInput, 'newzone.com');

    // Step 4: Submit the form
    const submitButton = screen.getByRole('button', { name: /Save Zone/i });
    await user.click(submitButton);

    // Step 5: Verify createZone was called with correct data
    await waitFor(() => {
      expect(mockCreateZone).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'newzone.com',
          organization_id: 'org-123',
        })
      );
    });

    // Step 6: Update zones data to include the new zone and invalidate cache
    zonesData = [mockNewZone];
    await queryClient.invalidateQueries({ queryKey: ['zones', 'org-123'] });

    // Step 7: Verify the new zone appears in the zones list
    await waitFor(() => {
      expect(screen.getByTestId('zone-zone-new-123')).toBeInTheDocument();
      expect(screen.getByText('newzone.com')).toBeInTheDocument();
    });

    // Step 8: Verify "No zones yet" message is gone
    expect(screen.queryByText('No zones yet')).not.toBeInTheDocument();
  });
});
